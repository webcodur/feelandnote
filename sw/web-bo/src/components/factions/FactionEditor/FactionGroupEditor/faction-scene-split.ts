import type { FactionCluster, FactionGroup, FactionPerson, FactionSceneBeat } from '@/lib/faction-types'
import { factionSequenceOf } from '@/lib/faction-types'
import { factionVoiceFile } from '@/lib/faction-voice'

type SplitFactionSceneInput = {
  group: FactionGroup
  groupIndex: number
  clusterIndex: number
  beatIndex: number
}

export type SplitFactionSceneResult = {
  group: FactionGroup
  newClusterIndex: number
}

type InsertFactionSceneBeforeInput = {
  group: FactionGroup
  clusterIndex: number
}

export type InsertFactionSceneBeforeResult = {
  group: FactionGroup
  newClusterIndex: number
}

export type InsertFactionSceneAfterResult = InsertFactionSceneBeforeResult

function assignedPersonIndex(beat: FactionSceneBeat, people: FactionPerson[]): number {
  if (beat.speakerCelebId) {
    return people.findIndex(person => person.celebId === beat.speakerCelebId)
  }
  const speaker = beat.speaker?.trim()
  return speaker ? people.findIndex(person => person.name === speaker) : -1
}

/** 옛 FxxCxxPxx 음원이 장면 분리 뒤 새 배열 좌표를 따라가며 끊기지 않게 원래 파일명을 박아 둔다. */
export function preserveFactionSceneBeatVoiceFile(
  beat: FactionSceneBeat,
  people: FactionPerson[],
  groupIndex: number,
  clusterIndex: number,
): FactionSceneBeat {
  if (!beat.legacyPersonVoice || beat.voiceFile) return beat
  const personIndex = assignedPersonIndex(beat, people)
  if (personIndex < 0) return beat
  return {
    ...beat,
    voiceFile: factionVoiceFile(groupIndex, personIndex, clusterIndex),
  }
}

function firstLine(text: string | undefined): string | undefined {
  const line = text?.split(/\r?\n/).find(candidate => candidate.trim())?.trim()
  if (!line) return undefined
  return line.length > 40 ? `${line.slice(0, 40)}…` : line
}

function splitSceneCluster(
  cluster: FactionCluster,
  beats: FactionSceneBeat[],
): FactionCluster {
  const first = beats[0]
  const hasBeatMedia = !!first?.media?.trim()
  return {
    ...cluster,
    label: first?.label?.trim()
      || first?.speaker?.trim()
      || firstLine(first?.text)
      || '새 장면',
    labelEn: first?.labelEn?.trim()
      || first?.speakerEn?.trim()
      || firstLine(first?.textEn),
    image: hasBeatMedia ? first.media : cluster.image,
    imageCrop: hasBeatMedia ? first.mediaCrop : cluster.imageCrop,
    // 인물 신원은 에피소드 안에서 전역 해소한다. 같은 인물 배치를 복제해 도감 행을 늘리지 않는다.
    people: [],
    beats,
  }
}

/** 현재 장면 바로 앞에 제목·화면·대사를 따로 소유하는 빈 독립 장면을 넣는다. */
function insertFactionSceneAtSequenceIndex(
  group: FactionGroup,
  sequenceIndex: number,
): InsertFactionSceneBeforeResult | null {
  const clusters = group.clusters ?? []
  const sequence = factionSequenceOf(group)
  if (sequenceIndex < 0 || sequenceIndex > sequence.length) return null

  // 기존 cluster 배열 좌표는 음성·타이밍 파일의 물리 좌표다. 새 장면은 배열 끝에 두고
  // 실제 영상 순서인 sequence에서만 원하는 경계에 끼운다.
  const newClusterIndex = clusters.length
  const nextSequence = [...sequence]
  nextSequence.splice(sequenceIndex, 0, { kind: 'cluster', clusterIndex: newClusterIndex })

  return {
    newClusterIndex,
    group: {
      ...group,
      clusters: [...clusters, { label: '새 장면', people: [], beats: [] }],
      sequence: nextSequence,
    },
  }
}

export function insertFactionSceneBefore({
  group,
  clusterIndex,
}: InsertFactionSceneBeforeInput): InsertFactionSceneBeforeResult | null {
  const clusters = group.clusters ?? []
  if (!clusters[clusterIndex]) return null

  const sequence = factionSequenceOf(group)
  const sequenceIndex = sequence.findIndex(item => item.kind === 'cluster' && item.clusterIndex === clusterIndex)
  if (sequenceIndex < 0) return null

  return insertFactionSceneAtSequenceIndex(group, sequenceIndex)
}

type InsertFactionSceneAfterInput = {
  group: FactionGroup
  clusterIndex: number
}

/** 현재 장면 바로 뒤에 제목·화면·대사를 따로 소유하는 빈 독립 장면을 넣는다. */
export function insertFactionSceneAfter({
  group,
  clusterIndex,
}: InsertFactionSceneAfterInput): InsertFactionSceneAfterResult | null {
  const clusters = group.clusters ?? []
  if (!clusters[clusterIndex]) return null

  const sequence = factionSequenceOf(group)
  const sequenceIndex = sequence.findIndex(item => item.kind === 'cluster' && item.clusterIndex === clusterIndex)
  if (sequenceIndex < 0) return null

  return insertFactionSceneAtSequenceIndex(group, sequenceIndex + 1)
}

/**
 * 한 장면의 선택 대사와 그 아래 대사를 새 장면으로 분리한다.
 *
 * 새 cluster를 배열 끝에 붙여 기존 C 좌표를 보존하고, sequence에서만 현재 장면 바로 뒤에
 * 끼운다. 첫 대사에서 자르면 원본이 비므로 허용하지 않는다.
 */
export function splitFactionSceneAtBeat({
  group,
  groupIndex,
  clusterIndex,
  beatIndex,
}: SplitFactionSceneInput): SplitFactionSceneResult | null {
  const clusters = group.clusters ?? []
  const cluster = clusters[clusterIndex]
  const beats = cluster?.beats ?? []
  if (!cluster || beatIndex <= 0 || beatIndex >= beats.length) return null

  const sequence = factionSequenceOf(group)
  const sequenceIndex = sequence.findIndex(item => item.kind === 'cluster' && item.clusterIndex === clusterIndex)
  if (sequenceIndex < 0) return null

  const movedBeats = beats.slice(beatIndex).map(beat => preserveFactionSceneBeatVoiceFile(
    beat,
    cluster.people ?? [],
    groupIndex,
    clusterIndex,
  ))
  const newClusterIndex = clusters.length
  const nextClusters = clusters.map((candidate, index) => index === clusterIndex
    ? { ...candidate, beats: beats.slice(0, beatIndex) }
    : candidate)
  nextClusters.push(splitSceneCluster(cluster, movedBeats))

  const nextSequence = [...sequence]
  nextSequence.splice(sequenceIndex + 1, 0, { kind: 'cluster', clusterIndex: newClusterIndex })

  return {
    newClusterIndex,
    group: {
      ...group,
      clusters: nextClusters,
      sequence: nextSequence,
    },
  }
}
