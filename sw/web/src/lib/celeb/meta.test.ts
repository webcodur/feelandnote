import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCelebDescriptionEn,
  buildCelebDescriptionKo,
  buildCelebTitleEn,
  buildCelebTitleKo,
  estimateTitleWidth,
  formatCelebRecordCounts,
  rankRecordTypes,
  type CelebMetaInput,
} from "./meta";

const emptyCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 };

const billGates: CelebMetaInput = {
  nickname: "빌 게이츠",
  title: "MS 설립",
  headline: "윈도우를 PC 표준으로 키운 마이크로소프트 공동창업자",
  headline_en: "The Microsoft co-founder who drove Windows to PC dominance",
  tier: "full",
  counts: { BOOK: 177, VIDEO: 13, MUSIC: 73, GAME: 5 },
  signatureWorks: ["사피엔스", "권력의 조건", "힐빌리의 노래"],
};

test("records rank by count, then by book·video·music·game", () => {
  assert.deepEqual(rankRecordTypes(billGates.counts), ["BOOK", "MUSIC", "VIDEO", "GAME"]);
  assert.deepEqual(rankRecordTypes({ ...emptyCounts, VIDEO: 2, GAME: 2 }), ["VIDEO", "GAME"]);
  assert.deepEqual(
    formatCelebRecordCounts(billGates.counts, "ko"),
    ["책 177권", "음악 73곡", "영상 13편", "게임 5개"],
  );
  assert.deepEqual(
    formatCelebRecordCounts({ ...emptyCounts, BOOK: 1, MUSIC: 1200 }, "en"),
    ["1,200 songs", "1 book"],
  );
});

test("full title puts the short title in brackets after the name, then as many record counts as fit", () => {
  assert.equal(buildCelebTitleKo(billGates), "빌 게이츠(MS 설립)가 감상한 책 177권·음악 73곡·영상 13편");
  // 조사는 괄호 앞 이름의 받침에 맞춘다.
  assert.equal(
    buildCelebTitleKo({ ...billGates, nickname: "젠슨 황", title: "엔비디아 설립", counts: { ...emptyCounts, BOOK: 5, GAME: 1 } }),
    "젠슨 황(엔비디아 설립)이 감상한 책 5권·게임 1개",
  );
  // 작품명 수식어도 딱지로 읽힌다 — 이름 앞 꾸밈말이면 「레미제라블」을 감상한 것처럼 읽혔다.
  assert.equal(
    buildCelebTitleKo({ ...billGates, nickname: "빅토르 위고", title: "「레미제라블」", counts: { ...emptyCounts, BOOK: 9, MUSIC: 3 } }),
    "빅토르 위고(「레미제라블」)가 감상한 책 9권·음악 3곡",
  );
  // 영어도 이름 뒤 괄호에 두고, 폭이 모자라면 분야를 줄인다.
  assert.equal(
    buildCelebTitleEn({ ...billGates, nickname: "Bill Gates", title: "Microsoft Founder" }),
    "Bill Gates (Microsoft Founder): 177 Books Read",
  );
  assert.equal(
    buildCelebTitleEn({ ...billGates, nickname: "Bill Gates", title: null }),
    "Bill Gates: 177 Books Read & 73 Songs Heard",
  );
  // 한국어 제목에 쉼표 토막이 없어야 Google이 한 토막만 골라 쓰지 않는다.
  assert.doesNotMatch(buildCelebTitleKo(billGates), /,/);
  // 폭을 넘기면 뒤 분야부터 뺀다. 첫 분야는 넘쳐도 남긴다.
  const longTitle = buildCelebTitleKo({ ...billGates, title: "아주 긴 수식어를 가진 인물의 칭호" });
  assert.equal(longTitle, "빌 게이츠(아주 긴 수식어를 가진 인물의 칭호)가 감상한 책 177권");
  assert.ok(estimateTitleWidth(buildCelebTitleKo(billGates)) <= 30);
});

test("thin full records keep numbers out of the title", () => {
  const input: CelebMetaInput = { ...billGates, counts: { ...emptyCounts, BOOK: 1, VIDEO: 1 } };
  assert.equal(buildCelebTitleKo(input), "빌 게이츠(MS 설립)의 책·영상 감상 기록");
  assert.equal(
    buildCelebTitleEn({ ...input, nickname: "Bill Gates", title: "Microsoft Founder" }),
    "Bill Gates (Microsoft Founder): Books Read & Videos Watched",
  );
  assert.equal(
    buildCelebDescriptionKo({ ...input, signatureWorks: ["사피엔스"] }),
    "빌 게이츠, 윈도우를 PC 표준으로 키운 마이크로소프트 공동창업자. 《사피엔스》의 감상 기록을 모았습니다.",
  );
});

