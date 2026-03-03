'use server'

import { createClient } from '@/lib/supabase/server'
import type { PersonaJsonb, PersonaProfile } from '@/lib/persona/types'
import { parsePersonaJsonb } from '@/lib/persona/types'
import { calcDistance, type SimilarCeleb } from '@/lib/persona/utils'

export interface SimilarByCelebResult {
  targetPersona: PersonaProfile | null
  similarCelebs: SimilarCeleb[]
}

export async function getSimilarByCelebId(
  celebId: string,
  limit: number = 5,
  locale: string = 'ko'
): Promise<SimilarByCelebResult> {
  const supabase = await createClient()

  const { data: target, error: targetError } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (nickname, nickname_en, profession, avatar_url, birth_date, death_date, title)
    `)
    .eq('celeb_id', celebId)
    .single()

  if (targetError || !target) {
    return { targetPersona: null, similarCelebs: [] }
  }

  const isEn = locale === 'en'
  const resolveNick = (en: string | null, ko: string) => isEn && en ? en : ko

  const tRow = target as any
  const tProfile = Array.isArray(tRow.profiles) ? tRow.profiles[0] : tRow.profiles
  const tStats = parsePersonaJsonb(tRow.persona as PersonaJsonb)

  const targetPersona: PersonaProfile = {
    celeb_id: tRow.celeb_id,
    nickname: resolveNick(tProfile?.nickname_en, tProfile?.nickname ?? ''),
    nickname_en: tProfile?.nickname_en ?? null,
    profession: tProfile?.profession ?? null,
    avatar_url: tProfile?.avatar_url ?? null,
    birth_date: tProfile?.birth_date ?? null,
    death_date: tProfile?.death_date ?? null,
    title: tProfile?.title ?? null,
    ...tStats,
  }

  const { data: all, error: allError } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (nickname, nickname_en, profession, avatar_url)
    `)
    .neq('celeb_id', celebId)

  if (allError || !all) {
    return { targetPersona, similarCelebs: [] }
  }

  const similarCelebs: SimilarCeleb[] = (all as any[])
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const stats = parsePersonaJsonb(row.persona as PersonaJsonb)
      const vec: PersonaProfile = {
        celeb_id: row.celeb_id,
        nickname: resolveNick(profile?.nickname_en, profile?.nickname ?? ''),
        nickname_en: profile?.nickname_en ?? null,
        profession: profile?.profession ?? null,
        avatar_url: profile?.avatar_url ?? null,
        birth_date: null,
        death_date: null,
        title: null,
        ...stats,
      }
      return { ...vec, distance: calcDistance(targetPersona, vec) }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)

  return { targetPersona, similarCelebs }
}
