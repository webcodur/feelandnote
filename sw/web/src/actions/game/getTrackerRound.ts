/*
  파일명: actions/game/getTrackerRound.ts
  기능: 미궁(인물등용) 게임 라운드 데이터 조회
  책임: 랜덤 셀럽 1명(등용 대상) + 페르소나 + 콘텐츠 + 현자 5명 일괄 조회
*/
"use server";

import { unstable_cache } from "next/cache";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { getLocale } from "next-intl/server";
import { getCountryNameAsync } from "@/lib/countries";
import type { Tables } from "@/types/supabase";
import type { DialogueLines } from "@/lib/game/voice/types";

export interface TrackerContent {
  id: string;
  title: string;
  creator: string | null;
  thumbnailUrl: string | null;
  type: string;
  review: string;
  /** 마스킹 전 원본 리뷰 (결과 화면용) */
  rawReview: string;
  sourceUrl: string | null;
}

export interface TrackerOption {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  speechTone?: string | null;
  dialogueLines?: DialogueLines | null;
  hasVoice?: boolean;
  voiceV?: number;
  voiceSpeed?: number;
}

// fallback 경로 profiles 조회 행 — 본문(여정·소개)은 선정된 1명만 별도 수신
type FallbackCelebRow = Pick<
  Tables<"profiles">,
  | "id" | "slug" | "nickname" | "nickname_en" | "profession" | "avatar_url"
  | "death_date" | "nationality" | "birth_date"
>;

// 오답 보기 profiles 조회 행
type DistractorRow = Pick<
  Tables<"profiles">,
  "id" | "nickname" | "nickname_en" | "avatar_url" | "profession" | "nationality" | "birth_date" | "death_date"
>;

// 옵션 인물 톤·음성 조회 행
type ToneRow = Pick<Tables<"profiles">, "id" | "speech_tone" | "has_voice" | "voice_v" | "voice_speed">;

// 리뷰 콘텐츠 user_contents 조회 행
type TrackerUcRow = Pick<Tables<"user_contents">, "content_id" | "review" | "review_en" | "source_url">;

// contents(content_locales) 조회 행
interface TrackerContentRow {
  id: string;
  type: string | null;
  content_locales: { locale: string; title: string | null; creator: string | null; thumbnail_url: string | null }[] | null;
}

// celeb_dialogues lines 조회 행
interface TrackerDialogueRow {
  celeb_id: string;
  lines: DialogueLines;
  lines_en: DialogueLines | null;
}

interface TrackerPersona {
  // 능력 (0~100)
  command: number;
  martial: number;
  intellect: number;
  charm: number;
  // 덕목 (0~100)
  temperance: number;
  diligence: number;
  reflection: number;
  courage: number;
  loyalty: number;
  benevolence: number;
  fairness: number;
  humility: number;
  // 성향 (-50~+50)
  pessimism_optimism: number;
  conservative_progressive: number;
  individual_social: number;
  cautious_bold: number;
}

export interface TrackerRound {
  celebId: string;
  celebSlug: string | null;
  nickname: string;
  profession: string;
  avatarUrl: string | null;
  nationality: string | null;
  birthDate: string | null;
  deathDate: string | null;
  nationalityLabel: string | null;
  bio: string | null;
  quotes: string | null;
  culturalJourney: string | null;
  persona: TrackerPersona;
  contents: TrackerContent[];
  options: TrackerOption[];
}

