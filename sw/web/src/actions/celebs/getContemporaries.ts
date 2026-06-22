'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
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

// 생몰일 보유 셀럽 전체를 셀럽·locale 무관 단일 캐시 키로 1회만 조회한다.
// 동시대 인물 필터는 이 공유 캐시 위에서 수행하므로, 크롤러가 모든 셀럽
// 페이지를 순회해도 전체 프로필 전송은 1시간당 1회로 묶인다.
async function fetchAllCelebsWithDates(): Promise<CelebDateRow[]> {
  const supabase = createStaticClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nickname, nickname_en, avatar_url, profession, birth_date, death_date, slug, nationality')
    .eq('profile_type', 'CELEB')
    .not('birth_date', 'is', null)
  return (data as CelebDateRow[] | null) ?? []
}

const getAllCelebsWithDatesCached = unstable_cache(
  fetchAllCelebsWithDates,
  ['celebs-with-dates'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
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

  const death = deathDate ? parseInt(deathDate) : new Date().getFullYear()
  if (isNaN(death)) return []

  const all = await getAllCelebsWithDatesCached()
  const results: ContemporaryCeleb[] = []

  for (const row of all) {
    if (row.id === celebId) continue
    const b = parseInt(row.birth_date!)
    if (isNaN(b)) continue
    const d = row.death_date ? parseInt(row.death_date) : new Date().getFullYear()
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
    const overlapA = Math.min(death, a.death_date ? parseInt(a.death_date) : new Date().getFullYear()) - Math.max(birth, parseInt(a.birth_date!))
    const overlapB = Math.min(death, b.death_date ? parseInt(b.death_date) : new Date().getFullYear()) - Math.max(birth, parseInt(b.birth_date!))
    return overlapB - overlapA
  })

  return results
}
