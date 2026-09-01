"use client";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { bindCanvasPan } from "./canvasPan";
import GraphBoundaryFeedback, { type GraphBoundaryFeedbackHandle } from "./GraphBoundaryFeedback";
import { containGraphViewport, createBoundedGraphPan, focusGraphPerson, restoreGraphView, type CenterableGraph, type ImmediateCameraGraph, type TranslatableGraph } from "./graphCamera";
import { buildGraphData, graphStageHeight, mobileGraphStageHeight } from "./graphLayout";
import { bindRelationClicks, createReadyQueue } from "./relationInteraction";
import { relationFocusesForMode } from "./relationModel";
import styles from "./RelationDiagram.module.css";
import type {
  DiagramData, DiagramLabels, PersonNode, RelationFocus, RelationMode, RelationModel,
} from "./types";
interface GraphApi extends ImmediateCameraGraph, CenterableGraph, TranslatableGraph {
  render: () => Promise<void>;
  destroy: () => void;
  fitView: (options?: { when?: "overflow" | "always"; direction?: "x" | "y" | "both" }) => Promise<void>;
  getZoom: () => number;
  zoomTo: (zoom: number, animation?: object, origin?: [number, number]) => Promise<void>;
  setElementState: (states: Record<string, string[]>, animation?: boolean) => Promise<void>;
}
type MoveRequest = { type: "center" } | { type: "person"; personId: string };
interface Props {
  mode: RelationMode; focuses: RelationFocus[]; model: RelationModel;
  centerName: string; centerAvatarUrl: string | null; labels: DiagramLabels;
  zoomInLabel: string; zoomOutLabel: string; selectedId: string | null;
  onSelect: (person: PersonNode) => void;
}
const DESKTOP_ZOOM = { min: 0.7, max: 1.6, initial: 1.3 };
const MOBILE_ZOOM = { min: 0.55, max: 1.35, initial: 0.75 };
const ZOOM_STEP = 0.15;
const cssColor = (styles: CSSStyleDeclaration, name: string, fallback: string) =>
  styles.getPropertyValue(name).trim() || fallback;
