"use server";

/**
 * 경로 잇기 (Travel) 서버 조회
 *
 * 역할:
 * 1. 인접 리스트(그래프) 구축: celeb_tag_assignments + celeb_contents.
 * 2. 인물 기본 정보 조회.
 * 3. 7일 단일 키 공유 캐시.
 *
 * 조회 실패 시 에러를 던진다 — 조용한 폴백 금지.
 * 배포 환경에서만 동작하며 로컬에서는 fixture가 대신한다.
 */

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { LISTING_DEFAULT_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { selectAllPages, selectInChunks } from "@feelandnote/shared/lib/paginate";
import type { AdjacencyEdge, TravelCeleb, TravelGraph } from "@/components/features/game/travel/types";

// ──────────────────── 타입 ────────────────────

interface ProfileRow {
  id: string;
  nickname: string;
  nickname_en: string | null;
  slug: string;
  nationality: string | null;
  profession: string | null;
  avatar_url: string | null;
}

interface TagAssignmentRow {
  celeb_id: string;
  tag_id: string;
}

interface TagRow {
  id: string;
  name: string;
  name_en: string | null;
}

interface CelebContentRow {
  celeb_id: string;
  content_id: string;
}

interface ContentLocaleRow {
  content_id: string;
  title: string | null;
}

// ──────────────────── 데이터 가져오기 ────────────────────

async function fetchTravelGraph(locale: string): Promise<TravelGraph> {
  const supabase = createStaticClient();

  // 1) 활성 셀럽 프로필
  const celebRows = await selectAllPages<ProfileRow>((from, to) =>
    supabase
      .from("celebs")
      .select("id, nickname, nickname_en, slug, nationality, profession, avatar_url")
      .eq("publication_status", "active")
      .in("celeb_tier", [...LISTING_DEFAULT_TIERS])
      .order("id", { ascending: true })
      .range(from, to) as unknown as PromiseLike<{
      data: ProfileRow[] | null;
      error: { message: string } | null;
    }>,
  );

  if (celebRows.length === 0) {
    throw new Error("[fetchTravelGraph] No celebs loaded");
  }

  const profileMap = new Map<string, ProfileRow>(celebRows.map((p) => [p.id, p]));

  // 2) 세력 태그 배정
  const tagAssignments = await selectAllPages<TagAssignmentRow>((from, to) =>
    supabase
      .from("celeb_tag_assignments")
      .select("celeb_id, tag_id")
      .order("id", { ascending: true })
      .range(from, to) as unknown as PromiseLike<{
      data: TagAssignmentRow[] | null;
      error: { message: string } | null;
    }>,
  );

  // 3) 태그 이름
  const { data: tags, error: tagError } = await supabase
    .from("celeb_tags")
    .select("id, name, name_en")
    .order("id", { ascending: true })
    .limit(200);

  if (tagError) {
    throw new Error(`[fetchTravelGraph] celeb_tags: ${tagError.message}`);
  }

  const tagNameMap = new Map<string, string>(
    (tags ?? []).map((t: TagRow) => [
      t.id,
      locale === "en" ? (t.name_en || t.name) : t.name,
    ]),
  );

  // 4) celeb_contents (셀럽이 기록한 콘텐츠)
  // 전량 조회: in()은 462개에서 실패한 실측 이력이 있으므로 selectInChunks(200개 단위)를 쓴다.
  // 각 chunk 안에서도 PostgREST 1,000행 상한을 넘을 수 있으므로 selectAllPages로 페이징한다.
  const celebIds = [...profileMap.keys()];
  const celebContents = await selectInChunks<CelebContentRow>(celebIds, (chunk) =>
    selectAllPages<CelebContentRow>((from, to) =>
      supabase
        .from("celeb_contents")
        .select("celeb_id, content_id")
        .in("celeb_id", chunk)
        .order("id", { ascending: true })
        .range(from, to) as unknown as PromiseLike<{
        data: CelebContentRow[] | null;
        error: { message: string } | null;
      }>,
    ).then((data) => ({ data, error: null })),
  );

  // 5) 콘텐츠 제목 (간선 레이블용)
  const contentIds = [...new Set(celebContents.map((row) => row.content_id))];
  const contentTitleMap = new Map<string, string>();
  if (contentIds.length > 0) {
    // 제목은 content_locales에서. in()은 200개 단위로 나눠 조회한다.
    const titleRows = await selectInChunks<ContentLocaleRow>(contentIds, (chunk) =>
      supabase
        .from("content_locales")
        .select("content_id, title")
        .in("content_id", chunk)
        .eq("locale", locale) as unknown as PromiseLike<{
        data: ContentLocaleRow[] | null;
        error: { message: string } | null;
      }>,
    );
    for (const row of titleRows) {
      if (row.title) contentTitleMap.set(row.content_id, row.title);
    }
  }

  // ──────────── 그래프 구축 ────────────────

  const adjacency: Record<string, AdjacencyEdge[]> = {};
  const celebs: Record<string, TravelCeleb> = {};

  // 노드 초기화
  for (const p of celebRows) {
    adjacency[p.id] = [];
    celebs[p.id] = {
      id: p.id,
      nickname: locale === "en" ? (p.nickname_en || p.nickname) : p.nickname,
      nicknameEn: p.nickname_en || p.nickname,
      slug: p.slug,
      avatarUrl: p.avatar_url,
      profession: p.profession,
      nationality: p.nationality,
    };
  }

  // 태그 간선: 같은 태그에 속한 셀럽끼리 연결
  const tagToCelebs = new Map<string, string[]>();
  for (const row of tagAssignments) {
    if (!profileMap.has(row.celeb_id)) continue;
    const arr = tagToCelebs.get(row.tag_id) ?? [];
    arr.push(row.celeb_id);
    tagToCelebs.set(row.tag_id, arr);
  }

  for (const [tagId, members] of tagToCelebs) {
    // 허브 캡: 태그에 20명 초과면 간선을 만들지 않는다 (붕괴 방지)
    if (members.length > 20) continue;

    const tagLabel = tagNameMap.get(tagId) ?? tagId;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        addEdge(adjacency, members[i], members[j], { type: "tag", label: tagLabel });
      }
    }
  }

  // 콘텐츠 간선: 같은 콘텐츠를 기록한 셀럽끼리 연결
  const contentToCelebs = new Map<string, string[]>();
  for (const row of celebContents) {
    if (!profileMap.has(row.celeb_id)) continue;
    const arr = contentToCelebs.get(row.content_id) ?? [];
    arr.push(row.celeb_id);
    contentToCelebs.set(row.content_id, arr);
  }

  for (const [contentId, members] of contentToCelebs) {
    // 허브 캡: 10명 초과 공유 콘텐츠는 간선으로 만들지 않는다 (성경·논어 허브 차단)
    if (members.length > 10) continue;
    if (members.length < 2) continue;

    const title = contentTitleMap.get(contentId) ?? contentId;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        addEdge(adjacency, members[i], members[j], { type: "content", label: title });
      }
    }
  }

  return { adjacency, celebs };
}

