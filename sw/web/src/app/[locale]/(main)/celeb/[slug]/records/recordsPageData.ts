import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
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
  return { profile, contents, page };
}
