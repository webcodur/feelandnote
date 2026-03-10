'use server'

import { createClient } from '@/lib/supabase/server'
import { getCountryNamesMap } from '@/lib/countries'

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

export async function getCelebTimeline(): Promise<TimelineData> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, profession, title, title_en, bio, bio_en, nationality, birth_date, death_date, celeb_tier, quotes, quotes_en, has_voice, voice_v')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('nationality', 'is', null)
    .not('birth_date', 'is', null)
    .order('birth_date', { ascending: true })

  if (error) {
    console.error('타임라인 데이터 조회 에러:', error)
    return { celebs: [], countries: [] }
  }

  const rows = (data || []) as Array<Omit<TimelineCeleb, 'greeting' | 'greeting_en'> & { id: string }>
  const celebIds = rows.map(r => r.id)

  // 대사 조회 (greeting + quote, 100개씩 배치 분할, 병렬 실행)
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
        .select('celeb_id, lines, lines_en')
        .in('celeb_id', batch)
    )
  )
  for (const { data: dialogueRows } of batchResults) {
    ;(dialogueRows ?? []).forEach(row => {
      const lines = row.lines as Record<string, any> | null
      const linesEn = row.lines_en as Record<string, any> | null
      if (lines?.greeting) greetingMap.set(row.celeb_id, lines.greeting)
      if (linesEn?.greeting) greetingEnMap.set(row.celeb_id, linesEn.greeting)
      if (lines?.quote) quoteMap.set(row.celeb_id, lines.quote)
      if (linesEn?.quote) quoteEnMap.set(row.celeb_id, linesEn.quote)
    })
  }

  const celebs: TimelineCeleb[] = rows.map(row => ({
    ...row,
    quotes: quoteMap.get(row.id) ?? row.quotes ?? null,
    quotes_en: quoteEnMap.get(row.id) ?? row.quotes_en ?? null,
    has_voice: (row as Record<string, unknown>).has_voice as boolean ?? false,
    voice_v: (row as Record<string, unknown>).voice_v as number ?? 0,
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
