'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getLocale } from 'next-intl/server'

// #region 허브 콘텐츠 샘플 - 셀럽별/직업별 대표 콘텐츠 (미리보기용)
export interface HubContentSample {
  id: string
  title: string
  thumbnail_url: string | null
  type: string
  creator: string | null
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
  const db = createStaticClient()

  const { data, error } = await db.rpc('get_profession_content_samples', { per_profession: perProfession })
  throwOnQueryError('콘텐츠 표본 조회', error)
  if (!data?.length) return {}

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
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getContentSamplesByProfession(_professions: string[], perProfession = 3): Promise<Record<string, HubContentSample[]>> {
  const locale = await getLocale()
  return withQueryFallback('getContentSamplesByProfession', () => getContentSamplesByProfessionCached(perProfession, locale), {})
}
// #endregion
