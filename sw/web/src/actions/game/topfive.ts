"use server";

/**
 * 상위 다섯 (Top Five) — 서버 액션
 *
 * DB에서 영향력 순위·콘텐츠 기록 수를 조회하여 퍼즐 풀을 조립한다.
 * 환경값이 없으면 체험 표본으로 돌아간다 (화면에 명시).
 *
 * 스냅샷 전략: 날짜 포함 캐시 키로 7일간 고정.
 * 한 판 중간에 순위가 바뀌지 않는다.
 */

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/supabase/static";
import type { TopFivePool } from "@/components/features/game/topfive/engine";
import type { CategoryType, TopFiveCandidate, TopFivePuzzle } from "@/components/features/game/topfive/types";
import { CANDIDATES_COUNT } from "@/components/features/game/topfive/types";
import { getFixturePool, isFixtureMode } from "@/components/features/game/topfive/fixture";

// ──────────────────── 타입 ────────────────────

interface InfluenceRow {
  celeb_id: string;
  total_score: number;
  profiles: {
    nickname: string;
    nickname_en: string | null;
    profession: string | null;
  } | null;
}

interface TagRow {
  id: string;
  name: string;
  name_en: string | null;
}

interface TagAssignmentRow {
  celeb_id: string;
  tag_id: string;
}

// ──────────────────── 직군별 영향력 순위 퍼즐 ────────────────────

const PROFESSION_META: Record<string, { ko: string; en: string }> = {
  scientist: { ko: "과학자 영향력 순위", en: "Most Influential Scientists" },
  author: { ko: "작가 영향력 순위", en: "Most Influential Authors" },
  leader: { ko: "지도자 영향력 순위", en: "Most Influential Leaders" },
  entrepreneur: { ko: "기업가 영향력 순위", en: "Most Influential Entrepreneurs" },
  musician: { ko: "음악가 영향력 순위", en: "Most Influential Musicians" },
  visual_artist: { ko: "시각예술가 영향력 순위", en: "Most Influential Visual Artists" },
  commander: { ko: "군사 지휘관 영향력 순위", en: "Most Influential Commanders" },
  politician: { ko: "정치인 영향력 순위", en: "Most Influential Politicians" },
  director: { ko: "감독 영향력 순위", en: "Most Influential Directors" },
  humanities_scholar: { ko: "인문학자 영향력 순위", en: "Most Influential Humanities Scholars" },
  social_scientist: { ko: "사회과학자 영향력 순위", en: "Most Influential Social Scientists" },
};

/** 태그 기반 퍼즐을 생성할 수 있는 최소 영향력 보유 인원 (정답 5명) */
const MIN_TAG_MEMBERS_WITH_INFLUENCE = 5;

