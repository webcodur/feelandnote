import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { LIST_REVALIDATE, STATIC_REVALIDATE } from '@/lib/cache'
import { getCelebLifeEndYear } from '@/lib/celeb/lifespan'

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

export interface CelebLifeSpanRow {
  id: string
  birth_date: string | null
  death_date: string | null
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
      .from('celebs')
      .select('id, nickname, nickname_en, avatar_url, profession, birth_date, death_date, slug, nationality')
      .eq('publication_status', 'active')
      .not('birth_date', 'is', null)
      .order('id')
      .range(from, to)
      .overrideTypes<CelebDateRow[], { merge: false }>()
  )
}

/* 인물 전체를 훑어 생몰년만 모은다. 일반 프로필·서고 수정과 무관한 공유 자료라
   CELEBS 목록 태그를 달지 않는다. 한 시간 만료로 생몰년·공개 상태 변경을 흡수한다. */
const getAllCelebsWithDatesCached = unstable_cache(
  fetchAllCelebsWithDates,
  ['celebs-with-dates'],
  { revalidate: LIST_REVALIDATE },
)

// 상세 페이지의 목차에는 동시대 인물 전체 카드가 아니라 존재 여부만 필요하다.
// 표시용 1시간 캐시를 페이지 생성 중 읽으면 그 짧은 수명이 인물 상세 전체의
// 재검증 주기로 전파되므로, 생몰일만 담은 7일 안전망 원장을 따로 둔다.
// 태그를 붙이지 않아 일반 프로필 수정이 이 공유 원장과 모든 상세를 함께 비우지 않는다.
async function fetchAllCelebLifeSpans(): Promise<CelebLifeSpanRow[]> {
  const supabase = createStaticClient()
  return await selectAllPages<CelebLifeSpanRow>((from, to) =>
    supabase
      .from('celebs')
      .select('id, birth_date, death_date')
      .eq('publication_status', 'active')
      .not('birth_date', 'is', null)
      .order('id')
      .range(from, to)
      .overrideTypes<CelebLifeSpanRow[], { merge: false }>()
  )
}

const getAllCelebLifeSpansCached = unstable_cache(
  fetchAllCelebLifeSpans,
  ['celeb-life-spans-for-presence'],
  { revalidate: STATIC_REVALIDATE },
)

export function hasContemporaryOverlap(
  rows: readonly CelebLifeSpanRow[],
  celebId: string,
  birthDate: string,
  deathDate: string | null,
): boolean {
  const birth = parseInt(birthDate)
  if (isNaN(birth)) return false

  const death = getCelebLifeEndYear(birthDate, deathDate)
  if (death === null) return false

  return rows.some((row) => {
    if (row.id === celebId || !row.birth_date) return false

    const candidateBirth = parseInt(row.birth_date)
    if (isNaN(candidateBirth)) return false

    const candidateDeath = getCelebLifeEndYear(row.birth_date, row.death_date)
    if (candidateDeath === null) return false

    return birth <= candidateDeath && death >= candidateBirth
  })
}

/** 인물 상세 목차용 경량 판정. 첫 겹침에서 멈추며 카드 생성·정렬을 하지 않는다. */
export async function hasContemporaries(
  celebId: string,
  birthDate: string,
  deathDate: string | null,
): Promise<boolean> {
  if (isNaN(parseInt(birthDate))) return false
  const rows = await getAllCelebLifeSpansCached()
  return hasContemporaryOverlap(rows, celebId, birthDate, deathDate)
}

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

  const death = getCelebLifeEndYear(birthDate, deathDate)
  if (death === null) return []

  const all = await getAllCelebsWithDatesCached()
  const results: ContemporaryCeleb[] = []

  for (const row of all) {
    if (row.id === celebId) continue
    const b = parseInt(row.birth_date!)
    if (isNaN(b)) continue
    const d = getCelebLifeEndYear(row.birth_date, row.death_date)
    if (d === null) continue

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

    const endA = getCelebLifeEndYear(a.birth_date, a.death_date) ?? birthA
    const endB = getCelebLifeEndYear(b.birth_date, b.death_date) ?? birthB
    const overlapA = Math.min(death, endA) - Math.max(birth, birthA)
    const overlapB = Math.min(death, endB) - Math.max(birth, birthB)
    if (overlapA !== overlapB) return overlapB - overlapA

    return a.id.localeCompare(b.id)
  })

  return results.slice(0, MAX_CONTEMPORARIES)
}
