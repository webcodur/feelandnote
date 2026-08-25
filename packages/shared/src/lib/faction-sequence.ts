/**
 * 세력 안의 실제 이야기 순서.
 *
 * 최상위 sequence에는 장면(cluster)과 쇼츠 경계(cut)만 둔다. 구 인물 대사와
 * isPerson=false 장면은 같은 cluster.beats 안의 대사 항목으로 평평하게 승격한다.
 */

import {
  legacyFactionEntryToSceneBeats,
  legacyFactionPersonToSceneBeat,
  projectFactionSceneBeatsToPeople,
  type UnifiedFactionSceneBeat,
} from './faction-scene-unification'

export type FactionSequenceItem =
  | { kind: 'cluster'; clusterIndex: number; beatStart?: number; beatEnd?: number }
  | { kind: 'cut' }

type LegacyFactionSequenceItem = FactionSequenceItem | { kind: 'entry'; clusterIndex: number; entryIndex: number }

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

function cleanCuts(sequence: FactionSequenceItem[]): FactionSequenceItem[] {
  const clean: FactionSequenceItem[] = []
  for (const item of sequence) {
    if (item.kind === 'cut' && (clean.length === 0 || clean.at(-1)?.kind === 'cut')) continue
    clean.push(item)
  }
  if (clean.at(-1)?.kind === 'cut') clean.pop()
  return clean
}

/**
 * 구 openingScenes/scenesAfter/inline scene과 people quote를 cluster.beats로 한 번에 승격한다.
 * entry 행은 이 함수 안의 임시 입력 좌표일 뿐 반환 sequence에는 남지 않는다.
 */
