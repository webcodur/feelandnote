/*
  파일명: actions/home/getTagChronologicalLibrary.ts
  기능: 기획전 태그 내 셀럽들의 연대기 콘텐츠 조회
  책임: 출생연도 순 정렬된 셀럽 목록과 셀럽별 감상 콘텐츠 반환
*/
"use server";

import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { CL_SELECT_LIST, type ContentLocaleRow } from "@/lib/utils/content-locale";
import type {
  TimelineCeleb,
  TimelineContent,
} from "@/components/features/game/shared/CelebContentTimeline";

// 프로필 select 결과 행
interface ChronoProfileRow {
  id: string;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  profession: string | null;
  birth_date: string | null;
}

// user_contents + contents 조인 select 결과 행
interface ChronoUserContentRow {
  user_id: string;
  content_id: string;
  review: string | null;
  review_en: string | null;
  source_url: string | null;
  contents: {
    id: string;
    type: string | null;
    content_locales: ContentLocaleRow[] | null;
  };
}

async function fetchTagChronologicalLibrary(tagId: string): Promise<{
  celebs: TimelineCeleb[];
  contentsMap: Record<string, TimelineContent[]>;
}> {
  const supabase = createStaticClient();

  // 1. 태그에 속한 셀럽 ID 조회
  const { data: assignments } = await supabase
    .from("celeb_tag_assignments")
    .select("celeb_id")
    .eq("tag_id", tagId);

  if (!assignments?.length) return { celebs: [], contentsMap: {} };

  const celebIds = assignments.map((a) => a.celeb_id);

  // 2. 프로필 조회 (birthYear 계산용)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, nickname_en, avatar_url, profession, birth_date")
    .in("id", celebIds);

  if (!profiles?.length) return { celebs: [], contentsMap: {} };

  // birthYear 계산 후 정렬
  const celebs: TimelineCeleb[] = (profiles as ChronoProfileRow[])
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      nickname_en: p.nickname_en,
      avatar_url: p.avatar_url,
      profession: p.profession,
      birthYear: p.birth_date ? new Date(p.birth_date).getFullYear() : 0,
    }))
    .filter((c) => c.birthYear !== 0)
    .sort((a, b) => a.birthYear - b.birthYear);

  // 3. user_contents + contents JOIN (셀럽당 최대 4개)
  const { data, error } = await supabase
    .from("user_contents")
    .select(
      `user_id, content_id, review, review_en, source_url, contents!inner(id, type, content_locales(${CL_SELECT_LIST}))`
    )
    .in("user_id", celebIds)
    .eq("visibility", "public");

  if (error || !data) return { celebs, contentsMap: {} };

  const contentsMap: Record<string, TimelineContent[]> = {};

  // 다대일 조인(contents)을 supabase가 배열로 잘못 추론하므로 unknown 경유 캐스트
  for (const row of data as unknown as ChronoUserContentRow[]) {
    const c = row.contents;
    const ko = c.content_locales?.find(l => l.locale === 'ko');
    const en = c.content_locales?.find(l => l.locale === 'en');

    if (!contentsMap[row.user_id]) {
      contentsMap[row.user_id] = [];
    }

    // 셀럽당 최대 4개
    if (contentsMap[row.user_id].length >= 4) continue;

    contentsMap[row.user_id].push({
      contentId: c.id,
      title: ko?.title || en?.title || "",
      title_en: en?.title ?? null,
      creator: ko?.creator || en?.creator || null,
      creator_en: en?.creator ?? null,
      thumbnailUrl: ko?.thumbnail_url || en?.thumbnail_url || null,
      type: c.type ?? "BOOK",
      review: row.review ?? null,
      review_en: row.review_en ?? null,
      sourceUrl: row.source_url ?? null,
    });
  }

  return { celebs, contentsMap };
}

export const getTagChronologicalLibrary = unstable_cache(
  fetchTagChronologicalLibrary,
  ['tag-chronological-library'],
  { revalidate: 3600, tags: ['celebs'] }
);
