import { flattenLocales } from '@/lib/utils/content-locale'
import type { LibraryContent, LibraryResult } from '@/actions/library/types'

/** The all-era and single-era RPCs return the same columns. Keep one card mapping. */
export function toScriptureResult(rows: Record<string, unknown>[] | null, locale: string, page: number, limit: number): LibraryResult {
  const total = Number(rows?.[0]?.total_count ?? 0)
  const contents: LibraryContent[] = (rows ?? []).map(row => {
    const titleKo = (row.title_ko as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    const creatorEn = (row.creator_en as string) ?? null
    const thumbnailEn = (row.thumbnail_en as string) ?? null
    const type = row.content_type as string
    const flat = flattenLocales([
      { locale: 'ko', title: titleKo, creator: (row.creator as string) ?? null,
        thumbnail_url: (row.thumbnail_url as string) ?? null, sources: row.sources_ko },
      { locale: 'en', title: titleEn, creator: creatorEn, thumbnail_url: thumbnailEn, sources: row.sources_en },
    ], locale, type)
    return {
      id: row.content_id as string, type, title: flat.title, creator: flat.creator,
      thumbnail_url: flat.thumbnail_url, title_badge: flat.title_badge,
      celeb_count: Number(row.celeb_count), user_count: Number(row.user_count),
      avg_rating: row.avg_rating == null ? null : Number(row.avg_rating),
      title_ko: titleKo, title_en: titleEn, creator_en: creatorEn,
      isbn_en: (row.isbn_en as string) ?? null, thumbnail_en: thumbnailEn,
      has_en_edition: (row.has_en_edition as boolean) ?? null,
    }
  })
  return { contents, total, totalPages: Math.ceil(total / limit), currentPage: page }
}
