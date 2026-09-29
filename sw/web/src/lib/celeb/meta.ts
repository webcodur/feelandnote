import type { CelebTier, CelebReality } from "@feelandnote/shared/constants/celeb-tiers";

import { particleFor, withParticle, type ParticleKind } from "../korean-particle";

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
export interface CelebMetaSourceWork { title: string; relationType?: string }

export interface CelebMetaInput {
  nickname: string;
  title: string | null;
  headline?: string | null;
  headline_en?: string | null;
  counts: ContentCounts;
  tier?: CelebTier;
  /** REAL이 아니면(BOTH·FICTION) 원전·전승 중심 제목·설명을 쓴다.
   *  BOTH 인물도 실제 감상 기록이 얇아 이 문체가 더 맞는다. */
  reality?: CelebReality;
  /** 인물 안내 본문. 요청 언어로 쓰인 글만 넘긴다 — 영문 화면에 한국어 대체본을 싣지 않는다. */
  guide?: string | null;
  /** 요청 언어로 쓰인 bio만 넘긴다. */
  bio?: string | null;
  hasConnections?: boolean;
  /** 실존 light 설명문은 화면에 실제로 있는 분석만 말한다. 모르면 없다고 본다. */
  hasInfluence?: boolean;
  hasSpectrum?: boolean;
  sourceWorks?: readonly CelebMetaSourceWork[];
  /** 가장 많이 기록된 분야에서 다른 인물도 많이 감상한 순서의 작품 제목. */
  signatureWorks?: readonly string[];
}

// 합계가 이 이하이면 「책 1권」처럼 얇은 숫자를 앞세우지 않는다.
const COUNT_HIDE_THRESHOLD = 2;
const DESCRIPTION_MAX = 175;
// 검색 결과 제목 칸(PC 약 600px, 20px 글자)의 폭을 한글 한 자 = 1로 어림한 값.
// 분야 건수는 이 폭 안에 들어가는 만큼만 싣는다 — 넘친 뒤는 「…」로 잘린다.
const TITLE_WIDTH_BUDGET = 30;
const SIGNATURE_WORK_LIMIT = 3;
// 인물 안내·bio 첫 문장의 최대 길이. 이보다 긴 첫 문장은 잘라 쓴다.
const LEAD_MAX = 110;

const RECORD_TYPE_ORDER: readonly RecordType[] = ["BOOK", "VIDEO", "MUSIC", "GAME"];

