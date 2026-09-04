"use server";

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { LISTING_DEFAULT_REALITIES } from "@feelandnote/shared/constants/celeb-tiers";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { selectAllPages } from "@feelandnote/shared/lib/paginate";
import type { GridCeleb, GridCondition } from "@/components/features/game/grid/types";

// ──────────────────── 타입 ────────────────────

interface ProfileRow {
  id: string;
  nickname: string;
  nickname_en: string | null;
  slug: string;
  nationality: string | null;
  profession: string | null;
  birth_date: string | null;
  death_date: string | null;
}

interface TagAssignmentRow {
  celeb_id: string;
  tag_id: string;
}

interface TagRow {
  id: string;
  name: string;
  name_en: string | null;
  slug: string | null;
}

// ──────────────────── 데이터 가져오기 ────────────────────

async function fetchGridCelebs(locale: string): Promise<GridCeleb[]> {
  const db = createStaticClient();

  // 1) 활성 셀럽 프로필 (full/light) — 1,476명이므로 페이징 필수 (PostgREST 1,000행 상한)
  const celebs = await selectAllPages<ProfileRow>((from, to) =>
    db
      .from("celebs")
      .select("id, nickname, nickname_en, slug, nationality, profession, birth_date, death_date")
      .eq("publication_status", "active")
      .in("celeb_reality", [...LISTING_DEFAULT_REALITIES])
      .not("nationality", "is", null)
      .not("profession", "is", null)
      .order("id", { ascending: true })
      .range(from, to)
      .overrideTypes<ProfileRow[], { merge: false }>() as unknown as PromiseLike<{
      data: ProfileRow[] | null;
      error: { message: string } | null;
    }>,
  );

  if (celebs.length === 0) return [];

  // 2) 세력 태그 배정
  const assignments = await selectAllPages<TagAssignmentRow>((from, to) =>
    db
      .from("celeb_tag_assignments")
      .select("celeb_id, tag_id")
      .eq("hidden", false)
      .order("celeb_id", { ascending: true })
      .range(from, to)
      .overrideTypes<TagAssignmentRow[], { merge: false }>() as unknown as PromiseLike<{
      data: TagAssignmentRow[] | null;
      error: { message: string } | null;
    }>,
  );

  // 인물별 태그 id 맵
  const tagMap = new Map<string, string[]>();
  for (const row of assignments) {
    const arr = tagMap.get(row.celeb_id) ?? [];
    arr.push(row.tag_id);
    tagMap.set(row.celeb_id, arr);
  }

  return celebs.map((p) => ({
    id: p.id,
    nickname: locale === "en" ? (p.nickname_en || p.nickname) : p.nickname,
    nicknameEn: p.nickname_en || p.nickname,
    slug: p.slug,
    nationality: p.nationality,
    profession: p.profession,
    birthDate: p.birth_date,
    deathDate: p.death_date,
    tagIds: tagMap.get(p.id) ?? [],
  }));
}

// ⚠️ unstable_cache 는 반환값을 직렬화해 저장한다. Map·Set 은 그 과정을 넘기지 못하고
//    빈 객체로 변해 호출부에서 `.get is not a function` 으로 터진다(26.07.31 실측).
//    그래서 캐시 경계를 넘길 때는 배열로 넘기고, 받는 쪽에서 Map 을 다시 만든다.
async function fetchGridConditionLabels(): Promise<{
  tags: [string, { name: string; nameEn: string }][];
}> {
  const db = createStaticClient();

  const { data: tags, error } = await db
    .from("celeb_tags")
    .select("id, name, name_en, slug")
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .limit(100)
    .overrideTypes<TagRow[], { merge: false }>();

  if (error) {
    throw new Error(`[getGridConditions] tags: ${error.message}`);
  }

  const entries: [string, { name: string; nameEn: string }][] = (tags ?? []).map((t) => [
    t.id,
    { name: t.name, nameEn: t.name_en || t.name },
  ]);

  return { tags: entries };
}

