'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { getCountryNamesMap } from '@/lib/countries'
import { DIALOGUE_BRIEF_SELECT_WITH_ID, type DialogueBriefWithId } from '@/lib/utils/celeb-dialogues'

export interface TimelineCeleb {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  title: string | null
  title_en: string | null
  bio: string | null
  bio_en: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  celeb_tier: string | null
  quotes: string | null
  quotes_en: string | null
  greeting: string[] | null
  greeting_en: string[] | null
  has_voice: boolean
  voice_v: number
}

export interface CountryGroup {
  code: string
  name: string
  count: number
}

export interface TimelineData {
  celebs: TimelineCeleb[]
  countries: CountryGroup[]
}

async function fetchCelebTimeline(): Promise<TimelineData> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, profession, title, title_en, bio, bio_en, nationality, birth_date, death_date, celeb_tier, has_voice, voice_v')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('nationality', 'is', null)
    .not('birth_date', 'is', null)
    .order('birth_date', { ascending: true })

  if (error) {
    console.error('타임라인 데이터 조회 에러:', error)
    return { celebs: [], countries: [] }
  }

  const rows = (data || []) as Array<Omit<TimelineCeleb, 'greeting' | 'greeting_en' | 'quotes' | 'quotes_en'> & { id: string }>
  const celebIds = rows.map(r => r.id)

  // 대사 조회 (greeting + quote, JSON path만 100개씩 배치)
  const greetingMap = new Map<string, string[]>()
  const greetingEnMap = new Map<string, string[]>()
  const quoteMap = new Map<string, string>()
  const quoteEnMap = new Map<string, string>()
  const BATCH = 100
  const batches: string[][] = []
  for (let i = 0; i < celebIds.length; i += BATCH) {
    batches.push(celebIds.slice(i, i + BATCH))
  }
  const batchResults = await Promise.all(
    batches.map(batch =>
      supabase
        .from('celeb_dialogues')
        .select(DIALOGUE_BRIEF_SELECT_WITH_ID)
        .in('celeb_id', batch)
    )
  )
  for (const { data: dialogueRows } of batchResults) {
    ;((dialogueRows ?? []) as unknown as DialogueBriefWithId[]).forEach(row => {
      if (row.greeting) greetingMap.set(row.celeb_id, row.greeting)
      if (row.greeting_en) greetingEnMap.set(row.celeb_id, row.greeting_en)
      if (row.quote) quoteMap.set(row.celeb_id, row.quote)
      if (row.quote_en) quoteEnMap.set(row.celeb_id, row.quote_en)
    })
  }

  const celebs: TimelineCeleb[] = rows.map(row => ({
    ...row,
    quotes: quoteMap.get(row.id) ?? null,
    quotes_en: quoteEnMap.get(row.id) ?? null,
    has_voice: row.has_voice ?? false,
    voice_v: row.voice_v ?? 0,
    greeting: greetingMap.get(row.id) ?? null,
    greeting_en: greetingEnMap.get(row.id) ?? null,
  }))

  // 국가별 카운트 집계
  const countMap: Record<string, number> = {}
  for (const row of celebs) {
    if (row.nationality) {
      countMap[row.nationality] = (countMap[row.nationality] ?? 0) + 1
    }
  }

  const codes = Object.keys(countMap)
  const namesMap = await getCountryNamesMap(codes)

  const countries: CountryGroup[] = Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .map(([code, count]) => ({
      code,
      name: namesMap[code] || code,
      count,
    }))

  return { celebs, countries }
}

export const getCelebTimeline = unstable_cache(
  fetchCelebTimeline,
  ['celeb-timeline'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)
