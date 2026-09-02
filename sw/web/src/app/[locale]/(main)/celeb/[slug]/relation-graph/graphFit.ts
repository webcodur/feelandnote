import { containGraphViewport, type ImmediateCameraGraph } from "./graphCamera";

interface Size { width: number; height: number; }

interface ZoomableGraph extends ImmediateCameraGraph {
  zoomTo: (zoom: number, animation?: object, origin?: [number, number]) => Promise<void>;
}

const INITIAL_INSET = 18;
const roundedZoom = (zoom: number) => Math.round(zoom * 1000) / 1000;

export function fitZoomToBounds(
  viewport: Size, rendered: Size, preferredZoom: number, inset = INITIAL_INSET,
) {
  if (viewport.width <= 0 || viewport.height <= 0 || rendered.width <= 0 || rendered.height <= 0) {
    return preferredZoom;
  }
  const availableWidth = Math.max(1, viewport.width - inset * 2);
  const availableHeight = Math.max(1, viewport.height - inset * 2);
  const scale = Math.min(1, availableWidth / rendered.width, availableHeight / rendered.height);
  return roundedZoom(preferredZoom * scale);
}

export async function fitRenderedGraph(
  graph: ZoomableGraph, container: HTMLElement, minimumZoom: number,
) {
  const viewport = container.getBoundingClientRect();
  const nodes = [...container.querySelectorAll<HTMLElement>(".relation-person, .relation-lane")];
  if (!nodes.length) return graph.getZoom();
  const rects = nodes.map((node) => node.getBoundingClientRect());
  const rendered = {
    width: Math.max(...rects.map((rect) => rect.right)) - Math.min(...rects.map((rect) => rect.left)),
    height: Math.max(...rects.map((rect) => rect.bottom)) - Math.min(...rects.map((rect) => rect.top)),
  };
  const currentZoom = graph.getZoom();
  const nextZoom = Math.max(minimumZoom, fitZoomToBounds(viewport, rendered, currentZoom));
  if (nextZoom < currentZoom - 0.001) {
    await graph.zoomTo(nextZoom, undefined, [viewport.width / 2, viewport.height / 2]);
  }
  containGraphViewport(graph, container);
  return graph.getZoom();
}
