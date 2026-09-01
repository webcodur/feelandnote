import assert from "node:assert/strict";
import test from "node:test";

import { buildGraphData, mobileGraphStageHeight } from "./graphLayout";
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
  familyPeople: [], socialPeople: [...rivals, upPerson, downPerson],
};
const labels: DiagramLabels = {
  parents: "Parents", siblings: "Siblings", spouses: "Spouses", children: "Children",
  up: "Influence", left: "Peers", right: "Rivals", down: "Influenced",
};
const data = buildGraphData(
  "social", model, ["up", "right", "down"], "Center", null, labels,
  { deep: "#000", edge: "#555", accent: "#fff" },
);

const node = (id: string) => data.nodes.find((item) => item.id === id) as DiagramNode;
const geometry = (id: string) => {
  const style = node(id).style;
  return { x: Number(style.x), y: Number(style.y), size: style.size as [number, number] };
};

test("상하 레인은 좌우처럼 중심 노드에 붙어 보인다", () => {
  const center = geometry("center");
  const up = geometry("lane:up");
  const down = geometry("lane:down");
  const upGap = center.y - center.size[1] / 2 - (up.y + up.size[1] / 2);
  const downGap = down.y - down.size[1] / 2 - (center.y + center.size[1] / 2);
  assert.ok(upGap <= 4, `up gap ${upGap}px`);
  assert.ok(downGap <= 4, `down gap ${downGap}px`);
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
  assert.equal(mobileGraphStageHeight("social", model, ["up", "right", "down"], 0.75), 446);
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
