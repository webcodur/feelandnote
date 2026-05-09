'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'

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

async function fetchContemporaries(
  celebId: string,
  birthDate: string,
  deathDate: string | null,
  locale: string,
): Promise<ContemporaryCeleb[]> {
  const supabase = createStaticClient()
  const isEn = locale === 'en'

  const birth = parseInt(birthDate)
  if (isNaN(birth)) return []

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

const getContemporariesCached = unstable_cache(
  fetchContemporaries,
  ['contemporaries'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getContemporaries(
  celebId: string,
  birthDate: string,
  deathDate: string | null,
  locale: string = 'ko',
): Promise<ContemporaryCeleb[]> {
  return getContemporariesCached(celebId, birthDate, deathDate, locale)
}
