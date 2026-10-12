export const FACTION_PREVIEW_ITEMS = 2

export interface FactionPreviewMember {
  id: string
  name: string
  nameEn: string | null
  groupId: string | null
  groupName: string | null
  groupNameEn: string | null
  groupPosition: number | null
  position: number | null
}

export interface FactionPreview {
  kind: 'people' | 'groups'
  names: string[]
  remaining: number
}

// 본인을 빼고 같은 그룹의 인물부터 소개한다. 함께 보여 줄 동료가 없는 그룹은 도감의 그룹 구성을 보여 준다.
export function selectFactionPreview(members: readonly FactionPreviewMember[], personId: string, locale: string): FactionPreview | null {
  const ordered = [...members].sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.id.localeCompare(b.id))
  const byId = new Map<string, FactionPreviewMember>()
  const byGroup = new Map<string, FactionPreviewMember>()
  for (const row of ordered) {
    if (!byId.has(row.id)) byId.set(row.id, row)
    if (row.groupId && row.groupName && !byGroup.has(row.groupId)) byGroup.set(row.groupId, row)
  }
  const unique = [...byId.values()]
  const own = unique.find(row => row.id === personId)
  const others = unique.filter(row => row.id !== personId)
  const peers = own?.groupId ? others.filter(row => row.groupId === own.groupId) : []
  const groups = [...byGroup.values()]
    .sort((a, b) => (a.groupPosition ?? Infinity) - (b.groupPosition ?? Infinity) || (a.position ?? Infinity) - (b.position ?? Infinity) || a.groupId!.localeCompare(b.groupId!))

  if (!peers.length && groups.length > 1) return {
    kind: 'groups',
    names: groups.slice(0, FACTION_PREVIEW_ITEMS).map(row => locale === 'en' ? row.groupNameEn?.trim() || row.groupName! : row.groupName!),
    remaining: Math.max(0, groups.length - FACTION_PREVIEW_ITEMS),
  }
  if (!others.length) return null
  const peersIds = new Set(peers.map(row => row.id))
  const people = [...peers, ...others.filter(row => !peersIds.has(row.id))].slice(0, FACTION_PREVIEW_ITEMS)
  return {
    kind: 'people',
    names: people.map(row => locale === 'en' ? row.nameEn?.trim() || row.name : row.name),
    remaining: others.length - people.length,
  }
}
