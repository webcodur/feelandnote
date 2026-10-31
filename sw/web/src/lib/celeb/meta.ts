import { particleFor, type ParticleKind } from "../korean-particle";

/* ─────────────────────────────────────────────
 * 인물 상세의 검색 제목·설명문
 *
 * Google은 <title>이 길거나 틀에 박혀 있으면 화면에서 크게 보이는 다른 문구로 제목을
 * 바꿔 쓴다. headline을 제목 앞에 두던 때 검색 결과에 headline만 떠 이름이 빠졌다.
 * 그래서 세 가지를 지킨다.
 * 1. 이름을 맨 앞에 둔다 — 뒤가 잘려도 남는다. 감상 기록 제목은 이름 뒤 괄호에 수식어를 붙여
 *    이름만으로 모를 인물이 누군지 알린다(「빌 게이츠(MS 설립)가 감상한 …」).
 * 2. 쉼표로 여러 토막을 내지 않는다 — 토막 하나만 골라 쓰기 쉬워진다.
 * 3. 제목의 말을 화면 머리에서도 보이게 한다 — 수식어·이름(h1)·headline·건수 줄(HeroIdentity).
 * 인물 상세 제목에는 브랜드 접미사를 붙이지 않는다(celebPageMetadata.ts의 title.absolute).
 * 그 폭을 수식어와 건수에 쓴다.
 * ───────────────────────────────────────────── */

export type RecordType = "BOOK" | "VIDEO" | "MUSIC" | "GAME";
export interface ContentCounts { BOOK: number; VIDEO: number; GAME: number; MUSIC: number }
export interface CelebMetaSourceWork {
  title: string;
  relationType?: string;
  /** 원전다움 — 작을수록 앞선다(rankSourceWork). 없으면 목록 차례만 본다 */
  sourceRank?: number;
}

/**
 * 원전으로 부를 만한 작품인지 등급을 매긴다. 등장 작품의 첫 줄을 원전으로 부르던 때 제우스의 원전이
 * 요즘 나온 교양서(《기묘한 세계사의 미스터리》)가 됐다(26.09.29). 위키데이터 작품 식별자가 있는 고전이 먼저,
 * 원제·원저자가 기록된 번역본이 다음, 다시 쓴 책(retelling)과 ISBN으로만 식별되는 요즘 책이 맨 뒤다.
 */
export function rankSourceWork(work: {
  wikidataQid?: string | null;
  originalTitle?: string | null;
  originalCreator?: string | null;
  editionKind?: string | null;
  workIdentity?: string | null;
}): number {
  const modern = work.editionKind === "retelling" || (work.workIdentity ?? "").startsWith("book/");
  if (work.wikidataQid && !modern) return 0;
  if ((work.originalTitle || work.originalCreator) && !modern) return 1;
  return modern ? 3 : 2;
}

export interface CelebMetaInput {
  nickname: string;
  title: string | null;
  headline?: string | null;
  headline_en?: string | null;
  counts: ContentCounts;
  /** 요청 언어의 소개 전문. 다른 언어의 대체값은 조립부에서 제외한다. */
  bio?: string | null;
  /** 소개가 없을 때만 사용하는 요청 언어의 인물 안내 전문. */
  guide?: string | null;
  /** headline도 없을 때 제목의 신원을 보완하는 등장 작품. */
  sourceWorks?: readonly CelebMetaSourceWork[];
}

// 합계가 이 이하이면 「책 1권」처럼 얇은 숫자를 앞세우지 않는다.
const COUNT_HIDE_THRESHOLD = 2;
// 검색 결과 제목 칸(PC 약 600px, 20px 글자)의 폭을 한글 한 자 = 1로 어림한 값.
// 분야 건수는 이 폭 안에 들어가는 만큼만 싣는다 — 넘친 뒤는 「…」로 잘린다.
const TITLE_WIDTH_BUDGET = 30;
// 영어 제목이 검색 결과 한 줄(PC 600px)에 드는 글자 수 어림. 64자짜리(Dido: …)는 한 줄에 들었고 76자짜리는 잘렸다(26.09.29 예상 화면)
const EN_TITLE_MAX_CHARS = 64;

const RECORD_TYPE_ORDER: readonly RecordType[] = ["BOOK", "VIDEO", "MUSIC", "GAME"];

const RECORD_LABEL_KO: Record<RecordType, { noun: string; unit: string }> = {
  BOOK: { noun: "책", unit: "권" },
  VIDEO: { noun: "영상", unit: "편" },
  MUSIC: { noun: "음악", unit: "곡" },
  GAME: { noun: "게임", unit: "개" },
};

