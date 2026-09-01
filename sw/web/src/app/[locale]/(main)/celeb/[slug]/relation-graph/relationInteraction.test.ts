import assert from "node:assert/strict";
import test from "node:test";

import { bindRelationClicks, createReadyQueue } from "./relationInteraction";

class FakeContainer {
  private readonly listeners = new Map<string, Set<EventListener>>();
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (typeof listener !== "function") return;
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (typeof listener === "function") this.listeners.get(type)?.delete(listener);
  }
  dispatch(type: string, event: Event) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

const personTarget = (personId: string) => ({
  closest: (selector: string) => selector === "[data-relation-person]"
    ? { dataset: { relationPerson: personId } } as unknown as HTMLElement : null,
});

test("the first visible person click is retained until the graph is ready", () => {
  const container = new FakeContainer();
  const selected: string[] = [];
  const focused: string[] = [];
  const focus = createReadyQueue<string>((personId) => focused.push(personId));
  bindRelationClicks(container as unknown as HTMLElement, {
    onCenter: () => undefined,
    onPerson: (personId) => {
      selected.push(personId);
      focus.request(personId);
    },
  });

  container.dispatch("click", { target: personTarget("ada"), timeStamp: 1 } as unknown as MouseEvent);
  assert.deepEqual(selected, ["ada"]);
  assert.deepEqual(focused, []);

  focus.ready();
  assert.deepEqual(focused, ["ada"]);
});

test("layout movement cannot replace the person pressed at the start of a click", () => {
  const container = new FakeContainer();
  const selected: string[] = [];
  bindRelationClicks(container as unknown as HTMLElement, {
    onCenter: () => undefined,
    onPerson: (personId) => selected.push(personId),
  });
  const pointer = (type: string, target: ReturnType<typeof personTarget>, timeStamp: number) =>
    container.dispatch(type, {
      target, timeStamp, isPrimary: true, button: 0, pointerId: 4, clientX: 100, clientY: 100,
    } as unknown as PointerEvent);

  pointer("pointerdown", personTarget("ada"), 10);
  pointer("pointerup", personTarget("grace"), 20);
  container.dispatch("click", { target: personTarget("grace"), timeStamp: 21 } as unknown as MouseEvent);

  assert.deepEqual(selected, ["ada"]);
});

test("only the latest early click is focused after initialization", () => {
  const focused: string[] = [];
  const focus = createReadyQueue<string>((personId) => focused.push(personId));

  focus.request("ada");
  focus.request("grace");
  focus.ready();
  focus.request("linus");

  assert.deepEqual(focused, ["grace", "linus"]);
});
