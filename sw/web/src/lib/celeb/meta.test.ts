import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCelebDescriptionEn,
  buildCelebDescriptionKo,
  buildCelebTitleEn,
  buildCelebTitleKo,
  type CelebMetaInput,
} from "./meta";

const emptyCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 };

test("full title describes only real viewing records", () => {
  const input: CelebMetaInput = {
    nickname: "빌 게이츠",
    title: "마이크로소프트 창업자",
    tier: "full",
    counts: { ...emptyCounts, BOOK: 10, VIDEO: 3 },
  };

  assert.equal(
    buildCelebTitleKo(input),
    "마이크로소프트 창업자 빌 게이츠가 감상한 책 10권, 본 영상 3편",
  );
  assert.equal(
    buildCelebTitleEn({ ...input, nickname: "Bill Gates", title: "Microsoft co-founder" }),
    "Bill Gates, Microsoft co-founder: 10 books read, 3 videos watched",
  );
});

test("full title leads with the headline while preserving viewing records", () => {
  const input: CelebMetaInput = {
    nickname: "젠슨 황",
    title: "엔비디아 CEO",
    headline: "AI 가속 컴퓨팅 시대를 연 엔비디아의 수장",
    headline_en: "The Nvidia chief who ushered in accelerated AI computing",
    tier: "full",
    counts: { ...emptyCounts, BOOK: 5, GAME: 1 },
  };

  assert.equal(
    buildCelebTitleKo(input),
    "AI 가속 컴퓨팅 시대를 연 엔비디아의 수장, 젠슨 황이 감상한 책 5권, 즐긴 게임 1개",
  );
  assert.equal(
    buildCelebTitleEn({ ...input, nickname: "Jensen Huang" }),
    "The Nvidia chief who ushered in accelerated AI computing — Jensen Huang: 5 books read, 1 game played",
  );
});

test("full profile without records does not claim recommendations", () => {
  const input: CelebMetaInput = {
    nickname: "기록 없는 인물",
    title: null,
    tier: "full",
    counts: emptyCounts,
  };

  assert.equal(buildCelebTitleKo(input), "기록 없는 인물: 인물 정보와 기록");
  assert.doesNotMatch(buildCelebTitleEn(input), /recommended/i);
});

test("light title keeps the existing modifier without inventing a page summary", () => {
  const input: CelebMetaInput = {
    nickname: "곽가",
    title: "군사좨주",
    tier: "light",
    counts: emptyCounts,
  };

  assert.equal(buildCelebTitleKo(input), "군사좨주, 곽가");
  assert.equal(
    buildCelebTitleEn({ ...input, nickname: "Guo Jia", title: "Army Libationer" }),
    "Army Libationer — Guo Jia",
  );

  const variedTitles = [
    ["강감찬", "귀주대첩", "귀주대첩, 강감찬"],
    ["김고은", "도깨비", "도깨비, 김고은"],
    ["마리아 칼라스", "라 디비나", "라 디비나, 마리아 칼라스"],
    ["클레오파트라", "마지막 파라오", "마지막 파라오, 클레오파트라"],
  ] as const;
  for (const [nickname, title, expected] of variedTitles) {
    assert.equal(buildCelebTitleKo({ ...input, nickname, title }), expected);
  }
  assert.equal(buildCelebTitleKo({ ...input, title: null }), "곽가");

  const description = buildCelebDescriptionEn({
    ...input,
    nickname: "Guo Jia",
    title: "Strategist to Cao Cao",
    bio: "A strategist in the late Eastern Han. He shaped several campaigns through careful judgment.",
  });
  assert.match(description, /A strategist in the late Eastern Han\./);
  assert.doesNotMatch(description, /several campaigns/);
});

