'use server'

import { createClient } from '@/lib/supabase/server'
import type { PersonaJsonb, PersonaProfile } from '@/lib/persona/types'
import { parsePersonaJsonb } from '@/lib/persona/types'

/** @deprecated PersonaProfile을 직접 사용하세요 */
export type { PersonaProfile as PersonaVector } from '@/lib/persona/types'

interface PersonaRow {
  celeb_id: string
  persona: PersonaJsonb
  profiles:
    | { nickname: string | null; profession: string | null; avatar_url: string | null; birth_date: string | null; death_date: string | null; title: string | null }
    | { nickname: string | null; profession: string | null; avatar_url: string | null; birth_date: string | null; death_date: string | null; title: string | null }[]
    | null
}

export async function getPersonaByCelebId(celebId: string): Promise<PersonaProfile | null> {
  if (!celebId) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (
        nickname, profession, avatar_url, birth_date, death_date, title
      )
    `)
    .eq('celeb_id', celebId)
    .single()

  if (error || !data) {
    console.error('[getPersonaByCelebId] failed:', error?.message ?? 'unknown error')
    return null
  }

  const row = data as unknown as PersonaRow
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const stats = parsePersonaJsonb(row.persona)

  return {
    celeb_id: row.celeb_id,
    nickname: profile?.nickname ?? '',
    nickname_en: null,
    profession: profile?.profession ?? null,
    avatar_url: profile?.avatar_url ?? null,
    birth_date: profile?.birth_date ?? null,
    death_date: profile?.death_date ?? null,
    title: profile?.title ?? null,
    ...stats,
  }
}