test("full profile without records falls back to name and headline", () => {
  const input: CelebMetaInput = { ...billGates, counts: emptyCounts };
  assert.equal(buildCelebTitleKo(input), "빌 게이츠, 윈도우를 PC 표준으로 키운 마이크로소프트 공동창업자");
  assert.equal(buildCelebTitleKo({ ...input, headline: null }), "빌 게이츠, MS 설립");
  assert.equal(buildCelebTitleKo({ ...input, headline: null, title: null }), "빌 게이츠");
  assert.doesNotMatch(buildCelebTitleEn(input), /recommended/i);
});

test("full description names the person, signature works and every record count", () => {
  const ko = buildCelebDescriptionKo(billGates);
  assert.equal(
    ko,
    "빌 게이츠, 윈도우를 PC 표준으로 키운 마이크로소프트 공동창업자. 《사피엔스》, 《권력의 조건》, 《힐빌리의 노래》 등 책 177권, 음악 73곡, 영상 13편, 게임 5개의 감상 기록을 모았습니다.",
  );
  assert.ok(ko.length <= 175);

  const en = buildCelebDescriptionEn({
    ...billGates,
    nickname: "Bill Gates",
    signatureWorks: ["Sapiens", "Team of Rivals", "Hillbilly Elegy"],
  });
  // 영어는 길어 나머지 분야 건수를 먼저 덜고 대표작을 지킨다. 앞 두 분야 건수는 제목이 싣는다.
  assert.equal(
    en,
    "Bill Gates, the Microsoft co-founder who drove Windows to PC dominance. Records of 177 books read, including Sapiens, Team of Rivals and Hillbilly Elegy.",
  );
  assert.equal(
    buildCelebDescriptionEn({
      ...billGates,
      nickname: "Bill Gates",
      headline_en: "The Microsoft co-founder",
      signatureWorks: ["Sapiens"],
    }),
    "Bill Gates, the Microsoft co-founder. Records of 177 books read, including Sapiens, plus 73 songs heard, 13 videos watched and 5 games played.",
  );

  // 음악이 가장 많으면 대표작도 음악이고 괄호가 바뀐다.
  const singer = buildCelebDescriptionKo({
    ...billGates,
    nickname: "가수",
    counts: { ...emptyCounts, MUSIC: 40, BOOK: 3 },
    signatureWorks: ["Feeling Good"],
  });
  assert.match(singer, /〈Feeling Good〉 등 음악 40곡, 책 3권의 감상 기록/);
});

test("full description drops signature works before cutting the identity", () => {
  const input: CelebMetaInput = {
    ...billGates,
    signatureWorks: [`첫째 ${"가".repeat(36)}`, `둘째 ${"나".repeat(36)}`, `셋째 ${"다".repeat(36)}`],
  };
  const ko = buildCelebDescriptionKo(input);
  assert.ok(ko.length <= 175, `${ko.length}`);
  assert.match(ko, /^빌 게이츠, 윈도우를 PC 표준으로 키운 마이크로소프트 공동창업자\. 《첫째/);
  assert.match(ko, /《둘째/);
  assert.doesNotMatch(ko, /셋째/);
  assert.match(ko, /등 책 177권(, 음악 73곡, 영상 13편, 게임 5개)?의 감상 기록을 모았습니다\.$/);
  assert.doesNotMatch(ko, /…/);

  // 대표작이 하나도 안 들어갈 만큼 길면 작품 없이 건수로 마무리한다.
  const huge = buildCelebDescriptionKo({ ...input, signatureWorks: ["가".repeat(200)] });
  assert.equal(
    huge,
    "빌 게이츠, 윈도우를 PC 표준으로 키운 마이크로소프트 공동창업자. 책 177권, 음악 73곡, 영상 13편, 게임 5개의 감상 기록을 모았습니다.",
  );
});

