'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
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

const TIMELINE_BASE_SELECT =
  'id, slug, nickname, nickname_en, avatar_url, profession, title, title_en, nationality, birth_date, death_date, celeb_tier, has_voice, voice_v'

async function fetchCelebTimeline(locale: 'ko' | 'en'): Promise<TimelineData> {
  const supabase = createStaticClient()

  // bio는 본문급 텍스트라 필요한 locale만 받는다 (en은 ko 폴백 때문에 둘 다)
  const bioSelect = locale === 'en' ? ', bio, bio_en' : ', bio'

  type TimelineRow = Omit<
    TimelineCeleb,
    'greeting' | 'greeting_en' | 'quotes' | 'quotes_en' | 'bio_en'
  > & { id: string; bio_en?: string | null }

  // 1,000행 상한에 걸리므로 나눠 받는다. 자르면 연표에서 사람이 조용히 빠지고
  // 아래 국가별 집계도 함께 축소된다.
  // birth_date는 중복이 많아 정렬키로 불충분 — id를 2차 키로 둬 페이지 경계를 고정한다.
  const rows = await selectAllPages<TimelineRow>((from, to) =>
    supabase
      .from('celebs')
      .select(`${TIMELINE_BASE_SELECT}${bioSelect}`)
      .eq('publication_status', 'active')
      // 신화·관계 인물은 타임라인에서 제외
      .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
      .not('nationality', 'is', null)
      .not('birth_date', 'is', null)
      .order('birth_date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
      .overrideTypes<TimelineRow[], { merge: false }>()
  )
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
    bio_en: row.bio_en ?? null,
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

// locale 인자가 캐시 키에 포함되어 ko/en 별도 캐시로 갈라진다
export const getCelebTimeline = unstable_cache(
  fetchCelebTimeline,
  ['celeb-timeline'],
  // celebs + celeb_dialogues
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES] }
)
