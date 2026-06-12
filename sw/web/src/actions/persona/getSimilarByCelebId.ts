'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { PersonaJsonb, PersonaProfile } from '@/lib/persona/types'
import { parsePersonaJsonb } from '@/lib/persona/types'
import { calcDistance, type SimilarCeleb } from '@/lib/persona/utils'

export interface SimilarByCelebResult {
  targetPersona: PersonaProfile | null
  targetPersonaJsonb: PersonaJsonb | null
  similarCelebs: SimilarCeleb[]
}

// celeb_persona + profiles 조인 행 (두 select의 합집합, 두 번째 조회는 생몰일·title 미포함)
interface PersonaJoinProfile {
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  avatar_url: string | null
  birth_date?: string | null
  death_date?: string | null
  title?: string | null
}

interface PersonaJoinRow {
  celeb_id: string
  persona: PersonaJsonb
  profiles: PersonaJoinProfile | PersonaJoinProfile[] | null
}

async function fetchSimilarByCelebId(
  celebId: string,
  limit: number,
  locale: string,
): Promise<SimilarByCelebResult> {
  const supabase = createStaticClient()

  const { data: target, error: targetError } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (nickname, nickname_en, profession, avatar_url, birth_date, death_date, title)
    `)
    .eq('celeb_id', celebId)
    .single()

  if (targetError || !target) {
    return { targetPersona: null, targetPersonaJsonb: null, similarCelebs: [] }
  }

  const isEn = locale === 'en'
  const resolveNick = (en: string | null | undefined, ko: string) => isEn && en ? en : ko

  const tRow: PersonaJoinRow = target
  const tProfile = Array.isArray(tRow.profiles) ? tRow.profiles[0] : tRow.profiles
  const tJsonb = tRow.persona
  const tStats = parsePersonaJsonb(tJsonb)

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
    return { targetPersona, targetPersonaJsonb: tJsonb, similarCelebs: [] }
  }

  const similarCelebs: SimilarCeleb[] = (all as PersonaJoinRow[])
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const stats = parsePersonaJsonb(row.persona)
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

  return { targetPersona, targetPersonaJsonb: tJsonb, similarCelebs }
}

const getSimilarByCelebIdCached = unstable_cache(
  fetchSimilarByCelebId,
  ['similar-by-celeb'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getSimilarByCelebId(
  celebId: string,
  limit: number = 5,
  locale: string = 'ko'
): Promise<SimilarByCelebResult> {
  return getSimilarByCelebIdCached(celebId, limit, locale)
}
