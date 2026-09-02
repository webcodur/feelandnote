import assert from "node:assert/strict";
import test from "node:test";

import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

import { buildRelationModel, typesForMode } from "./relationModel";

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

test("대응 신격은 상세 관계망의 왼쪽 사회 관계에 둔다", () => {
  const model = buildRelationModel([counterpart], "ko");

  assert.deepEqual(model.social.left.map(({ id }) => id), ["jupiter"]);
  assert.deepEqual(model.socialPeople.map(({ id }) => id), ["jupiter"]);
  assert.deepEqual(typesForMode(model.people[0], "social"), ["counterpart"]);
});
