import { factionSequenceOf, type FactionSequenceItem } from './faction-sequence'

type Row = Record<string, unknown>

export interface FactionShortsStep {
  gi: number
  sequenceStart: number
  sequenceEnd: number
  /** 장면 내부 경계로 갈린 경우 이 장면의 beat 구간만 재생한다. */
  clusterIndex?: number
  beatStart?: number
  beatEnd?: number
}

/** 활성 쇼츠 대상 그룹의 sequence에 내부 편 경계가 하나라도 있는지 확인한다. */
export function hasFactionShortsCuts(groups: ReadonlyArray<Row>): boolean {
  return groups.some(group => (
    group.disabled !== true
    && group.longformOnly !== true
    && (factionSequenceOf(group).some(item => item.kind === 'cut')
      || rows(group.clusters).some(cluster => rows(cluster.beats).some(beat => beat.shortsCutBefore === true)))
  ))
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => !!item && typeof item === 'object' && !Array.isArray(item))
    : []
}

/**
 * 그룹 배열의 이야기 순서를 따라 쇼츠 편을 만든다.
 * sequence의 cut은 같은 그룹도 양쪽 편으로 나누지만 clusters/people 배열과 F/C/P 좌표는 바꾸지 않는다.
 */
export function factionShortsSegments(groups: ReadonlyArray<Row>): FactionShortsStep[][] {
  const segments: FactionShortsStep[][] = [[]]
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    if (group.disabled === true || group.longformOnly === true) continue
    const sequence = factionSequenceOf(group)
    for (let index = 0; index < sequence.length; index++) {
      const item = sequence[index]
      if (item.kind === 'cut') {
        if (segments.at(-1)?.length) segments.push([])
        continue
      }
      const beats = rows(rows(group.clusters)[item.clusterIndex]?.beats)
      const internalStarts = beats.flatMap((beat, beatIndex) => beat.shortsCutBefore === true && beatIndex > 0 ? [beatIndex] : [])
      if (!internalStarts.length) {
        segments[segments.length - 1].push({ gi, sequenceStart: index, sequenceEnd: index + 1 })
        continue
      }
      const starts = [0, ...internalStarts]
      starts.forEach((beatStart, sliceIndex) => {
        if (sliceIndex > 0 && segments.at(-1)?.length) segments.push([])
        segments[segments.length - 1].push({
          gi,
          sequenceStart: index,
          sequenceEnd: index + 1,
          clusterIndex: item.clusterIndex,
          beatStart,
          beatEnd: starts[sliceIndex + 1] ?? beats.length,
        })
      })
    }
  }
  return segments.filter(segment => segment.length > 0)
}

/** 한 쇼츠 slice가 실제로 포함하는 sequence 항목. cut marker 자체는 반환하지 않는다. */
export function factionShortsSliceItems(
  group: Row,
  step: Pick<FactionShortsStep, 'sequenceStart' | 'sequenceEnd' | 'clusterIndex' | 'beatStart' | 'beatEnd'>,
): FactionSequenceItem[] {
  if (step.clusterIndex != null) return [{
    kind: 'cluster',
    clusterIndex: step.clusterIndex,
    beatStart: step.beatStart,
    beatEnd: step.beatEnd,
  }]
  return factionSequenceOf(group)
    .slice(step.sequenceStart, step.sequenceEnd)
    .filter(item => item.kind !== 'cut')
}

/** 내부 경계를 쓰는 에피소드의 실제 쇼츠 편 번호. 경계가 없으면 legacy part에 맡기므로 빈 배열이다. */
export function factionShortsPartNumbers(groups: ReadonlyArray<Row>): number[] {
  if (!hasFactionShortsCuts(groups)) return []
  return factionShortsSegments(groups).map((_, index) => index + 1)
}
