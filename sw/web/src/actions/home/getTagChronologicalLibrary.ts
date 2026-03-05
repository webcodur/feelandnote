/*
  파일명: actions/home/getTagChronologicalLibrary.ts
  기능: 기획전 태그 내 셀럽들의 연대기 콘텐츠 조회
  책임: 출생연도 순 정렬된 셀럽 목록과 셀럽별 감상 콘텐츠 반환
*/
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  TimelineCeleb,
  TimelineContent,
} from "@/components/features/game/shared/CelebContentTimeline";

export async function getTagChronologicalLibrary(tagId: string): Promise<{
  celebs: TimelineCeleb[];
  contentsMap: Record<string, TimelineContent[]>;
}> {
  const supabase = await createClient();

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
    .select("id, nickname, avatar_url, profession, birth_date")
    .in("id", celebIds);

  if (!profiles?.length) return { celebs: [], contentsMap: {} };

  // birthYear 계산 후 정렬
  const celebs: TimelineCeleb[] = profiles
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
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
      "user_id, content_id, review, source_url, contents!inner(id, title, creator, thumbnail_url, type)"
    )
    .in("user_id", celebIds)
    .eq("visibility", "public");

  if (error || !data) return { celebs, contentsMap: {} };

  const contentsMap: Record<string, TimelineContent[]> = {};

  for (const row of data) {
    const c = row.contents as unknown as {
      id: string;
      title: string | null;
      creator: string | null;
      thumbnail_url: string | null;
      type: string | null;
    };

    if (!contentsMap[row.user_id]) {
      contentsMap[row.user_id] = [];
    }

    // 셀럽당 최대 4개
    if (contentsMap[row.user_id].length >= 4) continue;

    contentsMap[row.user_id].push({
      contentId: c.id,
      title: c.title ?? "",
      creator: c.creator,
      thumbnailUrl: c.thumbnail_url,
      type: c.type ?? "BOOK",
      review: (row as any).review ?? null,
      sourceUrl: (row as any).source_url ?? null,
    });
  }

  return { celebs, contentsMap };
}
