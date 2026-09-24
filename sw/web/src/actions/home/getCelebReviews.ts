'use server'

import { unstable_cache } from 'next/cache'
import { throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import type { ContentType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow, type TitleBadge } from '@/lib/utils/content-locale'

// contents 조인 select 결과 행
interface PreviewContentRow {
  id: string
  type: string
  user_count: number | null
  content_locales: ContentLocaleRow[] | null
}

// celeb_contents select 결과 행
interface PreviewRow {
  id: string
  review: string | null
  review_en?: string | null
  content_id: string
  content: PreviewContentRow | PreviewContentRow[] | null
}

// ─── 서재 미리보기 (닮은 인물 모달) ───

export interface CelebLibraryPreviewItem {
  id: string
  review: string
  content: {
    id: string
    title: string
    creator: string | null
    thumbnail_url: string | null
    type: ContentType
    title_badge: TitleBadge | null
  }
}

const LIBRARY_PREVIEW_LIMIT = 4

/**
 * 닮은 인물 모달에 얹는 감상작 미리보기. 대표 감상문과 같은 선별 기준
 * (공개·감상문 보유, 고정 → 추천 → 최신)을 승계하되 부수 조회 없이 가볍게 간다.
 */
async function fetchCelebLibraryPreview(celebId: string, locale: string): Promise<CelebLibraryPreviewItem[]> {
  const db = createStaticClient()
  const reviewEnSelect = locale === 'en' ? 'review_en,' : ''

  const { data, error } = await db
    .from('celeb_contents')
    .select(`
      id,
      review,
      ${reviewEnSelect}
      content_id,
      content:contents!celeb_contents_content_id_fkey(
        id, type, user_count:record_count,
        content_locales(${CL_SELECT_LIST})
      )
    `)
    .eq('celeb_id', celebId)
    .not('review', 'is', null)
    .neq('review', '')
    .eq('visibility', 'public')
    .order('is_pinned', { ascending: false, nullsFirst: false })
    .order('is_recommended', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(LIBRARY_PREVIEW_LIMIT)

  throwOnQueryError('셀럽 서재 미리보기 조회', error)

  const rows = (data ?? []) as unknown as PreviewRow[]
  return rows.flatMap((row) => {
    const content = Array.isArray(row.content) ? row.content[0] : row.content
    if (!content || !row.review) return []

    const flat = flattenLocales(content.content_locales, locale)
    const review = locale === 'en' && row.review_en ? row.review_en : row.review
    return [{
      id: row.id,
      review,
      content: {
        id: content.id,
        title: flat.title,
        creator: flat.creator,
        thumbnail_url: flat.thumbnail_url,
        type: content.type as ContentType,
        title_badge: flat.title_badge,
      },
    }]
  })
}

const getCelebLibraryPreviewCached = unstable_cache(
  fetchCelebLibraryPreview,
  ['celeb-library-preview'],
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS] }
)

export async function getCelebLibraryPreview(celebId: string): Promise<CelebLibraryPreviewItem[]> {
  const locale = await getLocale()
  return withQueryFallback('getCelebLibraryPreview', () => getCelebLibraryPreviewCached(celebId, locale), [])
}