function addEdge(
  adjacency: Record<string, AdjacencyEdge[]>,
  a: string,
  b: string,
  reason: { type: "content" | "tag"; label: string },
) {
  // a → b
  const existingAB = adjacency[a]?.find((e) => e.targetId === b);
  if (existingAB) {
    if (!existingAB.reasons.some((r) => r.type === reason.type && r.label === reason.label)) {
      existingAB.reasons.push(reason);
    }
  } else {
    adjacency[a] = adjacency[a] ?? [];
    adjacency[a].push({ targetId: b, reasons: [reason] });
  }

  // b → a
  const existingBA = adjacency[b]?.find((e) => e.targetId === a);
  if (existingBA) {
    if (!existingBA.reasons.some((r) => r.type === reason.type && r.label === reason.label)) {
      existingBA.reasons.push(reason);
    }
  } else {
    adjacency[b] = adjacency[b] ?? [];
    adjacency[b].push({ targetId: a, reasons: [reason] });
  }
}

// ──────────────────── 캐시 래퍼 ────────────────────

const getTravelGraphCached = unstable_cache(
  fetchTravelGraph,
  ["travel-game-graph"],
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS, CACHE_TAGS.TAGS],
  },
);

// ──────────────────── 공개 API ────────────────────

export interface TravelGameData {
  graph: TravelGraph;
  isFixture: boolean;
}

export async function getTravelGameData(): Promise<TravelGameData> {
  try {
    const locale = await getLocale();
    const graph = await getTravelGraphCached(locale);

    if (Object.keys(graph.adjacency).length === 0) {
      throw new Error("Empty graph");
    }

    return { graph, isFixture: false };
  } catch (err) {
    // 조용한 폴백 금지 — 왜 표본으로 돌아갔는지 서버 로그에 남긴다
    console.error("[travel] 실제 조회 실패 → 체험 표본으로 전환:", err);
    // 환경값 부재 또는 조회 실패 → 체험 표본
    const { FIXTURE_GRAPH } = await import(
      "@/components/features/game/travel/fixture"
    );
    return { graph: FIXTURE_GRAPH, isFixture: true };
  }
}
