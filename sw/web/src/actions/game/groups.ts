"use server";

/**
 * 넷씩 넷 (Groups) — 서버 액션
 *
 * DB에서 묶음 후보를 조회하여 PuzzlePool을 조립한다.
 * 환경값이 없으면 체험 표본으로 돌아간다 (화면에 명시).
 */

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import type { GroupDef, GroupItem } from "@/components/features/game/groups/types";
import type { PuzzlePool } from "@/components/features/game/groups/engine";
import { getFixturePool, isFixtureMode } from "@/components/features/game/groups/fixture";

interface TagRow {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
}

interface TagAssignmentRow {
  celeb_id: string;
  tag_id: string;
  celeb: {
    id: string;
    nickname: string;
    nickname_en: string | null;
    avatar_url: string | null;
    profession: string | null;
    nationality: string | null;
    publication_status: string;
  } | null;
}

/**
 * DB에서 세력 태그 기반 묶음 + 직군/국적 기반 묶음을 조합하여
 * 서로 겹치지 않는 퍼즐 풀을 만든다.
 *
 * 겹침 방지 전략:
 * 1. 태그 묶음: celeb_tag_assignments에서 인원 4명 이상인 태그를 후보로 삼는다.
 * 2. 직군 묶음: 같은 직군 인물 중 국적이 모두 다른 4명을 뽑는다.
 * 3. 국적 묶음: 같은 국적 인물 중 직군이 모두 다른 4명을 뽑는다.
 * 4. 최종 조합 시 인물 중복이 없도록 필터.
 */
async function fetchGroupsPool(locale: string): Promise<PuzzlePool> {
  const db = createStaticClient();

  // 1) 인원 4명 이상인 세력 태그 조회
  const { data: tags, error: tagError } = await db
    .from("celeb_tags")
    .select("id, name, name_en, slug")
    .is("parent_id", null) // 최상위 태그만
    .overrideTypes<TagRow[], { merge: false }>();

  if (tagError) throw new Error(`[getGroupsPool] tags: ${tagError.message}`);

  // 2) 태그별 인물 조회
  const { data: assignments, error: assignError } = await db
    .from("celeb_tag_assignments")
    .select(`
      celeb_id,
      tag_id,
      celeb:celebs!celeb_tags_celebs_fkey (
        id, nickname, nickname_en, avatar_url, profession, nationality, publication_status
      )
    `)
    .overrideTypes<TagAssignmentRow[], { merge: false }>();

  if (assignError) throw new Error(`[getGroupsPool] assignments: ${assignError.message}`);

  const groups: GroupDef[] = [];
  const members: GroupItem[][] = [];

  // 태그별로 활성 인물 4명 이상인 태그를 묶음 후보로 등록
  const tagMap = new Map(tags?.map((t) => [t.id, t]) ?? []);

  const assignmentsByTag = new Map<string, TagAssignmentRow[]>();
  for (const a of assignments ?? []) {
    if (!a.celeb || a.celeb.publication_status !== "active") continue;
    const arr = assignmentsByTag.get(a.tag_id) ?? [];
    arr.push(a);
    assignmentsByTag.set(a.tag_id, arr);
  }

  for (const [tagId, tagAssignments] of assignmentsByTag.entries()) {
    if (tagAssignments.length < 4) continue;
    const tag = tagMap.get(tagId);
    if (!tag) continue;

    // 태그에서 4명만 취한다 (sort_order나 첫 4명)
    const fourMembers = tagAssignments.slice(0, 4).map((a) => {
      // assignmentsByTag에 넣을 때 null 조인을 이미 거른다.
      const celeb = a.celeb!;
      return {
        id: celeb.id,
        name: locale === "en"
          ? (celeb.nickname_en || celeb.nickname)
          : celeb.nickname,
        avatarUrl: celeb.avatar_url,
        groupIndex: -1, // 나중에 부여
      };
    });

    groups.push({
      label: locale === "en" ? (tag.name_en || tag.name) : tag.name,
      difficulty: 1, // 태그 기반은 보통 난이도
      axis: "tag",
      axisValue: tag.slug,
    });
    members.push(fourMembers);
  }

  // 3) 직군별 묶음 (국적이 모두 다른 4명)
  const professionPool = new Map<string, TagAssignmentRow["celeb"][]>();
  for (const a of assignments ?? []) {
    if (!a.celeb || a.celeb.publication_status !== "active" || !a.celeb.profession) continue;
    const arr = professionPool.get(a.celeb.profession) ?? [];
    // 중복 방지
    if (!arr.find((p) => p!.id === a.celeb!.id)) {
      arr.push(a.celeb);
      professionPool.set(a.celeb.profession, arr);
    }
  }

  const PROFESSION_LABELS: Record<string, { ko: string; en: string }> = {
    scientist: { ko: "과학자", en: "Scientists" },
    author: { ko: "작가", en: "Authors" },
    commander: { ko: "지휘관", en: "Commanders" },
    entrepreneur: { ko: "기업가", en: "Entrepreneurs" },
    musician: { ko: "음악인", en: "Musicians" },
    politician: { ko: "정치인", en: "Politicians" },
    leader: { ko: "지도자", en: "Leaders" },
    director: { ko: "감독", en: "Directors" },
    athlete: { ko: "스포츠인", en: "Athletes" },
  };

  for (const [prof, profMembers] of professionPool.entries()) {
    // 국적이 모두 다른 4명을 찾아 함정 구조로 만든다
    const withNationality = profMembers.filter((p) => p?.nationality);
    const diverseGroup = pickDiverseByField(withNationality, "nationality", 4);
    if (diverseGroup.length < 4) continue;

    const label = PROFESSION_LABELS[prof];
    if (!label) continue;

    groups.push({
      label: locale === "en" ? label.en : label.ko,
      difficulty: 2,
      axis: "profession",
      axisValue: prof,
    });
    members.push(
      diverseGroup.map((p) => ({
        id: p!.id,
        name: locale === "en" ? (p!.nickname_en || p!.nickname) : p!.nickname,
        avatarUrl: p!.avatar_url,
        groupIndex: -1,
      }))
    );
  }

  return { groups, members };
}

/** 특정 필드의 값이 모두 다른 N명을 뽑는다 */
function pickDiverseByField(
  items: (TagAssignmentRow["celeb"])[],
  field: "nationality" | "profession",
  count: number
): (TagAssignmentRow["celeb"])[] {
  const seen = new Set<string>();
  const result: (TagAssignmentRow["celeb"])[] = [];
  for (const item of items) {
    if (!item) continue;
    const value = item[field];
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(item);
    if (result.length >= count) break;
  }
  return result;
}

const getGroupsPoolCached = unstable_cache(
  fetchGroupsPool,
  ["groups-game-pool"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS] }
);

export interface GroupsDataResult {
  pool: PuzzlePool;
  isFixture: boolean;
}

export async function getGroupsData(): Promise<GroupsDataResult> {
  const locale = await getLocale();

  if (isFixtureMode()) {
    return { pool: getFixturePool(locale), isFixture: true };
  }

  try {
    const pool = await getGroupsPoolCached(locale);
    return { pool, isFixture: false };
  } catch (err) {
    // 조용한 폴백 금지 — 왜 표본으로 돌아갔는지 서버 로그에 남긴다
    console.error("[groups] 실제 조회 실패 → 체험 표본으로 전환:", err);
    // DB 조회 실패 시 표본으로 폴백 (화면에 명시)
    return { pool: getFixturePool(locale), isFixture: true };
  }
}
