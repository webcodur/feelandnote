import type { CelebTier } from "@feelandnote/shared/constants/celeb-tiers";

export interface ContentCounts { BOOK: number; VIDEO: number; GAME: number; MUSIC: number }
export interface CelebMetaSourceWork { title: string; relationType?: string }

export interface CelebMetaInput {
  nickname: string;
  title: string | null;
  headline?: string | null;
  headline_en?: string | null;
  counts: ContentCounts;
  tier?: CelebTier;
  quote?: string | null;
  bio?: string | null;
  hasReading?: boolean;
  hasConnections?: boolean;
  sourceWorks?: readonly CelebMetaSourceWork[];
}

const COUNT_HIDE_THRESHOLD = 2;
const DESCRIPTION_MAX = 175;
const QUOTE_MAX = { ko: 90, en: 170 } as const;
const totalCount = (counts: ContentCounts) => counts.BOOK + counts.VIDEO + counts.MUSIC + counts.GAME;

function subjectParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "이";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

function cleanSourceTitle(title: string): string {
  return title
    .trim()
    .replace(/^[《〈「『"“‘']+/, "")
    .replace(/[》〉」』"”’']+$/, "")
    .trim();
}

function primarySource(input: CelebMetaInput): string | null {
  const works = input.sourceWorks ?? [];
  const source = works.find((work) => work.relationType === "origin") ?? works[0];
  return source?.title ? cleanSourceTitle(source.title) : null;
}
const sourceAfterPrepositionEn = (title: string) => /^The /.test(title) ? `the ${title.slice(4)}`
  : /^(Iliad|Odyssey|Argonautica|Mahabharata|Ramayana|Theogony|Investiture of the Gods)$/.test(title) ? `the ${title}` : title;

function titleLabel(input: CelebMetaInput): string {
  const title = input.title?.trim();
  return title ? `${title} — ${input.nickname}` : input.nickname;
}

function sanitizeQuote(raw: string | null | undefined, locale: "ko" | "en"): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["“”'‘’「『]+/, "")
    .replace(/["“”'‘’」』]+$/, "")
    .trim();
  if (/^\[[\s\S]*\]$/.test(cleaned)) return null;
  if (cleaned.length < 8 || cleaned.length > QUOTE_MAX[locale]) return null;
  return cleaned;
}

function clamp(text: string, limit = DESCRIPTION_MAX): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= limit) return cleaned;
  const slice = cleaned.slice(0, Math.max(1, limit - 1)); const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.5 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}
function firstSentence(raw: string | null | undefined, limit = 92): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const stops = [". ", "! ", "? "].map((marker) => cleaned.indexOf(marker)).filter((index) => index >= 8);
  if (stops.length > 0) return cleaned.slice(0, Math.min(...stops) + 1);
  if (cleaned.length <= limit) return cleaned;
  return clamp(cleaned, limit);
}

function composeDescription(head: string, tail: string): string {
  const combined = `${head} ${tail}`.replace(/\s+/g, " ").trim();
  if (combined.length <= DESCRIPTION_MAX) return combined;
  const headLimit = Math.max(32, DESCRIPTION_MAX - tail.length - 1);
  return `${clamp(head, headLimit)} ${tail}`;
}

const identityKo = (input: CelebMetaInput) =>
  `${input.title ?? ""} ${input.nickname}`.replace(/\s+/g, " ").trim();

function countPartsKo(counts: ContentCounts): string[] {
  const numbered = totalCount(counts) > COUNT_HIDE_THRESHOLD;
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(numbered ? `감상한 책 ${counts.BOOK}권` : "감상한 책");
  if (counts.VIDEO > 0) parts.push(numbered ? `본 영상 ${counts.VIDEO}편` : "본 영상");
  if (counts.MUSIC > 0) parts.push(numbered ? `들은 음악 ${counts.MUSIC}곡` : "들은 음악");
  if (counts.GAME > 0) parts.push(numbered ? `즐긴 게임 ${counts.GAME}개` : "즐긴 게임");
  return parts;
}

export function buildCelebTitleKo(input: CelebMetaInput): string {
  const tier = input.tier ?? "full";
  const headline = input.headline?.trim();
  if (tier === "fiction") {
    if (headline) return `${headline} — ${input.nickname}`;
    const source = primarySource(input);
    return source
      ? `${input.nickname}, 《${source}》의 등장인물`
      : titleLabel(input);
  }
  if (tier === "light") {
    if (headline) return `${headline} — ${input.nickname}`;
    return titleLabel(input);
  }
  const records = countPartsKo(input.counts);
  if (records.length > 0) {
    return `${identityKo(input)}${subjectParticle(input.nickname)} ${records.join(", ")}`;
  }
  if (headline) return `${headline} — ${input.nickname}`;
  return `${identityKo(input)}: 인물 정보와 기록`;
}

function descriptionHeadKo(input: CelebMetaInput): string {
  if ((input.tier ?? "full") === "full") {
    const quote = sanitizeQuote(input.quote, "ko");
    if (quote) return `“${quote}” ${identityKo(input)}.`;
  }
  const headline = input.headline?.trim();
  const intro = firstSentence(input.bio);
  if (headline) {
    return intro ? `${headline} ${input.nickname}. ${intro}` : `${headline} ${input.nickname}.`;
  }
  return intro ? `${identityKo(input)}. ${intro}` : `${identityKo(input)}의 인물 정보.`;
}

export function buildCelebDescriptionKo(input: CelebMetaInput): string {
  const tier = input.tier ?? "full";
  if (tier === "fiction") {
    const source = primarySource(input);
    const parts = [source ? `《${source}》 등 원전과 등장 작품` : "신화와 이야기 속 행적"];
    if (input.hasReading) parts.push("인물 안내와 탐구");
    if (input.hasConnections) parts.push("이야기 속 관계");
    return composeDescription(descriptionHeadKo(input), `${parts.join(", ")}까지 살펴보세요.`);
  }
  if (tier === "light") {
    const parts = ["영향력 평가와 16축 스펙트럼"];
    if (input.hasReading) parts.push("인물 안내와 탐구");
    if (input.hasConnections) parts.push("인물 관계");
    return composeDescription(descriptionHeadKo(input), `${parts.join(", ")}까지 살펴보세요.`);
  }
  const parts = countPartsKo(input.counts);
  if (input.hasReading) parts.push("인물 안내와 탐구");
  if (input.hasConnections) parts.push("인물 관계");
  const tail = parts.length > 0 ? `${parts.join(", ")}까지 한 페이지에서 살펴보세요.`
    : "소개와 인물 기록을 한 페이지에서 살펴보세요.";
  return composeDescription(descriptionHeadKo(input), tail);
}

const identityEn = (input: CelebMetaInput) =>
  input.title ? `${input.nickname}, ${input.title}` : input.nickname;

function countPartsEn(counts: ContentCounts): string[] {
  const numbered = totalCount(counts) > COUNT_HIDE_THRESHOLD;
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(numbered ? `${counts.BOOK} books read` : "books read");
  if (counts.VIDEO > 0) parts.push(numbered ? `${counts.VIDEO} videos watched` : "videos watched");
  if (counts.MUSIC > 0) parts.push(numbered ? `${counts.MUSIC} songs heard` : "music heard");
  if (counts.GAME > 0) parts.push(numbered ? `${counts.GAME} games played` : "games played");
  return parts;
}

export function buildCelebTitleEn(input: CelebMetaInput): string {
  const tier = input.tier ?? "full";
  const headlineEn = (input.headline_en || input.headline)?.trim();
  if (tier === "fiction") {
    if (headlineEn) return `${headlineEn} — ${input.nickname}`;
    const source = primarySource(input);
    return source ? `${input.nickname} in ${sourceAfterPrepositionEn(source)}` : titleLabel(input);
  }
  if (tier === "light") {
    if (headlineEn) return `${headlineEn} — ${input.nickname}`;
    return titleLabel(input);
  }
  const records = countPartsEn(input.counts);
  if (records.length > 0) {
    return `${identityEn(input)}: ${records.join(", ")}`;
  }
  if (headlineEn) return `${headlineEn} — ${input.nickname}`;
  return `${identityEn(input)}: Biography & Records`;
}

function descriptionHeadEn(input: CelebMetaInput): string {
  if ((input.tier ?? "full") === "full") {
    const quote = sanitizeQuote(input.quote, "en");
    if (quote) return `“${quote}” ${identityEn(input)}.`;
  }
  const headlineEn = (input.headline_en || input.headline)?.trim();
  const intro = firstSentence(input.bio);
  if (headlineEn) {
    return intro ? `${headlineEn} ${input.nickname}. ${intro}` : `A profile of ${headlineEn} ${input.nickname}.`;
  }
  return intro ? `${identityEn(input)}. ${intro}` : `A profile of ${identityEn(input)}.`;
}

export function buildCelebDescriptionEn(input: CelebMetaInput): string {
  const tier = input.tier ?? "full";
  const parts: string[] = [];
  if (tier === "fiction") {
    const source = primarySource(input);
    parts.push(source ? `source works including ${sourceAfterPrepositionEn(source)}` : "the figure's place in myth and story");
    if (input.hasReading) parts.push("a character guide");
    if (input.hasConnections) parts.push("story relationships");
  } else if (tier === "light") {
    parts.push("influence scores", "a 16-axis spectrum");
    if (input.hasReading) parts.push("a figure guide");
    if (input.hasConnections) parts.push("connections");
  } else {
    parts.push(...countPartsEn(input.counts));
    if (input.hasReading) parts.push("a figure guide");
    if (input.hasConnections) parts.push("connections");
    if (parts.length === 0) parts.push("a biography and figure records");
  }
  return composeDescription(descriptionHeadEn(input), `Explore ${parts.join(", ")}.`);
}

export const buildCelebTitle = (input: CelebMetaInput, locale: string) => locale === "en" ? buildCelebTitleEn(input) : buildCelebTitleKo(input);

export const buildCelebDescription = (input: CelebMetaInput, locale: string) => locale === "en" ? buildCelebDescriptionEn(input) : buildCelebDescriptionKo(input);
