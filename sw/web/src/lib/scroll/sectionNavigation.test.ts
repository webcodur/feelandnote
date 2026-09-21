import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { cancelSectionNavigation, scrollToSection } from "./sectionNavigation";

function page(t: TestContext) {
  const original = new Map<string, PropertyDescriptor | undefined>();
  const win = Object.assign(new EventTarget(), {
    scrollY: 0,
    innerHeight: 900,
    scrollTo({ top, behavior }: ScrollToOptions) {
      assert.equal(behavior, "instant");
      this.scrollY = top!;
    },
  });
  const root = { scrollHeight: 9000 };
  let targetTop = 5000;
  let disconnected = false;
  let resized = () => {};
  const section = {
    isConnected: true,
    getBoundingClientRect: () => ({ top: targetTop - win.scrollY }),
    closest: () => ({ querySelectorAll: () => [section] }),
    focus: (options: FocusOptions) => assert.equal(options.preventScroll, true),
  } as unknown as HTMLElement;
  for (const [key, value] of Object.entries({
    window: win,
    document: { body: {}, documentElement: root },
    getComputedStyle: () => ({ scrollMarginTop: "64px" }),
    ResizeObserver: class {
      constructor(callback: () => void) { resized = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    },
  })) {
    original.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  t.after(() => {
    cancelSectionNavigation();
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  return {
    win, root, section,
    shift(amount: number) { targetTop += amount; if (!disconnected) resized(); },
    disconnected: () => disconnected,
    top: () => targetTop - win.scrollY,
  };
}

test("late sections above the destination can expand and shrink without moving its heading", (t) => {
  const p = page(t);
  scrollToSection(p.section);
  assert.equal(p.top(), 64);
  p.shift(2562);
  assert.equal(p.top(), 64);
  p.shift(-1500);
  assert.equal(p.top(), 64);
});

test("short last sections clamp to the bottom and realign when the page grows", (t) => {
  const p = page(t);
  p.root.scrollHeight = 5500;
  scrollToSection(p.section);
  assert.equal(p.win.scrollY, 4600);
  p.root.scrollHeight += 600;
  p.shift(0);
  assert.equal(p.top(), 64);
});

for (const event of ["wheel", "touchstart", "pointerdown", "keydown", "popstate", "pagehide"]) {
  test(`${event} releases the heading so later loading does not undo user movement`, (t) => {
    const p = page(t);
    scrollToSection(p.section);
    p.win.dispatchEvent(new Event(event));
    assert(p.disconnected());
    p.win.scrollY += 300;
    const y = p.win.scrollY;
    p.shift(2562);
    assert.equal(p.win.scrollY, y);
  });
}

test("unmount cleanup releases the observer", (t) => {
  const p = page(t);
  scrollToSection(p.section);
  cancelSectionNavigation();
  assert(p.disconnected());
});