async function fetchTopFivePool(locale: string): Promise<TopFivePool> {
  const supabase = createStaticClient();

  // 1) 영향력 순위를 직군별로 조회 (상위 2000명)
  const { data: influences, error: infError } = await supabase
    .from("celeb_influence")
    .select(`
      celeb_id,
      total_score,
      profiles!celeb_influence_celeb_id_fkey (
        nickname, nickname_en, profession
      )
    `)
    .order("total_score", { ascending: false })
    .limit(2000)
    .overrideTypes<InfluenceRow[], { merge: false }>();

  if (infError) throw new Error(`[getTopFivePool] influence: ${infError.message}`);
  if (!influences || influences.length === 0) throw new Error("No influence data");

  // ── 직군별 퍼즐 ──
  const byProfession = new Map<string, InfluenceRow[]>();
  for (const row of influences) {
    const prof = row.profiles?.profession;
    if (!prof) continue;
    const arr = byProfession.get(prof) ?? [];
    arr.push(row);
    byProfession.set(prof, arr);
  }

  const puzzles: TopFivePuzzle[] = [];

  for (const [profession, rows] of byProfession) {
    if (rows.length < CANDIDATES_COUNT) continue;
    const meta = PROFESSION_META[profession];
    if (!meta) continue;

    const topRows = rows.slice(0, CANDIDATES_COUNT);
    const candidates: TopFiveCandidate[] = topRows.map((row, i) => ({
      id: row.celeb_id,
      label: locale === "en"
        ? (row.profiles?.nickname_en || row.profiles?.nickname || "")
        : (row.profiles?.nickname || ""),
      rank: i + 1,
      isAnswer: i < 5,
    }));

    puzzles.push({
      dateKey: "",
      categoryType: "profession_influence" as CategoryType,
      categoryLabel: locale === "en" ? meta.en : meta.ko,
      categoryLabelEn: meta.en,
      candidates,
    });
  }

  // ── 태그별 영향력 순위 퍼즐 ──
  // 태그 소속 인물 중 영향력 점수 보유 5명 이상인 태그만 퍼즐로 생성
  const { data: tags, error: tagError } = await supabase
    .from("celeb_tags")
    .select("id, name, name_en")
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .limit(100)
    .overrideTypes<TagRow[], { merge: false }>();

  if (tagError) throw new Error(`[getTopFivePool] tags: ${tagError.message}`);

  const { data: assignments, error: assignError } = await supabase
    .from("celeb_tag_assignments")
    .select("celeb_id, tag_id")
    .eq("hidden", false)
    .limit(5000)
    .overrideTypes<TagAssignmentRow[], { merge: false }>();

  if (assignError) throw new Error(`[getTopFivePool] assignments: ${assignError.message}`);

  if (tags && assignments) {
    // 영향력 맵 (celeb_id → { score, nickname, nickname_en })
    const influenceMap = new Map(
      influences.map((r) => [
        r.celeb_id,
        {
          score: r.total_score,
          nickname: r.profiles?.nickname ?? "",
          nicknameEn: r.profiles?.nickname_en ?? r.profiles?.nickname ?? "",
        },
      ])
    );

    // 태그별 영향력 보유 멤버
    const tagMembers = new Map<string, { id: string; score: number; nickname: string; nicknameEn: string }[]>();
    for (const a of assignments) {
      const inf = influenceMap.get(a.celeb_id);
      if (!inf || inf.score <= 0) continue;
      const arr = tagMembers.get(a.tag_id) ?? [];
      arr.push({ id: a.celeb_id, score: inf.score, nickname: inf.nickname, nicknameEn: inf.nicknameEn });
      tagMembers.set(a.tag_id, arr);
    }

    for (const tag of tags) {
      const members = tagMembers.get(tag.id);
      if (!members || members.length < MIN_TAG_MEMBERS_WITH_INFLUENCE) continue;

      // 영향력 순으로 정렬
      const sorted = [...members].sort((a, b) => b.score - a.score);
      // 후보 수: 최대 CANDIDATES_COUNT, 최소 members 수
      const candidateCount = Math.min(sorted.length, CANDIDATES_COUNT);
      const topSorted = sorted.slice(0, candidateCount);

      const candidates: TopFiveCandidate[] = topSorted.map((m, i) => ({
        id: m.id,
        label: locale === "en" ? m.nicknameEn : m.nickname,
        rank: i + 1,
        isAnswer: i < 5,
      }));

      const labelKo = `${tag.name} 영향력 순위`;
      const labelEn = `Most Influential in ${tag.name_en || tag.name}`;

      puzzles.push({
        dateKey: "",
        categoryType: "faction_influence" as CategoryType,
        categoryLabel: locale === "en" ? labelEn : labelKo,
        categoryLabelEn: labelEn,
        candidates,
      });
    }
  }

  if (puzzles.length === 0) throw new Error("Not enough data for puzzles");

  return { puzzles };
}

// ──────────────────── 캐시 래퍼 ────────────────────

const getTopFivePoolCached = unstable_cache(
  fetchTopFivePool,
  ["topfive-game-pool"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
);

// ──────────────────── 공개 API ────────────────────

export interface TopFiveDataResult {
  pool: TopFivePool;
  isFixture: boolean;
}

export async function getTopFiveData(): Promise<TopFiveDataResult> {
  const locale = await getLocale();

  if (isFixtureMode()) {
    return { pool: getFixturePool(locale), isFixture: true };
  }

  try {
    const pool = await getTopFivePoolCached(locale);
    return { pool, isFixture: false };
  } catch (err) {
    // 조용한 폴백 금지 — 왜 표본으로 돌아갔는지 서버 로그에 남긴다
    console.error("[topfive] 실제 조회 실패 → 체험 표본으로 전환:", err);
    // DB 조회 실패 시 표본으로 폴백 (화면에 명시)
    return { pool: getFixturePool(locale), isFixture: true };
  }
}
