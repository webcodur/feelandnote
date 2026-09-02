'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/db/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { getCountryNamesMap } from '@/lib/countries'

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

async function fetchCelebTimeline(locale: 'ko' | 'en'): Promise<TimelineData> {
  const db = createStaticClient()

  // bio는 본문급 텍스트라 필요한 locale만 받는다 (en은 ko 폴백 때문에 둘 다)
  const bioSelect = locale === 'en' ? ', bio, bio_en' : ', bio'

  type TimelineRow = Omit<TimelineCeleb, 'bio_en'> & { id: string; bio_en?: string | null }

  // 1,000행 상한에 걸리므로 나눠 받는다. 자르면 연표에서 사람이 조용히 빠지고
  // 아래 국가별 집계도 함께 축소된다.
  // birth_date는 중복이 많아 정렬키로 불충분 — id를 2차 키로 둬 페이지 경계를 고정한다.
  const rows = await selectAllPages<TimelineRow>((from, to) =>
    db
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
  const celebs: TimelineCeleb[] = rows.map(row => ({
    ...row,
    bio_en: row.bio_en ?? null,
    has_voice: row.has_voice ?? false,
    voice_v: row.voice_v ?? 0,
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
  // 키 버전을 올려 대사 필드가 든 옛 캐시 항목과 섞이지 않게 한다
  ['celeb-timeline', 'v2'],
  // celebs 만 읽는다
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
