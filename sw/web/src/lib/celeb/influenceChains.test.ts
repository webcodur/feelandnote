import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInfluenceChains,
  type ChainCandidate,
  type ChainRelationInput,
} from "./influenceChains";

function celeb(id: string, birthYear: number | null): ChainCandidate {
  return {
    id,
    slug: id,
    nickname: id,
    nicknameEn: null,
    avatarUrl: `${id}.jpg`,
    title: null,
    titleEn: null,
    birthYear,
  };
}

const names = (chain: { nodes: { celeb: { id: string } }[] }) =>
  chain.nodes.map((node) => node.celeb.id);

test("스승·영향을 시대순 한 줄로 잇는다", () => {
  const candidates = [celeb("소크라테스", -470), celeb("플라톤", -427), celeb("아리스토텔레스", -384)];
  // (A,B,teacher) = B는 A의 스승 ⇒ 사슬은 B에서 A로 흐른다
  const relations: ChainRelationInput[] = [
    { fromId: "플라톤", toId: "소크라테스", relType: "teacher" },
    { fromId: "플라톤", toId: "아리스토텔레스", relType: "student" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  assert.deepEqual(names(chain), ["소크라테스", "플라톤", "아리스토텔레스"]);
  assert.equal(chain.fromYear, -470);
  assert.equal(chain.toYear, -384);
  assert.deepEqual(
    chain.nodes.map((node) => node.kind),
    ["mentor", "mentor", null],
  );
});

test("influenced는 반대 방향으로 읽는다", () => {
  const candidates = [celeb("앞사람", 1800), celeb("뒷사람", 1900)];
  const relations: ChainRelationInput[] = [
    { fromId: "앞사람", toId: "뒷사람", relType: "influenced" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  assert.deepEqual(names(chain), ["앞사람", "뒷사람"]);
  assert.deepEqual(
    chain.nodes.map((node) => node.kind),
    ["influence", null],
  );
});

test("맞수·동료·가족은 흐름이 없어 사슬이 되지 않는다", () => {
  const candidates = [celeb("갑", 1800), celeb("을", 1850), celeb("병", 1900)];
  const relations: ChainRelationInput[] = [
    { fromId: "갑", toId: "을", relType: "rival" },
    { fromId: "을", toId: "병", relType: "colleague" },
    { fromId: "갑", toId: "병", relType: "sibling" },
  ];

  const chains = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 3,
    minLength: 2,
    maxLength: 7,
  });

  assert.deepEqual(chains, []);
});

test("시대를 거스르는 간선은 버려 사슬이 순환하지 않는다", () => {
  const candidates = [celeb("선대", 1800), celeb("후대", 1900)];
  // 후대가 선대의 스승이라는 자료 오류 — 사슬은 후대에서 선대로 흐르려 한다
  const relations: ChainRelationInput[] = [
    { fromId: "선대", toId: "후대", relType: "teacher" },
    { fromId: "선대", toId: "후대", relType: "influenced" },
  ];

  const chains = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 3,
    minLength: 2,
    maxLength: 7,
  });

  // 정방향 간선(influenced) 하나만 살아남는다
  assert.equal(chains.length, 1);
  assert.deepEqual(names(chains[0]), ["선대", "후대"]);
});

test("동갑이 서로 영향을 주고받아도 순환하지 않는다", () => {
  const candidates = [celeb("A", 1900), celeb("B", 1900)];
  const relations: ChainRelationInput[] = [
    { fromId: "A", toId: "B", relType: "influenced" },
    { fromId: "B", toId: "A", relType: "influenced" },
  ];

  const chains = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 3,
    minLength: 2,
    maxLength: 7,
  });

  assert.equal(chains.length, 1);
  assert.equal(chains[0].nodes.length, 2);
});

