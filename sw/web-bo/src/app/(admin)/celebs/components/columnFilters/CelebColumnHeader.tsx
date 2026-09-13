'use client'

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { CELEB_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { CELEB_CONTENT_COUNT } from '@feelandnote/shared/constants/celeb-content-research'
import { CELEB_REALITY_DISPLAY } from '@/constants/celebReality'
import { useCelebTableQuery } from './CelebTableQuery'
import { NationalityFilter, RangeFilter } from './FilterPopover'

type FilterOption = { value: string; label: string }
type Column = {
  field: string
  width?: string
  filter?:
    | { type: 'select'; param: string; options: readonly FilterOption[] }
    | { type: 'nationality' }
    | { type: 'range'; from: string; to: string; minimum?: number; date?: boolean }
}

const PRESENCE_OPTIONS = [{ value: 'present', label: '있음' }, { value: 'missing', label: '없음' }]
const COLUMNS: Column[] = [
  { field: 'avatar_url', filter: { type: 'select', param: 'avatar', options: PRESENCE_OPTIONS } },
  { field: 'portrait_url', filter: { type: 'select', param: 'portrait', options: PRESENCE_OPTIONS } },
  { field: 'awakened_image_url', filter: { type: 'select', param: 'awakened', options: PRESENCE_OPTIONS } },
  { field: 'title', width: 'min-w-36' },
  { field: 'nickname', width: 'min-w-36' },
  { field: 'celeb_reality', filter: { type: 'select', param: 'reality', options: CELEB_REALITIES.map((value) => ({ value, label: CELEB_REALITY_DISPLAY[value].label })) } },
  { field: 'profession', filter: { type: 'select', param: 'profession', options: CELEB_PROFESSIONS } },
  { field: 'nationality', width: 'min-w-24', filter: { type: 'nationality' } },
  { field: 'gender', filter: { type: 'select', param: 'gender', options: [{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }, { value: 'unknown', label: '미상' }] } },
  { field: 'status', filter: { type: 'select', param: 'status', options: [{ value: 'active', label: '활성' }, { value: 'inactive', label: '비공개' }] } },
  { field: 'influence_total', filter: { type: 'range', from: 'influenceMin', to: 'influenceMax' } },
  { field: 'celeb_tier', filter: { type: 'select', param: 'tier', options: [{ value: 'full', label: 'full' }, { value: 'light', label: 'light' }] } },
  { field: 'content_count', filter: { type: 'range', from: 'contentMin', to: 'contentMax', minimum: CELEB_CONTENT_COUNT.RESEARCHED_EMPTY } },
  { field: 'follower_count', filter: { type: 'range', from: 'followerMin', to: 'followerMax' } },
  { field: 'created_at', filter: { type: 'range', from: 'createdFrom', to: 'createdTo', date: true } },
]

export const FILTER_CONTROL_CLASS = 'h-7 w-full min-w-16 rounded border bg-bg-card px-1.5 text-left text-[11px] font-normal hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50'

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
  if (filter.type === 'range') return <RangeFilter label={column.field} {...filter} />
  const value = getSelectValue(params, filter.param)
  return (
    <select
      aria-label={`${column.field} 필터`}
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
  const sort = params.get('sort') || 'created_at'
  const order = params.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  return (
    <tr>
      {COLUMNS.map((column) => {
        const active = sort === column.field
        const nextOrder = active && order === 'desc' ? 'asc' : 'desc'
        return (
          <th key={column.field} scope="col" aria-sort={active ? order === 'asc' ? 'ascending' : 'descending' : 'none'} className={`px-2 pb-2 pt-2 text-left align-top font-medium ${column.width || ''}`}>
            <button
              type="button"
              onClick={() => update({ sort: column.field, sortOrder: nextOrder })}
              disabled={pending}
              aria-label={`${column.field} ${nextOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`}
              className={`mb-1 flex h-6 w-full items-center justify-between gap-1 whitespace-nowrap rounded px-1 text-[11px] hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50 ${active ? 'text-accent' : 'text-text-secondary'}`}
            >
              <span>{column.field}</span>
              {active ? order === 'asc' ? <ChevronUp className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" /> : <ChevronsUpDown className="size-3 shrink-0 opacity-40" />}
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
          <div className="mb-1 truncate text-[10px] text-text-secondary" title={column.field}>{column.field}</div>
          <ColumnFilter column={column} />
        </div>
      ))}
      <div className="ml-auto flex gap-1">
        <label className="text-[10px] text-text-secondary">정렬
          <select aria-label="정렬 컬럼" value={params.get('sort') || 'created_at'} onChange={(event) => update({ sort: event.target.value })} disabled={pending} className={`${FILTER_CONTROL_CLASS} mt-1 block border-border text-text-secondary`}>
            {COLUMNS.map((column) => <option key={column.field} value={column.field}>{column.field}</option>)}
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
