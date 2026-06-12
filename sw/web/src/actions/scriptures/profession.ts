'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'
import { getLocale } from 'next-intl/server'
import type { Tables } from '@/types/supabase'
import type { ScripturesByProfession, TopCeleb } from './types'
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

async function fetchScripturesByProfession(
  profession: string,
  page: number,
  limit: number,
  locale: string,
): Promise<ScripturesByProfession | null> {
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

  const { contents, total } = aggregateContents(typedData, { page, limit, userCountMap })

  const globalCounts = await fetchGlobalCelebCounts(supabase, contents.map(c => c.id))
  for (const content of contents) {
    content.celeb_count = globalCounts.get(content.id) ?? content.celeb_count
  }

  const professionInfo = PROFESSION_MAP.find(p => p.key === profession)

  return {
    profession,
    label: professionInfo?.label || profession,
    contents,
    total,
    topCelebs
  }
}

const getScripturesByProfessionCached = unstable_cache(
  fetchScripturesByProfession,
  ['scriptures-by-profession'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getScripturesByProfession(params?: {
  profession?: string
  page?: number
  limit?: number
}): Promise<ScripturesByProfession | null> {
  const locale = await getLocale()
  return getScripturesByProfessionCached(
    params?.profession || 'entrepreneur',
    params?.page || 1,
    params?.limit || 12,
    locale,
  )
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
  { revalidate: 3600, tags: ['celebs'] }
)
// #endregion
