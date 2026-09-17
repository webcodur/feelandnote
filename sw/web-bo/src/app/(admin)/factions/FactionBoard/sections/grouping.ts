/**
 * 세력도감 목록의 분류 묶기 — 서비스 도감과 같은 갈래를 관리 화면에도 세운다.
 *
 * 갈래의 정본은 두 표다 — 분류는 `faction_lv1`(L1), 세력 카드는 `faction_lv2`(L2)이고
 * `lv2.lv1_id`가 소속 분류를 가린다. 분류 행 자체는 목록에서 한 줄을 차지하지 않고
 * 묶음 머리로 올라선다.
 */

import type { FactionEntrySummary } from '@/actions/admin/factions/board'

/** 분류 하나와 그 아래 세력 목록 */
export interface FactionSection {
  key: string
  name: string
  /** 분류의 고유색 */
  color: string | null
  /** 분류(L1) 행의 id — 머리줄에서 그 분류를 열 때 쓴다 */
  lv1Id: string | null
  entries: FactionEntrySummary[]
}

export const UNGROUPED_KEY = '__ungrouped__'
export const UNGROUPED_NAME = '분류 없음'

/**
 * 분류별로 묶은 목록.
 *
 * 넘어오는 행은 이미 검색으로 걸러진 것이며, 여기서는 순서를 바꾸지 않고
 * 갈래에만 나눠 담는다. 묶음 순서는 도감 노출 순서(`sort_order`)를 그대로 따른다.
 * 아무것도 안 남은 묶음은 돌려주지 않는다.
 */
export function buildFactionSections({
  entries,
  allEntries,
}: {
  /** 제 줄을 갖는 세력(걸러진 뒤) */
  entries: FactionEntrySummary[]
  /** 갈래 판정을 위한 도감 행 전량 */
  allEntries: FactionEntrySummary[]
}): FactionSection[] {
  const heads = allEntries
    .filter(entry => entry.level === 1)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

  const sections = new Map<string, FactionSection>()
  for (const head of heads) {
    sections.set(head.id, { key: head.id, name: head.name, color: head.color, lv1Id: head.id, entries: [] })
  }
  sections.set(UNGROUPED_KEY, { key: UNGROUPED_KEY, name: UNGROUPED_NAME, color: null, lv1Id: null, entries: [] })

  const bucket = (key: string) => sections.get(key) ?? sections.get(UNGROUPED_KEY)!

  for (const entry of entries) {
    // L1 분류는 제 줄을 갖지 않고 묶음 머리로 올라선다
    if (entry.level === 1) continue
    bucket(entry.lv1_id ?? UNGROUPED_KEY).entries.push(entry)
  }

  return [...sections.values()].filter(s => s.entries.length > 0)
}