const RECORD_LABEL_EN: Record<RecordType, { one: string; many: string; bare: string; verb: string }> = {
  BOOK: { one: "book", many: "books", bare: "books", verb: "read" },
  VIDEO: { one: "video", many: "videos", bare: "videos", verb: "watched" },
  MUSIC: { one: "song", many: "songs", bare: "music", verb: "heard" },
  GAME: { one: "game", many: "games", bare: "games", verb: "played" },
};

const totalCount = (counts: ContentCounts) => counts.BOOK + counts.VIDEO + counts.MUSIC + counts.GAME;
const isNumbered = (counts: ContentCounts) => totalCount(counts) > COUNT_HIDE_THRESHOLD;
const formatNumber = (value: number) => value.toLocaleString("en-US");
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** 기록이 있는 분야를 건수 많은 순으로. 같으면 책·영상·음악·게임 순. */
export function rankRecordTypes(counts: ContentCounts): RecordType[] {
  return RECORD_TYPE_ORDER
    .filter((type) => counts[type] > 0)
    .sort((a, b) => counts[b] - counts[a] || RECORD_TYPE_ORDER.indexOf(a) - RECORD_TYPE_ORDER.indexOf(b));
}

const countKo = (type: RecordType, count: number) =>
  `${RECORD_LABEL_KO[type].noun} ${formatNumber(count)}${RECORD_LABEL_KO[type].unit}`;

const countEn = (type: RecordType, count: number) =>
  `${formatNumber(count)} ${count === 1 ? RECORD_LABEL_EN[type].one : RECORD_LABEL_EN[type].many}`;

/** 머리 영역 건수 줄. 제목과 같은 낱말·순서를 쓴다 — 예: 「책 177권」, 「177 books」. */
export function formatCelebRecordCounts(counts: ContentCounts, locale: string): string[] {
  return rankRecordTypes(counts).map((type) =>
    locale === "en" ? countEn(type, counts[type]) : countKo(type, counts[type]),
  );
}

/** 감상 기록 유무만 제목을 가른다. 티어·실존 분류는 사용하지 않는다. */
function leadsWithRecords(input: CelebMetaInput): boolean {
  return totalCount(input.counts) > 0;
}

