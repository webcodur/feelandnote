'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { STATIC_REVALIDATE } from '@/lib/cache'

export interface ContemporaryCeleb {
  id: string
  nickname: string
  avatar_url: string | null
  profession: string | null
  birth_date: string | null
  death_date: string | null
  slug: string | null
  nationality: string | null
}

interface CelebDateRow {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  birth_date: string | null
  death_date: string | null
  slug: string | null
  nationality: string | null
}

const MAX_CONTEMPORARIES = 30
const DATE_SORT_UNITS_PER_YEAR = 12 * 31

function getBirthDateSortValue(value: string): number {
  const match = /^(-?\d{1,4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(value)
  if (!match) return parseInt(value) * DATE_SORT_UNITS_PER_YEAR

  const year = Number(match[1])
  const month = match[2] ? Number(match[2]) : 7
  const day = match[3] ? Number(match[3]) : 15
  return year * DATE_SORT_UNITS_PER_YEAR + (month - 1) * 31 + day
}

// 생몰일 보유 셀럽 전체를 셀럽·locale 무관 단일 캐시 키로 1회만 조회한다.
// 동시대 인물 필터는 이 공유 캐시 위에서 수행하므로, 크롤러가 모든 셀럽
// 페이지를 순회해도 전체 프로필 전송은 1시간당 1회로 묶인다.
async function fetchAllCelebsWithDates(): Promise<CelebDateRow[]> {
  const supabase = createStaticClient()
  // 1,000행 상한에 걸리므로 나눠 받는다. 자르면 동시대 인물 후보 자체가 줄어
  // 모든 셀럽의 동시대 목록이 조용히 부실해진다.
  return await selectAllPages<CelebDateRow>((from, to) =>
    supabase
      .from('profiles')
      .select('id, nickname, nickname_en, avatar_url, profession, birth_date, death_date, slug, nationality')
      .eq('profile_type', 'CELEB')
      .eq('status', 'active')
      .not('birth_date', 'is', null)
      .order('id')
      .range(from, to)
      .overrideTypes<CelebDateRow[], { merge: false }>()
  )
}

const getAllCelebsWithDatesCached = unstable_cache(
  fetchAllCelebsWithDates,
  ['celebs-with-dates'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)

export async function getContemporaries(
  celebId: string,
  birthDate: string,
  deathDate: string | null,
  locale: string = 'ko',
): Promise<ContemporaryCeleb[]> {
  const isEn = locale === 'en'

  const birth = parseInt(birthDate)
  if (isNaN(birth)) return []
  const birthDateSortValue = getBirthDateSortValue(birthDate)

  const currentYear = new Date().getFullYear()
  const death = deathDate ? parseInt(deathDate) : currentYear
  if (isNaN(death)) return []

  const all = await getAllCelebsWithDatesCached()
  const results: ContemporaryCeleb[] = []

  for (const row of all) {
    if (row.id === celebId) continue
    const b = parseInt(row.birth_date!)
    if (isNaN(b)) continue
    const d = row.death_date ? parseInt(row.death_date) : currentYear
    if (isNaN(d)) continue

    if (birth <= d && death >= b) {
      results.push({
        id: row.id,
        nickname: isEn && row.nickname_en ? row.nickname_en : row.nickname,
        avatar_url: row.avatar_url,
        profession: row.profession,
        birth_date: row.birth_date,
        death_date: row.death_date,
        slug: row.slug,
        nationality: row.nationality,
      })
    }
  }

  results.sort((a, b) => {
    const birthA = parseInt(a.birth_date!)
    const birthB = parseInt(b.birth_date!)
    const birthGap = Math.abs(birthDateSortValue - getBirthDateSortValue(a.birth_date!))
      - Math.abs(birthDateSortValue - getBirthDateSortValue(b.birth_date!))
    if (birthGap !== 0) return birthGap

    const overlapA = Math.min(death, a.death_date ? parseInt(a.death_date) : currentYear) - Math.max(birth, birthA)
    const overlapB = Math.min(death, b.death_date ? parseInt(b.death_date) : currentYear) - Math.max(birth, birthB)
    if (overlapA !== overlapB) return overlapB - overlapA

    return a.id.localeCompare(b.id)
  })

  return results.slice(0, MAX_CONTEMPORARIES)
}
