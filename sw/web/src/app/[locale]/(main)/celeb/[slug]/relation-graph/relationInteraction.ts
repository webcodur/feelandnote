import { PAN_THRESHOLD } from "./canvasPan";

interface RelationClickCallbacks {
  onCenter: () => void;
  onPerson: (personId: string) => void;
}

interface ClickElement {
  closest: <T extends HTMLElement>(selector: string) => T | null;
}

export function bindRelationClicks(container: HTMLElement, callbacks: RelationClickCallbacks) {
  let pressed: { center: boolean; personId?: string; pointerId: number; x: number; y: number } | null = null;
  let committedAt: number | null = null;
  const findTarget = (target: EventTarget | null) => {
    const element = target as ClickElement | null;
    const personEl = element?.closest<HTMLElement>("[data-relation-person]");
    const personId = personEl?.dataset.relationPerson;
    if (personId === "__CENTER__" || element?.closest<HTMLElement>(".relation-center")) {
      return { center: true };
    }
    if (personId) return { center: false, personId };
    return null;
  };
  const commit = (target: { center: boolean; personId?: string }) => {
    if (target.center) callbacks.onCenter();
    else if (target.personId) callbacks.onPerson(target.personId);
  };
  const handlePointerDown = (event: PointerEvent) => {
    const target = findTarget(event.target);
    if (!target || !event.isPrimary || event.button !== 0) return;
    pressed = { ...target, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const handlePointerUp = (event: PointerEvent) => {
    if (!pressed || event.pointerId !== pressed.pointerId) return;
    const distance = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
    const target = pressed;
    pressed = null;
    if (distance >= PAN_THRESHOLD) return;
    committedAt = event.timeStamp;
    commit(target);
  };
  const handleClick = (event: MouseEvent) => {
    const followsPointer = committedAt !== null && Math.abs(event.timeStamp - committedAt) < 500;
    committedAt = null;
    if (!followsPointer) {
      const target = findTarget(event.target);
      if (target) commit(target);
    }
  };
  const cancelPointer = () => { pressed = null; };
  container.addEventListener("pointerdown", handlePointerDown, true);
  container.addEventListener("pointerup", handlePointerUp, true);
  container.addEventListener("pointercancel", cancelPointer, true);
  container.addEventListener("click", handleClick);
  return () => {
    container.removeEventListener("pointerdown", handlePointerDown, true);
    container.removeEventListener("pointerup", handlePointerUp, true);
    container.removeEventListener("pointercancel", cancelPointer, true);
    container.removeEventListener("click", handleClick);
  };
}

export function createReadyQueue<T>(run: (value: T) => void) {
  let isReady = false;
  let pending: { value: T } | null = null;
  return {
    request(value: T) {
      if (!isReady) {
        pending = { value };
        return;
      }
      run(value);
    },
    ready() {
      isReady = true;
      if (!pending) return;
      const { value } = pending;
      pending = null;
      run(value);
    },
  };
}
