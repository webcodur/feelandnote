'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'
import { getLocale } from 'next-intl/server'
import type { Tables } from '@/types/supabase'
import type { ScriptureContent, ScripturesByProfession, TopCeleb } from './types'
import { aggregateContents, fetchAllUserContents, fetchGlobalCelebCounts, fetchUserContentCounts } from './helpers'

const PROFESSION_MAP = CELEB_PROFESSIONS.map(p => ({ key: p.value, label: p.label }))

// #region 길의 갈래 - 직업별 인기 콘텐츠
// profiles + celeb_influence(total_score) 임베드 조회 행
type TopCelebRow = Pick<
  Tables<'profiles'>,
  'id' | 'nickname' | 'nickname_en' | 'avatar_url' | 'title' | 'title_en'
> & {
  celeb_influence: { total_score: number | null } | { total_score: number | null }[] | null
}

interface ProfessionAggregate {
  contents: ScriptureContent[]
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
  const supabase = createStaticClient()

  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .eq('profession', profession)

  if (profileError || !celebProfiles?.length) return null

  const celebIds = celebProfiles.map(p => p.id)

  const [typedData, { data: topCelebsData }] = await Promise.all([
    fetchAllUserContents(supabase, celebIds),
    supabase
      .from('profiles')
      .select('id, nickname, nickname_en, avatar_url, title, title_en, celeb_influence(total_score)')
      .in('id', celebIds)
      .not('celeb_influence', 'is', null)
      .order('celeb_influence(total_score)', { ascending: false })
      .limit(5),
  ])

  const topCelebRows: TopCelebRow[] = topCelebsData || []
  const topCelebs: TopCeleb[] = topCelebRows.map(c => {
    const influence = Array.isArray(c.celeb_influence) ? c.celeb_influence[0] : c.celeb_influence
    const contentCount = typedData.filter(item => item.user_id === c.id).length
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

  const userCountMap = await fetchUserContentCounts(supabase)

  // limit을 크게 줘 전체 정렬 리스트를 확보. 페이지 분할은 호출부에서 수행.
  const { contents, total } = aggregateContents(typedData, { page: 1, limit: Number.MAX_SAFE_INTEGER, userCountMap })

  return { contents, total, topCelebs }
}

const getProfessionAggregateCached = unstable_cache(
  fetchProfessionAggregate,
  ['scriptures-profession-agg'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)

export async function getScripturesByProfession(params?: {
  profession?: string
  page?: number
  limit?: number
}): Promise<ScripturesByProfession | null> {
  const locale = await getLocale()
  const profession = params?.profession || 'entrepreneur'
  const page = params?.page || 1
  const limit = params?.limit || 12

  const agg = await getProfessionAggregateCached(profession, locale)
  if (!agg) return null

  // 캐시된 전체 리스트에서 현재 페이지만 분리 (캐시 원본 mutate 방지 위해 얕은 복사)
  const start = (page - 1) * limit
  const pageContents = agg.contents.slice(start, start + limit).map(c => ({ ...c }))

  // 콘텐츠별 전체 셀럽 수는 현재 페이지에 대해서만 카운트 RPC로 보정
  const supabase = createStaticClient()
  const globalCounts = await fetchGlobalCelebCounts(supabase, pageContents.map(c => c.id))
  for (const content of pageContents) {
    content.celeb_count = globalCounts.get(content.id) ?? content.celeb_count
  }

  const professionInfo = PROFESSION_MAP.find(p => p.key === profession)

  return {
    profession,
    label: professionInfo?.label || profession,
    contents: pageContents,
    total: agg.total,
    topCelebs: agg.topCelebs,
  }
}

async function fetchProfessionContentCounts(): Promise<Array<{ profession: string; label: string; count: number }>> {
  const supabase = createStaticClient()

  const results = await Promise.all(
    PROFESSION_MAP.map(async ({ key, label }) => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('profile_type', 'CELEB')
        .eq('status', 'active')
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
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)
// #endregion