// 셀럽 이름을 블러 치환 (보호 단어 지정: 작품명, 작가명 등을 마스킹에서 제외)
function censorName(text: string, nickname: string, safeWords: string[] = []): string {
  if (!text || !nickname) return text;

  // 1. 보호 단어를 임시 플레이스홀더로 치환
  let result = text;
  const placeholders: string[] = [];
  
  // 긴 단어부터 치환하기 위해 길이순 정렬
  const sortedSafeWords = [...safeWords]
    .filter((word) => word && word.trim().length > 0)
    .sort((a, b) => b.length - a.length);

  sortedSafeWords.forEach((word, index) => {
    // word가 정규식 특수문자를 포함할 수 있으므로 escape
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const placeholder = `__SAFE_WORD_${index}__`;
    placeholders.push(word);
    result = result.replace(new RegExp(escapedWord, "gi"), placeholder);
  });

  // 2. 닉네임 블라인드 처리
  const escaped = nickname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  result = result.replace(new RegExp(escaped, "gi"), "■■■");

  // 토큰별 치환 (성/이름 부분일치)
  const tokens = nickname.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (token.length >= 2) {
      // 2글자 이상: 앞쪽에 한글이나 영문/숫자가 없는 경우에만 치환 (부정형 후방 탐색 방어)
      const regexStr = `(?<![가-힣ㄱ-ㅎa-zA-Z0-9_])${esc}`;
      result = result.replace(new RegExp(regexStr, "gi"), "■■■");
    } else {
      // 1글자: 뒤에 조사/공백이 따라올 때만 치환 (기존 오탐 방지)
      result = result.replace(new RegExp(esc + "(?=[은는이가의를을에]|\\s|$)", "g"), "■■■");
    }
  }

  // 3. 임시 플레이스홀더를 원래 보호 단어로 복구
  placeholders.forEach((word, index) => {
    const placeholder = `__SAFE_WORD_${index}__`;
    result = result.replace(new RegExp(placeholder, "g"), word);
  });

  return result;
}

/** next-intl 로케일 기반 한국어 우선 여부 판별 */
async function isKoreanLocale(): Promise<boolean> {
  try {
    const locale = await getLocale();
    return locale === "ko";
  } catch {
    return true;
  }
}

// 등용 후보 전체 조회 캐시 — exclude 필터·랜덤 선택은 캐시 밖에서 수행 (라운드 고정 방지)
const getCachedTrackerCandidates = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    // 자격 있는 셀럽 목록 조회 (퍼블릭 도메인 + persona + review 있는 콘텐츠 + cultural journey)
    const { data, error } = await supabase.rpc("get_tracker_candidates", {
      exclude_ids: [],
    });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["tracker-candidates"],
  { revalidate: STATIC_REVALIDATE, tags: ["celebs"] }
);

export async function getTrackerRound(
  excludeIds: string[] = []
): Promise<TrackerRound | null> {
  const safeIds = Array.isArray(excludeIds) ? excludeIds : [];
  const supabase = createStaticClient();

  // 1. 자격 있는 셀럽 목록 조회 (캐시) — RPC가 없으면 직접 쿼리
  let allCandidates;
  try {
    allCandidates = await getCachedTrackerCandidates();
  } catch (e) {
    console.error(
      "[getTrackerRound] RPC 실패, fallback 사용:",
      e instanceof Error ? e.message : String(e)
    );
    return getTrackerRoundFallback(safeIds);
  }

  const excludeSet = new Set(safeIds);
  const candidates = allCandidates.filter((c: { id: string }) => !excludeSet.has(c.id));
  if (candidates.length === 0) return null;

  // 랜덤 선택
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const preferKo = await isKoreanLocale();
  const resolve = (en: string | null | undefined, ko: string | null | undefined) =>
    preferKo ? (ko || en || null) : (en || ko || null);

  // quote만 JSON path로 조회
  const { data: chosenDialogue } = await supabase
    .from("celeb_dialogues")
    .select("quote:lines->quote, quote_en:lines_en->quote")
    .eq("celeb_id", chosen.id)
    .maybeSingle();
  const chosenQuote = resolve(
    (chosenDialogue as { quote_en?: string | null } | null)?.quote_en,
    (chosenDialogue as { quote?: string | null } | null)?.quote
  );

  return buildRound(supabase, chosen.id, chosen.slug ?? null,
    (resolve(chosen.nickname_en, chosen.nickname) ?? chosen.nickname) as string,
    chosen.profession, chosen.avatar_url,
    resolve(chosen.cultural_journey_en, chosen.cultural_journey),
    chosen.nationality, chosen.birth_date, chosen.death_date,
    resolve(chosen.bio_en, chosen.bio),
    chosenQuote,
    preferKo);
}

