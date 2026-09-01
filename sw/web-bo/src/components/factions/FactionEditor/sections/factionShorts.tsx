import type { FactionGroup, FactionScript } from '@/lib/faction-types'
import {
  factionShortsSegments,
  factionShortsSliceItems,
  type FactionShortsStep,
} from '@feelandnote/shared/lib/faction-shorts'

/**
 * 쇼츠 편성 헬퍼 — 편은 이야기 순서 위의 경계(장면 사이·컷 사이·세력 사이)로만 갈린다.
 * 편 번호는 경계 순서대로 1부터고, 편별 제목·음악·시작문구(`*ByPart`)는 그 번호를 키로 쓴다.
 * 옛 `group.part` 배정과 `shortsPartCount`는 폐기했다(26.08.28) — 읽지 않는다.
 */

export type PartSection = { key: number; label: string; hint: string }
export type ShortsPartSlice = {
  group: FactionGroup
  groupIndex: number
  step: FactionShortsStep
}

const rowsOf = (script: FactionScript) => script.groups as unknown as Array<Record<string, unknown>>

/** 쇼츠 편 수 = 경계로 갈린 구간 수. 경계가 없으면 1. */
export function shortsPartCountOf(script: FactionScript): number {
  return Math.max(1, factionShortsSegments(rowsOf(script)).length)
}

/** 실제 렌더와 같은 한 편의 구간 목록. 같은 세력이 경계 양쪽 편에 각각 등장할 수 있다. */
export function shortsPartSlicesOf(script: FactionScript, part: number): ShortsPartSlice[] {
  if (part < 1) return []
  return (factionShortsSegments(rowsOf(script))[part - 1] ?? [])
    .flatMap(step => {
      const group = script.groups[step.gi]
      return group ? [{ group, groupIndex: step.gi, step }] : []
    })
}

/**
 * 길이·인물 수 미리보기용으로 한 구간만 가진 세력을 만든다.
 * sequence의 clusterIndex는 원본 배열 좌표이므로 선택한 cluster만 모은 뒤 0부터 다시 매긴다.
 */
export function materializeShortsSlice(slice: ShortsPartSlice): FactionGroup {
  const items = factionShortsSliceItems(
    slice.group as unknown as Record<string, unknown>,
    slice.step,
  )
  const originalIndexes = [...new Set(items.flatMap(item => item.kind === 'cut' ? [] : [item.clusterIndex]))]
  const indexMap = new Map(originalIndexes.map((original, index) => [original, index]))
  const clusters: FactionGroup['clusters'] = originalIndexes.map(original => {
    const cluster = slice.group.clusters?.[original]
    if (!cluster) throw new Error(`${slice.group.name}의 쇼츠 구간이 없는 묶음 ${original + 1}을 가리킵니다`)
    return cluster
  })
  const sequence = items.map(item => {
    if (item.kind === 'cut') return item
    const clusterIndex = indexMap.get(item.clusterIndex)
    if (clusterIndex == null) throw new Error(`${slice.group.name}의 쇼츠 묶음 참조를 다시 매기지 못했습니다`)
    return { ...item, clusterIndex }
  })
  return { ...slice.group, clusters, people: [], sequence }
}

/** 한 편만 담은 미리보기 대본. */
export function shortsPartScriptOf(script: FactionScript, part: number): FactionScript {
  return { ...script, groups: shortsPartSlicesOf(script, part).map(materializeShortsSlice) }
}

/** 편성 행에 보여줄 실제 구간명 — 장면과 묶음을 재생 순서대로 짧게 잇는다. */
export function shortsSliceSummary(slice: ShortsPartSlice): string {
  const items = factionShortsSliceItems(
    slice.group as unknown as Record<string, unknown>,
    slice.step,
  )
  const labels = items.flatMap(item => {
    if (item.kind === 'cluster') {
      const cluster = slice.group.clusters?.[item.clusterIndex]
      const label = cluster?.label?.split('\n')[0]?.trim()
      return label ? [label] : []
    }
    return []
  })
  return labels.join(' → ') || '이야기 구간'
}

/** key 0 = 모든 편 공통 설정, 1부터 경계로 갈린 쇼츠 편. */
export function partSectionsOf(count: number): PartSection[] {
  return [
    { key: 0, label: '모든 편 공통', hint: '쇼츠 모든 편에 노출' },
    ...Array.from({ length: count }, (_, index) => {
      const part = index + 1
      return { key: part, label: `${part}편`, hint: `${part}편 쇼츠에만` }
    }),
  ]
}

export function contrastText(hex: string): string {
  const color = (hex ?? '').replace('#', '')
  if (color.length < 6) return '#ffffff'
  const red = parseInt(color.slice(0, 2), 16)
  const green = parseInt(color.slice(2, 4), 16)
  const blue = parseInt(color.slice(4, 6), 16)
  return 0.299 * red + 0.587 * green + 0.114 * blue > 150 ? '#1a1a1a' : '#ffffff'
}
