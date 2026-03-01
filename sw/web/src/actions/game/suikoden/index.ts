'use server'

import { createClient } from '@/lib/supabase/server'
import type { GameCharacter } from '@/lib/game/suikoden/types'
import { dbToCharacter, getDeathYear } from '@/lib/game/suikoden/utils'

const CUTOFF_YEARS = 120

export async function loadSuikodenCharacters(): Promise<GameCharacter[]> {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()
  const maxDeathYear = currentYear - CUTOFF_YEARS

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, nickname, title, profession, nationality, gender,
      birth_date, death_date, bio, quotes,
      avatar_url,
      celeb_influence (
        political, strategic, tech, social, economic, cultural,
        transhistoricity, total_score
      ),
      celeb_persona (
        command, martial, intellect, charisma,
        temperance, diligence, reflection, courage,
        loyalty, benevolence, fairness, humility,
        pessimism_optimism, conservative_progressive,
        individual_social, cautious_bold
      )
    `)
    .not('death_date', 'is', null)
    .not('death_date', 'eq', '')
    .not('profession', 'is', null)

  if (error || !data) {
    console.error("[loadSuikodenCharacters] 캐릭터 조회 실패:", error?.message);
    return [];
  }

  return data
    .filter((p: any) => {
      const influence = Array.isArray(p.celeb_influence) ? p.celeb_influence[0] : p.celeb_influence
      if (!influence) return false
      const year = getDeathYear(p.death_date)
      return year <= maxDeathYear
    })
    .map((p: any) => {
      const influence = Array.isArray(p.celeb_influence) ? p.celeb_influence[0] : p.celeb_influence
      const persona = Array.isArray(p.celeb_persona) ? p.celeb_persona[0] : p.celeb_persona
      return dbToCharacter(p, influence, persona ?? undefined)
    })
    .sort((a: GameCharacter, b: GameCharacter) => b.totalScore - a.totalScore)
}

/** celeb_dialogues 로딩 — characterId → lines 매핑 */
export async function loadSuikodenDialogues(
  characterIds: string[],
): Promise<Record<string, Record<string, string[]>>> {
  if (characterIds.length === 0) return {}

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_dialogues')
    .select('celeb_id, lines')
    .in('celeb_id', characterIds.slice(0, 200))

  if (error || !data) {
    console.error("[loadSuikodenDialogues] 대사 조회 실패:", error?.message)
    return {}
  }

  const map: Record<string, Record<string, string[]>> = {}
  for (const row of data as any[]) {
    if (row.lines && typeof row.lines === 'object') {
      map[row.celeb_id] = row.lines
    }
  }
  return map
}

