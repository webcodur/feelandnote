import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRelationCircles,
  buildRelationFans,
  buildRivalries,
  type ShapeCandidate,
  type ShapeRelationInput,
} from "./relationShapes";

function celeb(id: string, influence = 0): ShapeCandidate {
  return {
    id,
    slug: id,
    nickname: id,
    nicknameEn: null,
    avatarUrl: `${id}.jpg`,
    title: null,
    titleEn: null,
    birthYear: 1800,
    influence,
  };
}

const names = (list: readonly { celeb: { id: string } }[]) => list.map((item) => item.celeb.id);

// ── 갈래 ────────────────────────────────────────────────────────────

test("뻗어나간 갈래와 모여든 갈래를 방향대로 모은다", () => {
  const candidates = [celeb("스승"), celeb("갑"), celeb("을"), celeb("병")];
  // (A,B,influenced) = A가 B에게 줬다 ⇒ A에게서 뻗어나간다
  const relations: ShapeRelationInput[] = [
    { fromId: "스승", toId: "갑", relType: "influenced" },
    { fromId: "스승", toId: "을", relType: "influenced" },
    { fromId: "스승", toId: "병", relType: "influenced" },
  ];

  const fans = buildRelationFans({
    relations,
    candidates,
    countPerDirection: 1,
    spokeLimit: 10,
    minSpokes: 3,
  });

  assert.equal(fans.length, 1);
  assert.equal(fans[0].direction, "out");
  assert.equal(fans[0].center.id, "스승");
  assert.deepEqual(names(fans[0].spokes).sort(), ["갑", "병", "을"]);
});

test("teacher는 방향을 뒤집어 읽는다", () => {
  // (A,B,teacher) = B는 A의 스승 ⇒ B에게서 A로 흐른다
  const candidates = [celeb("제자1"), celeb("제자2"), celeb("제자3"), celeb("스승")];
  const relations: ShapeRelationInput[] = [
    { fromId: "제자1", toId: "스승", relType: "teacher" },
    { fromId: "제자2", toId: "스승", relType: "teacher" },
    { fromId: "제자3", toId: "스승", relType: "teacher" },
  ];

  const [fan] = buildRelationFans({
    relations,
    candidates,
    countPerDirection: 1,
    spokeLimit: 10,
    minSpokes: 3,
  });

  assert.equal(fan.center.id, "스승");
  assert.equal(fan.direction, "out");
  assert.equal(fan.spokes.every((spoke) => spoke.kind === "mentor"), true);
});

test("갈래가 넘치면 영향력 큰 사람부터 세우고 전체 수를 남긴다", () => {
  const spokes = Array.from({ length: 8 }, (_, i) => celeb(`p${i}`, i));
  const candidates = [celeb("중심"), ...spokes];
  const relations: ShapeRelationInput[] = spokes.map((spoke) => ({
    fromId: "중심",
    toId: spoke.id,
    relType: "influenced",
  }));

  const [fan] = buildRelationFans({
    relations,
    candidates,
    countPerDirection: 1,
    spokeLimit: 3,
    minSpokes: 3,
  });

  assert.equal(fan.total, 8);
  assert.deepEqual(names(fan.spokes), ["p7", "p6", "p5"]);
});

test("같은 사람이 두 갈래의 한가운데 앉지 않는다", () => {
  // 중심은 준 갈래도 받은 갈래도 셋씩 갖는다 — 둘 다 뽑히면 같은 얼굴이 두 판의 주인공이 된다
  const candidates = [
    celeb("중심"),
    celeb("준1"), celeb("준2"), celeb("준3"),
    celeb("받1"), celeb("받2"), celeb("받3"),
  ];
  const relations: ShapeRelationInput[] = [
    { fromId: "중심", toId: "받1", relType: "influenced" },
    { fromId: "중심", toId: "받2", relType: "influenced" },
    { fromId: "중심", toId: "받3", relType: "influenced" },
    { fromId: "준1", toId: "중심", relType: "influenced" },
    { fromId: "준2", toId: "중심", relType: "influenced" },
    { fromId: "준3", toId: "중심", relType: "influenced" },
  ];

  const fans = buildRelationFans({
    relations,
    candidates,
    countPerDirection: 1,
    spokeLimit: 10,
    minSpokes: 3,
  });

  const centers = fans.map((fan) => fan.center.id);
  assert.equal(new Set(centers).size, centers.length);
});

