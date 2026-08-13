import type { FactionGroup, FactionPerson } from '@/lib/faction-types'

export interface FactionCastEntry {
  key: string
  celebId?: string
  slug?: string
  name: string
  role?: string
  groupNames: string[]
  appearances: number
  excluded: boolean
}

function peopleOf(group: FactionGroup): FactionPerson[] {
  if (group.clusters?.length) {
    return group.clusters.flatMap(cluster => cluster.people ?? [])
  }
  return group.people ?? []
}

function identityOf(person: FactionPerson): string {
  if (person.celebId) return `id:${person.celebId}`
  if (person.slug) return `slug:${person.slug.trim().toLocaleLowerCase('en-US')}`
  return `name:${person.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR')}`
}

/** 같은 셀럽이 여러 세력에 나와도 사진 작업 카드에는 한 번만 세운다. */
export function collectFactionCast(groups: FactionGroup[]): FactionCastEntry[] {
  const entries = new Map<string, FactionCastEntry>()

  for (const group of groups) {
    const groupName = group.name.split('\n')[0]?.trim() || '이름 없는 세력'
    for (const person of peopleOf(group)) {
      const key = identityOf(person)
      const existing = entries.get(key)
      const placementExcluded = !!group.disabled || !!person.disabled
      if (existing) {
        existing.appearances += 1
        existing.excluded = existing.excluded && placementExcluded
        if (!existing.groupNames.includes(groupName)) existing.groupNames.push(groupName)
        continue
      }

      entries.set(key, {
        key,
        celebId: person.celebId,
        slug: person.slug,
        name: person.name.trim() || '이름 없음',
        role: person.role?.trim() || person.lines?.find(Boolean)?.trim(),
        groupNames: [groupName],
        appearances: 1,
        excluded: placementExcluded,
      })
    }
  }

  return [...entries.values()]
}
