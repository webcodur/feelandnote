/**
 * 세력 안의 실제 이야기 순서.
 *
 * 단체샷은 cluster 항목, DB 개인 항목은 faction_people 행으로 보존한다. 사람 카드가 아닌
 * 서사 컷도 같은 행을 쓰되 `isPerson=false`로 표시하고, sequence는 본문을 중복 저장하지 않고
 * 그 행의 배열 위치만 가리킨다.
 */

export type FactionSequenceItem =
  | { kind: 'cluster'; clusterIndex: number }
  | { kind: 'entry'; clusterIndex: number; entryIndex: number }
  | { kind: 'cut' }

type Row = Record<string, unknown>

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => !!item && typeof item === 'object' && !Array.isArray(item))
    : []
}

function groupLabel(group: Row): string {
  const name = typeof group.name === 'string' ? group.name.split('\n')[0]?.trim() : ''
  return name || '이름 없는 세력'
}

/** isPerson이 생략된 기존 행은 모두 인물이다. */
export function isFactionPersonEntry(entry: Row): boolean {
  return entry.isPerson !== false
}

export function isFactionNarrativeEntry(entry: Row): boolean {
  return entry.isPerson === false
}

/** 구 inline scene 본문을 faction_people 한 행과 같은 개인 항목 형태로 바꾼다. */
export function legacySceneToFactionEntry(scene: Row): Row {
  const { title, titleEn, media, mediaCrop, ...rest } = scene
  return {
    ...rest,
    isPerson: false,
    name: typeof title === 'string' && title.trim() ? title : '이름 없는 장면',
    ...(typeof titleEn === 'string' && titleEn.trim() ? { nameEn: titleEn } : {}),
    ...(typeof media === 'string' && media ? { image: media } : {}),
    ...(mediaCrop && typeof mediaCrop === 'object' ? { imageCrop: mediaCrop } : {}),
  }
}

function validateCuts(group: Row, sequence: FactionSequenceItem[]): void {
  sequence.forEach((item, index) => {
    if (item.kind !== 'cut') return
    if (index === 0 || index === sequence.length - 1) {
      throw new Error(`${groupLabel(group)} sequence의 편 경계는 맨 앞이나 맨 뒤에 둘 수 없다`)
    }
    if (sequence[index - 1]?.kind === 'cut') {
      throw new Error(`${groupLabel(group)} sequence에 편 경계가 연속으로 들어 있다`)
    }
  })
}

/**
 * 구 openingScenes/scenesAfter/inline scene을 새 행 참조 구조로 한 번에 승격한다.
 * 기존 인물의 F/C/P 음성 좌표를 보존하기 위해 서사 항목은 해당 묶음 people 배열의 맨 뒤에 붙인다.
 */
export function normalizeFactionGroupEntries<T extends Row>(group: T): T {
  const clusters: Row[] = rows(group.clusters).map(cluster => ({
    ...cluster,
    people: rows(cluster.people).map(person => ({ ...person })),
  }))
  const hasLegacyScenes = Array.isArray(group.openingScenes)
    || (Array.isArray(group.sequence) && group.sequence.some(item => (item as Row)?.kind === 'scene'))
    || clusters.some(cluster => Array.isArray(cluster.scenesAfter))
  if (clusters.length === 0 && hasLegacyScenes) {
    throw new Error(`${groupLabel(group)}의 서사 항목을 담을 묶음이 없다`)
  }

  const source: Row[] = Array.isArray(group.sequence)
    ? rows(group.sequence)
    : [
        ...rows(group.openingScenes).map(scene => ({ kind: 'scene', scene })),
        ...clusters.flatMap((cluster, clusterIndex) => [
          { kind: 'cluster', clusterIndex },
          ...rows(cluster.scenesAfter).map(scene => ({ kind: 'scene', scene })),
        ]),
      ]

  const sequence: FactionSequenceItem[] = []
  let lastClusterIndex = 0
  for (const [index, raw] of source.entries()) {
    if (raw.kind === 'cluster') {
      lastClusterIndex = Number(raw.clusterIndex)
      sequence.push({ kind: 'cluster', clusterIndex: lastClusterIndex })
      continue
    }
    if (raw.kind === 'entry') {
      sequence.push({
        kind: 'entry',
        clusterIndex: Number(raw.clusterIndex),
        entryIndex: Number(raw.entryIndex),
      })
      continue
    }
    if (raw.kind === 'scene' && raw.scene && typeof raw.scene === 'object' && !Array.isArray(raw.scene)) {
      const clusterIndex = Math.min(Math.max(lastClusterIndex, 0), clusters.length - 1)
      const people = clusters[clusterIndex].people as Row[]
      const entryIndex = people.length
      people.push(legacySceneToFactionEntry(raw.scene as Row))
      sequence.push({ kind: 'entry', clusterIndex, entryIndex })
      continue
    }
    if (raw.kind === 'cut') {
      sequence.push({ kind: 'cut' })
      continue
    }
    throw new Error(`${groupLabel(group)} sequence ${index + 1}번의 kind가 cluster, entry 또는 cut이 아니다`)
  }

  const cleanClusters = clusters.map(cluster => {
    const clean = { ...cluster }
    delete clean.scenesAfter
    return clean
  })
  const clean: Row = { ...group, clusters: cleanClusters, sequence }
  delete clean.openingScenes
  return clean as T
}

