import assert from "node:assert/strict";
import test from "node:test";

import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

import { buildRelationModel, peopleForMode, relationFocusesForMode, typesForMode } from "./relationModel";

const counterpart: CelebRelationItem = {
  relType: "counterpart",
  relGroup: "counterpart",
  id: "jupiter",
  slug: "jupiter",
  listed: true,
  nickname: "유피테르",
  nickname_en: "Jupiter",
  avatar_url: null,
  profession: null,
  nationality: null,
  birth_date: null,
  death_date: null,
  qid: "Q4649",
  note: "그리스와 로마의 대응 신격",
  note_en: "Greek and Roman counterpart deities",
};

test("가족·친구·대응 관계는 네 축에 포함하지 않는다", () => {
  for (const relType of ['father', 'friend', 'counterpart']) {
    const model = buildRelationModel([{ ...counterpart, relType }], "ko");
    assert.deepEqual(model.people, []);
    assert.deepEqual(model.other, []);
    assert.deepEqual(model.familyPeople, []);
  }
});

test("한 인물이 영향 양방향·협력·대립 네 갈래에 모두 속할 수 있다", () => {
  const rows = ['influence', 'influenced', 'colleague', 'rival'].map(relType => ({ ...counterpart, relType }));
  const model = buildRelationModel(rows, "ko");
  assert.equal(model.people.length, 1);
  for (const band of Object.values(model.social)) assert.deepEqual(band.map(p => p.id), ['jupiter']);
  assert.deepEqual(typesForMode(model.people[0], "social"), ['influence', 'influenced', 'colleague', 'rival']);
  assert.equal(peopleForMode(model, "social").length, 1);
  assert.equal(relationFocusesForMode(model, "social").length, 4);
});

test("사제·공동창업을 네 축으로 읽고 명단 밖 상대도 같은 기준을 쓴다", () => {
  const model = buildRelationModel(['teacher', 'student', 'cofounder'].map(relType => ({ ...counterpart, listed: false, relType })), "en");
  assert.deepEqual(model.people[0].types, ['influence', 'influenced', 'colleague']);
  assert.equal(model.people[0].name, 'Jupiter');
});
