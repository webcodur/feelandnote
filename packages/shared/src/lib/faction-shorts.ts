import { factionSequenceOf, type FactionSequenceItem } from './faction-sequence'

type Row = Record<string, unknown>

export interface FactionShortsStep {
  gi: number
  sequenceStart: number
  sequenceEnd: number
}

/** 활성 쇼츠 대상 그룹의 sequence에 내부 편 경계가 하나라도 있는지 확인한다. */
export function hasFactionShortsCuts(groups: ReadonlyArray<Row>): boolean {
  return groups.some(group => (
    group.disabled !== true
    && group.longformOnly !== true
    && factionSequenceOf(group).some(item => item.kind === 'cut')
  ))
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
    let start = 0
    for (let index = 0; index <= sequence.length; index++) {
      const atEnd = index === sequence.length
      if (!atEnd && sequence[index]?.kind !== 'cut') continue
      if (index > start) {
        segments[segments.length - 1].push({ gi, sequenceStart: start, sequenceEnd: index })
      }
      if (!atEnd) segments.push([])
      start = index + 1
    }
  }
  return segments.filter(segment => segment.length > 0)
}

/** 한 쇼츠 slice가 실제로 포함하는 sequence 항목. cut marker 자체는 반환하지 않는다. */
export function factionShortsSliceItems<TScene = Row>(
  group: Row,
  step: Pick<FactionShortsStep, 'sequenceStart' | 'sequenceEnd'>,
): FactionSequenceItem<TScene>[] {
  return (factionSequenceOf(group) as unknown as FactionSequenceItem<TScene>[])
    .slice(step.sequenceStart, step.sequenceEnd)
    .filter(item => item.kind !== 'cut')
}

/** 내부 경계를 쓰는 에피소드의 실제 쇼츠 편 번호. 경계가 없으면 legacy part에 맡기므로 빈 배열이다. */
export function factionShortsPartNumbers(groups: ReadonlyArray<Row>): number[] {
  if (!hasFactionShortsCuts(groups)) return []
  return factionShortsSegments(groups).map((_, index) => index + 1)
}
