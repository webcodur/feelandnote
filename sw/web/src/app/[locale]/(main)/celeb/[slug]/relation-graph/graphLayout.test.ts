import assert from "node:assert/strict";
import test from "node:test";

import { buildGraphData, graphStageHeight, mobileGraphStageHeight } from "./graphLayout";
import type { DiagramLabels, DiagramNode, PersonNode, RelationModel } from "./types";

const person = (index: number): PersonNode => ({
  id: `person-${index}`, slug: `person-${index}`, listed: true, name: `Person ${index}`,
  avatarUrl: null, types: ["rival"], groups: ["rivalry"], note: null,
  profession: null, nationality: null, birthDate: null, deathDate: null, qid: null,
});

const rivals = Array.from({ length: 7 }, (_, index) => person(index));
const upPerson = person(7);
const downPerson = person(8);
const model: RelationModel = {
  people: [...rivals, upPerson, downPerson],
  family: { parents: [], siblings: [], spouses: [], children: [] },
  social: { up: [upPerson], left: [], right: rivals, down: [downPerson] },
  other: [],
  familyPeople: [], socialPeople: [...rivals, upPerson, downPerson],
};
const labels: DiagramLabels = {
  parents: "Parents", siblings: "Siblings", spouses: "Spouses", children: "Children",
  up: "Influence", left: "Peers", right: "Rivals", down: "Influenced",
};
const CENTER_X = 480;
const data = buildGraphData(
  "social", model, ["up", "right", "down"], "Center", null, labels,
  { deep: "#000", edge: "#555", accent: "#fff" },
);

const node = (id: string) => data.nodes.find((item) => item.id === id) as DiagramNode;
const geometry = (id: string) => {
  const style = node(id).style;
  return { x: Number(style.x), y: Number(style.y), size: style.size as [number, number] };
};

test("상하 관계 용어는 중심 인물명과 읽기 좋은 간격을 둔다", () => {
  const center = geometry("center");
  const up = geometry("lane:up");
  const down = geometry("lane:down");
  const upGap = center.y - center.size[1] / 2 - (up.y + up.size[1] / 2);
  const downGap = down.y - down.size[1] / 2 - (center.y + center.size[1] / 2);
  assert.equal(upGap, downGap);
  assert.ok(upGap >= 20 && upGap <= 30, `axis gap ${upGap}px`);
});

test("협력과 대립 행은 관계 용어에서 같은 거리로 시작한다", () => {
  const allies = Array.from({ length: rivals.length }, (_, index) => ({
    ...person(index + 20), types: ["friend"], groups: ["friendship"] as PersonNode["groups"],
  }));
  const symmetricModel: RelationModel = {
    ...model,
    people: [...model.people, ...allies],
    social: { ...model.social, left: allies },
    socialPeople: [...model.socialPeople, ...allies],
  };
  const symmetric = buildGraphData(
    "social", symmetricModel, ["left", "right"], "Center", null, labels,
    { deep: "#000", edge: "#555", accent: "#fff" },
  );
  const pointX = (id: string) => Number(symmetric.nodes.find((item) => item.id === `person:${id}`)?.style.x);
  const leftDistances = allies.map(({ id }) => CENTER_X - pointX(id)).sort((a, b) => a - b);
  const rightDistances = rivals.map(({ id }) => pointX(id) - CENTER_X).sort((a, b) => a - b);
  assert.deepEqual(leftDistances, rightDistances);
});

test("우측의 짧은 행도 중심에서 같은 거리로 시작한다", () => {
  const center = geometry("center");
  const rows = new Map<number, number[]>();
  rivals.forEach(({ id }) => {
    const point = geometry(`person:${id}`);
    rows.set(point.y, [...(rows.get(point.y) ?? []), point.x - center.x]);
  });
  const nearest = [...rows.values()].map((distances) => Math.min(...distances));
  assert.ok(Math.max(...nearest) - Math.min(...nearest) <= 1, `row spread ${Math.max(...nearest) - Math.min(...nearest)}px`);
});

