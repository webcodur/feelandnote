import type { ContentStatus, ContentType, VisibilityType } from '@/types/database'
import { flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import type { UserContentPublic } from './getUserContents'

type RawRow = Record<string, unknown>

function getContent(row: RawRow): RawRow | null {
  const value = row.content
  const content = Array.isArray(value) ? value[0] : value
  return content && typeof content === 'object' ? content as RawRow : null
}

function mapBase(row: RawRow, locale: string) {
  const content = getContent(row)
  if (!content) return null
  const flat = flattenLocales(content.content_locales as ContentLocaleRow[] | null, locale)
  return {
    id: row.id as string,
    content_id: row.content_id as string,
    status: row.status as ContentStatus,
    visibility: row.visibility as VisibilityType | null,
    created_at: row.created_at as string,
    content,
    flat,
  }
}

export function mapCelebIndexRow(row: RawRow, locale: string): UserContentPublic | null {
  const base = mapBase(row, locale)
  if (!base) return null
  return {
    id: base.id,
    content_id: base.content_id,
    status: base.status,
    is_recommended: false,
    visibility: base.visibility,
    created_at: base.created_at,
    source_url: null,
    content: {
      id: base.content.id as string,
      type: base.content.type as ContentType,
      title: base.flat.title,
      creator: base.flat.creator,
      thumbnail_url: base.flat.thumbnail_url,
      metadata: null,
      user_count: null,
      title_ko: base.flat.title_ko,
      title_en: base.flat.title_en,
      creator_en: base.flat.creator_en,
      isbn_en: base.flat.isbn_en,
      thumbnail_en: base.flat.thumbnail_en,
      has_en_edition: base.flat.has_en_edition,
    },
    public_record: null,
  }
}

export function mapCelebRecordRow(row: RawRow, locale: string): UserContentPublic | null {
  const index = mapCelebIndexRow(row, locale)
  const content = getContent(row)
  if (!index || !content) return null
  const review = row.review as string | null
  const reviewEn = row.review_en as string | undefined
  const reviewPresets = row.review_presets as string[] | null
  return {
    ...index,
    source_url: row.source_url as string | null,
    content: {
      ...index.content,
      metadata: content.metadata as Record<string, unknown> | null,
      user_count: content.user_count as number | null,
    },
    public_record: review || reviewEn || reviewPresets?.length
      ? {
          rating: null,
          content_preview: review || null,
          content_preview_en: reviewEn || null,
          review_presets: reviewPresets || null,
          is_spoiler: row.is_spoiler as boolean,
        }
      : null,
  }
}
