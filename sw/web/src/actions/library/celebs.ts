'use server'

import { unstable_cache } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

export interface CelebInfo {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  /** 이 콘텐츠에 대한 공개 감상평 — 비공개·미작성이면 null */
  review: string | null
  is_spoiler: boolean
}

// celeb_contents select 결과 행 (review_en은 en 화면에서만 실린다)
interface CelebContentRow {
  celeb_id: string | null
  review: string | null
  review_en?: string | null
  is_spoiler: boolean | null
  visibility: string | null
}

// #region 콘텐츠를 감상한 셀럽 목록
async function fetchCelebsForContent(contentId: string, locale: string): Promise<CelebInfo[]> {
  const db = createStaticClient()

  // 영어 감상평은 en 화면에서만 쓴다 — ko 응답에서 수신 제외 (egress 절감)
  const reviewEnSelect = locale === 'en' ? 'review_en,' : ''
  const { data: celebContents, error: ucError } = await db
    .from('celeb_contents')
    .select(`celeb_id, review, ${reviewEnSelect} is_spoiler, visibility`)
    .eq('content_id', contentId)
    .eq('status', 'FINISHED')

  throwOnQueryError('getCelebsForContent 감상 조회', ucError)
  if (!celebContents?.length) return []

  const rows = celebContents as unknown as CelebContentRow[]
  const celebIds = rows.map(row => row.celeb_id).filter((id): id is string => Boolean(id))

  // 인물별 공개 감상평 — 인물 카드를 눌렀을 때 바로 보여줄 이 콘텐츠의 글이다
  const reviewByCeleb = new Map<string, { review: string; is_spoiler: boolean }>()
  for (const row of rows) {
    if (!row.celeb_id || (row.visibility ?? 'public') !== 'public' || reviewByCeleb.has(row.celeb_id)) continue
    const text = (locale === 'en' && row.review_en ? row.review_en : row.review)?.trim()
    if (text) reviewByCeleb.set(row.celeb_id, { review: text, is_spoiler: row.is_spoiler ?? false })
  }

  const { data: celebs, error: profileError } = await db
    .from('celebs')
    .select('id, nickname, nickname_en, avatar_url, profession')
    .in('id', celebIds)
    .eq('publication_status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])

  throwOnQueryError('getCelebsForContent 프로필 조회', profileError)

  return (celebs || []).map(p => ({
    id: p.id,
    nickname: p.nickname,
    nickname_en: p.nickname_en,
    avatar_url: p.avatar_url,
    profession: p.profession,
    review: reviewByCeleb.get(p.id)?.review ?? null,
    is_spoiler: reviewByCeleb.get(p.id)?.is_spoiler ?? false,
  }))
}

const getCelebsForContentCached = unstable_cache(
  fetchCelebsForContent,
  ['celebs-for-content'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getCelebsForContent(contentId: string): Promise<CelebInfo[]> {
  const locale = await getLocale()
  return withQueryFallback('getCelebsForContent', () => getCelebsForContentCached(contentId, locale), [])
}
// #endregion