test("mobile stage height follows the visible relationship density", () => {
  assert.equal(mobileGraphStageHeight("social", model, ["up"], 0.75), 360);
  assert.equal(mobileGraphStageHeight("social", model, ["up", "right", "down"], 0.75), 476);
});

test("only toggled relation groups are drawn", () => {
  const focused = buildGraphData(
    "social", model, ["right"], "Center", null, labels,
    { deep: "#000", edge: "#555", accent: "#fff" },
  );
  const ids = new Set(focused.nodes.map(({ id }) => id));
  assert.equal(ids.has("lane:right"), true);
  assert.equal(ids.has("lane:up"), false);
  assert.equal(ids.has("lane:down"), false);
  assert.equal(ids.has(`person:${upPerson.id}`), false);
  assert.equal(ids.has(`person:${downPerson.id}`), false);
  const centerHtml = String(focused.nodes.find(({ id }) => id === "center")?.style.innerHTML);
  assert.match(centerHtml, /relation-profile-fallback/);
  assert.doesNotMatch(centerHtml, /<small|relation-profile-monogram/);
  assert.match(centerHtml, /cy="35" r="22"/);
  assert.match(centerHtml, /M-4 108/);
  assert.match(centerHtml, /relation-ray is-right/);
  assert.doesNotMatch(centerHtml, /relation-ray is-(up|left|down)/);
});

test("shared family people render distinct placement nodes with valid edge targets", () => {
  const shared = { ...person(100), types: ["sibling", "spouse"], groups: ["family"] as PersonNode["groups"] };
  const overlapModel: RelationModel = {
    people: [shared],
    family: { parents: [], siblings: [shared], spouses: [shared], children: [] },
    social: { up: [], left: [], right: [], down: [] },
    other: [],
    familyPeople: [shared],
    socialPeople: [],
  };
  const overlap = buildGraphData(
    "family", overlapModel, ["siblings", "spouses"], "Center", null, labels,
    { deep: "#000", edge: "#555", accent: "#fff" },
  );
  const personNodeIds = overlap.nodes
    .filter(({ id }) => id.startsWith("person:"))
    .map(({ id }) => id);
  const ids = new Set(overlap.nodes.map(({ id }) => id));

  assert.equal(new Set(personNodeIds).size, personNodeIds.length);
  assert.equal(personNodeIds.length, 2);
  assert.ok(personNodeIds.some((id) => id === `person:${shared.id}`));
  assert.ok(personNodeIds.some((id) => id !== `person:${shared.id}`));
  assert.equal(overlap.edges.every(({ source, target }) => ids.has(source) && ids.has(target)), true);
});

test("full family layout keeps axis and side people in separate rows", () => {
  const makePeople = (count: number, offset: number) => Array.from(
    { length: count }, (_, index) => ({
      ...person(offset + index), types: ["family"], groups: ["family"] as PersonNode["groups"],
    }),
  );
  const parents = makePeople(2, 200);
  const siblings = makePeople(5, 210);
  const spouses = makePeople(16, 220);
  const children = makePeople(21, 240);
  const familyModel: RelationModel = {
    people: [...parents, ...siblings, ...spouses, ...children],
    family: { parents, siblings, spouses, children },
    social: { up: [], left: [], right: [], down: [] },
    other: [], familyPeople: [...parents, ...siblings, ...spouses, ...children], socialPeople: [],
  };
  const family = buildGraphData(
    "family", familyModel, ["parents", "siblings", "spouses", "children"], "Center", null, labels,
    { deep: "#000", edge: "#555", accent: "#fff" },
  );
  const boxes = family.nodes.filter(({ id }) => id.startsWith("person:")).map(({ style }) => {
    const [width, height] = style.size as [number, number];
    const x = Number(style.x);
    const y = Number(style.y);
    return { left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2 };
  });
  const overlapArea = (a: typeof boxes[number], b: typeof boxes[number]) => (
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  );
  assert.equal(boxes.some((a, index) => boxes.slice(index + 1).some((b) => overlapArea(a, b) > 0)), false);
  assert.equal(graphStageHeight("family", familyModel, ["parents", "siblings", "spouses", "children"]), 1264);
});
