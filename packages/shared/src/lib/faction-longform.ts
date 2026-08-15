import { factionSequenceOf, type FactionSequenceItem } from './faction-sequence'

type Row = Record<string, unknown>

export type FactionLongformLayoutItem<Tera = unknown, TChapter = unknown> =
  | { group: number }
  | { era: Tera }
  | { cut: true }
  | { chapter: TChapter }

export type FactionLongformStep<Tera = unknown, TChapter = unknown> =
  | { era: Tera }
  | { gi: number; sequenceStart: number; sequenceEnd: number }
  | { chapter: TChapter }

/**
 * 롱폼 편성(longformLayout)의 바깥 경계만 전역 편 목록으로 푼다.
 * 세력 sequence 안의 cut은 쇼츠 경계이므로 롱폼에서는 재생 항목 없이 건너뛴다.
 */
export function factionLongformSegments<Tera = unknown, TChapter = unknown>(
  groups: ReadonlyArray<Row>,
  layout?: ReadonlyArray<FactionLongformLayoutItem<Tera, TChapter>>,
): Array<Array<FactionLongformStep<Tera, TChapter>>> {
  const segments: Array<Array<FactionLongformStep<Tera, TChapter>>> = [[]]
  const pushGroup = (gi: number) => {
    const group = groups[gi]
    if (!group || group.disabled === true) return
    const sequence = factionSequenceOf(group)
    if (sequence.length === 0) return
    segments[segments.length - 1].push({
      gi,
      sequenceStart: 0,
      sequenceEnd: sequence.length,
    })
  }

  const placedGroups = new Set<number>()
  for (const item of layout ?? []) {
    if ('cut' in item) {
      segments.push([])
    } else if ('group' in item) {
      placedGroups.add(item.group)
      pushGroup(item.group)
    } else if ('chapter' in item) {
      segments[segments.length - 1].push({ chapter: item.chapter })
    } else {
      segments[segments.length - 1].push({ era: item.era })
    }
  }

  groups.forEach((group, gi) => {
    if (group.disabled === true || placedGroups.has(gi)) return
    pushGroup(gi)
  })
  return segments
}

/** 한 세력 slice가 실제로 포함하는 sequence 항목. cut marker 자체는 반환하지 않는다. */
export function factionLongformSliceItems<TScene = Row>(
  group: Row,
  step: { sequenceStart: number; sequenceEnd: number },
): FactionSequenceItem<TScene>[] {
  return (factionSequenceOf(group) as unknown as FactionSequenceItem<TScene>[])
    .slice(step.sequenceStart, step.sequenceEnd)
    .filter(item => item.kind !== 'cut')
}

/** longformLayout의 바깥 경계만 센 실제 롱폼 편 수. */
export function factionLongformPartCount(
  groups: ReadonlyArray<Row>,
  layout?: ReadonlyArray<FactionLongformLayoutItem>,
): number {
  return factionLongformSegments(groups, layout).length
}
