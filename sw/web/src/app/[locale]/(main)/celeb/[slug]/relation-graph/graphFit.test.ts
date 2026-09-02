import assert from "node:assert/strict";
import test from "node:test";

import { fitZoomToBounds } from "./graphFit";

test("the initial desktop zoom shrinks when rendered family nodes cross both vertical edges", () => {
  const viewport = { width: 988, height: 552 };
  const rendered = { width: 420, height: 624 };

  assert.equal(fitZoomToBounds(viewport, rendered, 1.3), 1.075);
});

test("the preferred initial zoom remains when every rendered node already fits", () => {
  const viewport = { width: 988, height: 552 };
  const rendered = { width: 640, height: 480 };

  assert.equal(fitZoomToBounds(viewport, rendered, 1.3), 1.3);
});
