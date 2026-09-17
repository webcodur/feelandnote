import type { FactionEntry } from '@/actions/admin/factions/entries'

/** 분류(L1) 하나와 그에 속한 세력(L2)들 */
export interface FactionTheme {
  id: string
  name: string
  /** 비어 있으면 하위 세력이 없는 단독 분류다 */
  factions: { id: string; name: string }[]
}

/**
 * 도감 행 목록을 「분류(L1) → 소속 세력(L2)」 두 단으로 나눈다.
 * 들어온 순서(sort_order → 이름)를 그대로 이어받으므로 분류끼리도, 분류 안에서도 정렬된다.
 */
export function buildFactionThemes(entries: FactionEntry[]): FactionTheme[] {
  const sections = entries.filter((e) => e.level === 1)
  const factions = entries.filter((e) => e.level === 2)
  const sectionIds = new Set(sections.map((e) => e.id))

  return [
    ...sections.map((section) => ({
      id: section.id,
      name: section.name,
      factions: factions
        .filter((f) => f.lv1_id === section.id)
        .map((f) => ({ id: f.id, name: f.name })),
    })),
    // 소속 분류가 목록에 없는 세력은 잃지 않도록 스스로 분류 자리에 선다
    ...factions
      .filter((f) => !f.lv1_id || !sectionIds.has(f.lv1_id))
      .map((f) => ({ id: f.id, name: f.name, factions: [] })),
  ]
}

/** 주소창에 남은 세력 값 하나를 「분류 + 세력」 두 칸으로 되돌린다 */
export function resolveFactionSelection(
  themes: FactionTheme[],
  faction: string,
): { theme: string; faction: string } {
  if (!faction || faction === 'all') return { theme: 'all', faction: 'all' }

  if (themes.some((theme) => theme.id === faction)) return { theme: faction, faction: 'all' }

  const owner = themes.find((theme) => theme.factions.some((item) => item.id === faction))
  if (owner) return { theme: owner.id, faction }

  return { theme: 'all', faction: 'all' }
}
