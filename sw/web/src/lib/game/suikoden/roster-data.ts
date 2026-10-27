import { isHistoricalGameFigure } from "@/lib/game/figure-selection"
import type { DatabaseClient } from '@feelandnote/db'
import { parseSpectrumJsonb, type SpectrumJsonb } from '@/lib/spectrum/types'
import { getCelebYear } from '@/lib/celeb/lifespan'
import { STAT_KEYS } from './constants'
import type { RosterRow } from './types'

interface ProfileRow {
  id: string; nickname: string | null; nickname_en: string | null; title: string | null; title_en: string | null
  profession: string | null; nationality: string | null; gender: boolean | null; birth_date: string | null; death_date: string | null
  avatar_url: string | null; voice_v: number; view_count: number; celeb_reality: string
  celeb_influence: { total_score: number }[] | { total_score: number } | null
  celeb_persona: { persona: SpectrumJsonb | null }[] | { persona: SpectrumJsonb | null } | null
}
const PAGE_SIZE = 1000
export async function readRoster(db: DatabaseClient, locale: string): Promise<{ rows: RosterRow[]; avatarBase: string }> {
  const rows: RosterRow[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const result = await db.from('celebs')
      .select('id,nickname,nickname_en,title,title_en,profession,nationality,gender,birth_date,death_date,avatar_url,voice_v,view_count,celeb_reality,celeb_influence!celeb_influence_celebs_fkey(total_score),celeb_persona!celeb_persona_celebs_fkey(persona)')
      .eq('publication_status', 'active').order('id').range(start, start + PAGE_SIZE - 1)
      .overrideTypes<ProfileRow[], { merge: false }>()
    if (result.error) throw result.error
    const page = result.data ?? []
    for (const profile of page) {
      // 신화·소설의 고정 인물은 유지하고, 실존·전승 인물은 공통 연대 기준으로 선발한다.
      if (profile.celeb_reality !== 'FICTION' && !isHistoricalGameFigure(profile.death_date)) continue
      const persona = Array.isArray(profile.celeb_persona) ? profile.celeb_persona[0] : profile.celeb_persona
      const influence = Array.isArray(profile.celeb_influence) ? profile.celeb_influence[0] : profile.celeb_influence
      let stats: number[] | null = null
      if (persona?.persona) {
        try {
          const parsed = parseSpectrumJsonb(persona.persona)
          const values = STAT_KEYS.map(key => parsed[key])
          if (values.every(value => typeof value === 'number' && Number.isFinite(value))) stats = values
        } catch { /* Missing persona fields use visibly marked derived game stats. */ }
      }
      rows.push([profile.id, locale === 'en' ? profile.nickname_en || profile.nickname || '' : profile.nickname || '',
        locale === 'en' ? profile.title_en || profile.title || '' : profile.title || '', profile.profession || 'other', profile.nationality || '',
        profile.gender === null ? null : Number(profile.gender), getCelebYear(profile.birth_date), getCelebYear(profile.death_date), profile.avatar_url,
        stats, influence?.total_score ?? 0, profile.celeb_reality === 'FICTION' ? 'F' : profile.celeb_reality === 'BOTH' ? 'B' : 'R', profile.voice_v ?? 0, profile.view_count ?? 0])
    }
    if (page.length < PAGE_SIZE) break
  }
  return { rows, avatarBase: process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? 'https://assets.feelandnote.com' }
}