test("light and myth titles lead with the name, then the headline", () => {
  const light: CelebMetaInput = {
    nickname: "찰리 멍거",
    title: "투자자",
    headline: "워런 버핏의 60년 지혜이자 평생 파트너",
    headline_en: "Warren Buffett's Lifelong Partner and Mentor",
    tier: "light",
    counts: emptyCounts,
  };
  assert.equal(buildCelebTitleKo(light), "찰리 멍거, 워런 버핏의 60년 지혜이자 평생 파트너");
  assert.equal(
    buildCelebTitleEn({ ...light, nickname: "Charlie Munger" }),
    "Charlie Munger: Warren Buffett's Lifelong Partner and Mentor",
  );
  // light는 기록이 있어도 감상 기록 제목을 쓰지 않는다 — 볼 서가가 없다.
  assert.equal(
    buildCelebTitleKo({ ...light, counts: { ...emptyCounts, BOOK: 13 } }),
    "찰리 멍거, 워런 버핏의 60년 지혜이자 평생 파트너",
  );
  assert.equal(buildCelebTitleKo({ ...light, headline: null }), "찰리 멍거, 투자자");

  const myth: CelebMetaInput = {
    nickname: "헤라클레스",
    title: "제우스의 아들",
    headline: "열두 과업을 완수한 영웅",
    tier: "light",
    reality: "FICTION",
    counts: emptyCounts,
    sourceWorks: [{ title: "《헤라클레스》", relationType: "appearance" }],
  };
  assert.equal(buildCelebTitleKo(myth), "헤라클레스, 열두 과업을 완수한 영웅");
  // 서술형 headline도 이름 뒤 동격으로 자연스럽게 붙는다.
  assert.equal(
    buildCelebTitleKo({ ...myth, nickname: "하이럼 빙엄", headline: "마추픽추 발견은 한 농부의 안내에서 시작됐다" }),
    "하이럼 빙엄, 마추픽추 발견은 한 농부의 안내에서 시작됐다",
  );
});

test("myth without headline uses its linked source, then its title", () => {
  const input: CelebMetaInput = {
    nickname: "아킬레우스",
    title: "트로이 전쟁의 영웅",
    tier: "light",
    reality: "FICTION",
    counts: emptyCounts,
    sourceWorks: [
      { title: "트로이 전쟁", relationType: "related" },
      { title: "《일리아스》", relationType: "appearance" },
    ],
  };
  assert.equal(buildCelebTitleKo(input), "아킬레우스, 《일리아스》의 등장인물");
  assert.equal(
    buildCelebTitleEn({ ...input, nickname: "Achilles", sourceWorks: [{ title: "The Iliad", relationType: "appearance" }] }),
    "Achilles in the Iliad",
  );
  assert.equal(buildCelebTitleKo({ ...input, sourceWorks: [] }), "아킬레우스, 트로이 전쟁의 영웅");
  assert.equal(buildCelebTitleKo({ ...input, sourceWorks: [], title: null }), "아킬레우스");
  assert.doesNotMatch(buildCelebTitleKo(input), /감상|추천/);
});

test("myth description opens with the figure guide and the linked source", () => {
  const input: CelebMetaInput = {
    nickname: "헤라클레스",
    title: "제우스의 아들",
    headline: "열두 과업을 완수한 영웅",
    tier: "light",
    reality: "FICTION",
    counts: emptyCounts,
    guide: "헤라클레스는 그리스 신화에서 제우스와 인간 여인 알크메네 사이에 태어난 영웅이다. 헤라는 남편이 다른 여인에게서 얻은 이 아들을 미워해 그에게 광기를 씌웠고, 헤라클레스는 제정신이 아닌 채로 아내 메가라가 낳은 자식들을 죽였다.",
    bio: "헤라클레스 전승에 등장한다. 제우스의 아들, 열두 과제의 수행자.",
    hasConnections: true,
    sourceWorks: [{ title: "《헤라클레스》", relationType: "appearance" }],
  };
  assert.equal(
    buildCelebDescriptionKo(input),
    "헤라클레스는 그리스 신화에서 제우스와 인간 여인 알크메네 사이에 태어난 영웅이다. 《헤라클레스》 등 원전 속 행적과 인물 관계를 함께 볼 수 있습니다.",
  );
  // 둘째 문장이 자리에 들어가도 싣지 않는다 — 요약이 잘릴 때 뒤의 볼거리가 먼저 빠진다.
  assert.equal(
    buildCelebDescriptionKo({
      ...input,
      nickname: "아킬레우스",
      guide: "아킬레우스는 호메로스의 《일리아스》에서 아카이아군 최강으로 묘사되는 전사이다. 그는 전투에서 물러난다.",
      sourceWorks: [{ title: "《일리아스》", relationType: "appearance" }],
    }),
    "아킬레우스는 호메로스의 《일리아스》에서 아카이아군 최강으로 묘사되는 전사이다. 《일리아스》 등 원전 속 행적과 인물 관계를 함께 볼 수 있습니다.",
  );

  // 인물 안내가 없으면 이름, headline 뒤에 bio를 잇되 누구에게나 붙는 첫 문장은 건너뛴다.
  const withoutGuide = buildCelebDescriptionKo({ ...input, guide: null, hasConnections: false });
  assert.equal(
    withoutGuide,
    "헤라클레스, 열두 과업을 완수한 영웅. 제우스의 아들, 열두 과제의 수행자. 《헤라클레스》 등 원전 속 행적을 함께 볼 수 있습니다.",
  );
  assert.doesNotMatch(withoutGuide, /전승에 등장한다/);

  const en = buildCelebDescriptionEn({
    ...input,
    nickname: "Heracles",
    headline_en: "The hero who completed the twelve labors",
    guide: null,
    bio: "A figure from the Heracles tradition. Son of Zeus, performer of the twelve labors.",
    sourceWorks: [{ title: "Heracles", relationType: "appearance" }],
  });
  assert.equal(
    en,
    "Heracles, the hero who completed the twelve labors. Son of Zeus, performer of the twelve labors. Explore source works including Heracles and story relationships.",
  );
  assert.doesNotMatch(en, /influence|spectrum|recommended/i);
});

