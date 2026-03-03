'use server'

import { createClient } from '@/lib/supabase/server'
import { getLocale } from "next-intl/server";
import type { GameCharacter } from '@/lib/game/suikoden/types'
import type { PersonaJsonb } from '@/lib/persona/types'
import { parsePersonaJsonb } from '@/lib/persona/types'
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
      celeb_persona ( persona )
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
      const personaRow = Array.isArray(p.celeb_persona) ? p.celeb_persona[0] : p.celeb_persona
      const persona = personaRow?.persona ? parsePersonaJsonb(personaRow.persona as PersonaJsonb) : undefined
      return dbToCharacter(p, influence, persona)
    })
    .sort((a: GameCharacter, b: GameCharacter) => b.totalScore - a.totalScore)
}

/** celeb_dialogues 로딩 — characterId → lines 매핑 */
export async function loadSuikodenDialogues(): Promise<Record<string, any>> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data, error } = await supabase
    .from('celeb_dialogues')
    .select('celeb_id, lines, lines_en');

  if (error || !data) {
    console.error("[loadSuikodenDialogues] 대사 조회 실패:", error?.message)
    return {}
  }

  const result: Record<string, any> = {};
  data.forEach(row => {
    // locale에 따라 lines_en을 우선 적용하거나 fallback으로 lines 사용
    result[row.celeb_id] = locale === 'en' && row.lines_en ? row.lines_en : row.lines;
  });
  return result;
}
