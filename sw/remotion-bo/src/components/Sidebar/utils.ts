import type { EpisodeSummary, PartEntry, PersonGroup, TabKey } from './types'

export function fmtYear(y: number | null): string {
  if (y == null) return '?'
  return y < 0 ? `BC ${Math.abs(y)}` : String(y)
}

export function parseEpName(name: string) {
  const isEn = name.endsWith('-en')
  const withoutEn = isEn ? name.slice(0, -3) : name
  const partMatch = withoutEn.match(/-(\d+)$/)
  const partNum = partMatch ? parseInt(partMatch[1]) : 1
  const basePerson = withoutEn.replace(/-\d+$/, '')
  return { isEn, basePerson, partNum, groupKey: withoutEn }
}

export function groupByPerson(episodes: EpisodeSummary[]): PersonGroup[] {
  const partMap = new Map<string, PartEntry>()
  const personMap = new Map<string, PersonGroup>()

  for (const ep of episodes) {
    const { isEn, basePerson, partNum, groupKey } = parseEpName(ep.name)

    if (!partMap.has(groupKey)) {
      partMap.set(groupKey, { partNum, baseName: groupKey, status: ep.status ?? 'todo', group: ep.group ?? '' })
    }
    const part = partMap.get(groupKey)!
    if (isEn) part.en = ep
    else { part.ko = ep; part.status = ep.status ?? 'todo'; part.group = ep.group ?? '' }

    if (!personMap.has(basePerson)) {
      personMap.set(basePerson, {
        personKey: basePerson,
        nickname: ep.nickname,
        birthYear: ep.birthYear ?? null,
        status: ep.status ?? 'todo',
        group: ep.group ?? '',
        parts: [],
      })
    }
    const person = personMap.get(basePerson)!
    if (!isEn) {
      person.nickname = ep.nickname
      person.birthYear = ep.birthYear ?? null
      person.group = ep.group ?? ''
    }
  }

  for (const [groupKey, part] of partMap) {
    const { basePerson } = parseEpName(groupKey)
    const person = personMap.get(basePerson)!
    if (!person.parts.some(p => p.baseName === groupKey)) person.parts.push(part)
  }

  for (const person of personMap.values()) {
    person.parts.sort((a, b) => a.partNum - b.partNum)
    person.status = person.parts[person.parts.length - 1].status
  }

  return [...personMap.values()]
}

export function tabKeyId(t: TabKey): string {
  if (t.kind === 'group') return `g:${t.group}`
  return t.kind
}

export function groupLabel(group: string): string {
  if (!group) return '그 외'
  if (group === '_archive') return '보관소'
  return group.split('/').pop() || group
}
