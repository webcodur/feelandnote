'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/db/static'
import { STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { getCountryNamesMap } from '@/lib/countries'
import { findContemporaries } from '@/components/features/user/explore/sections/TimelineSection/utils'

/**
 * 연표 한 칸이 쓰는 필드만 싣는다. 인사말·인용은 연표 화면이 읽지 않는데도 2,200명분을
 * 실어 응답이 3 MB를 넘겼고, Next 데이터 캐시 한도(2 MB)에 걸려 캐시되지 않은 채
 * 재생성마다 대사 30배치 조회를 다시 돌렸다(26.08.28 운영 로그). 필드를 늘리려면
 * 먼저 캐시 한도 안에 드는지 확인한다.
 */
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

type TimelineRow = Omit<TimelineCeleb, 'bio_en'> & { id: string; bio_en?: string | null }

const TIMELINE_PAGE_SIZE = 1000

interface TimelinePage {
  rows: TimelineCeleb[]
  total: number
}

async function fetchTimelinePage(locale: 'ko' | 'en', pageIndex: number): Promise<TimelinePage> {
  const db = createStaticClient()

  // bio는 본문급 텍스트라 필요한 locale만 받는다 (en은 ko 폴백 때문에 둘 다)
  const bioSelect = locale === 'en' ? ', bio, bio_en' : ', bio'

  // 1,000행 상한에 걸리므로 나눠 받는다. 자르면 연표에서 사람이 조용히 빠지고
  // 아래 국가별 집계도 함께 축소된다.
  // birth_date는 중복이 많아 정렬키로 불충분 — id를 2차 키로 둬 페이지 경계를 고정한다.
  const { data, error, count } = await db
    .from('celebs')
    .select(`${TIMELINE_BASE_SELECT}${bioSelect}`, { count: 'exact' })
    .eq('publication_status', 'active')
    // 신화·관계 인물은 타임라인에서 제외
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
    .not('nationality', 'is', null)
    .not('birth_date', 'is', null)
    .order('birth_date', { ascending: true })
    .order('id', { ascending: true })
    .range(pageIndex * TIMELINE_PAGE_SIZE, (pageIndex + 1) * TIMELINE_PAGE_SIZE - 1)
    .overrideTypes<TimelineRow[], { merge: false }>()

  throwOnQueryError('연표 조회', error)

  return {
    rows: (data ?? []).map((row) => ({
      ...row,
      bio_en: row.bio_en ?? null,
      has_voice: row.has_voice ?? false,
      voice_v: row.voice_v ?? 0,
    })),
    total: count ?? 0,
  }
}

// PostgREST 페이지가 곧 캐시 단위다. 한 덩어리로 캐시하면(en 기준 ~2.6MB) Next 데이터
// 캐시 2MB 상한을 넘어 쓰기가 건너뛰어져 매 방문마다 전수 조회를 다시 돌았다 —
// 26.08 사고가 인물 수 증가로 재발한 것이다. 조각당 ~0.9MB라 상한 아래에 든다.
const getTimelinePage = unstable_cache(
  fetchTimelinePage,
  ['celeb-timeline', 'v3'],
  // celebs 만 읽는다
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)

async function fetchCelebTimeline(locale: 'ko' | 'en'): Promise<TimelineData> {
  // 첫 조각이 총 행 수를 가져온다 — 나머지 조각 수가 정해지면 함께 띄운다
  const first = await getTimelinePage(locale, 0)
  const pageCount = Math.max(
    1,
    Math.ceil(Math.max(first.total, first.rows.length) / TIMELINE_PAGE_SIZE),
  )
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) => getTimelinePage(locale, i + 1)),
  )
  const celebs = [first, ...rest].flatMap((page) => page.rows)

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

// 통째 캐시하지 않는다 — 3천 행분 bio까지 한 항목이면 2MB 상한을 넘어 캐시가 통째로 빈다.
// 조각(getTimelinePage)만 캐시하고 여기서는 합치기와 국가 집계만 한다.
export async function getCelebTimeline(locale: 'ko' | 'en'): Promise<TimelineData> {
  return fetchCelebTimeline(locale)
}

/** 동시대 비교를 요청할 때만 다른 국가 인물까지 기존 공개 캐시에서 찾아 전달한다. */
export async function getTimelineContemporaries(id: string, locale: 'ko' | 'en'): Promise<TimelineCeleb[]> {
  const { celebs } = await getCelebTimeline(locale === 'en' ? 'en' : 'ko')
  const celeb = celebs.find(item => item.id === id)
  if (!celeb) return []
  return findContemporaries(celebs, celeb, celeb.nationality ?? '')
}