test("이동할 주소나 얼굴이 없는 인물은 갈래에서 빠진다", () => {
  const candidates = [
    celeb("중심"),
    { ...celeb("주소없음"), slug: null },
    { ...celeb("얼굴없음"), avatarUrl: null },
    celeb("정상"),
  ];
  const relations: ShapeRelationInput[] = [
    { fromId: "중심", toId: "주소없음", relType: "influenced" },
    { fromId: "중심", toId: "얼굴없음", relType: "influenced" },
    { fromId: "중심", toId: "정상", relType: "influenced" },
  ];

  const fans = buildRelationFans({
    relations,
    candidates,
    countPerDirection: 1,
    spokeLimit: 10,
    minSpokes: 1,
  });

  assert.deepEqual(names(fans[0].spokes), ["정상"]);
});

// ── 맞수 ────────────────────────────────────────────────────────────

test("양방향 두 행을 한 쌍으로 접는다", () => {
  const candidates = [celeb("갑"), celeb("을")];
  const relations: ShapeRelationInput[] = [
    { fromId: "갑", toId: "을", relType: "rival", note: "갑이 본 대결" },
    { fromId: "을", toId: "갑", relType: "rival", note: "을이 본 대결" },
  ];

  const rivalries = buildRivalries({ relations, candidates, count: 5 });

  assert.equal(rivalries.length, 1);
  assert.equal(rivalries[0].a.id, "갑");
  assert.equal(rivalries[0].b.id, "을");
});

test("시작점 선정은 설명 없이도 관계 사실을 쓴다", () => {
  const candidates = [celeb("갑"), celeb("을")];
  const relations: ShapeRelationInput[] = [{ fromId: "갑", toId: "을", relType: "rival" }];

  assert.equal(buildRivalries({ relations, candidates, count: 5 }).length, 1);
});

test("같은 얼굴이 여러 대결에 겹쳐 나오지 않는다", () => {
  const candidates = [celeb("단골", 90), celeb("갑", 80), celeb("을", 70)];
  const relations: ShapeRelationInput[] = [
    { fromId: "단골", toId: "갑", relType: "rival", note: "첫 대결" },
    { fromId: "단골", toId: "을", relType: "rival", note: "두 번째 대결" },
  ];

  const rivalries = buildRivalries({ relations, candidates, count: 5 });

  assert.equal(rivalries.length, 1);
});

test("두 사람 다 큰 쌍을 먼저 세운다", () => {
  const candidates = [celeb("큰1", 80), celeb("큰2", 70), celeb("작1", 5), celeb("작2", 4)];
  const relations: ShapeRelationInput[] = [
    { fromId: "작1", toId: "작2", relType: "rival", note: "작은 대결" },
    { fromId: "큰1", toId: "큰2", relType: "rival", note: "큰 대결" },
  ];

  const [first] = buildRivalries({ relations, candidates, count: 1 });

  assert.deepEqual([first.a.id, first.b.id].sort(), ["큰1", "큰2"]);
});

// ── 무리 ────────────────────────────────────────────────────────────

test("이어진 동료를 한 덩어리로 모은다", () => {
  const candidates = [celeb("가"), celeb("나"), celeb("다"), celeb("라"), celeb("바깥")];
  const relations: ShapeRelationInput[] = [
    { fromId: "가", toId: "나", relType: "colleague", note: "같은 팀" },
    { fromId: "나", toId: "다", relType: "colleague", note: "같은 팀" },
    { fromId: "다", toId: "라", relType: "colleague", note: "같은 팀" },
  ];

  const circles = buildRelationCircles({
    relations,
    candidates,
    count: 5,
    minSize: 4,
    maxSize: 9,
  });

  assert.equal(circles.length, 1);
  assert.deepEqual(
    circles[0].members.map((member) => member.id).sort(),
    ["가", "나", "다", "라"],
  );
});

