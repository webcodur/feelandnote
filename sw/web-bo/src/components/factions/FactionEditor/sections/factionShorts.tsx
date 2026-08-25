import type { FactionGroup, FactionScript } from '@/lib/faction-types'
import {
  factionShortsPartNumbers,
  factionShortsSegments,
  factionShortsSliceItems,
  hasFactionShortsCuts,
  type FactionShortsStep,
} from '@feelandnote/shared/lib/faction-shorts'

export const DEFAULT_SHORTS_PART_COUNT = 2
export const MAX_SHORTS_PART_COUNT = 99

export type PartSection = { key: number; label: string; hint: string }
export type PartAssignOption = { value: number; label: string }
export type ShortsPartSlice = {
  group: FactionGroup
  groupIndex: number
  step: FactionShortsStep
}

const SHORTS_PART_RECORD_KEYS = [
  'titleByPart',
  'loglineByPart',
  'loglineByPartEn',
  'musicByPart',
  'musicVolumeByPart',
  'introImageByPart',
  'outroImageByPart',
  'heroesByPart',
] as const satisfies ReadonlyArray<keyof FactionScript>

export function configuredShortsParts(script: FactionScript): number[] {
  const internalParts = factionShortsPartNumbers(script.groups as unknown as Array<Record<string, unknown>>)
  if (internalParts.length > 0) return internalParts
  const parts = new Set<number>()
  for (const group of script.groups ?? []) {
    if (!group.disabled && group.part != null && group.part > 0) parts.add(group.part)
  }
  for (const key of SHORTS_PART_RECORD_KEYS) {
    const record = script[key]
    if (!record || typeof record !== 'object') continue
    for (const raw of Object.keys(record)) {
      const part = Number(raw)
      if (Number.isInteger(part) && part > 0) parts.add(part)
    }
  }
  return [...parts].sort((a, b) => a - b)
}

/** 기존 데이터는 2편 UI로 열고, 이미 3편 이상을 쓰는 데이터는 숨기지 않는다. */
export function shortsPartCountOf(script: FactionScript): number {
  const saved = Number.isInteger(script.shortsPartCount) && (script.shortsPartCount ?? 0) > 0
    ? Math.min(script.shortsPartCount as number, MAX_SHORTS_PART_COUNT)
    : DEFAULT_SHORTS_PART_COUNT
  const highestConfigured = configuredShortsParts(script).at(-1) ?? 0
  return Math.max(saved, highestConfigured)
}

/** sequence 내부 경계를 쓰는 새 편성인지 확인한다. 이때 legacy group.part는 화면 배정에 쓰지 않는다. */
export function usesInternalShortsCuts(script: FactionScript): boolean {
  return hasFactionShortsCuts(script.groups as unknown as Array<Record<string, unknown>>)
}

/** 실제 렌더와 같은 한 편의 group slice 목록. 같은 세력이 경계 양쪽 편에 각각 등장할 수 있다. */
export function shortsPartSlicesOf(script: FactionScript, part: number): ShortsPartSlice[] {
  if (!usesInternalShortsCuts(script) || part < 1) return []
  return (factionShortsSegments(script.groups as unknown as Array<Record<string, unknown>>)[part - 1] ?? [])
    .flatMap(step => {
      const group = script.groups[step.gi]
      return group ? [{ group, groupIndex: step.gi, step }] : []
    })
}

/**
 * 길이·인물 수 미리보기용으로 한 slice만 가진 세력을 만든다.
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

/** 내부 경계 편성의 한 편만 담은 미리보기 대본. */
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

/** key 0 = 편 미지정(모든 편 공통), 1부터 사용자가 지정한 쇼츠 편. */
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

type ComposeRowProps = {
  group: FactionGroup
  groupIndex: number
  partOptions: PartAssignOption[]
  onPart: (partKey: number) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
}

/** 편성 쇼츠 세력 배정 행. 세력 본문 편집은 정비 탭에 맡긴다. */
export function FactionComposeRow({
  group,
  groupIndex,
  partOptions,
  onPart,
  onMoveUp,
  onMoveDown,
  onEdit,
}: ComposeRowProps) {
  const color = group.color ?? '#92400e'
  const label = (group.name ?? '').split('\n')[0]?.trim() || '(이름 없음)'
  const people = group.clusters?.length
    ? group.clusters.reduce((sum, cluster) => sum + cluster.people.filter(person => person.isPerson !== false).length, 0)
    : (group.people ?? []).filter(person => person.isPerson !== false).length
  const current = group.disabled ? -1 : (group.part ?? 0)

  return (
    <div id={`faction-group-${groupIndex}`} className="flex scroll-mt-24 items-center gap-2 rounded-md border border-border bg-bg-card/50 px-2.5 py-1.5">
      <span
        className="min-w-0 max-w-[14rem] shrink truncate rounded px-2 py-0.5 text-xs font-bold"
        style={{ backgroundColor: color, color: contrastText(color) }}
        title={label}
      >
        {label}
      </span>
      <span className="shrink-0 text-[11px] text-text-dim">인물 {people}</span>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <select
          value={current}
          onChange={event => onPart(Number(event.target.value))}
          className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
          title="이 세력이 들어갈 편"
        >
          {partOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button type="button" onClick={onMoveUp} className="rounded border border-border px-1.5 py-1 text-[11px] leading-none text-text-secondary hover:bg-bg-hover" title="같은 편 안에서 위로">▲</button>
        <button type="button" onClick={onMoveDown} className="rounded border border-border px-1.5 py-1 text-[11px] leading-none text-text-secondary hover:bg-bg-hover" title="같은 편 안에서 아래로">▼</button>
        <button type="button" onClick={onEdit} className="rounded border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover" title="정비 탭에서 이 세력 데이터 편집">정비</button>
      </div>
    </div>
  )
}
