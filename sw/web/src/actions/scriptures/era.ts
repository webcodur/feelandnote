'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { getLocale } from 'next-intl/server'
import type { ScriptureContent, ScripturesResult } from './types'

// #region 시대의 작품 - 시대별 인기 콘텐츠
type Era = 'ancient' | 'medieval' | 'modern' | 'contemporary'

const ERA_CONFIG: Record<Era, { label: string; period: string; min: number; max: number; description: string }> = {
  ancient: {
    label: '고대',
    period: '~500년',
    min: -9999,
    max: 500,
    description: '철학과 사상의 씨앗이 뿌려진 시대입니다. 소크라테스, 공자, 붓다가 던진 근본적인 질문들이 오늘날까지 인류를 이끌고 있습니다.'
  },
  medieval: {
    label: '중세',
    period: '500~1500년',
    min: 500,
    max: 1500,
    description: '신앙과 기사도가 꽃피운 시대입니다. 어둠 속에서도 지혜의 불씨를 꺼뜨리지 않은 수도원과 학자들의 헌신이 오늘의 문명을 만들었습니다.'
  },
  modern: {
    label: '근대',
    period: '1500~1900년',
    min: 1500,
    max: 1900,
    description: '이성의 빛이 세상을 깨운 시대입니다. 르네상스, 계몽주의, 산업혁명을 통해 인류는 전례 없는 변화를 경험했습니다.'
  },
  contemporary: {
    label: '현대',
    period: '1900년~',
    min: 1900,
    max: 9999,
    description: '격변과 혁신의 세기입니다. 지금 우리의 생각과 삶의 방식을 형성한 거인들이 이 시대를 살아갔습니다.'
  },
}

interface EraCeleb {
  id: string
  nickname: string
  avatar_url: string | null
  title: string | null
  influence: number | null
  count: number
}

export interface EraScriptures {
  era: Era
  label: string
  period: string
  description: string
  contents: ScriptureContent[]
  celebCount: number
  contentCount: number
  topCelebs: EraCeleb[]
}

async function fetchScripturesByEra(locale: string): Promise<EraScriptures[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_scriptures_by_era', {
    p_era: null,
    p_category: null,
    p_limit: 6,
    p_offset: 0,
  })

  if (error || !data?.length) {
    if (error) console.error('getScripturesByEra error:', error)
    return []
  }

  const eraMap = new Map<string, EraScriptures>()
  const rows = data as Record<string, unknown>[]

  for (const row of rows) {
    const era = row.era as Era
    if (!eraMap.has(era)) {
      eraMap.set(era, {
        era,
        label: row.era_label as string,
        period: row.era_period as string,
        description: row.era_description as string,
        contents: [],
        celebCount: Number(row.celeb_count_in_era),
        contentCount: Number(row.total_count ?? 0),
        topCelebs: [],
      })
    }
    const titleKo = (row.title_ko as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    const creatorKo = (row.creator as string) ?? null
    const creatorEn = (row.creator_en as string) ?? null
    const thumbKo = (row.thumbnail_url as string) ?? null
    const thumbEn = (row.thumbnail_en as string) ?? null
    eraMap.get(era)!.contents.push({
      id: row.content_id as string,
      title: (locale === 'en' ? titleEn || titleKo : titleKo || titleEn) || '',
      creator: (locale === 'en' ? creatorEn || creatorKo : creatorKo || creatorEn) ?? null,
      thumbnail_url: (locale === 'en' ? thumbEn || thumbKo : thumbKo || thumbEn) ?? null,
      type: row.content_type as string,
      celeb_count: Number(row.celeb_count),
      user_count: Number(row.user_count),
      avg_rating: row.avg_rating ? Number(row.avg_rating) : null,
      title_ko: (row.title_ko as string) ?? null,
      title_en: (row.title_en as string) ?? null,
      creator_en: (row.creator_en as string) ?? null,
      isbn_en: (row.isbn_en as string) ?? null,
      thumbnail_en: (row.thumbnail_en as string) ?? null,
      has_en_edition: (row.has_en_edition as boolean) ?? null,
    })
  }

  const eras: Era[] = ['ancient', 'medieval', 'modern', 'contemporary']
  return eras.map(era => eraMap.get(era) ?? {
    era,
    label: ERA_CONFIG[era].label,
    period: ERA_CONFIG[era].period,
    description: ERA_CONFIG[era].description,
    contents: [],
    celebCount: 0,
    contentCount: 0,
    topCelebs: [],
  })
}

const getScripturesByEraCached = unstable_cache(
  fetchScripturesByEra,
  ['scriptures-by-era'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getScripturesByEra(): Promise<EraScriptures[]> {
  const locale = await getLocale()
  return getScripturesByEraCached(locale)
}

async function fetchEraContents(
  era: string,
  category: string | null,
  page: number,
  limit: number,
  locale: string,
): Promise<ScripturesResult> {
  const eraKey = era as Era
  if (!ERA_CONFIG[eraKey]) {
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const supabase = createStaticClient()
  const offset = (page - 1) * limit
  const { data, error } = await supabase.rpc('get_scriptures_by_era', {
    p_era: eraKey,
    p_category: category,
    p_limit: limit,
    p_offset: offset,
  })

  if (error || !data?.length) {
    if (error) console.error('getEraContents error:', error)
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const rows = data as Record<string, unknown>[]
  const total = Number(rows[0]?.total_count ?? 0)
  const contents: ScriptureContent[] = rows.map(row => {
    const titleKo = (row.title_ko as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    const creatorKo = (row.creator as string) ?? null
    const creatorEn = (row.creator_en as string) ?? null
    const thumbKo = (row.thumbnail_url as string) ?? null
    const thumbEn = (row.thumbnail_en as string) ?? null
    return {
      id: row.content_id as string,
      title: (locale === 'en' ? titleEn || titleKo : titleKo || titleEn) || '',
      creator: (locale === 'en' ? creatorEn || creatorKo : creatorKo || creatorEn) ?? null,
      thumbnail_url: (locale === 'en' ? thumbEn || thumbKo : thumbKo || thumbEn) ?? null,
      type: row.content_type as string,
      celeb_count: Number(row.celeb_count),
      user_count: Number(row.user_count),
      avg_rating: row.avg_rating ? Number(row.avg_rating) : null,
      title_ko: titleKo,
      title_en: titleEn,
      creator_en: creatorEn,
      isbn_en: (row.isbn_en as string) ?? null,
      thumbnail_en: thumbEn,
      has_en_edition: (row.has_en_edition as boolean) ?? null,
    }
  })

  return {
    contents,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

const getEraContentsCached = unstable_cache(
  fetchEraContents,
  ['era-contents'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getEraContents(params: {
  era: string
  category?: string
  page?: number
  limit?: number
}): Promise<ScripturesResult> {
  const locale = await getLocale()
  return getEraContentsCached(
    params.era,
    params.category || null,
    params.page || 1,
    params.limit || 12,
    locale,
  )
}
// #endregion
