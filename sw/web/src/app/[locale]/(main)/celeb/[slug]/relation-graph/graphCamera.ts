interface CameraLayer {
  getCamera: () => { pan: (x: number, y: number) => unknown };
}

export interface ImmediateCameraGraph {
  getZoom: () => number;
  getCanvas: () => { getLayers: () => Record<string, CameraLayer> };
}

export interface CenterableGraph {
  fitCenter: (animation?: false | object) => Promise<void>;
}

export interface TranslatableGraph {
  translateBy: (offset: [number, number], animation?: false | object) => Promise<void>;
}

interface MotionPreference {
  matchMedia: (query: string) => { matches: boolean };
}

export type PanBoundary = "top" | "end" | "bottom" | "start";
type BoundaryListener = (boundaries: PanBoundary[], pointer?: [number, number]) => void;
type BoundaryPressure = { [Key in PanBoundary]: number };

const CENTER_MOVE = { duration: 220, easing: "ease-out" };
const PERSON_MOVE = { duration: 160, easing: "ease-out" };
interface GraphBounds { left: number; top: number; right: number; bottom: number; }

const boundaryInset = ({ width, height }: Pick<DOMRect, "width" | "height">) =>
  Math.min(144, Math.max(48, Math.min(width, height) * 0.18));

const axisOffset = (
  desired: number, viewportStart: number, viewportEnd: number,
  contentStart: number, contentEnd: number, inset: number,
) => {
  const available = viewportEnd - viewportStart - inset * 2;
  if (contentEnd - contentStart <= available) {
    return (viewportStart + viewportEnd - contentStart - contentEnd) / 2;
  }
  const minimum = viewportEnd - inset - contentEnd;
  const maximum = viewportStart + inset - contentStart;
  return Math.min(maximum, Math.max(minimum, desired));
};

function measureGraph(container: HTMLElement) {
  const canvas = container.getBoundingClientRect();
  const nodes = [...container.querySelectorAll<HTMLElement>(".relation-person, .relation-lane")];
  if (!nodes.length) return null;
  const rects = nodes.map((node) => node.getBoundingClientRect());
  const content: GraphBounds = {
    left: Math.min(...rects.map((rect) => rect.left)),
    top: Math.min(...rects.map((rect) => rect.top)),
    right: Math.max(...rects.map((rect) => rect.left + rect.width)),
    bottom: Math.max(...rects.map((rect) => rect.top + rect.height)),
  };
  return { canvas, content };
}

export function boundGraphOffset(
  canvas: Pick<DOMRect, "left" | "top" | "width" | "height">,
  content: GraphBounds, [x, y]: [number, number],
): [number, number] {
  const inset = boundaryInset(canvas);
  return [
    axisOffset(x, canvas.left, canvas.left + canvas.width, content.left, content.right, inset),
    axisOffset(y, canvas.top, canvas.top + canvas.height, content.top, content.bottom, inset),
  ];
}

export function panGraphImmediately(graph: ImmediateCameraGraph, [x, y]: [number, number]) {
  const zoom = graph.getZoom();
  for (const layer of Object.values(graph.getCanvas().getLayers())) {
    layer.getCamera().pan(-x / zoom, -y / zoom);
  }
}

export function blockedPanBoundaries(
  requested: [number, number], bounded: [number, number],
): PanBoundary[] {
  const boundaries: PanBoundary[] = [];
  if (requested[1] > bounded[1]) boundaries.push("top");
  if (requested[0] < bounded[0]) boundaries.push("end");
  if (requested[1] < bounded[1]) boundaries.push("bottom");
  if (requested[0] > bounded[0]) boundaries.push("start");
  return boundaries;
}

const emptyBoundaryPressure = (): BoundaryPressure => ({ top: 0, end: 0, bottom: 0, start: 0 });
const boundaryPressureDistance = (
  requested: [number, number], bounded: [number, number],
): BoundaryPressure => ({
  top: Math.max(0, requested[1] - bounded[1]),
  end: Math.max(0, bounded[0] - requested[0]),
  bottom: Math.max(0, bounded[1] - requested[1]),
  start: Math.max(0, requested[0] - bounded[0]),
});
const BOUNDARY_PRESSURE_PX = 12;