test("무리 크기가 범위를 벗어나면 세우지 않는다", () => {
  const candidates = [celeb("가"), celeb("나")];
  const relations: ShapeRelationInput[] = [
    { fromId: "가", toId: "나", relType: "colleague", note: "둘뿐" },
  ];

  const circles = buildRelationCircles({
    relations,
    candidates,
    count: 5,
    minSize: 4,
    maxSize: 9,
  });

  assert.deepEqual(circles, []);
});

test("무리를 설명할 문장은 창업 쪽을 먼저 쓴다", () => {
  const candidates = [celeb("가"), celeb("나"), celeb("다"), celeb("라")];
  const relations: ShapeRelationInput[] = [
    { fromId: "가", toId: "나", relType: "colleague", note: "같은 팀 소속" },
    { fromId: "나", toId: "다", relType: "cofounder", note: "2021년 회사를 함께 세웠다" },
    { fromId: "다", toId: "라", relType: "colleague", note: "같은 팀 소속" },
  ];

  const [circle] = buildRelationCircles({
    relations,
    candidates,
    count: 5,
    minSize: 4,
    maxSize: 9,
  });

  assert.equal(circle.note, "2021년 회사를 함께 세웠다");
});

test("창업 동료가 낀 무리를 먼저 세운다", () => {
  const candidates = [
    // 영향력만 보면 동료 무리가 앞서지만 창업 무리가 먼저다
    celeb("동료1", 90), celeb("동료2", 90), celeb("동료3", 90), celeb("동료4", 90),
    celeb("창업1", 1), celeb("창업2", 1), celeb("창업3", 1), celeb("창업4", 1),
  ];
  const relations: ShapeRelationInput[] = [
    { fromId: "동료1", toId: "동료2", relType: "colleague", note: "같은 팀" },
    { fromId: "동료2", toId: "동료3", relType: "colleague", note: "같은 팀" },
    { fromId: "동료3", toId: "동료4", relType: "colleague", note: "같은 팀" },
    { fromId: "창업1", toId: "창업2", relType: "cofounder", note: "함께 세웠다" },
    { fromId: "창업2", toId: "창업3", relType: "cofounder", note: "함께 세웠다" },
    { fromId: "창업3", toId: "창업4", relType: "cofounder", note: "함께 세웠다" },
  ];

  const [first] = buildRelationCircles({
    relations,
    candidates,
    count: 1,
    minSize: 4,
    maxSize: 9,
  });

  assert.equal(first.members.some((member) => member.id.startsWith("창업")), true);
});

test("자료가 같으면 늘 같은 모양이 나온다", () => {
  const candidates = Array.from({ length: 10 }, (_, i) => celeb(`p${i}`, i % 3));
  const relations: ShapeRelationInput[] = [];
  for (let i = 0; i < 9; i += 1) {
    relations.push({ fromId: `p${i}`, toId: `p${i + 1}`, relType: "colleague", note: "동석" });
    relations.push({ fromId: `p0`, toId: `p${i + 1}`, relType: "influenced" });
    relations.push({ fromId: `p${i}`, toId: `p9`, relType: "rival", note: "대결" });
  }

  const run = (input: ShapeRelationInput[], list: ShapeCandidate[]) => ({
    fans: buildRelationFans({
      relations: input, candidates: list,
      countPerDirection: 1, spokeLimit: 5, minSpokes: 2,
    }).map((fan) => [fan.center.id, ...names(fan.spokes)]),
    rivalries: buildRivalries({ relations: input, candidates: list, count: 3 }).map((r) => r.id),
    circles: buildRelationCircles({
      relations: input, candidates: list, count: 2, minSize: 3, maxSize: 12,
    }).map((c) => c.members.map((m) => m.id)),
  });

  assert.deepEqual(run(relations, candidates), run([...relations].reverse(), [...candidates].reverse()));
});
