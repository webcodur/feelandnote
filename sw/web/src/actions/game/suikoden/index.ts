'use server'

import { createClient } from '@/lib/supabase/server'
import type { GameCharacter, GameItem } from '@/lib/game/suikoden/types'
import { dbToCharacter, dbToItem, getDeathYear } from '@/lib/game/suikoden/utils'

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
      avatar_url, portrait_url,
      celeb_influence (
        political, strategic, tech, social, economic, cultural,
        transhistoricity, total_score
      )
    `)
    .not('death_date', 'is', null)
    .not('death_date', 'eq', '')
    .not('profession', 'is', null)

  if (error || !data) return []

  return data
    .filter((p: any) => {
      const influence = Array.isArray(p.celeb_influence) ? p.celeb_influence[0] : p.celeb_influence
      if (!influence) return false
      const year = getDeathYear(p.death_date)
      return year <= maxDeathYear
    })
    .map((p: any) => {
      const influence = Array.isArray(p.celeb_influence) ? p.celeb_influence[0] : p.celeb_influence
      return dbToCharacter(p, influence)
    })
    .sort((a: GameCharacter, b: GameCharacter) => b.totalScore - a.totalScore)
}

export async function loadSuikodenItems(characterIds: string[]): Promise<GameItem[]> {
  if (characterIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_contents')
    .select(`
      user_id, content_id, review,
      contents (id, type, title, creator, thumbnail_url)
    `)
    .in('user_id', characterIds.slice(0, 100)) // 배치 제한

  if (error || !data) return []

  // 콘텐츠별 평균 점수 계산을 위해 그룹핑
  const contentScores = new Map<string, number[]>()
  // 간단히 50점 기본값 사용
  const items: GameItem[] = []
  const seen = new Set<string>()

  for (const uc of data as any[]) {
    const content = uc.contents
    if (!content || seen.has(content.id)) continue
    seen.add(content.id)
    items.push(dbToItem(content, uc, 40)) // 기본 점수 40
  }

  return items
}