test("이동할 주소나 얼굴이 없는 인물은 사슬에서 빠진다", () => {
  const noSlug: ChainCandidate = { ...celeb("주소없음", 1850), slug: null };
  const noAvatar: ChainCandidate = { ...celeb("얼굴없음", 1860), avatarUrl: null };
  const candidates = [celeb("앞", 1800), noSlug, noAvatar, celeb("뒤", 1900)];
  const relations: ChainRelationInput[] = [
    { fromId: "앞", toId: "주소없음", relType: "influenced" },
    { fromId: "주소없음", toId: "얼굴없음", relType: "influenced" },
    { fromId: "얼굴없음", toId: "뒤", relType: "influenced" },
  ];

  const chains = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 3,
    minLength: 2,
    maxLength: 7,
  });

  assert.deepEqual(chains, []);
});

test("생년을 모르는 인물은 시대순을 못 정해 빠진다", () => {
  const candidates = [celeb("앞", 1800), celeb("미상", null), celeb("뒤", 1900)];
  const relations: ChainRelationInput[] = [
    { fromId: "앞", toId: "미상", relType: "influenced" },
    { fromId: "미상", toId: "뒤", relType: "influenced" },
  ];

  const chains = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 3,
    minLength: 2,
    maxLength: 7,
  });

  assert.deepEqual(chains, []);
});

test("상한을 넘겨 길게 이어져도 상한까지만 세운다", () => {
  const candidates = Array.from({ length: 10 }, (_, i) => celeb(`p${i}`, 1000 + i * 10));
  const relations: ChainRelationInput[] = candidates.slice(0, -1).map((item, i) => ({
    fromId: item.id,
    toId: candidates[i + 1].id,
    relType: "influenced",
  }));

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 6,
  });

  assert.equal(chain.nodes.length, 6);
});

test("한 번 세운 인물은 다음 사슬에 다시 나오지 않는다", () => {
  // 허브 하나를 여러 갈래가 지난다 — 막지 않으면 같은 얼굴이 줄마다 되풀이된다
  const candidates = [
    celeb("갈래1", 1700),
    celeb("갈래2", 1710),
    celeb("허브", 1800),
    celeb("꼬리", 1900),
  ];
  const relations: ChainRelationInput[] = [
    { fromId: "갈래1", toId: "허브", relType: "influenced" },
    { fromId: "갈래2", toId: "허브", relType: "influenced" },
    { fromId: "허브", toId: "꼬리", relType: "influenced" },
  ];

  const chains = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 2,
    minLength: 2,
    maxLength: 7,
  });

  // 허브를 첫 사슬이 가져가면 갈래2는 이을 상대가 없어 사슬이 되지 못한다
  assert.equal(chains.length, 1);
  assert.deepEqual(names(chains[0]), ["갈래1", "허브", "꼬리"]);
});

test("사슬끼리 같은 인물을 나눠 갖지 않는다", () => {
  const candidates = [
    celeb("고대", 100),
    celeb("중세", 1200),
    celeb("근대", 1800),
    celeb("갑", 1500),
    celeb("을", 1600),
    celeb("병", 1700),
  ];
  const relations: ChainRelationInput[] = [
    { fromId: "고대", toId: "중세", relType: "influenced" },
    { fromId: "중세", toId: "근대", relType: "influenced" },
    // 고대에서 뻗는 또 다른 갈래 — 인물이 겹치면 안 된다
    { fromId: "고대", toId: "갑", relType: "influenced" },
    { fromId: "갑", toId: "을", relType: "influenced" },
    { fromId: "을", toId: "병", relType: "influenced" },
  ];

  const chains = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 3,
    minLength: 2,
    maxLength: 7,
  });

  const seen = new Set<string>();
  for (const chain of chains) {
    for (const id of names(chain)) {
      assert.equal(seen.has(id), false, `${id}가 두 사슬에 걸쳐 있다`);
      seen.add(id);
    }
  }
});

