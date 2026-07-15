'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { getLocale } from "next-intl/server";
import type { GameCharacter } from '@/lib/game/suikoden/types'
import type { PersonaJsonb } from '@/lib/persona/types'
import { parsePersonaJsonb } from '@/lib/persona/types'
import { dbToCharacter, getDeathYear } from '@/lib/game/suikoden/utils'
import type { Tables } from '@/types/supabase'

const CUTOFF_YEARS = 120

// celeb_influence 임베드 조회 행
type SuikodenInfluenceJoin = Pick<
  Tables<'celeb_influence'>,
  'political' | 'strategic' | 'tech' | 'social' | 'economic' | 'cultural' | 'transhistoricity' | 'total_score'
>

// profiles 조회 행 (death_date는 not-null 필터 적용됨)
interface SuikodenProfileRow {
  id: string
  nickname: string | null
  title: string | null
  profession: string | null
  nationality: string | null
  gender: boolean | null
  birth_date: string | null
  death_date: string
  bio: string | null
  avatar_url: string | null
  celeb_influence: SuikodenInfluenceJoin | SuikodenInfluenceJoin[] | null
  celeb_persona: { persona: PersonaJsonb | null } | { persona: PersonaJsonb | null }[] | null
}

// 대사 구조 (상황 키 → 변형 배열)
type SuikodenLines = Record<string, string[]>

// celeb_dialogues 조회 행
interface SuikodenDialogueRow {
  celeb_id: string
  lines: SuikodenLines
  lines_en: SuikodenLines | null
}

export async function loadSuikodenCharacters(): Promise<GameCharacter[]> {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()
  const maxDeathYear = currentYear - CUTOFF_YEARS

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, nickname, title, profession, nationality, gender,
      birth_date, death_date, bio,
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

  const rows: SuikodenProfileRow[] = data

  // celeb_dialogues에서 quote 조회
  const filteredIds = rows
    .filter((p) => {
      const influence = Array.isArray(p.celeb_influence) ? p.celeb_influence[0] : p.celeb_influence
      if (!influence) return false
      const year = getDeathYear(p.death_date)
      return year <= maxDeathYear
    })
    .map((p) => p.id)

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

  return rows
    .filter((p) => filteredIds.includes(p.id))
    .map((p) => {
      const influence = Array.isArray(p.celeb_influence) ? p.celeb_influence[0] : p.celeb_influence
      const personaRow = Array.isArray(p.celeb_persona) ? p.celeb_persona[0] : p.celeb_persona
      const persona = personaRow?.persona ? parsePersonaJsonb(personaRow.persona) : undefined
      const char = dbToCharacter(p, influence!, persona)
      const dlgQuote = quoteMap.get(p.id)
      if (dlgQuote) char.quotes = dlgQuote
      return char
    })
    .sort((a: GameCharacter, b: GameCharacter) => b.totalScore - a.totalScore)
}

/** celeb_dialogues 로딩 — characterId → lines 매핑 (1시간 캐시) */
async function fetchSuikodenDialogues(locale: string): Promise<Record<string, SuikodenLines>> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('celeb_dialogues')
    .select('celeb_id, lines, lines_en');

  if (error || !data) {
    console.error("[loadSuikodenDialogues] 대사 조회 실패:", error?.message)
    return {}
  }

  const result: Record<string, SuikodenLines> = {};
  const dialogueRows: SuikodenDialogueRow[] = data;
  dialogueRows.forEach(row => {
    result[row.celeb_id] = locale === 'en' && row.lines_en ? row.lines_en : row.lines;
  });
  return result;
}

const loadSuikodenDialoguesCached = unstable_cache(
  fetchSuikodenDialogues,
  ['suikoden-dialogues'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES] }
)

export async function loadSuikodenDialogues(): Promise<Record<string, SuikodenLines>> {
  const locale = await getLocale()
  return loadSuikodenDialoguesCached(locale)
}
