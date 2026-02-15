'use server'

import { createClient } from '@/lib/supabase/server'
import type { PersonaVector } from '@/lib/persona/utils'

interface PersonaJoinedProfileRow {
  nickname: string | null
  profession: string | null
  avatar_url: string | null
  birth_date: string | null
  death_date: string | null
  title: string | null
}

interface PersonaDetailRow {
  celeb_id: string
  temperance: number | null
  diligence: number | null
  reflection: number | null
  courage: number | null
  loyalty: number | null
  benevolence: number | null
  fairness: number | null
  humility: number | null
  command: number | null
  martial: number | null
  intellect: number | null
  charisma: number | null
  pessimism_optimism: number | null
  conservative_progressive: number | null
  individual_social: number | null
  cautious_bold: number | null
  profiles: PersonaJoinedProfileRow | PersonaJoinedProfileRow[] | null
}

const toNumber = (value: number | null): number => (typeof value === 'number' ? value : 0)
const parseProfile = (row: PersonaDetailRow): PersonaJoinedProfileRow | null =>
  (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) ?? null

export async function getPersonaByCelebId(celebId: string): Promise<PersonaVector | null> {
  if (!celebId) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id,
      temperance, diligence, reflection, courage,
      loyalty, benevolence, fairness, humility,
      command, martial, intellect, charisma,
      pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
      profiles!celeb_persona_celeb_id_fkey (
        nickname,
        profession,
        avatar_url,
        birth_date,
        death_date,
        title
      )
    `)
    .eq('celeb_id', celebId)
    .single()

  if (error || !data) {
    console.error('[getPersonaByCelebId] failed:', error?.message ?? 'unknown error')
    return null
  }

  const row = data as PersonaDetailRow
  const profile = parseProfile(row)

  return {
    celeb_id: row.celeb_id,
    nickname: profile?.nickname ?? '',
    profession: profile?.profession ?? null,
    avatar_url: profile?.avatar_url ?? null,
    birth_date: profile?.birth_date ?? null,
    death_date: profile?.death_date ?? null,
    title: profile?.title ?? null,
    influence_score: 0,
    temperance: toNumber(row.temperance),
    diligence: toNumber(row.diligence),
    reflection: toNumber(row.reflection),
    courage: toNumber(row.courage),
    loyalty: toNumber(row.loyalty),
    benevolence: toNumber(row.benevolence),
    fairness: toNumber(row.fairness),
    humility: toNumber(row.humility),
    command: toNumber(row.command),
    martial: toNumber(row.martial),
    intellect: toNumber(row.intellect),
    charisma: toNumber(row.charisma),
    pessimism_optimism: toNumber(row.pessimism_optimism),
    conservative_progressive: toNumber(row.conservative_progressive),
    individual_social: toNumber(row.individual_social),
    cautious_bold: toNumber(row.cautious_bold),
  }
}
