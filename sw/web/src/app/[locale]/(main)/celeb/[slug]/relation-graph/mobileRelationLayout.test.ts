import assert from "node:assert/strict";
import test from "node:test";
import { mobileRelationPeople } from "./mobileRelationLayout";

test("the overview counts a person in multiple relationship branches only once", () => {
  const shared = { id: "both" };
  const options = [
    { key: "up" as const, people: [{ id: "mentor" }, shared] },
    { key: "left" as const, people: [shared, { id: "colleague" }] },
    { key: "down" as const, people: [] },
  ];
  assert.deepEqual(mobileRelationPeople(options, null).map(person => person.id), ["mentor", "both", "colleague"]);
});

test("choosing a branch preserves all of its people without including another branch", () => {
  const parents = Array.from({ length: 12 }, (_, index) => ({ id: `parent-${index}` }));
  const options = [
    { key: "parents" as const, people: parents },
    { key: "siblings" as const, people: [{ id: "sibling" }] },
    { key: "spouses" as const, people: [] },
  ];
  assert.deepEqual(mobileRelationPeople(options, "parents"), parents);
  assert.deepEqual(mobileRelationPeople(options, "siblings"), [{ id: "sibling" }]);
  assert.deepEqual(mobileRelationPeople(options, "spouses"), []);
});