test("fiction title states the linked source relationship and never claims viewing", () => {
  const input: CelebMetaInput = {
    nickname: "아킬레우스",
    title: "트로이 전쟁의 영웅",
    tier: "fiction",
    counts: emptyCounts,
    sourceWorks: [
      { title: "후대 각색", relationType: "adaptation" },
      { title: "《일리아스》", relationType: "origin" },
    ],
  };

  assert.equal(buildCelebTitleKo(input), "아킬레우스, 《일리아스》의 등장인물");
  assert.equal(
    buildCelebTitleEn({ ...input, nickname: "Achilles", sourceWorks: [{ title: "The Iliad", relationType: "origin" }] }),
    "Achilles in the Iliad",
  );

  const sourceCases = [
    ["오디세우스", "《오디세이아》", "오디세우스, 《오디세이아》의 등장인물"],
    ["헬레네", "《일리아스》", "헬레네, 《일리아스》의 등장인물"],
    ["아가멤논", "《일리아스》", "아가멤논, 《일리아스》의 등장인물"],
    ["오딘", "《에다 이야기》", "오딘, 《에다 이야기》의 등장인물"],
  ] as const;
  for (const [nickname, sourceTitle, expected] of sourceCases) {
    assert.equal(
      buildCelebTitleKo({
        ...input,
        nickname,
        sourceWorks: [{ title: sourceTitle, relationType: "origin" }],
      }),
      expected,
    );
  }
  assert.doesNotMatch(buildCelebTitleKo(input), /감상|추천/);
});

test("fiction without a linked source falls back to its existing title", () => {
  const input: CelebMetaInput = {
    nickname: "멤논",
    title: "에티오피아의 왕",
    tier: "fiction",
    counts: emptyCounts,
    bio: "오래된 이야기에서 선택의 대가를 보여주는 인물이다.",
    hasReading: true,
    hasConnections: true,
  };
  const ko = buildCelebDescriptionKo(input);
  const enInput = {
    ...input,
    nickname: "Memnon",
    title: "King of Ethiopia",
    bio: "A figure shaped by an old tale.",
  };
  const en = buildCelebDescriptionEn(enInput);

  assert.equal(buildCelebTitleKo(input), "에티오피아의 왕, 멤논");
  assert.equal(buildCelebTitleEn(enInput), "King of Ethiopia — Memnon");
  assert.equal(buildCelebTitleKo({ ...input, title: null }), "멤논");
  assert.match(ko, /인물 안내와 탐구/);
  assert.match(ko, /이야기 속 관계/);
  assert.doesNotMatch(ko, /영향력|스펙트럼|감상한/);
  assert.doesNotMatch(en, /influence|spectrum|recommended/i);
  assert.ok(ko.length <= 175);
  assert.ok(en.length <= 175);
});

test("headline takes priority for fiction and light profiles", () => {
  const fictionInput: CelebMetaInput = {
    nickname: "아킬레우스",
    title: "트로이 전쟁의 영웅",
    headline: "그리스군 최강의 전사",
    headline_en: "The Greatest Warrior of the Achaean Army",
    tier: "fiction",
    counts: emptyCounts,
    sourceWorks: [{ title: "《일리아스》", relationType: "origin" }],
  };

  assert.equal(buildCelebTitleKo(fictionInput), "그리스군 최강의 전사, 아킬레우스");
  assert.equal(buildCelebTitleEn(fictionInput), "The Greatest Warrior of the Achaean Army — 아킬레우스");

  const lightInput: CelebMetaInput = {
    nickname: "찰리 멍거",
    title: "투자자",
    headline: "워런 버핏의 60년 지혜이자 평생 파트너",
    headline_en: "Warren Buffett's Lifelong Partner and Mentor",
    tier: "light",
    counts: emptyCounts,
  };

  assert.equal(buildCelebTitleKo(lightInput), "워런 버핏의 60년 지혜이자 평생 파트너, 찰리 멍거");
  assert.equal(buildCelebTitleEn(lightInput), "Warren Buffett's Lifelong Partner and Mentor — 찰리 멍거");
});
