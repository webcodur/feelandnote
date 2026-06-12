'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales } from '@/lib/utils/content-locale'
import type { ContentJoinRow } from './types'

// #region 허브 콘텐츠 샘플 - 셀럽별/직업별 대표 콘텐츠 (미리보기용)
export interface HubContentSample {
  id: string
  title: string
  thumbnail_url: string | null
  type: string
  creator: string | null
}

async function fetchContentSamplesForCelebs(
  celebIdsKey: string,
  perCeleb: number,
  locale: string,
): Promise<Record<string, HubContentSample[]>> {
  const celebIds = celebIdsKey ? celebIdsKey.split(',') : []
  if (!celebIds.length) return {}

  const supabase = createStaticClient()

  // contents는 to-one 조인이라 객체로 반환 — 파서가 배열로 추론하므로 overrideTypes로 교정
  const { data, error } = await supabase
    .from('user_contents')
    .select(`user_id, contents!inner(id, type, content_locales(${CL_SELECT_LIST}))`)
    .in('user_id', celebIds)
    .eq('visibility', 'public')
    .eq('status', 'FINISHED')
    .overrideTypes<Array<{ user_id: string; contents: ContentJoinRow }>, { merge: false }>()

  if (error || !data?.length) return {}

  const result: Record<string, HubContentSample[]> = {}
  const seen: Record<string, Set<string>> = {}

  for (const row of data) {
    const celebId = row.user_id
    const content = row.contents
    const flat = flattenLocales(content.content_locales, locale)
    if (!flat.thumbnail_url) continue

    if (!seen[celebId]) seen[celebId] = new Set()
    if (seen[celebId].has(content.id)) continue
    seen[celebId].add(content.id)

    if (!result[celebId]) result[celebId] = []
    if (result[celebId].length >= perCeleb) continue

    result[celebId].push({
      id: content.id,
      title: flat.title,
      thumbnail_url: flat.thumbnail_url,
      type: content.type,
      creator: flat.creator,
    })
  }

  return result
}

const getContentSamplesForCelebsCached = unstable_cache(
  fetchContentSamplesForCelebs,
  ['content-samples-for-celebs'],
  { revalidate: 3600, tags: ['celebs'] }
)

// 미사용 — unstable_cache 래퍼 구조 보존을 위해 export만 해제
async function getContentSamplesForCelebs(celebIds: string[], perCeleb = 2): Promise<Record<string, HubContentSample[]>> {
  if (!celebIds.length) return {}
  const locale = await getLocale()
  // 정렬한 join을 키로 — 같은 조합이면 캐시 히트
  const key = [...celebIds].sort().join(',')
  return getContentSamplesForCelebsCached(key, perCeleb, locale)
}

// get_profession_content_samples RPC 결과 행
interface ProfessionSampleRow {
  profession: string
  content_id: string
  content_type: string
  title: string | null
  title_ko: string | null
  title_en: string | null
  creator: string | null
  creator_en: string | null
  thumbnail_url: string | null
  thumbnail_en: string | null
}

async function fetchContentSamplesByProfession(
  perProfession: number,
  locale: string,
): Promise<Record<string, HubContentSample[]>> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_profession_content_samples', { per_profession: perProfession })
  if (error || !data?.length) return {}

  const result: Record<string, HubContentSample[]> = {}
  const rows: ProfessionSampleRow[] = data
  for (const row of rows) {
    const profession = row.profession
    if (!result[profession]) result[profession] = []
    const titleKo = row.title_ko ?? row.title ?? null
    const titleEn = row.title_en ?? null
    const creatorKo = row.creator ?? null
    const creatorEn = row.creator_en ?? null
    const thumbKo = row.thumbnail_url ?? null
    const thumbEn = row.thumbnail_en ?? null
    result[profession].push({
      id: row.content_id,
      title: (locale === 'en' ? titleEn || titleKo : titleKo || titleEn) || '',
      thumbnail_url: (locale === 'en' ? thumbEn || thumbKo : thumbKo || thumbEn) ?? null,
      type: row.content_type,
      creator: (locale === 'en' ? creatorEn || creatorKo : creatorKo || creatorEn) ?? null,
    })
  }
  return result
}

const getContentSamplesByProfessionCached = unstable_cache(
  fetchContentSamplesByProfession,
  ['content-samples-by-profession'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getContentSamplesByProfession(_professions: string[], perProfession = 3): Promise<Record<string, HubContentSample[]>> {
  const locale = await getLocale()
  return getContentSamplesByProfessionCached(perProfession, locale)
}
// #endregion