// fallback 자격 셀럽 목록 캐시 — exclude 필터·랜덤 선택은 캐시 밖에서 수행
const getCachedFallbackEligible = unstable_cache(
  async (): Promise<FallbackCelebRow[]> => {
    const supabase = createStaticClient();

    // 자격 있는 셀럽 목록: persona 존재 + cultural journey 존재 + 리뷰 있는 콘텐츠 존재
    // 여정·소개 전문은 여기서 받지 않는다 — 선정된 1명만 별도 수신 (egress 절감)
    const { data: allCelebs } = await supabase
      .from("profiles")
      .select("id, slug, nickname, nickname_en, profession, avatar_url, death_date, nationality, birth_date")
      .eq("profile_type", "CELEB")
      .eq("status", "active")
      .not("cultural_journey", "is", null)
      .neq("cultural_journey", "")
      .not("death_date", "is", null);

    if (!allCelebs || allCelebs.length === 0) return [];
    const celebRows: FallbackCelebRow[] = allCelebs;

    // 퍼블릭 도메인 필터 (1920년 이전 사망)
    const publicDomain = celebRows.filter((c) => {
      const d = c.death_date;
      if (!d || d === "") return false;
      if (d.startsWith("-")) return true; // BC
      const match = d.match(/^(\d{1,4})/);
      return match ? parseInt(match[1], 10) <= 1920 : false;
    });

    // persona 존재 확인
    const celebIds = publicDomain.map((c) => c.id);
    const { data: personas } = await supabase
      .from("celeb_persona")
      .select("celeb_id")
      .in("celeb_id", celebIds);

    const personaSet = new Set(
      ((personas ?? []) as { celeb_id: string }[]).map((p) => p.celeb_id)
    );

    // 리뷰 있는 콘텐츠 4건 이상인 셀럽만 허용
    const { data: reviewRows } = await supabase
      .from("user_contents")
      .select("user_id")
      .in("user_id", celebIds)
      .not("review", "is", null)
      .neq("review", "");

    const reviewCountMap = new Map<string, number>();
    for (const r of (reviewRows ?? []) as { user_id: string }[]) {
      reviewCountMap.set(r.user_id, (reviewCountMap.get(r.user_id) ?? 0) + 1);
    }
    const reviewSet = new Set(
      [...reviewCountMap.entries()].filter(([, count]) => count >= 4).map(([id]) => id)
    );

    // cultural_journey 존재·비어있지 않음은 DB 필터로 보장됨
    return publicDomain.filter(
      (c) => personaSet.has(c.id) && reviewSet.has(c.id)
    );
  },
  ["tracker-fallback-eligible"],
  { revalidate: STATIC_REVALIDATE, tags: ["celebs"] }
);

