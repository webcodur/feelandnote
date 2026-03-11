'use server'

import { createClient } from '@/lib/supabase/server'

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

/**
 * 동시대 인물 조회: 생몰년이 겹치는 셀럽 목록 반환.
 * A와 B가 동시대 ↔ A.birth <= B.death AND A.death >= B.birth
 */
export async function getContemporaries(
  celebId: string,
  birthDate: string,
  deathDate: string | null,
  locale: string = 'ko',
): Promise<ContemporaryCeleb[]> {
  const supabase = await createClient()
  const isEn = locale === 'en'

  const birth = parseInt(birthDate)
  if (isNaN(birth)) return []

  // 사망연도가 없으면 생존 인물 → 현재 연도 사용
  const death = deathDate ? parseInt(deathDate) : new Date().getFullYear()
  if (isNaN(death)) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, nickname_en, avatar_url, profession, birth_date, death_date, slug, nationality')
    .eq('profile_type', 'CELEB')
    .neq('id', celebId)
    .not('birth_date', 'is', null)

  if (error || !data) return []

  const results: ContemporaryCeleb[] = []

  for (const row of data) {
    const b = parseInt(row.birth_date!)
    if (isNaN(b)) continue
    const d = row.death_date ? parseInt(row.death_date) : new Date().getFullYear()
    if (isNaN(d)) continue

    // 생존 기간 겹침 판정
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

  // 겹침 기간이 긴 순으로 정렬
  results.sort((a, b) => {
    const overlapA = Math.min(death, a.death_date ? parseInt(a.death_date) : new Date().getFullYear()) - Math.max(birth, parseInt(a.birth_date!))
    const overlapB = Math.min(death, b.death_date ? parseInt(b.death_date) : new Date().getFullYear()) - Math.max(birth, parseInt(b.birth_date!))
    return overlapB - overlapA
  })

  return results
}
