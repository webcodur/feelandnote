/*
  파일명: actions/game/getTrackerRound.ts
  기능: 미궁(인물등용) 게임 라운드 데이터 조회
  책임: 랜덤 셀럽 1명(등용 대상) + 페르소나 + 콘텐츠 + 현자 5명 일괄 조회
*/
"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCountryNameAsync } from "@/lib/countries";

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
  dialogueLines?: any | null;
}

export interface TrackerPersona {
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
  consumptionPhilosophy: string | null;
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

/** Accept-Language 헤더 기반 한국어 우선 여부 판별 */
async function isKoreanLocale(): Promise<boolean> {
  try {
    const h = await headers();
    const lang = h.get("accept-language") ?? "";
    // ko가 첫 번째 언어이거나 높은 우선순위인 경우
    return /^ko\b/i.test(lang) || /ko-KR/i.test(lang);
  } catch {
    return true; // 기본값: 한국어 우선
  }
}

export async function getTrackerRound(
  excludeIds: string[] = []
): Promise<TrackerRound | null> {
  const safeIds = Array.isArray(excludeIds) ? excludeIds : [];
  const supabase = await createClient();

  // 1. 자격 있는 셀럽 목록 조회 (퍼블릭 도메인 + persona + review 있는 콘텐츠 + philosophy)
  const { data: candidates, error: candErr } = await supabase.rpc(
    "get_tracker_candidates",
    { exclude_ids: safeIds }
  );

  // RPC가 없으면 직접 쿼리
  if (candErr) {
    console.error("[getTrackerRound] RPC 실패, fallback 사용:", candErr.message);
    return getTrackerRoundFallback(safeIds);
  }

  if (!candidates || candidates.length === 0) return null;

  // 랜덤 선택
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const preferKo = await isKoreanLocale();
  return buildRound(supabase, chosen.id, chosen.slug ?? null, chosen.nickname, chosen.profession, chosen.avatar_url, chosen.consumption_philosophy, chosen.nationality, chosen.birth_date, chosen.death_date, chosen.bio, chosen.quotes, preferKo);
}

async function getTrackerRoundFallback(
  excludeIds: string[]
): Promise<TrackerRound | null> {
  const supabase = await createClient();

  // 자격 있는 셀럽 목록: persona 존재 + philosophy 존재 + 리뷰 있는 콘텐츠 존재
  const { data: allCelebs } = await supabase
    .from("profiles")
    .select("id, slug, nickname, profession, avatar_url, consumption_philosophy, death_date, nationality, birth_date, bio, quotes")
    .eq("profile_type", "CELEB")
    .eq("status", "active")
    .not("consumption_philosophy", "is", null)
    .not("death_date", "is", null);

  if (!allCelebs || allCelebs.length === 0) return null;

  // 퍼블릭 도메인 필터 (1920년 이전 사망)
  const publicDomain = allCelebs.filter((c) => {
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

  const personaSet = new Set((personas ?? []).map((p) => p.celeb_id));

  // 리뷰 있는 콘텐츠 4건 이상인 셀럽만 허용
  const { data: reviewRows } = await supabase
    .from("user_contents")
    .select("user_id")
    .in("user_id", celebIds)
    .not("review", "is", null)
    .neq("review", "");

  const reviewCountMap = new Map<string, number>();
  for (const r of reviewRows ?? []) {
    reviewCountMap.set(r.user_id, (reviewCountMap.get(r.user_id) ?? 0) + 1);
  }
  const reviewSet = new Set(
    [...reviewCountMap.entries()].filter(([, count]) => count >= 4).map(([id]) => id)
  );
  const safeExclude = Array.isArray(excludeIds) ? excludeIds : [];
  const excludeSet = new Set(safeExclude);

  const eligible = publicDomain.filter(
    (c) =>
      personaSet.has(c.id) &&
      reviewSet.has(c.id) &&
      !excludeSet.has(c.id) &&
      c.consumption_philosophy &&
      c.consumption_philosophy.trim() !== ""
  );

  if (eligible.length === 0) return null;

  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  const preferKo = await isKoreanLocale();
  return buildRound(supabase, chosen.id, chosen.slug ?? null, chosen.nickname, chosen.profession ?? "other", chosen.avatar_url, chosen.consumption_philosophy, chosen.nationality, chosen.birth_date, chosen.death_date, chosen.bio, chosen.quotes, preferKo);
}

async function buildRound(
  supabase: Awaited<ReturnType<typeof createClient>>,
  celebId: string,
  celebSlug: string | null,
  nickname: string,
  profession: string,
  avatarUrl: string | null,
  philosophy: string | null,
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
      .select("content_id, review, source_url")
      .eq("user_id", celebId)
      .not("review", "is", null)
      .neq("review", "")
      .limit(8),
  ]);

  if (!personaData) return null;

  const contentIds = (ucData ?? []).map((uc) => uc.content_id);
  let contents: TrackerContent[] = [];

  if (contentIds.length > 0) {
    const { data: cData } = await supabase
      .from("contents")
      .select("id, title, creator, thumbnail_url, type")
      .in("id", contentIds);

    const reviewMap = new Map(
      (ucData ?? []).map((uc) => [uc.content_id, uc.review as string])
    );
    const sourceUrlMap = new Map(
      (ucData ?? []).map((uc) => [uc.content_id, (uc as any).source_url as string | null])
    );

    contents = (cData ?? [])
      .map((c) => {
        const raw = reviewMap.get(c.id) ?? "";
        return {
          id: c.id,
          title: c.title ?? "",
          creator: c.creator,
          thumbnailUrl: c.thumbnail_url,
          type: c.type ?? "BOOK",
          review: censorName(raw, nickname, [c.title ?? "", c.creator ?? ""]),
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
  const { data: poolRaw } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, profession, nationality, birth_date, death_date")
    .eq("profile_type", "CELEB")
    .eq("status", "active")
    .neq("id", celebId)
    .not("death_date", "is", null)
    .limit(300);

  // 퍼블릭 도메인 필터 (1920년 이전 사망)
  const pool = (poolRaw ?? []).filter((d) => {
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

  const rawOptions: TrackerOption[] = [
    { id: celebId, nickname, avatarUrl },
    ...distractors.map((d) => ({
      id: d.id,
      nickname: d.nickname,
      avatarUrl: d.avatar_url,
    })),
  ].sort(() => Math.random() - 0.5);

  const optionIds = rawOptions.map(o => o.id);
  const [{ data: tones }, { data: dialogues }] = await Promise.all([
    supabase.from("profiles").select("id, speech_tone").in("id", optionIds),
    supabase.from("celeb_dialogues").select("celeb_id, lines").in("celeb_id", optionIds)
  ]);

  const toneMap = new Map<string, string>((tones ?? []).map(t => [t.id, t.speech_tone as string]));
  const dialogueMap = new Map<string, any>((dialogues ?? []).map(d => [d.celeb_id, d.lines]));

  const options: TrackerOption[] = rawOptions.map(o => ({
    ...o,
    speechTone: toneMap.get(o.id) ?? "composed",
    dialogueLines: dialogueMap.get(o.id) ?? null
  }));

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
    consumptionPhilosophy: philosophy ? censorName(philosophy, nickname, safeWords) : null,
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
