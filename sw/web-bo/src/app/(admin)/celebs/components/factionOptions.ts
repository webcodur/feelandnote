import type { CelebTag } from '@/actions/admin/tags'

/** 상위 테마 하나와 그에 속한 세력들 */
export interface FactionTheme {
  id: string
  name: string
  /** 비어 있으면 하위 세력이 없는 단독 테마다 */
  factions: { id: string; name: string }[]
}

/**
 * 태그 목록을 「상위 테마 → 소속 세력」 두 단으로 나눈다.
 * 들어온 순서(sort_order → 이름)를 그대로 이어받으므로 테마끼리도, 테마 안에서도 정렬된다.
 */
export function buildFactionThemes(tags: CelebTag[]): FactionTheme[] {
  const childrenByParent = new Map<string, { id: string; name: string }[]>()
  for (const tag of tags) {
    if (!tag.parent_id) continue
    const entry = { id: tag.id, name: tag.name }
    const siblings = childrenByParent.get(tag.parent_id)
    if (siblings) siblings.push(entry)
    else childrenByParent.set(tag.parent_id, [entry])
  }

  const topLevelIds = new Set(tags.filter((tag) => !tag.parent_id).map((tag) => tag.id))

  return tags
    // 상위 테마가 목록에 없는 항목은 잃지 않도록 그 자체를 테마로 올린다
    .filter((tag) => !tag.parent_id || !topLevelIds.has(tag.parent_id))
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      factions: childrenByParent.get(tag.id) ?? [],
    }))
}

/** 주소창에 남은 세력 값 하나를 「테마 + 세력」 두 칸으로 되돌린다 */
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
