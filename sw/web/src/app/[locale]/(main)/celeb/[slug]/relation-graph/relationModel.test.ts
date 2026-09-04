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

test("대응 신격은 사회가 아니라 기타 갈래로 간다", () => {
  const model = buildRelationModel([counterpart], "ko");

  assert.deepEqual(model.other.map(({ id }) => id), ["jupiter"]);
  assert.deepEqual(model.social.left, []);
  assert.deepEqual(model.socialPeople, []);
  assert.deepEqual(model.familyPeople, []);
  assert.deepEqual(relationFocusesForMode(model, "other"), ["left"]);
  assert.deepEqual(peopleForMode(model, "other").map(({ id }) => id), ["jupiter"]);
  assert.deepEqual(typesForMode(model.people[0], "other"), ["counterpart"]);
});

test("협력·대립처럼 갈래가 있는 관계는 기타로 새지 않는다", () => {
  const colleague = { ...counterpart, id: "ally", relType: "colleague", relGroup: "career" } as CelebRelationItem;
  const model = buildRelationModel([colleague], "ko");

  assert.deepEqual(model.social.left.map(({ id }) => id), ["ally"]);
  assert.deepEqual(model.other, []);
});