async function applySelection(
  graph: GraphApi, data: DiagramData, previousId: string | null, selectedId: string | null, container: HTMLElement,
) {
  const states: Record<string, string[]> = {};
  for (const edge of data.edges) {
    const wasOnPath = Boolean(previousId && edge.data.personIds.includes(previousId));
    const onPath = Boolean(selectedId && edge.data.personIds.includes(selectedId));
    if (wasOnPath !== onPath && edge.data.layer === "ink") {
      states[edge.id] = onPath ? ["relation-active"] : [];
    }
  }
  if (Object.keys(states).length) await graph.setElementState(states, false);
  container.querySelectorAll<HTMLElement>("[data-relation-person]").forEach((node) => {
    node.classList.toggle("is-selected", node.dataset.relationPerson === selectedId);
  });
}
function RelationDiagram(props: Props) {
  const {
    mode, focuses, model, centerName, centerAvatarUrl, labels, zoomInLabel, zoomOutLabel, selectedId, onSelect,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const boundaryFeedbackRef = useRef<GraphBoundaryFeedbackHandle>(null);
  const graphRef = useRef<GraphApi | null>(null);
  const dataRef = useRef<DiagramData | null>(null);
  const appliedSelectionRef = useRef<string | null>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined"
    && window.matchMedia("(max-width: 900px)").matches);
  const { min: minZoom, max: maxZoom, initial: defaultZoom } = mobile ? MOBILE_ZOOM : DESKTOP_ZOOM;
  const compactFocus = mobile && focuses.length === 1;
  const fullView = !compactFocus && focuses.length === relationFocusesForMode(model, mode).length;
  const [zoom, setZoom] = useState(DESKTOP_ZOOM.initial);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const syncViewport = () => setMobile(query.matches);
    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setReady(false);
    setZoom(defaultZoom);
    appliedSelectionRef.current = null;
    let cancelled = false;
    let graph: GraphApi | null = null;
    let removeCanvasPan: () => void = () => undefined;
    const moveQueue = createReadyQueue<MoveRequest>((request) => {
      if (!graph) return;
      if (request.type === "center") return void restoreGraphView(graph, fullView, container);
      void focusGraphPerson(graph, container, request.personId);
    });
    const removeRelationClicks = bindRelationClicks(container, {
      onCenter: () => moveQueue.request({ type: "center" }),
      onPerson: (personId) => {
        const person = model.people.find((item) => item.id === personId);
        if (person) { moveQueue.request({ type: "person", personId }); onSelect(person); }
      },
    });
    void (async () => {
      try {
        const scope = container.closest<HTMLElement>("[data-world-material]") ?? container;
        const material = getComputedStyle(scope);
        const theme = {
          deep: cssColor(material, "--material-deep", "#080d11"),
          edge: cssColor(material, "--material-edge", "#51646c"),
          accent: cssColor(material, "--material-accent", "#9db9c5"),
        };
        const data = buildGraphData(
          mode, model, focuses, centerName, centerAvatarUrl, labels, theme,
          { compact: compactFocus, width: container.clientWidth },
        );
        const { Graph } = await import("@antv/g6");
        if (cancelled) return;
        graph = new Graph({
          container, data: data as never, autoResize: true, animation: { duration: 220, easing: "ease-out" }, node: { animation: false },
          devicePixelRatio: Math.max(2, window.devicePixelRatio),
          autoFit: "center",
          padding: compactFocus ? [24, 18, 24, 18] : 0,
          zoomRange: [minZoom, maxZoom],
          edge: { animation: false, state: { "relation-active": { stroke: theme.accent } } },
          behaviors: [],
        }) as unknown as GraphApi;
        await graph.render();
        removeCanvasPan = bindCanvasPan(container, createBoundedGraphPan(
          graph, container, (boundaries, pointer) => boundaryFeedbackRef.current?.show(boundaries, pointer),
        ));
        if (cancelled) return;
        if (compactFocus) {
          await graph.fitView({ when: "always", direction: "both" });
          const fittedZoom = graph.getZoom();
          if (fittedZoom > 1) {
            await graph.zoomTo(1, undefined, [container.clientWidth / 2, container.clientHeight / 2]);
          }
        } else {
          await graph.fitCenter({ duration: 0 });
          await graph.zoomTo(defaultZoom, undefined, [container.clientWidth / 2, container.clientHeight / 2]);
        }
        await applySelection(graph, data, null, selectedIdRef.current, container);
        graphRef.current = graph;
        dataRef.current = data;
        appliedSelectionRef.current = selectedIdRef.current;
        setZoom(graph.getZoom());
        setReady(true);
        moveQueue.ready();
      } catch (reason) {
        console.error("[relation-diagram] render failed", reason);
        if (!cancelled) { setError(true); setReady(false); }
      }
    })();
    return () => {
      cancelled = true;
      graphRef.current = null;
      dataRef.current = null;
      removeCanvasPan();
      removeRelationClicks();
      graph?.destroy();
    };
  }, [mode, focuses, model, centerName, centerAvatarUrl, labels, onSelect, mobile, defaultZoom, minZoom, maxZoom, compactFocus, fullView]);
  useEffect(() => {
    const graph = graphRef.current;
    const data = dataRef.current;
    const container = containerRef.current;
    if (graph && data && container) {
      const previousId = appliedSelectionRef.current;
      appliedSelectionRef.current = selectedId;
      void applySelection(graph, data, previousId, selectedId, container);
    }
  }, [selectedId]);
  const changeZoom = async (direction: -1 | 1) => {
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container) return;
    const current = graph.getZoom();
    const next = Math.min(maxZoom, Math.max(minZoom, Math.round((current + direction * ZOOM_STEP) * 100) / 100));
    if (next === current) return;
    await graph.zoomTo(next, undefined, [container.clientWidth / 2, container.clientHeight / 2]);
    containGraphViewport(graph, container);
    setZoom(next);
  };
  return <div className={styles.diagramShell}>
    <div className={styles.diagramViewport}>
      <div className={styles.diagramStage} style={{ height: mobile ? mobileGraphStageHeight(mode, model, focuses, defaultZoom) : graphStageHeight(mode, model, focuses) }}>
        <div ref={containerRef} className={styles.graphCanvas} data-ready={ready} />
        <GraphBoundaryFeedback ref={boundaryFeedbackRef} />
      </div>
    </div>
    <div className={styles.zoomControls} role="group" aria-label={`${zoomInLabel} · ${zoomOutLabel}`}>
      <button type="button" aria-label={zoomInLabel} title={zoomInLabel} disabled={!ready || zoom >= maxZoom}
        onClick={() => void changeZoom(1)}>
        <Plus aria-hidden="true" />
      </button>
      <button type="button" aria-label={zoomOutLabel} title={zoomOutLabel} disabled={!ready || zoom <= minZoom}
        onClick={() => void changeZoom(-1)}>
        <Minus aria-hidden="true" />
      </button>
    </div>
    {!graphRef.current && !error && <div className={styles.graphStatus}>RELATION DRAWING</div>}
    {error && <div className={styles.graphStatus}>RELATION DRAWING ERROR</div>}
  </div>;
}
export default memo(RelationDiagram);
