import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

export const RECORDS_PAGE_SIZE = 20;

export function recordsPath(slug: string, page: number, locale: string = "ko") {
  return `${locale === "en" ? "/en" : ""}/celeb/${encodeURIComponent(slug)}/records/${page}`;
}

export function parseRecordsPage(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= Math.floor(Number.MAX_SAFE_INTEGER / RECORDS_PAGE_SIZE)
    ? page : null;
}

interface RecordsDependencies {
  getProfile: (slug: string, locale: string) => Promise<{
    success: boolean;
    data?: CelebBySlugProfile | null;
  }>;
  getContents: (params: { userId: string; page: number; limit: number; sortBy: "recent" }, locale: string) => Promise<GetUserContentsResponse>;
  /** 작품 소개(줄거리). getContentBrief는 작품 단위로 서버 캐시되어 있어(카카오 등
   *  바깥 조회는 첫 조회에만 든다) 한 쪽(최대 20건)을 병렬로 불러도 부담이 적다. */
  getBrief: (contentId: string, locale: string) => Promise<ContentBrief | null>;
}

export async function loadRecordsPage(
  slug: string,
  locale: string,
  pageValue: string,
  dependencies: RecordsDependencies,
) {
  const page = parseRecordsPage(pageValue);
  if (page === null) return null;
  const result = await dependencies.getProfile(slug, locale);
  if (!result.success || !result.data || result.data.celeb_tier !== "full") return null;
  const profile = result.data;
  // 먼저 마지막 쪽을 확인해 임의의 큰 offset마다 DB 조회·빈 캐시가 생기는 것을 막는다.
  const first = await dependencies.getContents({ userId: profile.id, page: 1, limit: RECORDS_PAGE_SIZE, sortBy: "recent" }, locale);
  if (first.total === 0 || page > first.totalPages) return null;
  const contents = page === 1 ? first : await dependencies.getContents({
    userId: profile.id, page, limit: RECORDS_PAGE_SIZE, sortBy: "recent",
  }, locale);
  if (contents.items.length === 0) return null;

  // 개인 감상평만으로는 뭘 감상했는지 알기 어려워, 작품 소개를 함께 내려준다.
  // 항목 하나가 실패해도 나머지 소개가 통째로 사라지지 않게 개별로 잡는다.
  const descriptions = Object.fromEntries(
    await Promise.all(contents.items.map(async (item) => {
      const brief = await dependencies.getBrief(item.content_id, locale).catch(() => null);
      return [item.content_id, brief?.description ?? null] as const;
    })),
  );

  return { profile, contents, page, descriptions };
}
