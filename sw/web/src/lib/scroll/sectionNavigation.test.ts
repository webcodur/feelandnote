import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { scrollToSection } from "./sectionNavigation";

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

test("heading navigation respects the sticky header", (t) => {
  const p = page(t);
  scrollToSection(p.section);
  assert.equal(p.top(), 64);
});

test("navigation clamps short final sections to the document bottom", (t) => {
  const p = page(t);
  p.root.scrollHeight = 5500;
  scrollToSection(p.section);
  assert.equal(p.win.scrollY, 4600);
});

test("navigation never takes the camera back after the reader moves", (t) => {
  const p = page(t);
  scrollToSection(p.section);
  p.win.scrollY += 300;
  const y = p.win.scrollY;
  p.shift(2500);
  p.shift(-1500);
  assert.equal(p.win.scrollY, y);
});