export function normalizeFactionGroupEntries<T extends Row>(group: T): T {
  const clusters: Row[] = rows(group.clusters).map(cluster => ({
    ...cluster,
    people: rows(cluster.people).map(person => ({ ...person })),
    ...(Array.isArray(cluster.beats)
      ? { beats: rows(cluster.beats).map(beat => ({ ...beat })) }
      : {}),
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

  // 구 inline scene을 먼저 물리 행 참조로 바꾼다. 이후 단계는 entry/cluster/cut 세 종류만 다룬다.
  const expanded: LegacyFactionSequenceItem[] = []
  let lastClusterIndex = 0
  for (const [index, raw] of source.entries()) {
    if (raw.kind === 'cluster') {
      lastClusterIndex = Number(raw.clusterIndex)
      expanded.push({ kind: 'cluster', clusterIndex: lastClusterIndex })
      continue
    }
    if (raw.kind === 'entry') {
      const clusterIndex = Number(raw.clusterIndex)
      const entryIndex = Number(raw.entryIndex)
      const entry = rows(clusters[clusterIndex]?.people)[entryIndex]
      if (!entry) throw new Error(`${groupLabel(group)} sequence ${index + 1}번이 없는 개인 항목을 가리킨다`)
      // 한때 최상위로 펼친 isPerson=true 참조는 cluster 위치에서 한 번만 승격한다.
      if (isFactionPersonEntry(entry)) continue
      expanded.push({ kind: 'entry', clusterIndex, entryIndex })
      continue
    }
    if (raw.kind === 'scene' && raw.scene && typeof raw.scene === 'object' && !Array.isArray(raw.scene)) {
      const clusterIndex = Math.min(Math.max(lastClusterIndex, 0), clusters.length - 1)
      const people = clusters[clusterIndex].people as Row[]
      const entryIndex = people.length
      people.push(legacySceneToFactionEntry(raw.scene as Row))
      expanded.push({ kind: 'entry', clusterIndex, entryIndex })
      continue
    }
    if (raw.kind === 'cut') {
      expanded.push({ kind: 'cut' })
      continue
    }
    throw new Error(`${groupLabel(group)} sequence ${index + 1}번의 kind가 cluster, entry 또는 cut이 아니다`)
  }

  const ownerBefore = (index: number): number | undefined => {
    for (let i = index - 1; i >= 0; i--) {
      const item = expanded[i]
      if (item.kind !== 'cut') return item.clusterIndex
    }
    return undefined
  }
  const ownerAfter = (index: number): number | undefined => {
    for (let i = index + 1; i < expanded.length; i++) {
      const item = expanded[i]
      if (item.kind !== 'cut') return item.clusterIndex
    }
    return undefined
  }

  const hasExplicitBeats = clusters.map(cluster => Array.isArray(cluster.beats))
  const beatsByCluster = clusters.map(cluster => rows(cluster.beats) as UnifiedFactionSceneBeat[])
  const pendingInlineCut = new Set<number>()
  const seenClusters = new Set<number>()
  const sequence: FactionSequenceItem[] = []

  const appendBeats = (clusterIndex: number, additions: UnifiedFactionSceneBeat[]) => {
    if (!additions.length) return
    if (pendingInlineCut.has(clusterIndex)) {
      additions[0] = { ...additions[0], shortsCutBefore: true }
      pendingInlineCut.delete(clusterIndex)
    }
    beatsByCluster[clusterIndex].push(...additions)
  }

  for (const [index, item] of expanded.entries()) {
    if (item.kind === 'cut') {
      const before = ownerBefore(index)
      const after = ownerAfter(index)
      if (before !== undefined && before === after) pendingInlineCut.add(before)
      else sequence.push({ kind: 'cut' })
      continue
    }

    const clusterIndex = item.clusterIndex
    const cluster = clusters[clusterIndex]
    if (!cluster) throw new Error(`${groupLabel(group)} sequence ${index + 1}번이 없는 묶음을 가리킨다`)
    if (!seenClusters.has(clusterIndex)) {
      seenClusters.add(clusterIndex)
      sequence.push({ kind: 'cluster', clusterIndex })
    }
    if (hasExplicitBeats[clusterIndex]) continue

    if (item.kind === 'cluster') {
      appendBeats(
        clusterIndex,
        rows(cluster.people).filter(isFactionPersonEntry).map(legacyFactionPersonToSceneBeat),
      )
      continue
    }
    const entry = rows(cluster.people)[item.entryIndex]
    if (!entry) throw new Error(`${groupLabel(group)} sequence ${index + 1}번이 없는 개인 항목을 가리킨다`)
    appendBeats(
      clusterIndex,
      isFactionPersonEntry(entry)
        ? [legacyFactionPersonToSceneBeat(entry)]
        : legacyFactionEntryToSceneBeats(entry),
    )
  }

  // sequence가 없던 비정상·초기 데이터도 장면 자체는 잃지 않는다.
  clusters.forEach((cluster, clusterIndex) => {
    if (!seenClusters.has(clusterIndex)) sequence.push({ kind: 'cluster', clusterIndex })
    if (!hasExplicitBeats[clusterIndex] && beatsByCluster[clusterIndex].length === 0) {
      appendBeats(
        clusterIndex,
        rows(cluster.people).filter(isFactionPersonEntry).map(legacyFactionPersonToSceneBeat),
      )
    }
  })

  const cleanClusters = clusters.map((cluster, clusterIndex) => {
    const cast = rows(cluster.people).filter(isFactionPersonEntry)
    const beats = beatsByCluster[clusterIndex]
    const clean: Row = {
      ...cluster,
      beats,
      // quote 컬럼은 도감·기존 소비자를 위한 파생값이다. 편집 원천은 beats 하나뿐이다.
      people: projectFactionSceneBeatsToPeople(cast, beats),
    }
    delete clean.scenesAfter
    return clean
  })
  const clean: Row = { ...group, clusters: cleanClusters, sequence: cleanCuts(sequence) }
  delete clean.openingScenes
  return clean as T
}

/** 새 구조를 검증한다. sequence가 없으면 묶음과 서사 항목의 안전한 기본 순서를 만든다. */
export function factionSequenceOf(group: Row): FactionSequenceItem[] {
  let clusters = rows(group.clusters)
  let stored = group.sequence
  const needsUnification = !Array.isArray(stored)
    || rows(stored).some(item => item.kind === 'entry' || item.kind === 'scene')
    || Array.isArray(group.openingScenes)
    || clusters.some(cluster => Array.isArray(cluster.scenesAfter)
      || !Array.isArray(cluster.beats)
      || rows(cluster.people).some(isFactionNarrativeEntry))
  if (needsUnification) {
    const normalized = normalizeFactionGroupEntries(group)
    Object.assign(group, normalized)
    clusters = rows(group.clusters)
    stored = group.sequence
  }
  if (!Array.isArray(stored)) throw new Error(`${groupLabel(group)} sequence 정규화에 실패했다`)

  const seenClusters = new Set<number>()
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
      throw new Error(`${groupLabel(group)} sequence ${index + 1}번에 통합 전 entry가 남아 있다`)
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
  return sequence
}

export function sequenceClusters<TCluster extends Row = Row>(group: Row): TCluster[] {
  const clusters = rows(group.clusters) as TCluster[]
  return factionSequenceOf(group).flatMap(item => item.kind === 'cluster' ? [clusters[item.clusterIndex]] : [])
}

export function sequenceCutCount(group: Row): number {
  return factionSequenceOf(group).filter(item => item.kind === 'cut').length
}
