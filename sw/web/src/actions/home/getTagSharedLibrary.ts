/*
  파일명: actions/home/getTagSharedLibrary.ts
  기능: 세력도감 태그 내 셀럽들의 공유 콘텐츠 조회
  책임: 2명 이상이 공통으로 감상한 콘텐츠를 celebCount 내림차순으로 반환
*/
"use server";

import { unstable_cache } from "next/cache"
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { CL_SELECT_LIST, type ContentLocaleRow } from "@/lib/utils/content-locale";

interface SharedContentCeleb {
  id: string;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
}

export interface SharedContent {
  contentId: string;
  title: string;
  title_en: string | null;
  creator: string | null;
  creator_en: string | null;
  thumbnailUrl: string | null;
  type: string;
  celebCount: number;
  celebs: SharedContentCeleb[];
}

async function fetchTagSharedLibrary(tagId: string): Promise<SharedContent[]> {
  const supabase = createStaticClient();

  // 1. 태그에 속한 셀럽 ID 조회 — 단일 원천은 제작 테이블, 뷰가 웹 전용 배정과 합쳐 준다
  const { data: assignments } = await supabase
    .from("faction_atlas_members")
    .select("celeb_id")
    .eq("tag_id", tagId)
    .eq("hidden", false);

  if (!assignments?.length) return [];

  const celebIds = assignments.map((a) => a.celeb_id);

  // 2. 셀럽 프로필 조회 (닉네임, 아바타)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, nickname_en, avatar_url")
    .in("id", celebIds);

  const profileMap = new Map<string, SharedContentCeleb>();
  (profiles ?? []).forEach((p) =>
    profileMap.set(p.id, {
      id: p.id,
      nickname: p.nickname,
      nickname_en: p.nickname_en,
      avatar_url: p.avatar_url,
    })
  );

  // 3. user_contents + contents JOIN
  const { data, error } = await supabase
    .from("user_contents")
    .select(
      `user_id, content_id, contents!inner(id, type, content_locales(${CL_SELECT_LIST}))`
    )
    .in("user_id", celebIds)
    .eq("visibility", "public");

  if (error || !data) return [];

  // 4. content_id 기준 그룹화
  const contentMap = new Map<
    string,
    {
      title: string;
      title_en: string | null;
      creator: string | null;
      creator_en: string | null;
      thumbnailUrl: string | null;
      type: string;
      celebIds: Set<string>;
    }
  >();

  for (const row of data) {
    const c = row.contents as unknown as {
      id: string; type: string | null;
      content_locales: ContentLocaleRow[] | null;
    };
    const ko = c.content_locales?.find(l => l.locale === 'ko');
    const en = c.content_locales?.find(l => l.locale === 'en');

    const existing = contentMap.get(c.id);
    if (existing) {
      existing.celebIds.add(row.user_id);
    } else {
      contentMap.set(c.id, {
        title: ko?.title || en?.title || "",
        title_en: en?.title ?? null,
        creator: ko?.creator || en?.creator || null,
        creator_en: en?.creator ?? null,
        thumbnailUrl: ko?.thumbnail_url || en?.thumbnail_url || null,
        type: c.type ?? "BOOK",
        celebIds: new Set([row.user_id]),
      });
    }
  }

  // 5. 2명 이상 공유 콘텐츠만 필터 → celebCount 내림차순
  const result: SharedContent[] = [];

  for (const [contentId, info] of contentMap) {
    if (info.celebIds.size < 2) continue;

    const celebs: SharedContentCeleb[] = [];
    for (const cid of info.celebIds) {
      const profile = profileMap.get(cid);
      if (profile) celebs.push(profile);
    }

    result.push({
      contentId,
      title: info.title,
      title_en: info.title_en,
      creator: info.creator,
      creator_en: info.creator_en,
      thumbnailUrl: info.thumbnailUrl,
      type: info.type,
      celebCount: info.celebIds.size,
      celebs,
    });
  }

  result.sort((a, b) => b.celebCount - a.celebCount);

  return result;
}

export const getTagSharedLibrary = unstable_cache(
  fetchTagSharedLibrary,
  ['tag-shared-library'],
  // faction_atlas_members(편성) + profiles + user_contents
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
);
