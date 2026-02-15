/*
  파일명: actions/game/getTrackerRound.ts
  기능: 인물추적 게임 라운드 데이터 조회
  책임: 랜덤 셀럽 1명 + 페르소나 + 콘텐츠 + 오답 보기 3명 일괄 조회
*/
"use server";

import { createClient } from "@/lib/supabase/server";
import { getCountryNameAsync } from "@/lib/countries";

export interface TrackerContent {
  id: string;
  title: string;
  creator: string | null;
  thumbnailUrl: string | null;
  type: string;
  review: string;
}

export interface TrackerOption {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface TrackerPersona {
  // 능력 (0~100)
  command: number;
  martial: number;
  intellect: number;
  charisma: number;
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

// 셀럽 이름을 블러 치환
function censorName(text: string, nickname: string): string {
  if (!text || !nickname) return text;
  const escaped = nickname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let result = text.replace(new RegExp(escaped, "gi"), "■■■");

  // 성/이름 부분일치 치환 (2글자 이상 토큰만)
  const tokens = nickname.split(/\s+/).filter((t) => t.length >= 2);
  for (const token of tokens) {
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(esc, "gi"), "■■■");
  }
  return result;
}

export async function getTrackerRound(
  excludeIds: string[] = []
): Promise<TrackerRound | null> {
  const supabase = await createClient();

  // 1. 자격 있는 셀럽 목록 조회 (퍼블릭 도메인 + persona + review 있는 콘텐츠 + philosophy)
  const { data: candidates, error: candErr } = await supabase.rpc(
    "get_tracker_candidates",
    { exclude_ids: excludeIds }
  );

  // RPC가 없으면 직접 쿼리
  if (candErr) {
    return getTrackerRoundFallback(excludeIds);
  }

  if (!candidates || candidates.length === 0) return null;

  // 랜덤 선택
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return buildRound(supabase, chosen.id, chosen.nickname, chosen.profession, chosen.avatar_url, chosen.consumption_philosophy, chosen.nationality, chosen.birth_date, chosen.death_date, chosen.bio, chosen.quotes);
}

async function getTrackerRoundFallback(
  excludeIds: string[]
): Promise<TrackerRound | null> {
  const supabase = await createClient();

  // 자격 있는 셀럽 목록: persona 존재 + philosophy 존재 + 리뷰 있는 콘텐츠 존재
  const { data: allCelebs } = await supabase
    .from("profiles")
    .select("id, nickname, profession, avatar_url, consumption_philosophy, death_date, nationality, birth_date, bio, quotes")
    .eq("profile_type", "CELEB")
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

  // 리뷰 있는 콘텐츠 존재 확인
  const { data: reviewCounts } = await supabase
    .from("user_contents")
    .select("user_id")
    .in("user_id", celebIds)
    .not("review", "is", null)
    .neq("review", "");

  const reviewSet = new Set((reviewCounts ?? []).map((r) => r.user_id));
  const excludeSet = new Set(excludeIds);

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
  return buildRound(supabase, chosen.id, chosen.nickname, chosen.profession ?? "other", chosen.avatar_url, chosen.consumption_philosophy, chosen.nationality, chosen.birth_date, chosen.death_date, chosen.bio, chosen.quotes);
}

async function buildRound(
  supabase: Awaited<ReturnType<typeof createClient>>,
  celebId: string,
  nickname: string,
  profession: string,
  avatarUrl: string | null,
  philosophy: string | null,
  nationality: string | null,
  birthDate: string | null,
  deathDate: string | null,
  bio: string | null,
  quotes: string | null
): Promise<TrackerRound | null> {
  // 2. 페르소나 조회
  const { data: personaData } = await supabase
    .from("celeb_persona")
    .select(
      "command, martial, intellect, charisma, temperance, diligence, reflection, courage, loyalty, benevolence, fairness, humility, pessimism_optimism, conservative_progressive, individual_social, cautious_bold"
    )
    .eq("celeb_id", celebId)
    .single();

  if (!personaData) return null;

  // 3. 리뷰 있는 콘텐츠 최대 5건
  const { data: ucData } = await supabase
    .from("user_contents")
    .select("content_id, review")
    .eq("user_id", celebId)
    .not("review", "is", null)
    .neq("review", "")
    .limit(5);

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

    contents = (cData ?? []).map((c) => ({
      id: c.id,
      title: c.title ?? "",
      creator: c.creator,
      thumbnailUrl: c.thumbnail_url,
      type: c.type ?? "BOOK",
      review: censorName(reviewMap.get(c.id) ?? "", nickname),
    }));
  }

  // 4. 같은 직군 오답 보기 3명
  const { data: sameProf } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url")
    .eq("profile_type", "CELEB")
    .eq("profession", profession)
    .neq("id", celebId)
    .not("death_date", "is", null)
    .limit(20);

  // 퍼블릭 도메인 필터는 여기서도 적용 (death_date 정보 추가 조회 대신 단순 3명 선택)
  const distractors = (sameProf ?? [])
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // 3명 미달 시 다른 직군에서 보충
  if (distractors.length < 3) {
    const { data: others } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .eq("profile_type", "CELEB")
      .neq("id", celebId)
      .not("death_date", "is", null)
      .limit(10);

    const existing = new Set([celebId, ...distractors.map((d) => d.id)]);
    const extra = (others ?? [])
      .filter((o) => !existing.has(o.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - distractors.length);
    distractors.push(...extra);
  }

  const options: TrackerOption[] = [
    { id: celebId, nickname, avatarUrl },
    ...distractors.map((d) => ({
      id: d.id,
      nickname: d.nickname,
      avatarUrl: d.avatar_url,
    })),
  ].sort(() => Math.random() - 0.5);

  const nationalityLabel = nationality ? await getCountryNameAsync(nationality) : null;

  return {
    celebId,
    nickname,
    profession,
    avatarUrl,
    nationality,
    birthDate,
    deathDate,
    nationalityLabel,
    bio: bio ? censorName(bio, nickname) : null,
    quotes: quotes ? censorName(quotes, nickname) : null,
    consumptionPhilosophy: philosophy ? censorName(philosophy, nickname) : null,
    persona: personaData as TrackerPersona,
    contents,
    options,
  };
}
