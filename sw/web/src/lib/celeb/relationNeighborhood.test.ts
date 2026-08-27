import assert from "node:assert/strict";
import test from "node:test";

import {
  groupNeighbors,
  type NeighborCandidate,
  type NeighborRelationInput,
} from "./relationNeighborhood";

function celeb(id: string, influence = 0): NeighborCandidate {
  return {
    id,
    slug: id,
    nickname: id,
    nicknameEn: null,
    avatarUrl: `${id}.jpg`,
    title: null,
    titleEn: null,
    influence,
  };
}

function mapOf(...list: NeighborCandidate[]) {
  return new Map(list.map((item) => [item.id, item]));
}

const ids = (items: readonly { celeb: { id: string } }[]) => items.map((item) => item.celeb.id);

test("상대가 중심에게 무엇이었나로 묶음을 가른다", () => {
  const candidates = mapOf(celeb("스승"), celeb("제자"), celeb("맞수"), celeb("동료"), celeb("형제"));
  // rel_type은 「상대가 중심에게 무엇인가」다 — teacher는 상대가 스승이라는 뜻이다
  const relations: NeighborRelationInput[] = [
    { targetId: "스승", relType: "teacher" },
    { targetId: "제자", relType: "student" },
    { targetId: "맞수", relType: "rival" },
    { targetId: "동료", relType: "colleague" },
    { targetId: "형제", relType: "sibling" },
  ];

  const groups = groupNeighbors({ relations, candidates, limit: 10 });

  assert.deepEqual(
    groups.map((group) => group.kind),
    ["gave", "took", "rival", "together", "family"],
  );
  assert.deepEqual(ids(groups[0].items), ["스승"]);
  assert.deepEqual(ids(groups[1].items), ["제자"]);
});

test("influence는 준 쪽, influenced는 받은 쪽이다", () => {
  const candidates = mapOf(celeb("준사람"), celeb("받은사람"));
  const relations: NeighborRelationInput[] = [
    { targetId: "준사람", relType: "influence" },
    { targetId: "받은사람", relType: "influenced" },
  ];

  const groups = groupNeighbors({ relations, candidates, limit: 10 });

  assert.deepEqual(ids(groups.find((g) => g.kind === "gave")!.items), ["준사람"]);
  assert.deepEqual(ids(groups.find((g) => g.kind === "took")!.items), ["받은사람"]);
});

test("어떻게 이어졌는지 아는 사람을 앞에 세운다", () => {
  const candidates = mapOf(celeb("설명없음", 90), celeb("설명있음", 10));
  const relations: NeighborRelationInput[] = [
    { targetId: "설명없음", relType: "influence" },
    { targetId: "설명있음", relType: "influence", note: "그의 강의를 옮겨 적었다" },
  ];

  const [group] = groupNeighbors({ relations, candidates, limit: 10 });

  // 영향력은 설명없음이 크지만 사연이 있는 쪽이 먼저다
  assert.deepEqual(ids(group.items), ["설명있음", "설명없음"]);
});

test("같은 상대가 여러 관계로 걸리면 설명이 있는 쪽을 남긴다", () => {
  const candidates = mapOf(celeb("상대"));
  const relations: NeighborRelationInput[] = [
    { targetId: "상대", relType: "influence" },
    { targetId: "상대", relType: "teacher", note: "그에게 배웠다" },
  ];

  const [group] = groupNeighbors({ relations, candidates, limit: 10 });

  assert.equal(group.items.length, 1);
  assert.equal(group.items[0].note, "그에게 배웠다");
});

test("이동할 주소가 없는 상대는 세우지 않는다", () => {
  const candidates = mapOf({ ...celeb("주소없음"), slug: null }, celeb("정상"));
  const relations: NeighborRelationInput[] = [
    { targetId: "주소없음", relType: "influence" },
    { targetId: "정상", relType: "influence" },
  ];

  const [group] = groupNeighbors({ relations, candidates, limit: 10 });

  assert.deepEqual(ids(group.items), ["정상"]);
});

test("넘치면 잘라 세우되 전체 수는 남긴다", () => {
  const people = Array.from({ length: 9 }, (_, i) => celeb(`p${i}`, i));
  const candidates = mapOf(...people);
  const relations: NeighborRelationInput[] = people.map((person) => ({
    targetId: person.id,
    relType: "influenced",
  }));

  const [group] = groupNeighbors({ relations, candidates, limit: 3 });

  assert.equal(group.total, 9);
  assert.deepEqual(ids(group.items), ["p8", "p7", "p6"]);
});

test("모르는 관계 유형은 버린다", () => {
  const candidates = mapOf(celeb("상대"));
  const relations: NeighborRelationInput[] = [{ targetId: "상대", relType: "알수없음" }];

  assert.deepEqual(groupNeighbors({ relations, candidates, limit: 10 }), []);
});

test("빈 설명은 없는 것으로 본다", () => {
  const candidates = mapOf(celeb("상대"));
  const relations: NeighborRelationInput[] = [
    { targetId: "상대", relType: "influence", note: "   " },
  ];

  const [group] = groupNeighbors({ relations, candidates, limit: 10 });

  assert.equal(group.items[0].note, null);
});
