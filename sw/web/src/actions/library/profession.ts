'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'
import { getLocale } from 'next-intl/server'
import type { Tables } from '@/types/database.generated'
import type { ContentType } from '@/types/database'
import type { LibraryContent, LibraryByProfession, TopCeleb } from './types'
import { aggregateContents, fetchAllCelebContents, fetchGlobalCelebCounts, fetchUserContentCounts } from './helpers'

const PROFESSION_MAP = CELEB_PROFESSIONS.map(p => ({ key: p.value, label: p.label }))

// #region 길의 갈래 - 직업별 인기 콘텐츠
// celebs + celeb_influence(total_score) 임베드 조회 행
type TopCelebRow = Pick<
  Tables<'celebs'>,
  'id' | 'nickname' | 'nickname_en' | 'avatar_url' | 'title' | 'title_en'
> & {
  celeb_influence: { total_score: number | null } | { total_score: number | null }[] | null
}

interface ProfessionAggregate {
  contents: LibraryContent[]
  total: number
  topCelebs: TopCeleb[]
}

// 직업별 전체 집계(전체 콘텐츠 풀스캔 + 정렬 + 상위 인물)를 page/limit 무관하게
// [profession, locale] 단일 캐시 키로 1회만 계산한다. 페이지 분할은 캐시 밖에서
// 수행하므로, 같은 직업의 다른 페이지를 봐도 전체 풀스캔을 반복하지 않는다.
async function fetchProfessionAggregate(
  profession: string,
  locale: string,
): Promise<ProfessionAggregate | null> {
  const db = createStaticClient()

  const { data: celebProfiles, error: profileError } = await db
    .from('celebs')
    .select('id')
    .eq('publication_status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
    .eq('profession', profession)

  throwOnQueryError('getLibraryByProfession 프로필 조회', profileError)
  if (!celebProfiles?.length) return null

  const celebIds = celebProfiles.map(p => p.id)

  const [typedData, { data: topCelebsData }] = await Promise.all([
    fetchAllCelebContents(db, celebIds, locale),
    db
      .from('celebs')
      .select('id, nickname, nickname_en, avatar_url, title, title_en, celeb_influence!celeb_influence_celebs_fkey(total_score)')
      .in('id', celebIds)
      .not('celeb_influence', 'is', null)
      .order('celeb_influence(total_score)', { ascending: false })
      .limit(5),
  ])

  const topCelebRows: TopCelebRow[] = topCelebsData || []
  const topCelebs: TopCeleb[] = topCelebRows.map(c => {
    const influence = Array.isArray(c.celeb_influence) ? c.celeb_influence[0] : c.celeb_influence
    const contentCount = typedData.filter(item => item.celeb_id === c.id).length
    const nicknameEn = c.nickname_en ?? null
    const titleEn = c.title_en ?? null
    return {
      id: c.id,
      nickname: (locale === 'en' ? nicknameEn || c.nickname : c.nickname) || '',
      nickname_en: nicknameEn,
      avatar_url: c.avatar_url,
      title: (locale === 'en' ? titleEn || c.title : c.title) ?? null,
      title_en: titleEn,
      influence: influence?.total_score ?? null,
      count: contentCount
    }
  })

  // 이 화면이 쓰는 것은 위에서 고른 작품들의 감상 인원뿐이다. 전체를 집계하면
  // member_contents 를 통째로 훑다 문 시간을 넘겨(57014) 화면이 통째로 죽는다.
  const contentIds = [...new Set(typedData.map(item => item.content_id))]
  const userCountMap = await fetchUserContentCounts(db, undefined, contentIds)

  // limit을 크게 줘 전체 정렬 리스트를 확보. 페이지 분할은 호출부에서 수행.
  const { contents, total } = aggregateContents(typedData, { page: 1, limit: Number.MAX_SAFE_INTEGER, userCountMap })

  return { contents, total, topCelebs }
}

const getProfessionAggregateCached = unstable_cache(
  fetchProfessionAggregate,
  ['library-profession-agg'],
  // celebs(직업별 셀럽)+celeb_contents(서고 집계)+celeb_influence를 함께 읽는다
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getLibraryByProfession(params?: {
  profession?: string
  category?: ContentType
  page?: number
  limit?: number
}): Promise<LibraryByProfession | null> {
  const locale = await getLocale()
  const profession = params?.profession || 'entrepreneur'
  const page = params?.page || 1
  const limit = params?.limit || 12

  const agg = await withQueryFallback('getLibraryByProfession', () => getProfessionAggregateCached(profession, locale), null)
  if (!agg) return null

  // 직군 전체 집계 캐시를 재사용하고, 요청 카테고리를 적용한 뒤 현재 페이지만 분리한다.
  const filteredContents = params?.category
    ? agg.contents.filter(content => content.type === params.category)
    : agg.contents
  const start = (page - 1) * limit
  const pageContents = filteredContents.slice(start, start + limit).map(c => ({ ...c }))

  // 콘텐츠별 전체 셀럽 수는 현재 페이지에 대해서만 카운트 RPC로 보정
  const db = createStaticClient()
  const globalCounts = await fetchGlobalCelebCounts(db, pageContents.map(c => c.id))
  for (const content of pageContents) {
    content.celeb_count = globalCounts.get(content.id) ?? content.celeb_count
  }

  const professionInfo = PROFESSION_MAP.find(p => p.key === profession)

  return {
    profession,
    label: professionInfo?.label || profession,
    contents: pageContents,
    total: filteredContents.length,
    topCelebs: agg.topCelebs,
  }
}

async function fetchProfessionContentCounts(): Promise<Array<{ profession: string; label: string; count: number }>> {
  const db = createStaticClient()

  const results = await Promise.all(
    PROFESSION_MAP.map(async ({ key, label }) => {
      const { count } = await db
        .from('celebs')
        .select('id', { count: 'exact', head: true })
        .eq('publication_status', 'active')
        // 신화·관계 인물은 목록에서 제외
        .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
        .eq('profession', key)

      return count && count > 0 ? { profession: key, label, count } : null
    })
  )

  return results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.count - a.count)
}

export const getProfessionContentCounts = unstable_cache(
  fetchProfessionContentCounts,
  ['profession-content-counts'],
  // celebs만 센다
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
// #endregion