async function getTrackerRoundFallback(
  excludeIds: string[]
): Promise<TrackerRound | null> {
  const supabase = createStaticClient();

  const allEligible = await getCachedFallbackEligible();
  const safeExclude = Array.isArray(excludeIds) ? excludeIds : [];
  const excludeSet = new Set(safeExclude);
  const eligible = allEligible.filter((c) => !excludeSet.has(c.id));

  if (eligible.length === 0) return null;

  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  const preferKo = await isKoreanLocale();
  const resolve = (en: string | null | undefined, ko: string | null | undefined) =>
    preferKo ? (ko || en || null) : (en || ko || null);

  // quote만 JSON path로 조회 + 본문(여정·소개)은 선정된 1명만 수신
  const [{ data: chosenDialogue }, { data: chosenTexts }] = await Promise.all([
    supabase
      .from("celeb_dialogues")
      .select("quote:lines->quote, quote_en:lines_en->quote")
      .eq("celeb_id", chosen.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("cultural_journey, cultural_journey_en, bio, bio_en")
      .eq("id", chosen.id)
      .maybeSingle(),
  ]);
  const chosenQuote = resolve(
    (chosenDialogue as { quote_en?: string | null } | null)?.quote_en,
    (chosenDialogue as { quote?: string | null } | null)?.quote
  );

  return buildRound(supabase, chosen.id, chosen.slug ?? null,
    (resolve(chosen.nickname_en, chosen.nickname) ?? chosen.nickname) as string,
    chosen.profession ?? "other", chosen.avatar_url,
    resolve(chosenTexts?.cultural_journey_en, chosenTexts?.cultural_journey),
    chosen.nationality, chosen.birth_date, chosen.death_date,
    resolve(chosenTexts?.bio_en, chosenTexts?.bio),
    chosenQuote,
    preferKo);
}

// 오답 보기 후보 풀 캐시 — 라운드 무관 고정 데이터 (제외할 정답 셀럽은 캐시 밖에서 필터)
const getCachedDistractorPool = unstable_cache(
  async (): Promise<DistractorRow[]> => {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname, nickname_en, avatar_url, profession, nationality, birth_date, death_date")
      .eq("profile_type", "CELEB")
      .eq("status", "active")
      .not("death_date", "is", null)
      .limit(300);
    return (data ?? []) as DistractorRow[];
  },
  ["tracker-distractor-pool"],
  { revalidate: STATIC_REVALIDATE, tags: ["celebs"] }
);

async function buildRound(
  supabase: ReturnType<typeof createStaticClient>,
  celebId: string,
  celebSlug: string | null,
  nickname: string,
  profession: string,
  avatarUrl: string | null,
  culturalJourney: string | null,
  nationality: string | null,
  birthDate: string | null,
  deathDate: string | null,
  bio: string | null,
  quotes: string | null,
  preferKo: boolean = true
): Promise<TrackerRound | null> {
  // 2+3. 페르소나 + 리뷰 콘텐츠 병렬 조회
  const [{ data: personaData }, { data: ucData }] = await Promise.all([
    supabase
      .from("celeb_persona")
      .select(
        "command, martial, intellect, charm, temperance, diligence, reflection, courage, loyalty, benevolence, fairness, humility, pessimism_optimism, conservative_progressive, individual_social, cautious_bold"
      )
      .eq("celeb_id", celebId)
      .single(),
    supabase
      .from("user_contents")
      .select("content_id, review, review_en, source_url")
      .eq("user_id", celebId)
      .not("review", "is", null)
      .neq("review", "")
      .limit(8),
  ]);

  if (!personaData) return null;

  const ucRows: TrackerUcRow[] = ucData ?? [];
  const contentIds = ucRows.map((uc) => uc.content_id);
  let contents: TrackerContent[] = [];

  if (contentIds.length > 0) {
    const { data: cData } = await supabase
      .from("contents")
      .select("id, type, content_locales(locale, title, creator, thumbnail_url)")
      .in("id", contentIds);

    const reviewMap = new Map(
      ucRows.map((uc) => [uc.content_id, { review: uc.review as string, review_en: uc.review_en }])
    );
    const sourceUrlMap = new Map(
      ucRows.map((uc) => [uc.content_id, uc.source_url])
    );

    const contentRows: TrackerContentRow[] = cData ?? [];
    contents = contentRows
      .map((c) => {
        const locales = c.content_locales;
        const ko = locales?.find(l => l.locale === 'ko');
        const en = locales?.find(l => l.locale === 'en');
        const prim = preferKo ? ko : en;
        const fall = preferKo ? en : ko;
        const title = prim?.title || fall?.title || "";
        const creator = prim?.creator || fall?.creator || null;
        const thumbnailUrl = prim?.thumbnail_url || fall?.thumbnail_url || null;
        const reviews = reviewMap.get(c.id);
        const raw = (preferKo ? (reviews?.review || reviews?.review_en) : (reviews?.review_en || reviews?.review)) ?? "";
        return {
          id: c.id,
          title,
          creator,
          thumbnailUrl,
          type: c.type ?? "BOOK",
          review: censorName(raw, nickname, [title, creator ?? ""]),
          rawReview: raw,
          sourceUrl: sourceUrlMap.get(c.id) ?? null,
        };
      })
      // 로케일 기반 정렬: 한국 접속 → 한글 제목 우선, 해외 접속 → 영문 제목 우선
      .sort((a, b) => {
        const aIsKo = /[가-힣]/.test(a.title);
        const bIsKo = /[가-힣]/.test(b.title);
        if (aIsKo !== bIsKo) return preferKo ? (aIsKo ? -1 : 1) : (aIsKo ? 1 : -1);
        return 0;
      });
  }

  // 4. 유사 인물 오답 보기 5명 (직군·국적·생몰년 유사도, 퍼블릭 도메인만)
  const poolRows = (await getCachedDistractorPool()).filter((d) => d.id !== celebId);

  // 퍼블릭 도메인 필터 (1920년 이전 사망)
  const pool = poolRows.filter((d) => {
    const dd = d.death_date;
    if (!dd || dd === "") return false;
    if (dd.startsWith("-")) return true;
    const m = dd.match(/^(\d{1,4})/);
    return m ? parseInt(m[1], 10) <= 1920 : false;
  });

  const birthYear = parseYear(birthDate);
  const deathYear = parseYear(deathDate);

  const scored = pool.map((d) => {
    let similarity = 0;
    // 직군 일치 +3
    if (d.profession === profession) similarity += 3;
    // 국적 일치 +2
    if (nationality && d.nationality === nationality) similarity += 2;
    // 생년 유사도 (50년 이내일수록 높음, 최대 +3)
    const dBirth = parseYear(d.birth_date);
    if (birthYear !== null && dBirth !== null) {
      const gap = Math.abs(birthYear - dBirth);
      if (gap <= 50) similarity += 3;
      else if (gap <= 150) similarity += 2;
      else if (gap <= 300) similarity += 1;
    }
    // 사망년 유사도 (최대 +2)
    const dDeath = parseYear(d.death_date);
    if (deathYear !== null && dDeath !== null) {
      const gap = Math.abs(deathYear - dDeath);
      if (gap <= 50) similarity += 2;
      else if (gap <= 150) similarity += 1;
    }
    return { ...d, similarity };
  });

  // 유사도 내림차순 정렬 후, 동점 내 랜덤 셔플
  scored.sort((a, b) => b.similarity - a.similarity || Math.random() - 0.5);
  const distractors = scored.slice(0, 5);

  const resolveNick = (en: string | null | undefined, ko: string) =>
    preferKo ? (ko || en || ko) : (en || ko);

  const rawOptions: TrackerOption[] = [
    { id: celebId, nickname, avatarUrl },
    ...distractors.map((d) => ({
      id: d.id,
      nickname: resolveNick(d.nickname_en, d.nickname as string),
      avatarUrl: d.avatar_url,
    })),
  ].sort(() => Math.random() - 0.5);

  const optionIds = rawOptions.map(o => o.id);
  const [{ data: tones }, { data: dialogues }] = await Promise.all([
    supabase.from("profiles").select("id, speech_tone, has_voice, voice_v, voice_speed").in("id", optionIds),
    // egress-allow: 게임 라운드가 4명 옵션의 21상황 × 3변형 대사를 모두 사용 (clash_attack 등)
    supabase.from("celeb_dialogues").select("celeb_id, lines, lines_en").in("celeb_id", optionIds)
  ]);

  const toneRows: ToneRow[] = tones ?? [];
  const dialogueRows: TrackerDialogueRow[] = dialogues ?? [];

  const toneMap = new Map<string, string>(toneRows.map(t => [t.id, t.speech_tone as string]));
  const dialogueMap = new Map<string, DialogueLines>(dialogueRows.map(d => [d.celeb_id,
    (!preferKo && d.lines_en) ? d.lines_en : d.lines
  ]));
  const voiceMap = new Map<string, { hasVoice: boolean; voiceV: number; voiceSpeed: number }>(toneRows.map(t => [t.id, { hasVoice: t.has_voice ?? false, voiceV: t.voice_v ?? 0, voiceSpeed: t.voice_speed ?? 1.0 }]));

  const options: TrackerOption[] = rawOptions.map(o => {
    const voice = voiceMap.get(o.id);
    return {
      ...o,
      speechTone: toneMap.get(o.id) ?? "composed",
      dialogueLines: dialogueMap.get(o.id) ?? null,
      hasVoice: voice?.hasVoice ?? false,
      voiceV: voice?.voiceV ?? 0,
      voiceSpeed: voice?.voiceSpeed ?? 1.0,
    };
  });

  const nationalityLabel = nationality ? await getCountryNameAsync(nationality) : null;
  const safeWords = Array.from(new Set(contents.flatMap(c => [c.title, c.creator]).filter(Boolean))) as string[];

  return {
    celebId,
    celebSlug,
    nickname,
    profession,
    avatarUrl,
    nationality,
    birthDate,
    deathDate,
    nationalityLabel,
    bio: bio ? censorName(bio, nickname, safeWords) : null,
    quotes: quotes ? censorName(quotes, nickname, safeWords) : null,
    culturalJourney: culturalJourney ? censorName(culturalJourney, nickname, safeWords) : null,
    persona: personaData as TrackerPersona,
    contents,
    options,
  };
}

/** 날짜 문자열에서 연도 추출 (BC는 음수) */
function parseYear(date: string | null | undefined): number | null {
  if (!date || date === "") return null;
  if (date.startsWith("-")) {
    const n = parseInt(date.slice(1), 10);
    return isNaN(n) ? null : -n;
  }
  const match = date.match(/^(\d{1,4})/);
  return match ? parseInt(match[1], 10) : null;
}