/** 새 구조를 검증한다. sequence가 없으면 묶음과 서사 항목의 안전한 기본 순서를 만든다. */
export function factionSequenceOf(group: Row): FactionSequenceItem[] {
  const clusters = rows(group.clusters)
  const stored = group.sequence
  if (!Array.isArray(stored)) {
    const normalized = normalizeFactionGroupEntries(group)
    return factionSequenceOf(normalized)
  }

  const seenClusters = new Set<number>()
  const seenEntries = new Set<string>()
  const sequence = rows(stored).map((item, index): FactionSequenceItem => {
    if (item.kind === 'cluster') {
      const clusterIndex = Number(item.clusterIndex)
      if (!Number.isInteger(clusterIndex) || clusterIndex < 0 || clusterIndex >= clusters.length) {
        throw new Error(`${groupLabel(group)} sequence ${index + 1}번이 없는 묶음(${String(item.clusterIndex)})을 가리킨다`)
      }
      if (seenClusters.has(clusterIndex)) {
        throw new Error(`${groupLabel(group)} sequence에 묶음 ${clusterIndex + 1}이 두 번 들어 있다`)
      }
      seenClusters.add(clusterIndex)
      return { kind: 'cluster', clusterIndex }
    }
    if (item.kind === 'entry') {
      const clusterIndex = Number(item.clusterIndex)
      const entryIndex = Number(item.entryIndex)
      const entry = rows(clusters[clusterIndex]?.people)[entryIndex]
      if (!Number.isInteger(clusterIndex) || !Number.isInteger(entryIndex) || !entry) {
        throw new Error(`${groupLabel(group)} sequence ${index + 1}번이 없는 개인 항목을 가리킨다`)
      }
      if (!isFactionNarrativeEntry(entry)) {
        throw new Error(`${groupLabel(group)} sequence ${index + 1}번의 entry는 isPerson=false가 아니다`)
      }
      const key = `${clusterIndex}:${entryIndex}`
      if (seenEntries.has(key)) {
        throw new Error(`${groupLabel(group)} sequence에 개인 항목 ${clusterIndex + 1}:${entryIndex + 1}이 두 번 들어 있다`)
      }
      seenEntries.add(key)
      return { kind: 'entry', clusterIndex, entryIndex }
    }
    if (item.kind === 'cut') return { kind: 'cut' }
    if (item.kind === 'scene') {
      throw new Error(`${groupLabel(group)}에 구 inline scene이 남아 있다 — normalizeFactionGroupEntries를 먼저 적용하라`)
    }
    throw new Error(`${groupLabel(group)} sequence ${index + 1}번의 kind가 cluster, entry 또는 cut이 아니다`)
  })

  validateCuts(group, sequence)
  if (seenClusters.size !== clusters.length) {
    const missing = clusters.flatMap((_, index) => seenClusters.has(index) ? [] : [index + 1])
    throw new Error(`${groupLabel(group)} sequence에서 묶음 ${missing.join(', ')}이 빠졌다`)
  }
  const missingEntries: string[] = []
  clusters.forEach((cluster, clusterIndex) => {
    rows(cluster.people).forEach((entry, entryIndex) => {
      if (isFactionNarrativeEntry(entry) && !seenEntries.has(`${clusterIndex}:${entryIndex}`)) {
        missingEntries.push(`${clusterIndex + 1}:${entryIndex + 1}`)
      }
    })
  })
  if (missingEntries.length) {
    throw new Error(`${groupLabel(group)} sequence에서 서사 항목 ${missingEntries.join(', ')}이 빠졌다`)
  }
  return sequence
}

export function sequenceClusters<TCluster extends Row = Row>(group: Row): TCluster[] {
  const clusters = rows(group.clusters) as TCluster[]
  return factionSequenceOf(group).flatMap(item => item.kind === 'cluster' ? [clusters[item.clusterIndex]] : [])
}

export function sequenceEntries<TEntry extends Row = Row>(group: Row): TEntry[] {
  const clusters = rows(group.clusters)
  return factionSequenceOf(group).flatMap(item => item.kind === 'entry'
    ? [rows(clusters[item.clusterIndex]?.people)[item.entryIndex] as TEntry]
    : [])
}

export function sequenceCutCount(group: Row): number {
  return factionSequenceOf(group).filter(item => item.kind === 'cut').length
}
