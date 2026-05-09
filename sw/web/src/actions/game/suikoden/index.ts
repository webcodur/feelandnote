'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
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
    .eq('status', 'active')
    .not('death_date', 'is', null)
    .not('death_date', 'eq', '')
    .not('profession', 'is', null)

  if (error || !data) {
    console.error("[loadSuikodenCharacters] 캐릭터 조회 실패:", error?.message);
    return [];
  }

  // celeb_dialogues에서 quote 조회
  const filteredIds = data
    .filter((p: any) => {
      const influence = Array.isArray(p.celeb_influence) ? p.celeb_influence[0] : p.celeb_influence
      if (!influence) return false
      const year = getDeathYear(p.death_date)
      return year <= maxDeathYear
    })
    .map((p: any) => p.id)

  const locale = await getLocale()
  const quoteMap = new Map<string, string>()
  if (filteredIds.length > 0) {
    const { data: dRows } = await supabase
      .from('celeb_dialogues')
      .select('celeb_id, quote:lines->quote, quote_en:lines_en->quote')
      .in('celeb_id', filteredIds)
    for (const d of (dRows ?? []) as Array<{ celeb_id: string; quote: string | null; quote_en: string | null }>) {
      const quote = (locale === 'en' && d.quote_en) ? d.quote_en : d.quote
      quoteMap.set(d.celeb_id, quote ?? '')
    }
  }

  return data
    .filter((p: any) => filteredIds.includes(p.id))
    .map((p: any) => {
      const influence = Array.isArray(p.celeb_influence) ? p.celeb_influence[0] : p.celeb_influence
      const personaRow = Array.isArray(p.celeb_persona) ? p.celeb_persona[0] : p.celeb_persona
      const persona = personaRow?.persona ? parsePersonaJsonb(personaRow.persona as PersonaJsonb) : undefined
      const char = dbToCharacter(p, influence, persona)
      const dlgQuote = quoteMap.get(p.id)
      if (dlgQuote) char.quotes = dlgQuote
      return char
    })
    .sort((a: GameCharacter, b: GameCharacter) => b.totalScore - a.totalScore)
}

/** celeb_dialogues 로딩 — characterId → lines 매핑 (1시간 캐시) */
async function fetchSuikodenDialogues(locale: string): Promise<Record<string, any>> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('celeb_dialogues')
    .select('celeb_id, lines, lines_en');

  if (error || !data) {
    console.error("[loadSuikodenDialogues] 대사 조회 실패:", error?.message)
    return {}
  }

  const result: Record<string, any> = {};
  data.forEach(row => {
    result[row.celeb_id] = locale === 'en' && row.lines_en ? row.lines_en : row.lines;
  });
  return result;
}

const loadSuikodenDialoguesCached = unstable_cache(
  fetchSuikodenDialogues,
  ['suikoden-dialogues'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function loadSuikodenDialogues(): Promise<Record<string, any>> {
  const locale = await getLocale()
  return loadSuikodenDialoguesCached(locale)
}
