import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

const RECORDS_FETCH_BATCH_SIZE = 100;

export function recordsPath(slug: string) {
  return `/celeb/${encodeURIComponent(slug)}/records`;
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
) {
  const result = await dependencies.getProfile(slug, locale);
  if (!result.success || !result.data || result.data.celeb_tier !== "full") return null;

  const profile = result.data;
  const first = await dependencies.getContents({
    userId: profile.id,
    page: 1,
    limit: 1,
    sortBy: "recent",
  }, locale);
  if (first.total === 0) return null;

  const fetchLimit = Math.min(first.total, RECORDS_FETCH_BATCH_SIZE);
  const batchCount = Math.ceil(first.total / fetchLimit);
  const batches = await Promise.all(
    Array.from({ length: batchCount }, (_, batchIndex) => {
      const page = batchIndex + 1;
      return dependencies.getContents({
        userId: profile.id,
        page,
        limit: fetchLimit,
        sortBy: "recent",
      }, locale);
    }),
  );
  const contents: GetUserContentsResponse = {
    items: batches.flatMap((batch) => batch.items),
    page: 1,
    total: first.total,
    totalPages: 1,
    hasMore: false,
  };
  if (contents.items.length === 0) return null;

  const descriptions = Object.fromEntries(
    await Promise.all(contents.items.map(async (item) => {
      const brief = await dependencies.getBrief(item.content_id, locale).catch(() => null);
      return [item.content_id, brief?.description ?? null] as const;
    })),
  );

  return { profile, contents, descriptions };
}