test("길이가 같으면 시대를 더 멀리 건넌 사슬을 세운다", () => {
  const candidates = [celeb("시작", 1000), celeb("가까운끝", 1100), celeb("먼끝", 1900)];
  const relations: ChainRelationInput[] = [
    { fromId: "시작", toId: "가까운끝", relType: "influenced" },
    { fromId: "시작", toId: "먼끝", relType: "influenced" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  assert.deepEqual(names(chain), ["시작", "먼끝"]);
});

test("같은 두 사람에 사제와 영향이 겹치면 사제로 적는다", () => {
  const candidates = [celeb("스승", 1800), celeb("제자", 1850)];
  const relations: ChainRelationInput[] = [
    { fromId: "스승", toId: "제자", relType: "influenced" },
    { fromId: "제자", toId: "스승", relType: "teacher" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  assert.equal(chain.nodes[0].kind, "mentor");
});

test("고리에 건너뛴 햇수를 담는다", () => {
  const candidates = [celeb("고대", -400), celeb("중세", 1200), celeb("근대", 1800)];
  const relations: ChainRelationInput[] = [
    { fromId: "고대", toId: "중세", relType: "influenced" },
    { fromId: "중세", toId: "근대", relType: "influenced" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  assert.deepEqual(
    chain.nodes.map((node) => node.gap),
    [1600, 600, null],
  );
});

test("받은 사람 시점으로 쓰인 설명을 남긴다", () => {
  const candidates = [celeb("스승", 1800), celeb("제자", 1850)];
  // 같은 사이가 원장에 양방향 두 행으로 있고 서로 다른 시점으로 적혀 있다
  const relations: ChainRelationInput[] = [
    { fromId: "스승", toId: "제자", relType: "student", note: "내가 가르쳤다" },
    { fromId: "제자", toId: "스승", relType: "teacher", note: "나는 그에게 배웠다" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  assert.equal(chain.nodes[0].note, "나는 그에게 배웠다");
});

test("설명이 없는 행보다 있는 행을 남긴다", () => {
  const candidates = [celeb("앞", 1800), celeb("뒤", 1850)];
  const relations: ChainRelationInput[] = [
    // 받은 사람 시점이지만 설명이 비었다 — 시점보다 설명이 있는 쪽이 먼저다
    { fromId: "뒤", toId: "앞", relType: "influence", note: "   " },
    { fromId: "앞", toId: "뒤", relType: "influenced", note: "그의 문장을 베껴 적었다" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  assert.equal(chain.nodes[0].note, "그의 문장을 베껴 적었다");
});

test("펼칠 고리는 설명이 있는 것 중 가장 멀리 건넌 고리다", () => {
  const candidates = [celeb("가", 100), celeb("나", 1700), celeb("다", 1710), celeb("라", 1900)];
  const relations: ChainRelationInput[] = [
    // 가장 멀리 건넜지만(1600년) 설명이 없다
    { fromId: "가", toId: "나", relType: "influenced" },
    { fromId: "나", toId: "다", relType: "influenced", note: "짧게 건넜다" },
    { fromId: "다", toId: "라", relType: "influenced", note: "멀리 건넜다" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  // 설명 있는 고리는 나→다(10년)와 다→라(190년) 둘 — 멀리 건넌 쪽을 편다
  assert.deepEqual(chain.highlight, { index: 2, gap: 190 });
});

test("설명이 하나도 없으면 펼칠 고리를 두지 않는다", () => {
  const candidates = [celeb("앞", 1800), celeb("뒤", 1900)];
  const relations: ChainRelationInput[] = [
    { fromId: "앞", toId: "뒤", relType: "influenced" },
  ];

  const [chain] = buildInfluenceChains({
    relations,
    candidates,
    maxChains: 1,
    minLength: 2,
    maxLength: 7,
  });

  assert.equal(chain.highlight, null);
});

test("자료가 같으면 늘 같은 사슬이 나온다", () => {
  const candidates = Array.from({ length: 8 }, (_, i) => celeb(`p${i}`, 1000 + i * 10));
  const relations: ChainRelationInput[] = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      relations.push({ fromId: `p${i}`, toId: `p${j}`, relType: "influenced" });
    }
  }

  const first = buildInfluenceChains({ relations, candidates, maxChains: 3, minLength: 2, maxLength: 5 });
  const second = buildInfluenceChains({
    relations: [...relations].reverse(),
    candidates: [...candidates].reverse(),
    maxChains: 3,
    minLength: 2,
    maxLength: 5,
  });

  assert.deepEqual(first.map(names), second.map(names));
});