test("real light description only names the analyses the page has", () => {
  const input: CelebMetaInput = {
    nickname: "곽가",
    title: "군사좨주",
    headline: "손책의 피살을 예견한 조조의 책사",
    tier: "light",
    counts: emptyCounts,
    bio: "후한 말 조조의 책사. 여러 원정의 방향을 정했다.",
  };
  assert.equal(
    buildCelebDescriptionKo({ ...input, hasInfluence: true, hasSpectrum: true, hasConnections: true }),
    "곽가, 손책의 피살을 예견한 조조의 책사. 후한 말 조조의 책사. 영향력 평가, 16축 스펙트럼, 인물 관계를 함께 볼 수 있습니다.",
  );
  assert.match(buildCelebDescriptionKo({ ...input, hasInfluence: true, hasSpectrum: true }), /영향력 평가와 16축 스펙트럼을 함께/);
  const bare = buildCelebDescriptionKo(input);
  assert.doesNotMatch(bare, /영향력|스펙트럼|함께 볼/);
  assert.match(
    buildCelebDescriptionEn({ ...input, nickname: "Guo Jia", headline_en: "Cao Cao's strategist", bio: null, hasSpectrum: true }),
    /^Guo Jia: Cao Cao's strategist\. Explore a 16-axis spectrum\.$/,
  );
});

test("descriptions stay within the meta description budget", () => {
  const longGuide = "가".repeat(60) + "다. " + "나".repeat(200) + "다.";
  const ko = buildCelebDescriptionKo({
    nickname: "긴 인물",
    title: null,
    headline: "긴 정의",
    tier: "light",
    reality: "FICTION",
    counts: emptyCounts,
    guide: longGuide,
    hasConnections: true,
  });
  assert.ok(ko.length <= 175, `${ko.length}`);
  assert.match(ko, /^가{60}다\. 신화와 이야기 속 행적과 인물 관계를 함께 볼 수 있습니다\.$/);
});

test("a bio line without end punctuation gets a period before the tail", () => {
  const input: CelebMetaInput = {
    nickname: "Paul Biya",
    title: null,
    headline_en: "World's oldest head of state, now serving an eighth term",
    tier: "light",
    counts: emptyCounts,
    bio: "President of Cameroon since 1982",
    hasInfluence: true,
  };
  assert.equal(
    buildCelebDescriptionEn(input),
    "Paul Biya: World's oldest head of state, now serving an eighth term. President of Cameroon since 1982. Explore influence scores.",
  );
  assert.match(
    buildCelebDescriptionKo({ ...input, nickname: "닉 캐슬", headline: "《할로윈》에서 마이클 마이어스를 처음 입은 배우", bio: "미국의 영화 제작자 (1947년생)" }),
    /\(1947년생\)\. 영향력 평가를/,
  );
});

test("a myth figure without a source work does not repeat 'story'", () => {
  const en = buildCelebDescriptionEn({
    nickname: "Dinga Cissé",
    title: null,
    headline_en: "The Soninke patriarch who faced down a well spirit",
    tier: "light",
    reality: "FICTION",
    counts: emptyCounts,
    hasConnections: true,
  });
  assert.match(en, /Explore the figure's place in myth and story, plus their relationships\.$/);
  assert.doesNotMatch(en, /story and story/);
});

test("signature works spelled differently are listed once", () => {
  const en = buildCelebDescriptionEn({
    nickname: "John Fetterman",
    title: null,
    headline_en: "The blue-collar populist who brought Carhartt and shorts to the US Senate",
    tier: "full",
    counts: { ...emptyCounts, MUSIC: 2 },
    signatureWorks: ["Back In Black", "Back in Black"],
  });
  assert.match(en, /including Back In Black\.$/);
});
