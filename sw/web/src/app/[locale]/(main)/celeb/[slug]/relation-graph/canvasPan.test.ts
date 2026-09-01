import assert from "node:assert/strict";
import test from "node:test";

import { bindCanvasPan } from "./canvasPan";

class FakeContainer {
  readonly dataset: Record<string, string> = {};
  readonly style = { transform: "" };
  private readonly listeners = new Map<string, Set<EventListener>>();
  private readonly captured = new Set<number>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (typeof listener !== "function") return;
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (typeof listener === "function") this.listeners.get(type)?.delete(listener);
  }

  setPointerCapture(pointerId: number) { this.captured.add(pointerId); }
  hasPointerCapture(pointerId: number) { return this.captured.has(pointerId); }
  releasePointerCapture(pointerId: number) { this.captured.delete(pointerId); }
  dispatch(type: string, event: Event) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

const pointer = (clientX: number, clientY: number, button = 0, timeStamp = 0) => ({
  isPrimary: true, button, buttons: button === 0 ? 1 : 0,
  pointerId: 1, clientX, clientY, timeStamp, preventDefault: () => undefined,
}) as PointerEvent;

const click = (timeStamp = 0) => {
  let stopped = false;
  return {
    event: { timeStamp, preventDefault: () => undefined, stopImmediatePropagation: () => { stopped = true; } } as unknown as MouseEvent,
    stopped: () => stopped,
  };
};

test("드래그 중 바깥 뷰포트를 옮기지 않고 내부 카메라만 즉시 이동한다", () => {
  const container = new FakeContainer();
  const immediatePans: Array<{ offset: [number, number]; pointer?: [number, number] }> = [];
  const graph = {
    panImmediately: (offset: [number, number], position?: [number, number]) => {
      immediatePans.push({ offset, pointer: position });
    },
  };
  bindCanvasPan(container as unknown as HTMLElement, graph);

  container.dispatch("pointerdown", pointer(100, 100));
  container.dispatch("pointermove", pointer(120, 100));

  assert.equal(container.style.transform, "");
  assert.deepEqual(immediatePans, [{ offset: [20, 0], pointer: [120, 100] }]);

  container.dispatch("pointerup", pointer(120, 100));
  assert.equal(container.style.transform, "");
});

test("a three-pixel pointer wobble remains a click gesture", () => {
  const container = new FakeContainer();
  const immediatePans: [number, number][] = [];
  bindCanvasPan(container as unknown as HTMLElement, {
    panImmediately: (offset) => immediatePans.push(offset),
  });

  container.dispatch("pointerdown", pointer(100, 100));
  container.dispatch("pointermove", pointer(102, 101));
  container.dispatch("pointerup", pointer(102, 101));

  assert.deepEqual(immediatePans, []);
});

test("click suppression begins only after a completed drag", () => {
  const container = new FakeContainer();
  bindCanvasPan(container as unknown as HTMLElement, {
    panImmediately: () => undefined,
  });

  container.dispatch("pointerdown", pointer(100, 100));
  container.dispatch("pointermove", pointer(112, 100));
  const beforeFinish = click();
  container.dispatch("click", beforeFinish.event);
  assert.equal(beforeFinish.stopped(), false);

  container.dispatch("pointerup", pointer(112, 100));
  const afterFinish = click();
  container.dispatch("click", afterFinish.event);
  assert.equal(afterFinish.stopped(), true);
});

test("only the click emitted by the drag gesture is consumed", () => {
  const container = new FakeContainer();
  bindCanvasPan(container as unknown as HTMLElement, { panImmediately: () => undefined });

  container.dispatch("pointerdown", pointer(100, 100));
  container.dispatch("pointermove", pointer(112, 100));
  container.dispatch("pointerup", pointer(112, 100));

  const draggedClick = click();
  container.dispatch("click", draggedClick.event);
  assert.equal(draggedClick.stopped(), true);

  const deliberateClick = click();
  container.dispatch("click", deliberateClick.event);
  assert.equal(deliberateClick.stopped(), false);
});
