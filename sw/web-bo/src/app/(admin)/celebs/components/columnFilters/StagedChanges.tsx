'use client'

import { Check, X } from 'lucide-react'
import { CELEB_LIST_BLOCK_SIZE, getCelebBlockLabel } from '@/lib/celeb-list-filters'
import type { FactionTheme } from '../factionOptions'
import { COLUMNS } from './columns'
import { useCelebTableQuery } from './CelebTableQuery'

interface Chip {
  keys: string[]
  label: string
  value: string
}

/** 담아 둔 변경 하나를 사람이 읽는 「무엇: 어떻게」로 바꾼다. */
function describe(key: string, value: string | null, params: URLSearchParams, factionThemes: FactionTheme[], managedTotal: number): Chip {
  const cleared = value === null
  const chip = (label: string, shown: string): Chip => ({ keys: [key], label, value: cleared ? '해제' : shown })

  if (key === 'search') return chip('검색', value ?? '')
  if (key === 'block') return chip('등록순 구간', value ? getCelebBlockLabel(Number(value), Math.max(managedTotal, Number(value) * CELEB_LIST_BLOCK_SIZE)) : '')
  if (key === 'pageSize') return chip('표시 인원', `${value}명씩`)
  if (key === 'faction') {
    for (const theme of factionThemes) {
      if (theme.id === value) return chip('테마', theme.name)
      const faction = theme.factions.find((item) => item.id === value)
      if (faction) return chip('세력', `${theme.name} › ${faction.name}`)
    }
    return chip('테마', value ?? '')
  }
  if (key === 'sort' || key === 'sortOrder') {
    const sort = params.get('sort') || 'created_at'
    const order = params.get('sortOrder') === 'asc' ? '오름차순' : '내림차순'
    const column = COLUMNS.find((item) => item.field === sort)
    return { keys: ['sort', 'sortOrder'], label: '정렬', value: `${column?.label ?? sort} ${order}` }
  }

  for (const column of COLUMNS) {
    const filter = column.filter
    if (!filter) continue
    if (filter.type === 'select' && filter.param === key) {
      return chip(column.label, filter.options.find((option) => option.value === value)?.label ?? value ?? '')
    }
    if (filter.type === 'nationality' && key === 'nationality') return chip(column.label, value ?? '')
    if (filter.type === 'range' && (filter.from === key || filter.to === key)) {
      const edge = filter.from === key ? (filter.date ? '시작' : '최소') : (filter.date ? '종료' : '최대')
      return chip(`${column.label} ${edge}`, value ?? '')
    }
  }
  return chip(key, value ?? '')
}

/**
 * 담아 둔 정렬·필터를 칩으로 보여 주고 「적용」에서 한 번에 목록을 다시 불러온다.
 * 담아 둔 것이 없으면 아무것도 그리지 않는다.
 */
export default function StagedChanges({ factionThemes, managedTotal }: { factionThemes: FactionTheme[]; managedTotal: number }) {
  const { staged, params, pending, unstage, apply, discard } = useCelebTableQuery()
  if (staged.length === 0) return null

  const chips: Chip[] = []
  const seen = new Set<string>()
  for (const [key, value] of staged) {
    if (seen.has(key)) continue
    const chip = describe(key, value, params, factionThemes, managedTotal)
    chip.keys.forEach((item) => seen.add(item))
    chips.push(chip)
  }

  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-2 border-b border-accent/30 bg-accent/5 px-3 py-2 md:px-4">
      <span className="text-[11px] text-text-secondary">적용 대기</span>
      {chips.map((chip) => (
        <span key={chip.keys.join('+')} className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/40 bg-bg-card pl-2.5 pr-1 text-xs text-text-primary">
          <span className="text-text-secondary">{chip.label}</span>
          <span className="font-medium">{chip.value}</span>
          <button
            type="button"
            onClick={() => unstage(chip.keys)}
            disabled={pending}
            aria-label={`${chip.label} 변경 빼기`}
            className="rounded-full p-0.5 text-text-tertiary hover:bg-white/10 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={discard}
          disabled={pending}
          className="inline-flex h-7 items-center rounded px-2 text-xs text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        >
          모두 빼기
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={pending}
          className="inline-flex h-7 items-center gap-1 rounded bg-accent px-3 text-xs font-semibold text-white hover:bg-accent/90 active:bg-accent/80 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        >
          <Check className="size-3.5" />적용
        </button>
      </div>
    </div>
  )
}
