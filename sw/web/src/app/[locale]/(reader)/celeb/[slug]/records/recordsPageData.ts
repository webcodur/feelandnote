import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

const RECORDS_FETCH_BATCH_SIZE = 100;
export const RECORDS_PAGE_SIZE = 20;

export function recordsPath(slug: string, page = 1) {
  const path = `/celeb/${encodeURIComponent(slug)}/records`;
  return page === 1 ? path : `${path}/${page}`;
}

export function parseRecordsPage(value?: string) {
  if (value === undefined) return 1;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

interface RecordsDependencies {
  getProfile: (slug: string, locale: string) => Promise<{
    success: boolean;
    data?: CelebBySlugProfile | null;
  }>;
  getContents: (params: {
    userId: string;
    page: number;
    limit: number;
    sortBy: "recent";
  }, locale: string) => Promise<GetUserContentsResponse>;
  getBrief: (contentId: string, locale: string) => Promise<ContentBrief | null>;
}

export async function loadRecords(
  slug: string,
  locale: string,
  dependencies: RecordsDependencies,
  page = 1,
  focusContentId?: string,
) {
  if (!Number.isSafeInteger(page) || page < 1) return null;
  const result = await dependencies.getProfile(slug, locale);
  if (!result.success || !result.data || result.data.celeb_tier !== "full") return null;

  const profile = result.data;
  let contents = await dependencies.getContents({
    userId: profile.id,
    page: 1,
    limit: RECORDS_PAGE_SIZE,
    sortBy: "recent",
  }, locale);
  if (contents.total === 0) return null;
  const requestedPageExists = page <= Math.ceil(contents.total / RECORDS_PAGE_SIZE);
  // The database range API throws for an offset beyond the archive. Reuse the
  // cached first page to validate bounds before querying later pages.
  if (!requestedPageExists && !focusContentId) return null;
  if (page > 1 && requestedPageExists) {
    contents = await dependencies.getContents({
      userId: profile.id,
      page,
      limit: RECORDS_PAGE_SIZE,
      sortBy: "recent",
    }, locale);
  }

  // Existing deep links identify a work, not a page. Only those requests scan for
  // its position; descriptions are fetched only for the page being displayed.
  if (focusContentId && !contents.items.some((item) => item.content_id === focusContentId)) {
    const batchCount = Math.ceil(contents.total / RECORDS_FETCH_BATCH_SIZE);
    for (let batchPage = 1; batchPage <= batchCount; batchPage += 1) {
      const batch = await dependencies.getContents({
        userId: profile.id,
        page: batchPage,
        limit: RECORDS_FETCH_BATCH_SIZE,
        sortBy: "recent",
      }, locale);
      const index = batch.items.findIndex((item) => item.content_id === focusContentId);
      if (index < 0) continue;
      const focusPage = Math.floor(((batchPage - 1) * RECORDS_FETCH_BATCH_SIZE + index) / RECORDS_PAGE_SIZE) + 1;
      contents = await dependencies.getContents({
        userId: profile.id,
        page: focusPage,
        limit: RECORDS_PAGE_SIZE,
        sortBy: "recent",
      }, locale);
      break;
    }
  }
  if (!requestedPageExists && !contents.items.some((item) => item.content_id === focusContentId)) return null;
  if (contents.items.length === 0) return null;

  const descriptions = Object.fromEntries(
    await Promise.all(contents.items.map(async (item) => {
      const brief = await dependencies.getBrief(item.content_id, locale).catch(() => null);
      return [item.content_id, brief?.description ?? null] as const;
    })),
  );

  return { profile, contents, descriptions };
}