const RECORD_LABEL_KO: Record<RecordType, { noun: string; unit: string; open: string; close: string }> = {
  BOOK: { noun: "책", unit: "권", open: "《", close: "》" },
  VIDEO: { noun: "영상", unit: "편", open: "〈", close: "〉" },
  MUSIC: { noun: "음악", unit: "곡", open: "〈", close: "〉" },
  GAME: { noun: "게임", unit: "개", open: "〈", close: "〉" },
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

/** 감상 기록으로 제목·설명을 세우는 인물. BOTH·FICTION은 원전 중심 문체를 쓴다. */
function leadsWithRecords(input: CelebMetaInput): boolean {
  return (input.tier ?? "full") === "full"
    && (input.reality ?? "REAL") === "REAL"
    && totalCount(input.counts) > 0;
}

function cleanSourceTitle(title: string): string {
  return title
    .trim()
    .replace(/^[《〈「『"“‘']+/, "")
    .replace(/[》〉」』"”’']+$/, "")
    .trim();
}

function primarySource(input: CelebMetaInput): string | null {
  if ((input.reality ?? "REAL") === "REAL") return null;
  const source = (input.sourceWorks ?? []).find((work) => work.relationType === "appearance");
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

function listKo(items: readonly string[]): string {
  if (items.length === 2) return `${withParticle(items[0], "with")} ${items[1]}`;
  return items.join(", ");
}

function listEn(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function clamp(text: string, limit: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= limit) return cleaned;
  const slice = cleaned.slice(0, Math.max(1, limit - 1));
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.5 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

/**
 * 첫 문장만 가져온다. 길면 limit에서 자른다.
 * 검색 요약은 한국어 90자 안팎에서 잘린다 — 둘째 문장까지 실으면 뒤에 붙는 이 페이지의 볼거리
 * (원전 속 행적·인물 관계·영향력 평가)가 화면에서 빠진다(26.09.28 아킬레우스·조 서터 예상 화면).
 */
function leadSentence(raw: string | null | undefined, limit: number): string | null {
  const cleaned = raw?.replace(/\s+/g, " ").trim();
  // 자리가 이만큼도 없으면 잘린 토막만 남으므로 싣지 않는다.
  if (!cleaned || limit < 24) return null;
  const [first] = cleaned.split(/(?<=[.!?])\s+/);
  return first.length <= limit ? endSentence(first) : clamp(first, limit);
}

/**
 * 문장 부호 없이 끝난 소개(위키데이터식 한 줄 「President of Cameroon since 1982」「미국의 영화 제작자 (1947년생)」)에
 * 마침표를 찍는다 — 뒤에 꼬리 문장이 붙으면 「… since 1982 Explore …」처럼 두 문장이 한 문장으로 읽혔다(26.09.29 전수 점검).
 */
function endSentence(text: string): string {
  return /[.!?。…"”'’」』]$/.test(text) ? text : `${text}.`;
}

/** 대표작 목록에서 표기만 다른 같은 작품(「Back In Black」「Back in Black」)을 하나로 모은다. */
function uniqueWorks(works: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  return (works ?? []).filter((work) => {
    const key = work.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 「헤라클레스 전승에 등장한다.」「A figure from the Heracles tradition.」처럼 누구에게나 붙는 첫 문장.
const BIO_BOILERPLATE = /^([^.]{0,40}에 등장한다|A figure from [^.]{1,80})\.\s*/;

function usableBio(bio: string | null | undefined): string | null {
  const cleaned = bio?.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const stripped = cleaned.replace(BIO_BOILERPLATE, "").trim();
  return stripped.length >= 8 ? stripped : null;
}

/** 머리를 두고 꼬리가 들어갈 자리만큼 줄인다. */
function composeDescription(head: string, tail: string): string {
  if (!tail) return clamp(head, DESCRIPTION_MAX);
  const combined = `${head} ${tail}`;
  if (combined.length <= DESCRIPTION_MAX) return combined;
  return `${clamp(head, Math.max(32, DESCRIPTION_MAX - tail.length - 1))} ${tail}`;
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

/**
 * 감상 기록 설명의 꼬리를 자리에 맞춘다. 대표작이 가장 값지므로 먼저 나머지 분야 건수를
 * 덜고(제목이 이미 앞 분야 건수를 싣는다), 그래도 넘치면 대표작을 하나씩 덜어 낸다.
 * 정체 문장과 첫 분야 건수는 끝까지 남긴다.
 */
function fitRecordTail(
  head: string,
  works: readonly string[],
  buildTail: (shown: readonly string[], withOtherTypes: boolean) => string,
): string {
  for (let count = works.length; count > 0; count--) {
    for (const withOtherTypes of [true, false]) {
      const tail = buildTail(works.slice(0, count), withOtherTypes);
      if (`${head} ${tail}`.length <= DESCRIPTION_MAX) return `${head} ${tail}`;
    }
  }
  return composeDescription(head, buildTail([], true));
}

function recordDescriptionKo(input: CelebMetaInput): string {
  const types = rankRecordTypes(input.counts);
  const label = RECORD_LABEL_KO[types[0]];
  const numbered = isNumbered(input.counts);
  const scopeOf = (withOtherTypes: boolean) => {
    const shownTypes = withOtherTypes ? types : types.slice(0, 1);
    return numbered
      ? shownTypes.map((type) => countKo(type, input.counts[type])).join(", ")
      : shownTypes.map((type) => RECORD_LABEL_KO[type].noun).join("·");
  };
  const works = uniqueWorks(input.signatureWorks).slice(0, SIGNATURE_WORK_LIMIT)
    .map((work) => `${label.open}${work}${label.close}`);

  return fitRecordTail(`${identityKo(input)}.`, works, (shown, withOtherTypes) => {
    const scope = scopeOf(withOtherTypes);
    if (shown.length === 0) return `${scope}${numbered ? "의" : ""} 감상 기록을 모았습니다.`;
    // 얇은 기록은 건수 대신 작품을 바로 든다 — 「《A》 등 책」은 한 권뿐일 때 틀린 말이 된다.
    return numbered
      ? `${shown.join(", ")} 등 ${scope}의 감상 기록을 모았습니다.`
      : `${shown.join(", ")}의 감상 기록을 모았습니다.`;
  });
}

function profileTailKo(input: CelebMetaInput): string {
  if ((input.reality ?? "REAL") !== "REAL") {
    const source = primarySource(input);
    const scope = source ? `《${source}》 등 원전 속 행적` : "신화와 이야기 속 행적";
    const items = input.hasConnections ? listKo([scope, "인물 관계"]) : scope;
    return `${withParticle(items, "object")} 함께 볼 수 있습니다.`;
  }
  const items = [
    input.hasInfluence && "영향력 평가",
    input.hasSpectrum && "16축 스펙트럼",
    input.hasConnections && "인물 관계",
  ].filter((item): item is string => Boolean(item));
  return items.length > 0 ? `${withParticle(listKo(items), "object")} 함께 볼 수 있습니다.` : "";
}

function profileDescriptionKo(input: CelebMetaInput): string {
  const tail = profileTailKo(input);
  const room = Math.min(LEAD_MAX, DESCRIPTION_MAX - tail.length - 1);
  // 인물 안내는 「누구는 …이다」로 시작해 이름과 정체를 함께 담는다. 없으면 이름, headline에 bio를 잇는다.
  const guide = leadSentence(input.guide, room);
  if (guide) return composeDescription(guide, tail);
  const identity = `${identityKo(input)}.`;
  const bio = leadSentence(usableBio(input.bio), Math.max(0, room - identity.length - 1));
  return composeDescription(bio ? `${identity} ${bio}` : identity, tail);
}

export function buildCelebDescriptionKo(input: CelebMetaInput): string {
  return leadsWithRecords(input) ? recordDescriptionKo(input) : profileDescriptionKo(input);
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

/** 설명문 첫 문장. 관사로 시작하는 정의는 이름 뒤 동격으로, 나머지는 쌍점으로 잇는다. */
function identitySentenceEn(input: CelebMetaInput): string {
  const headline = headlineEnOf(input);
  if (headline && /^(The|A|An) /.test(headline)) {
    return `${input.nickname}, ${headline.charAt(0).toLowerCase()}${headline.slice(1)}.`;
  }
  return `${identityEn(input)}.`;
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
  if (!leadsWithRecords(input)) return identityEn(input);
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

function recordDescriptionEn(input: CelebMetaInput): string {
  const types = rankRecordTypes(input.counts);
  const numbered = isNumbered(input.counts);
  const parts = types.map((type) => numbered
    ? `${countEn(type, input.counts[type])} ${RECORD_LABEL_EN[type].verb}`
    : `${RECORD_LABEL_EN[type].bare} ${RECORD_LABEL_EN[type].verb}`);
  const works = uniqueWorks(input.signatureWorks).slice(0, SIGNATURE_WORK_LIMIT);

  return fitRecordTail(identitySentenceEn(input), works, (shown, withOtherTypes) => {
    const including = shown.length ? `, including ${listEn(shown)}` : "";
    if (!numbered) {
      return `Records of ${listEn(withOtherTypes ? parts : parts.slice(0, 1))}${including}.`;
    }
    // 대표작은 첫 분야의 작품이므로 그 분야 바로 뒤에 붙이고, 나머지 분야는 plus로 잇는다.
    const others = withOtherTypes && parts.length > 1 ? `, plus ${listEn(parts.slice(1))}` : "";
    return `Records of ${parts[0]}${including}${others}.`;
  });
}

function profileTailEn(input: CelebMetaInput): string {
  if ((input.reality ?? "REAL") !== "REAL") {
    const source = primarySource(input);
    // 원전이 없으면 앞말이 「myth and story」로 끝나 「… and story and story relationships」가 겹쳤다 — plus로 잇는다
    if (!source) return `Explore the figure's place in myth and story${input.hasConnections ? ", plus their relationships" : ""}.`;
    return `Explore source works including ${sourceAfterPrepositionEn(source)}${input.hasConnections ? " and story relationships" : ""}.`;
  }
  const items = [
    input.hasInfluence && "influence scores",
    input.hasSpectrum && "a 16-axis spectrum",
    input.hasConnections && "connections",
  ].filter((item): item is string => Boolean(item));
  return items.length > 0 ? `Explore ${listEn(items)}.` : "";
}

function profileDescriptionEn(input: CelebMetaInput): string {
  const tail = profileTailEn(input);
  const room = Math.min(LEAD_MAX, DESCRIPTION_MAX - tail.length - 1);
  const guide = leadSentence(input.guide, room);
  if (guide) return composeDescription(guide, tail);
  const identity = identitySentenceEn(input);
  const bio = leadSentence(usableBio(input.bio), Math.max(0, room - identity.length - 1));
  return composeDescription(bio ? `${identity} ${bio}` : identity, tail);
}

export function buildCelebDescriptionEn(input: CelebMetaInput): string {
  return leadsWithRecords(input) ? recordDescriptionEn(input) : profileDescriptionEn(input);
}

export const buildCelebTitle = (input: CelebMetaInput, locale: string) => locale === "en" ? buildCelebTitleEn(input) : buildCelebTitleKo(input);

export const buildCelebDescription = (input: CelebMetaInput, locale: string) => locale === "en" ? buildCelebDescriptionEn(input) : buildCelebDescriptionKo(input);