function cleanSourceTitle(title: string): string {
  return title
    .trim()
    .replace(/^[《〈「『"“‘']+/, "")
    .replace(/[》〉」』"”’']+$/, "")
    .trim();
}

function primarySource(input: CelebMetaInput): string | null {
  const source = (input.sourceWorks ?? [])
    .map((work, index) => ({ work, index }))
    .filter(({ work }) => work.relationType === "appearance" && work.title?.trim())
    .sort((a, b) => (a.work.sourceRank ?? 2) - (b.work.sourceRank ?? 2) || a.index - b.index)[0]?.work;
  return source?.title ? cleanSourceTitle(source.title) : null;
}

const sourceAfterPrepositionEn = (title: string) => /^The /.test(title) ? `the ${title.slice(4)}`
  : /^(Iliad|Odyssey|Argonautica|Mahabharata|Ramayana|Theogony|Investiture of the Gods)$/.test(title) ? `the ${title}` : title;

/** 제목 폭 어림. 로마자·숫자는 한글의 절반 남짓, 띄어쓰기·문장부호는 1/3 정도다. */
export function estimateTitleWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    if (/[A-Za-z0-9]/.test(char)) width += 0.55;
    else if (/[\s.,:;·&'’()-]/.test(char)) width += 0.3;
    else width += 1;
  }
  return width;
}

/** 분야를 하나씩 늘려 가며 제목 폭 안에 드는 가장 긴 제목을 고른다. 첫 분야는 넘쳐도 싣는다. */
function fitTitle(build: (typeCount: number) => string, typeTotal: number): string {
  let fitted = build(1);
  for (let typeCount = 2; typeCount <= typeTotal; typeCount++) {
    const candidate = build(typeCount);
    if (estimateTitleWidth(candidate) > TITLE_WIDTH_BUDGET) break;
    fitted = candidate;
  }
  return fitted;
}

function endSentence(text: string): string {
  return /[.!?。…"”'’」』]$/.test(text) ? text : `${text}.`;
}

function biographyDescription(input: CelebMetaInput, identity: string): string {
  const text = input.bio?.replace(/\s+/g, " ").trim()
    || input.guide?.replace(/\s+/g, " ").trim()
    || identity;
  return endSentence(text);
}

/* ── 한국어 ── */

/** 이름, headline — 화면 머리의 h1과 한 줄 정의를 그대로 잇는다. */
function identityKo(input: CelebMetaInput): string {
  const headline = input.headline?.trim();
  if (headline) return `${input.nickname}, ${headline}`;
  const source = primarySource(input);
  if (source) return `${input.nickname}, 《${source}》의 등장인물`;
  const title = input.title?.trim();
  return title ? `${input.nickname}, ${title}` : input.nickname;
}

/**
 * 이름(수식어) — 수식어는 화면에서 이름 위에 얹는 딱지라 문장 속 꾸밈말로 두면 어색하거나
 * 뜻이 갈린다(「MS 설립 빌 게이츠가」, 「「레미제라블」 빅토르 위고가 감상한」). 괄호로 딱지임을
 * 드러내고 조사는 괄호 앞 이름에 맞춘다(빌 게이츠(MS 설립)가). 동명이인도 갈린다(레이(아이브)).
 */
function namedKo(input: CelebMetaInput, kind?: ParticleKind): string {
  const title = input.title?.trim();
  const particle = kind ? particleFor(input.nickname, kind) : "";
  return title ? `${input.nickname}(${title})${particle}` : `${input.nickname}${particle}`;
}

export function buildCelebTitleKo(input: CelebMetaInput): string {
  if (!leadsWithRecords(input)) return identityKo(input);
  const types = rankRecordTypes(input.counts);
  // 이름만으로는 누군지 모를 인물이 대부분이다 — 수식어가 검색 결과에서 정체를 알린다.
  if (!isNumbered(input.counts)) {
    return `${namedKo(input)}의 ${types.map((type) => RECORD_LABEL_KO[type].noun).join("·")} 감상 기록`;
  }
  return fitTitle(
    (typeCount) => `${namedKo(input, "subject")} 감상한 ${types.slice(0, typeCount)
      .map((type) => countKo(type, input.counts[type])).join("·")}`,
    types.length,
  );
}

/** 분류·감상 유무와 관계없이 소개 전문을 제공한다. 표시 길이는 검색엔진이 정한다. */
export function buildCelebDescriptionKo(input: CelebMetaInput): string {
  return biographyDescription(input, identityKo(input));
}

/* ── 영어 ── */

const headlineEnOf = (input: CelebMetaInput) => (input.headline_en || input.headline)?.trim() || null;

function identityEn(input: CelebMetaInput): string {
  const headline = headlineEnOf(input);
  if (headline) return `${input.nickname}: ${headline}`;
  const source = primarySource(input);
  if (source) return `${input.nickname} in ${sourceAfterPrepositionEn(source)}`;
  const title = input.title?.trim();
  return title ? `${input.nickname}: ${title}` : input.nickname;
}

/** 영어도 수식어를 이름 뒤 괄호에 둔다 — 「Information Theory」「Les Misérables」처럼 동격으로 읽히지 않는 값이 있다. */
function namedEn(input: CelebMetaInput): string {
  const title = input.title?.trim();
  return title ? `${input.nickname} (${title})` : input.nickname;
}

const joinTitleEn = (parts: readonly string[]) => parts.length <= 2
  ? parts.join(" & ")
  : `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;

export function buildCelebTitleEn(input: CelebMetaInput): string {
  if (!leadsWithRecords(input)) {
    // 영어 한 줄 정의는 한국어보다 길어 「Name: headline」이 검색 결과 한 줄을 넘기 쉽다
    // (「Sugar Ray Robinson: The boxer for whom the phrase pound-for-pound was coined」). 넘치면 짧은 수식어로 쓴다
    const identity = identityEn(input);
    const title = input.title?.trim();
    const short = title ? `${input.nickname}: ${title}` : null;
    return short && identity.length > EN_TITLE_MAX_CHARS && short.length < identity.length ? short : identity;
  }
  const types = rankRecordTypes(input.counts);
  const subject = namedEn(input);
  const numbered = isNumbered(input.counts);
  // 얇은 기록은 숫자 없이 「Books Read」만 쓴다. 숫자형과 같은 틀이라 한 규칙으로 읽힌다.
  const parts = types.map((type) => {
    const count = input.counts[type];
    const label = RECORD_LABEL_EN[type];
    const noun = numbered ? `${formatNumber(count)} ${capitalize(count === 1 ? label.one : label.many)}` : capitalize(label.bare);
    return `${noun} ${capitalize(label.verb)}`;
  });
  return fitTitle((typeCount) => `${subject}: ${joinTitleEn(parts.slice(0, typeCount))}`, parts.length);
}

export function buildCelebDescriptionEn(input: CelebMetaInput): string {
  return biographyDescription(input, identityEn(input));
}

export const buildCelebTitle = (input: CelebMetaInput, locale: string) => locale === "en" ? buildCelebTitleEn(input) : buildCelebTitleKo(input);
export const buildCelebDescription = (input: CelebMetaInput, locale: string) => locale === "en" ? buildCelebDescriptionEn(input) : buildCelebDescriptionKo(input);
