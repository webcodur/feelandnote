import assert from "node:assert/strict";
import { test } from "node:test";
import { observeBottomNavHeight } from "./bottomNavHeight";

test("bottom chrome publishes before first paint, defers observed changes and cancels stale work", () => {
  const previous = { ResizeObserver: globalThis.ResizeObserver, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  let observed: (() => void) | undefined;
  let disconnected = false;
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const values = new Map<string, string>();
  let writes = 0;
  const element = { offsetHeight: 64 };
  const root = { style: {
    getPropertyValue: (key: string) => values.get(key) ?? "",
    setProperty: (key: string, value: string) => { writes++; values.set(key, value); },
    removeProperty: (key: string) => values.delete(key),
  } };
  globalThis.ResizeObserver = class {
    constructor(callback: () => void) { observed = callback; }
    observe() {} unobserve() {} disconnect() { disconnected = true; }
  } as unknown as typeof ResizeObserver;
  globalThis.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
  globalThis.cancelAnimationFrame = id => { frames.delete(id); };
  try {
    const stop = observeBottomNavHeight(element as HTMLElement, root as unknown as HTMLElement);
    assert.equal(values.get("--layer-bottom-chrome-h"), "64px");
    element.offsetHeight = 110;
    observed?.(); observed?.();
    assert.equal(values.get("--layer-bottom-chrome-h"), "64px", "must not mutate layout inside ResizeObserver");
    assert.equal(frames.size, 1, "coalesce observations in a frame");
    const [id, run] = [...frames][0]; frames.delete(id); run(0);
    assert.equal(values.get("--layer-bottom-chrome-h"), "110px");
    observed?.();
    const [sameId, same] = [...frames][0]; frames.delete(sameId); same(0);
    assert.equal(writes, 2, "unchanged size must not rewrite root styles");
    observed?.(); stop();
    assert.equal(frames.size, 0);
    assert.equal(disconnected, true);
    assert.equal(values.has("--layer-bottom-chrome-h"), false);
  } finally { Object.assign(globalThis, previous); }
});
