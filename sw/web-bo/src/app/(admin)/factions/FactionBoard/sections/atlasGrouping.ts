/**
 * 세력도감 목록의 상위분류 묶기 — 서비스 도감과 같은 갈래를 관리 화면에도 세운다.
 *
 * 갈래의 정본은 `celeb_tags.parent_id` 하나다(웹 도감도 같은 값으로 진열한다).
 * 아래에 테마를 하나라도 거느린 테마가 곧 상위분류이고, 그 테마 자체는 목록에서
 * 한 줄을 차지하지 않고 묶음 머리로 올라선다.
 */

import type { FactionThemeSummary } from '@/actions/admin/factions/themes'

/** 상위분류 하나와 그 아래 목록 */
export interface AtlasSection {
  key: string
  name: string
  /** 상위분류 테마의 고유색. 「분류 없음」 묶음은 없다 */
  color: string | null
  /** 상위분류 테마 자체의 id — 머리줄에서 그 테마를 열 때 쓴다 */
  tagId: string | null
  themes: FactionThemeSummary[]
}

export const UNGROUPED_KEY = '__ungrouped__'
export const UNGROUPED_NAME = '분류 없음'

/** 아래에 테마를 거느린 테마의 id 집합 — 이들이 상위분류다 */
export function groupTagIds(themes: FactionThemeSummary[]): Set<string> {
  const ids = new Set<string>()
  for (const theme of themes) {
    if (theme.parent_id) ids.add(theme.parent_id)
  }
  return ids
}

/**
 * 상위분류별로 묶은 목록.
 *
 * 넘어오는 테마는 이미 검색으로 걸러진 것이며, 여기서는 순서를 바꾸지 않고
 * 갈래에만 나눠 담는다. 묶음 순서는 도감 노출 순서(`sort_order`)를 그대로 따르고
 * 「분류 없음」이 맨 뒤에 선다. 아무것도 안 남은 묶음은 돌려주지 않는다.
 */
export function buildAtlasSections({
  themes,
  allThemes,
}: {
  /** 제 줄을 갖는 테마(걸러진 뒤) */
  themes: FactionThemeSummary[]
  /** 갈래 판정을 위한 테마 전량 */
  allThemes: FactionThemeSummary[]
}): AtlasSection[] {
  const groupIds = groupTagIds(allThemes)
  const groupThemes = allThemes
    .filter(theme => groupIds.has(theme.id))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

  const sections = new Map<string, AtlasSection>()
  for (const theme of groupThemes) {
    sections.set(theme.id, { key: theme.id, name: theme.name, color: theme.color, tagId: theme.id, themes: [] })
  }
  sections.set(UNGROUPED_KEY, { key: UNGROUPED_KEY, name: UNGROUPED_NAME, color: null, tagId: null, themes: [] })

  const bucket = (key: string) => sections.get(key) ?? sections.get(UNGROUPED_KEY)!

  for (const theme of themes) {
    // 상위분류 테마는 제 줄을 갖지 않고 묶음 머리로 올라선다
    if (groupIds.has(theme.id)) continue
    bucket(theme.parent_id ?? UNGROUPED_KEY).themes.push(theme)
  }

  return [...sections.values()].filter(s => s.themes.length > 0)
}
