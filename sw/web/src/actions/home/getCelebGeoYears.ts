'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { getCelebYear } from '@/lib/celeb/lifespan'

/** 국가별 생년 목록 — 지구본 보기가 생년 범위를 움직일 때 서버를 다시 부르지 않고 직접 센다 */
export interface CelebGeoYears {
  code: string
  /** 생년을 아는 인물의 연도(BC는 음수) */
  years: number[]
  /** 생년을 모르는 인물 수 — 생년 범위를 지정하면 빠진다 */
  unknownYears: number
}

async function fetchCelebGeoYears(): Promise<CelebGeoYears[]> {
  const db = createStaticClient()
  // 국적 선택지 집계(getNationalityCounts)와 같은 노출 기준을 쓴다.
  const rows = await selectAllPages<{ nationality: string | null; birth_date: string | null }>((from, to) =>
    db
      .from('celebs')
      .select('nationality, birth_date')
      .eq('publication_status', 'active')
      .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
      .not('nationality', 'is', null)
      .order('id')
      .range(from, to)
  )

  const byCode = new Map<string, CelebGeoYears>()
  for (const row of rows) {
    if (!row.nationality) continue
    const entry = byCode.get(row.nationality) ?? { code: row.nationality, years: [], unknownYears: 0 }
    const year = getCelebYear(row.birth_date)
    if (year === null) entry.unknownYears += 1
    else entry.years.push(year)
    byCode.set(row.nationality, entry)
  }
  return [...byCode.values()]
}

export const getCelebGeoYears = unstable_cache(
  fetchCelebGeoYears,
  ['celeb-geo-years'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
