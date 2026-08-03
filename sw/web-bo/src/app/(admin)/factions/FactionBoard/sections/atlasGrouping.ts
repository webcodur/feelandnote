/**
 * 세력도감 목록의 상위분류 묶기 — 서비스 도감과 같은 갈래를 관리 화면에도 세운다.
 *
 * 갈래의 정본은 `celeb_tags.parent_id` 하나다(웹 도감도 같은 값으로 진열한다).
 * 아래에 테마를 하나라도 거느린 테마가 곧 상위분류이고, 그 테마 자체는 목록에서
 * 한 줄을 차지하지 않고 묶음 머리로 올라선다.
 *
 * 영상 편은 스스로 갈래를 갖지 않는다 — 그 편의 세력이 가리키는 테마를 따라간다.
 * 여러 테마에 걸친 편은 갈래가 있는 첫 테마를 따르고, 어디에도 안 걸리면 「분류 없음」에 모인다.
 */

import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import type { FactionEpisodeSummary } from '@/actions/admin/factions/episodes'

/** 영상 편 한 줄에 붙는 테마 표시 */
export interface AtlasThemeLink {
  id: string
  name: string
  nameEn: string | null
  color: string
  /** 이 테마가 속한 상위분류 id. 없으면 무소속 */
  parentId: string | null
}

/** 상위분류 하나와 그 아래 목록 */
export interface AtlasSection {
  key: string
  name: string
  /** 상위분류 테마의 고유색. 「분류 없음」 묶음은 없다 */
  color: string | null
  /** 상위분류 테마 자체의 id — 머리줄에서 그 테마를 열 때 쓴다 */
  tagId: string | null
  episodes: FactionEpisodeSummary[]
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

/** 폴더 → 그 편의 세력이 가리키는 테마들 */
export function buildThemesByFolder(themes: FactionThemeSummary[]): Map<string, AtlasThemeLink[]> {
  const result = new Map<string, AtlasThemeLink[]>()
  for (const theme of themes) {
    for (const episode of theme.episodes) {
      const list = result.get(episode.folder) ?? []
      list.push({
        id: theme.id,
        name: theme.name,
        nameEn: theme.name_en,
        color: theme.color,
        parentId: theme.parent_id,
      })
      result.set(episode.folder, list)
    }
  }
  return result
}

/** 영상 편이 속한 상위분류 — 갈래가 있는 첫 테마를 따른다 */
export function sectionKeyOfEpisode(links: AtlasThemeLink[], groupIds: Set<string>): string {
  for (const link of links) {
    if (link.parentId) return link.parentId
    // 세력이 상위분류 테마를 직접 가리키는 경우도 있다
    if (groupIds.has(link.id)) return link.id
  }
  return UNGROUPED_KEY
}

/**
 * 상위분류별로 묶은 목록.
 *
 * 넘어오는 두 배열은 이미 검색·조건으로 걸러진 것이며, 여기서는 순서를 바꾸지 않고
 * 갈래에만 나눠 담는다. 묶음 순서는 도감 노출 순서(`sort_order`)를 그대로 따르고
 * 「분류 없음」이 맨 뒤에 선다. 아무것도 안 남은 묶음은 돌려주지 않는다.
 */
export function buildAtlasSections({
  episodes,
  themes,
  allThemes,
  themesByFolder,
}: {
  episodes: FactionEpisodeSummary[]
  /** 제 줄을 갖는 웹 전용 테마(걸러진 뒤) */
  themes: FactionThemeSummary[]
  /** 갈래 판정을 위한 테마 전량 */
  allThemes: FactionThemeSummary[]
  themesByFolder: Map<string, AtlasThemeLink[]>
}): AtlasSection[] {
  const groupIds = groupTagIds(allThemes)
  const groupThemes = allThemes
    .filter(theme => groupIds.has(theme.id))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

  const sections = new Map<string, AtlasSection>()
  for (const theme of groupThemes) {
    sections.set(theme.id, {
      key: theme.id,
      name: theme.name,
      color: theme.color,
      tagId: theme.id,
      episodes: [],
      themes: [],
    })
  }
  sections.set(UNGROUPED_KEY, {
    key: UNGROUPED_KEY,
    name: UNGROUPED_NAME,
    color: null,
    tagId: null,
    episodes: [],
    themes: [],
  })

  const bucket = (key: string) => sections.get(key) ?? sections.get(UNGROUPED_KEY)!

  for (const episode of episodes) {
    const links = themesByFolder.get(episode.folder) ?? []
    bucket(sectionKeyOfEpisode(links, groupIds)).episodes.push(episode)
  }

  for (const theme of themes) {
    // 상위분류 테마는 제 줄을 갖지 않고 묶음 머리로 올라선다
    if (groupIds.has(theme.id)) continue
    bucket(theme.parent_id ?? UNGROUPED_KEY).themes.push(theme)
  }

  return [...sections.values()].filter(s => s.episodes.length > 0 || s.themes.length > 0)
}
