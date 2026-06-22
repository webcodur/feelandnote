/*
  파일명: actions/game/getDawnCelebContents.ts
  기능: 여러 셀럽의 감상 콘텐츠 배치 조회
  책임: 여명 게임 결과에서 셀럽별 콘텐츠 표시용 데이터 반환
*/
"use server";

import { unstable_cache } from "next/cache";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { getLocale } from "next-intl/server";
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from "@/lib/utils/content-locale";

export interface DawnContent {
  contentId: string;
  title: string;
  creator: string | null;
  thumbnailUrl: string | null;
  type: string;
  review: string | null;
  sourceUrl: string | null;
}

// user_contents → contents(content_locales) 조인 조회 행
interface DawnContentRow {
  user_id: string;
  content_id: string;
  review: string | null;
  source_url: string | null;
  contents: {
    id: string;
    type: string | null;
    content_locales: ContentLocaleRow[] | null;
  };
}

// 캐시 inner: 정렬된 id 목록 문자열 + locale만 받아 캐시 키를 안정화한다
async function fetchDawnCelebContents(
  idsKey: string,
  locale: string
): Promise<Record<string, DawnContent[]>> {
  const supabase = createStaticClient();
  const celebIds = idsKey.split(",");

  // 단일 쿼리: user_contents JOIN contents (셀럽당 최대 4개는 클라이언트에서 제한)
  // contents는 to-one 조인이라 객체로 반환 — 파서가 배열로 추론하므로 overrideTypes로 교정
  const { data, error } = await supabase
    .from("user_contents")
    .select(
      `user_id, content_id, review, source_url, contents!inner(id, type, content_locales(${CL_SELECT_LIST}))`
    )
    .in("user_id", celebIds)
    .eq("visibility", "public")
    .overrideTypes<DawnContentRow[], { merge: false }>();

  if (error || !data) return {};

  const result: Record<string, DawnContent[]> = {};

  for (const row of data) {
    const rawContent = row.contents;
    const flat = flattenLocales(rawContent.content_locales, locale);

    if (!result[row.user_id]) {
      result[row.user_id] = [];
    }

    // 셀럽당 최대 4개
    if (result[row.user_id].length >= 4) continue;

    result[row.user_id].push({
      contentId: rawContent.id,
      title: flat.title,
      creator: flat.creator,
      thumbnailUrl: flat.thumbnail_url,
      type: rawContent.type ?? "BOOK",
      review: row.review ?? null,
      sourceUrl: row.source_url ?? null,
    });
  }

  return result;
}

const getCachedDawnCelebContents = unstable_cache(
  fetchDawnCelebContents,
  ["dawn-celeb-contents"],
  { revalidate: STATIC_REVALIDATE, tags: ["celebs"] }
);

export async function getDawnCelebContents(
  celebIds: string[]
): Promise<Record<string, DawnContent[]>> {
  if (celebIds.length === 0) return {};

  // locale은 요청 컨텍스트 의존이라 캐시 밖에서 확정해 인자로 전달
  const locale = await getLocale();
  return getCachedDawnCelebContents([...celebIds].sort().join(","), locale);
}