// ──────────────────── 캐시 래퍼 ────────────────────

const getGridCelebsCached = unstable_cache(
  fetchGridCelebs,
  ["grid-game-celebs"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
);

const getGridConditionLabelsCached = unstable_cache(
  fetchGridConditionLabels,
  ["grid-game-condition-labels"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
);

// ──────────────────── 공개 API ────────────────────

export interface GridGameData {
  celebs: GridCeleb[];
  conditions: GridCondition[];
  isFixture: boolean;
}

export async function getGridGameData(): Promise<GridGameData> {
  try {
    const locale = await getLocale();
    const [celebs, labelData] = await Promise.all([
      getGridCelebsCached(locale),
      getGridConditionLabelsCached(),
    ]);

    if (celebs.length === 0) {
      throw new Error("No celebs loaded");
    }

    // 조건 라벨 구축 — 캐시를 넘어온 배열을 Map 으로 되살린다
    const tags = new Map(labelData.tags);
    const conditions = buildConditions(celebs, tags, locale);

    return { celebs, conditions, isFixture: false };
  } catch (err) {
    // 환경값 부재 또는 조회 실패 → 체험 표본
    // 조용한 폴백 금지: 왜 표본으로 돌아갔는지 서버 로그에 남긴다
    console.error("[grid] 실제 조회 실패 → 체험 표본으로 전환:", err);
    const { FIXTURE_CELEBS, FIXTURE_CONDITIONS } = await import(
      "@/components/features/game/grid/fixture"
    );
    return { celebs: FIXTURE_CELEBS, conditions: FIXTURE_CONDITIONS, isFixture: true };
  }
}

// ──────────────────── 헬퍼 ────────────────────

function buildConditions(
  celebs: readonly GridCeleb[],
  tagNames: Map<string, { name: string; nameEn: string }>,
  locale: string,
): GridCondition[] {
  const conditions: GridCondition[] = [];

  // nationality — 5명 이상 (너무 적으면 교차 시 1명뿐인 칸 양산)
  const natCount = new Map<string, number>();
  for (const c of celebs) {
    if (c.nationality) natCount.set(c.nationality, (natCount.get(c.nationality) ?? 0) + 1);
  }
  for (const [code, count] of natCount) {
    if (count >= 5) {
      conditions.push({ axis: "nationality", value: code, label: code, labelEn: code });
    }
  }

  // profession — 5명 이상
  const profCount = new Map<string, number>();
  for (const c of celebs) {
    if (c.profession) profCount.set(c.profession, (profCount.get(c.profession) ?? 0) + 1);
  }
  for (const [prof, count] of profCount) {
    if (count >= 5) {
      conditions.push({ axis: "profession", value: prof, label: prof, labelEn: prof });
    }
  }

  // century — 10명 이상 (세기는 범위가 넓어 교차 확률이 낮다)
  const cenCount = new Map<string, number>();
  for (const c of celebs) {
    if (c.birthDate) {
      const num = parseInt(c.birthDate, 10);
      if (Number.isFinite(num)) {
        const cen = num < 0 ? `BC${Math.ceil(Math.abs(num) / 100)}` : String(Math.ceil(num / 100));
        cenCount.set(cen, (cenCount.get(cen) ?? 0) + 1);
      }
    }
  }
  for (const [cen, count] of cenCount) {
    if (count >= 10) {
      conditions.push({ axis: "century", value: cen, label: cen, labelEn: cen });
    }
  }

  // tag — 5명 이상
  const tagCount = new Map<string, number>();
  for (const c of celebs) {
    for (const tid of c.tagIds) tagCount.set(tid, (tagCount.get(tid) ?? 0) + 1);
  }
  for (const [tid, count] of tagCount) {
    if (count >= 5) {
      const names = tagNames.get(tid);
      conditions.push({
        axis: "tag",
        value: tid,
        label: names ? (locale === "en" ? names.nameEn : names.name) : tid,
        labelEn: names?.nameEn ?? tid,
      });
    }
  }

  return conditions;
}