function boundariesAt(
  snapshot: NonNullable<ReturnType<typeof measureGraph>>, offset: [number, number],
) {
  const positive: [number, number] = [offset[0] + 1, offset[1] + 1];
  const negative: [number, number] = [offset[0] - 1, offset[1] - 1];
  return new Set<PanBoundary>([
    ...blockedPanBoundaries(positive, boundGraphOffset(snapshot.canvas, snapshot.content, positive)),
    ...blockedPanBoundaries(negative, boundGraphOffset(snapshot.canvas, snapshot.content, negative)),
  ]);
}

export function createBoundedGraphPan(
  graph: ImmediateCameraGraph, container: HTMLElement, onBoundary?: BoundaryListener,
) {
  let snapshot: ReturnType<typeof measureGraph> = null;
  let applied: [number, number] = [0, 0];
  let gestureStartBoundaries = new Set<PanBoundary>();
  let pressure = emptyBoundaryPressure();
  const beginPan = () => {
    snapshot = measureGraph(container);
    applied = [0, 0];
    gestureStartBoundaries = snapshot ? boundariesAt(snapshot, applied) : new Set();
    pressure = emptyBoundaryPressure();
  };
  return {
    beginPan,
    panImmediately: ([x, y]: [number, number], pointer?: [number, number]) => {
      if (!snapshot) beginPan();
      const requested: [number, number] = [applied[0] + x, applied[1] + y];
      const next = snapshot
        ? boundGraphOffset(snapshot.canvas, snapshot.content, requested)
        : requested;
      const blocked = blockedPanBoundaries(requested, next);
      const distance = boundaryPressureDistance(requested, next);
      const feedback = blocked.filter((boundary) => {
        if (!gestureStartBoundaries.has(boundary)) { pressure[boundary] = 0; return false; }
        pressure[boundary] += distance[boundary];
        return pressure[boundary] >= BOUNDARY_PRESSURE_PX;
      });
      for (const boundary of ["top", "end", "bottom", "start"] as const) {
        if (!blocked.includes(boundary)) pressure[boundary] = 0;
      }
      onBoundary?.(feedback, pointer);
      const delta: [number, number] = [next[0] - applied[0], next[1] - applied[1]];
      applied = next;
      if (delta[0] || delta[1]) panGraphImmediately(graph, delta);
    },
    endPan: () => { snapshot = null; onBoundary?.([]); },
  };
}

export function containGraphViewport(graph: ImmediateCameraGraph, container: HTMLElement) {
  const snapshot = measureGraph(container);
  if (!snapshot) return;
  const offset = boundGraphOffset(snapshot.canvas, snapshot.content, [0, 0]);
  if (offset[0] || offset[1]) panGraphImmediately(graph, offset);
}

async function focusGraphNode(
  graph: TranslatableGraph, container: HTMLElement, node: HTMLElement,
  animation: false | object, vertical: "center" | "bottom",
) {
  const snapshot = measureGraph(container);
  if (!snapshot) return false;
  const rect = node.getBoundingClientRect();
  const inset = boundaryInset(snapshot.canvas);
  const desired: [number, number] = [
    snapshot.canvas.left + snapshot.canvas.width / 2 - rect.left - rect.width / 2,
    vertical === "bottom"
      ? snapshot.canvas.top + snapshot.canvas.height - inset - rect.top - rect.height
      : snapshot.canvas.top + snapshot.canvas.height / 2 - rect.top - rect.height / 2,
  ];
  await graph.translateBy(boundGraphOffset(snapshot.canvas, snapshot.content, desired), animation);
  return true;
}

export async function focusGraphPerson(
  graph: TranslatableGraph, container: HTMLElement, personId: string,
  motion: MotionPreference | null = typeof window === "undefined" ? null : window,
) {
  const person = [...container.querySelectorAll<HTMLElement>("[data-relation-person]")]
    .find((node) => node.dataset.relationPerson === personId);
  if (!person) return false;
  const animation = motion?.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? false : PERSON_MOVE;
  return focusGraphNode(graph, container, person, animation, "bottom");
}

export async function restoreGraphView(
  graph: CenterableGraph & TranslatableGraph, fullView: boolean, container: HTMLElement,
  motion: MotionPreference | null = typeof window === "undefined" ? null : window,
) {
  const animation = motion?.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? false
    : CENTER_MOVE;
  const center = container.querySelector<HTMLElement>(".relation-center");
  if (fullView && center) await focusGraphNode(graph, container, center, animation, "center");
  else await graph.fitCenter(animation);
}
