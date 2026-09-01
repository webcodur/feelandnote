import assert from "node:assert/strict";
import test from "node:test";

import {
  boundGraphOffset, createBoundedGraphPan, focusGraphPerson, panGraphImmediately, restoreGraphView,
} from "./graphCamera";

test("an immediate pan keeps every G6 render layer aligned", () => {
  const pans: Record<string, [number, number][]> = { main: [], label: [], transient: [] };
  const layers = Object.fromEntries(Object.keys(pans).map((name) => [name, {
    getCamera: () => ({ pan: (x: number, y: number) => pans[name].push([x, y]) }),
  }]));
  const graph = { getZoom: () => 2, getCanvas: () => ({ getLayers: () => layers }) };

  panGraphImmediately(graph, [20, -10]);

  assert.deepEqual(pans, {
    main: [[-10, 5]], label: [[-10, 5]], transient: [[-10, 5]],
  });
});

test("a compact mobile map can travel down while all of its content stays visible", () => {
  const canvas = { left: 0, top: 0, width: 320, height: 555 };
  const content = { left: 10, right: 310, top: 63, bottom: 492 };

  assert.deepEqual(boundGraphOffset(canvas, content, [0, 200]), [0, 45]);
});

test("an oversized mobile map stops close to its finished edge", () => {
  const canvas = { left: 0, top: 0, width: 320, height: 405 };
  const content = { left: 0, right: 500, top: -10, bottom: 420 };

  assert.equal(boundGraphOffset(canvas, content, [0, 200])[1], 42);
});

test("a gesture that reaches a boundary stays silent for all of its pointer frames", () => {
  const pans: [number, number][] = [];
  const boundaries: string[][] = [];
  const graph = {
    getZoom: () => 1,
    getCanvas: () => ({ getLayers: () => ({
      main: { getCamera: () => ({ pan: (x: number, y: number) => pans.push([x, y]) }) },
    }) }),
  };
  const nodes = [{ getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) }];
  const container = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    querySelectorAll: () => nodes,
  } as unknown as HTMLElement;
  const pan = createBoundedGraphPan(graph, container, (next) => boundaries.push(next));

  pan.beginPan();
  pan.panImmediately([100, 100]);
  pan.panImmediately([100, 100]);
  pan.panImmediately([100, 100]);
  pan.endPan();

  assert.deepEqual(pans, [[-100, -100], [-8, -8]]);
  assert.deepEqual(boundaries, [[], [], [], []]);
});

test("a new gesture against an already blocked edge reveals the boundary", () => {
  const pans: [number, number][] = [];
  const boundaries: string[][] = [];
  const graph = {
    getZoom: () => 1,
    getCanvas: () => ({ getLayers: () => ({
      main: { getCamera: () => ({ pan: (x: number, y: number) => pans.push([x, y]) }) },
    }) }),
  };
  const nodes = [{ getBoundingClientRect: () => ({ left: 108, top: 108, width: 1000, height: 800 }) }];
  const container = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    querySelectorAll: () => nodes,
  } as unknown as HTMLElement;
  const pan = createBoundedGraphPan(graph, container, (next) => boundaries.push(next));

  pan.beginPan();
  pan.panImmediately([3, 3]);
  pan.panImmediately([9, 9]);
  pan.panImmediately([-10, -10]);
  pan.endPan();

  assert.deepEqual(pans, [[10, 10]]);
  assert.deepEqual(boundaries, [[], ["top", "start"], [], []]);
});

test("an edge person moves only as far as the finite map boundary allows", async () => {
  const translations: Array<{ offset: [number, number]; animation?: false | object }> = [];
  const graph = {
    translateBy: async (offset: [number, number], animation?: false | object) => {
      translations.push({ offset, animation });
    },
  };
  const person = {
    dataset: { relationPerson: "ada" },
    getBoundingClientRect: () => ({ left: 200, top: 100, width: 80, height: 100 }),
  };
  const oppositePerson = {
    dataset: { relationPerson: "grace" },
    getBoundingClientRect: () => ({ left: 940, top: 500, width: 80, height: 100 }),
  };
  const container = {
    querySelectorAll: () => [person, oppositePerson],
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 600 }),
  } as unknown as HTMLElement;

  const motion = { matchMedia: () => ({ matches: false }) };
  assert.equal(await focusGraphPerson(graph, container, "ada", motion), true);
  assert.deepEqual(translations, [{
    offset: [8, 58], animation: { duration: 160, easing: "ease-out" },
  }]);
});

test("an interior person rests on the bottom focus line instead of the center", async () => {
  const translations: [number, number][] = [];
  const target = {
    dataset: { relationPerson: "ada" },
    getBoundingClientRect: () => ({ left: 360, top: 200, width: 80, height: 100 }),
  };
  const boundaryNodes = [
    { dataset: {}, getBoundingClientRect: () => ({ left: -200, top: 0, width: 80, height: 100 }) },
    { dataset: {}, getBoundingClientRect: () => ({ left: 920, top: 0, width: 80, height: 100 }) },
    { dataset: {}, getBoundingClientRect: () => ({ left: 0, top: -500, width: 80, height: 100 }) },
    { dataset: {}, getBoundingClientRect: () => ({ left: 0, top: 900, width: 80, height: 100 }) },
  ];
  const container = {
    querySelectorAll: () => [target, ...boundaryNodes],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  } as unknown as HTMLElement;
  const graph = { translateBy: async (offset: [number, number]) => { translations.push(offset); } };

  await focusGraphPerson(graph, container, "ada", { matchMedia: () => ({ matches: false }) });

  assert.deepEqual(translations, [[0, 192]]);
});

test("restoring the graph camera never moves the document", async () => {
  const calls: Array<{ action: string; offset?: [number, number]; animation?: false | object }> = [];
  let documentScrolls = 0;
  const graph = {
    translateBy: async (offset: [number, number], animation?: false | object) => {
      calls.push({ action: "translate", offset, animation });
    },
    fitCenter: async (animation?: false | object) => { calls.push({ action: "fit", animation }); },
  };
  const center = { getBoundingClientRect: () => ({ left: 360, top: 250, width: 80, height: 100 }) };
  const left = { getBoundingClientRect: () => ({ left: -100, top: 100, width: 80, height: 100 }) };
  const right = { getBoundingClientRect: () => ({ left: 820, top: 500, width: 80, height: 100 }) };
  const container = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    querySelector: () => center,
    querySelectorAll: () => [center, left, right],
  } as unknown as HTMLElement;
  const motion = {
    matchMedia: () => ({ matches: false }),
    scrollTo: () => { documentScrolls += 1; },
  };

  await restoreGraphView(graph, true, container, motion);
  assert.equal(documentScrolls, 0);
  await restoreGraphView(graph, false, container, motion);

  const animation = { duration: 220, easing: "ease-out" };
  assert.deepEqual(calls, [
    { action: "translate", offset: [0, 0], animation }, { action: "fit", animation },
  ]);
  assert.equal(documentScrolls, 0);

  calls.length = 0;
  await restoreGraphView(graph, true, container, { ...motion, matchMedia: () => ({ matches: true }) });
  assert.deepEqual(calls, [{ action: "translate", offset: [0, 0], animation: false }]);
  assert.equal(documentScrolls, 0);
});
