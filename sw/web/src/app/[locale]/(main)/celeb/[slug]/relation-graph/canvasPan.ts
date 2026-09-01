interface PanGraph {
  beginPan?: () => void;
  panImmediately: (offset: [number, number], pointer?: [number, number]) => void;
  endPan?: () => void;
}

export const PAN_THRESHOLD = 6;
const DRAG_CLICK_EVENT_WINDOW = 2;

export function bindCanvasPan(container: HTMLElement, graph: PanGraph) {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let panning = false;
  let completedPanAt: number | null = null;
  const moveEvent = typeof window !== "undefined" && "onpointerrawupdate" in window
    ? "pointerrawupdate" : "pointermove";

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastY = event.clientY;
    panning = false;
    graph.beginPan?.();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    if (!dx && !dy) return;
    if (!panning) {
      const totalX = event.clientX - startX;
      const totalY = event.clientY - startY;
      if (Math.hypot(totalX, totalY) < PAN_THRESHOLD) return;
      panning = true;
      event.preventDefault();
      if (!container.hasPointerCapture(event.pointerId)) container.setPointerCapture(event.pointerId);
      container.dataset.panning = "true";
      graph.panImmediately([totalX, totalY], [event.clientX, event.clientY]);
      return;
    }
    event.preventDefault();
    graph.panImmediately([dx, dy], [event.clientX, event.clientY]);
  };

  const finish = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const completedPan = panning;
    pointerId = null;
    panning = false;
    if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
    delete container.dataset.panning;
    graph.endPan?.();
    if (!completedPan) return;
    completedPanAt = event.timeStamp;
  };
  const preventDraggedClick = (event: MouseEvent) => {
    const sameGesture = completedPanAt !== null
      && Math.abs(event.timeStamp - completedPanAt) < DRAG_CLICK_EVENT_WINDOW;
    completedPanAt = null;
    if (!sameGesture) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const handleMove = (event: Event) => onPointerMove(event as PointerEvent);
  const preventNativeDrag = (event: DragEvent) => event.preventDefault();

  container.addEventListener("pointerdown", onPointerDown, true);
  container.addEventListener(moveEvent, handleMove, true);
  container.addEventListener("pointerup", finish, true);
  container.addEventListener("pointercancel", finish, true);
  container.addEventListener("click", preventDraggedClick, true);
  container.addEventListener("dragstart", preventNativeDrag, true);
  return () => {
    container.removeEventListener("pointerdown", onPointerDown, true);
    container.removeEventListener(moveEvent, handleMove, true);
    container.removeEventListener("pointerup", finish, true);
    container.removeEventListener("pointercancel", finish, true);
    container.removeEventListener("click", preventDraggedClick, true);
    container.removeEventListener("dragstart", preventNativeDrag, true);
  };
}
