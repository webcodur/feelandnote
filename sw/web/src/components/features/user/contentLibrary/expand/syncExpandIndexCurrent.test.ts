import assert from "node:assert/strict";
import test from "node:test";

import { syncExpandIndexCurrent } from "./syncExpandIndexCurrent";

class IndexElement {
  current = false;
  mutations = 0;

  getAttribute(name: string) {
    return name === "aria-current" && this.current ? "true" : null;
  }

  removeAttribute(name: string) {
    if (name === "aria-current") this.current = false;
    this.mutations += 1;
  }

  setAttribute(name: string, value: string) {
    if (name === "aria-current") this.current = value === "true";
    this.mutations += 1;
  }
}

function currentIndexes(elements: readonly IndexElement[]) {
  return elements.flatMap((element, index) => element.current ? [index] : []);
}

test("selection updates only the previous and next index items", () => {
  const elements = Array.from({ length: 156 }, () => new IndexElement());
  elements[0].current = true;

  syncExpandIndexCurrent({
    elements,
    previousSelectedIndex: 0,
    selectedIndex: 91,
    structureChanged: false,
  });

  assert.deepEqual(currentIndexes(elements), [91]);
  assert.equal(elements.reduce((total, element) => total + element.mutations, 0), 2);
});

test("a structure change clears stale markers before restoring the selection", () => {
  const elements = Array.from({ length: 5 }, () => new IndexElement());
  elements[0].current = true;
  elements[4].current = true;

  syncExpandIndexCurrent({
    elements,
    previousSelectedIndex: 4,
    selectedIndex: 2,
    structureChanged: true,
  });

  assert.deepEqual(currentIndexes(elements), [2]);
});

test("an unchanged selection does not rewrite its aria-current marker", () => {
  const elements = Array.from({ length: 3 }, () => new IndexElement());
  elements[1].current = true;

  syncExpandIndexCurrent({
    elements,
    previousSelectedIndex: 1,
    selectedIndex: 1,
    structureChanged: false,
  });

  assert.deepEqual(currentIndexes(elements), [1]);
  assert.equal(elements.reduce((total, element) => total + element.mutations, 0), 0);
});
