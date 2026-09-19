'use client'

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { useCelebTableQuery } from './CelebTableQuery'
import { useColumnVisibility } from './ColumnVisibility'
import { NationalityFilter, RangeFilter } from './FilterPopover'
import { CELL_BORDER_CLASS, COLUMNS, type Column } from './columns'

export const FILTER_CONTROL_CLASS = 'h-7 w-full min-w-16 rounded border bg-bg-card px-1.5 text-center text-[11px] font-normal hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50'

function getSelectValue(params: URLSearchParams, param: string) {
  const current = params.get(param)
  if (current) return current
  if (['avatar', 'portrait', 'awakened'].includes(param) && params.get('image') === `missing-${param}`) return 'missing'
  return 'all'
}

function ColumnFilter({ column }: { column: Column }) {
  const { params, pending, update } = useCelebTableQuery()
  const filter = column.filter
  if (!filter) return null
  if (filter.type === 'nationality') return <NationalityFilter />
  if (filter.type === 'range') return <RangeFilter label={column.label} {...filter} />
  const value = getSelectValue(params, filter.param)
  return (
    <select
      aria-label={`${column.label} 필터`}
      value={value}
      onChange={(event) => update({ [filter.param]: event.target.value })}
      disabled={pending}
      className={`${FILTER_CONTROL_CLASS} ${value !== 'all' ? 'border-accent/60 text-accent' : 'border-border text-text-tertiary'}`}
    >
      <option value="all">전체</option>
      {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}

export default function CelebColumnHeaders() {
  const { params, pending, update } = useCelebTableQuery()
  const { isVisible } = useColumnVisibility()
  const sort = params.get('sort') || 'created_at'
  const order = params.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  return (
    <tr>
      {COLUMNS.filter((column) => isVisible(column.field)).map((column) => {
        const active = sort === column.field
        const nextOrder = active && order === 'desc' ? 'asc' : 'desc'
        return (
          <th key={column.field} scope="col" aria-sort={active ? order === 'asc' ? 'ascending' : 'descending' : 'none'} className={`${CELL_BORDER_CLASS} px-2 pb-2 pt-2 text-left align-top font-medium ${column.width || ''}`}>
            <button
              type="button"
              onClick={() => update({ sort: column.field, sortOrder: nextOrder })}
              disabled={pending}
              aria-label={`${column.label} ${nextOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`}
              title={`눌러서 ${column.label} ${nextOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`}
              className={`mb-1 flex h-6 w-full items-center justify-center gap-1 whitespace-nowrap rounded px-1 text-[11px] hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50 ${active ? 'text-accent' : 'text-text-secondary'}`}
            >
              <span>{column.label}</span>
              {active ? order === 'asc' ? <ChevronUp className="size-3.5 shrink-0" /> : <ChevronDown className="size-3.5 shrink-0" /> : <ChevronsUpDown className="size-3.5 shrink-0 opacity-70" />}
            </button>
            <ColumnFilter column={column} />
          </th>
        )
      })}
    </tr>
  )
}

export function CelebImageFilterControls() {
  const { params, pending, update } = useCelebTableQuery()
  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-border bg-bg-secondary/40 px-3 py-2.5 md:px-4">
      {COLUMNS.filter((column) => column.filter).map((column) => (
        <div key={column.field} className="w-28">
          <div className="mb-1 truncate text-[10px] text-text-secondary" title={column.label}>{column.label}</div>
          <ColumnFilter column={column} />
        </div>
      ))}
      <div className="ml-auto flex gap-1">
        <label className="text-[10px] text-text-secondary">정렬
          <select aria-label="정렬 컬럼" value={params.get('sort') || 'created_at'} onChange={(event) => update({ sort: event.target.value })} disabled={pending} className={`${FILTER_CONTROL_CLASS} mt-1 block border-border text-text-secondary`}>
            {COLUMNS.map((column) => <option key={column.field} value={column.field}>{column.label}</option>)}
          </select>
        </label>
        <label className="text-[10px] text-text-secondary">방향
          <select aria-label="정렬 방향" value={params.get('sortOrder') || 'desc'} onChange={(event) => update({ sortOrder: event.target.value })} disabled={pending} className={`${FILTER_CONTROL_CLASS} mt-1 block border-border text-text-secondary`}>
            <option value="desc">내림차순</option><option value="asc">오름차순</option>
          </select>
        </label>
      </div>
    </div>
  )
}
