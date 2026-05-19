import { compareImageNames, stripImagePrefix } from '../utils'
import type { ImageField } from '../types'

export type FieldFilter = 'all' | ImageField
export type ViewMode = 'grid' | 'list'
export type SortMode = 'default' | 'name' | 'recent'
export type UsageFilter = 'all' | 'unused' | 'used'

export type FolderDropState = { folder: string; active: boolean }
export type Group = { key: string; label: string; files: string[] }

export const USAGE_BUTTONS: { value: UsageFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'unused', label: '미사용만' },
  { value: 'used', label: '사용중만' },
]

export const FILTER_BUTTONS: { value: FieldFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'summary', label: 'summary' },
  { value: 'context', label: 'context' },
  { value: 'quote', label: 'quote' },
]

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: '기본' },
  { value: 'name', label: '이름' },
  { value: 'recent', label: '최신' },
]

export const IMAGE_POOL_COLLAPSED_KEY = 'remotion-bo.imagePool.collapsed'

// 사이드바 너비 등 레이아웃 상수
export const POOL_STYLES = {
  sidebar: 'w-[600px] shrink-0 border-l border-border/30 p-3 space-y-2 overflow-y-auto max-h-[90vh] sticky top-0 self-start bg-bg-card/30',
  sidebarCollapsed: 'w-8 shrink-0 border-l border-border/30 sticky top-0 self-start bg-bg-card/30 max-h-[90vh]',
  input: 'w-full px-2 py-1 text-[11px] bg-bg-card border border-border/40 rounded focus:outline-none focus:border-accent/60',
  pill: 'px-2 py-0.5 text-[11px] rounded border transition-colors',
  pillActive: 'bg-accent/20 text-accent border-accent/40',
  pillIdle: 'text-text-secondary border-border/40 hover:border-accent/40 hover:text-accent',
  toggleGroup: 'flex items-center gap-0.5 border border-border/40 rounded',
  toggleBtn: 'px-2 py-0.5 text-[11px] transition-colors',
  toggleActive: 'bg-accent/20 text-accent',
  toggleIdle: 'text-text-secondary hover:text-accent',
  sectionHeader: 'w-full flex items-center gap-2 px-2 py-1 bg-bg-card/50 hover:bg-bg-hover transition-colors text-left',
  gridBody: 'grid grid-cols-2 gap-1.5',
  listBody: 'space-y-0.5',
} as const

/** 파일명 끝 `_{숫자}.{ext}` 타임스탬프 추출. 없으면 0 반환 (최신 정렬용). */
function extractTimestamp(fn: string): number {
  const m = fn.match(/_(\d{10,})\.[^.]+$/)
  return m ? parseInt(m[1], 10) : 0
}

export function sortBy(mode: SortMode, files: string[]): string[] {
  const arr = [...files]
  if (mode === 'default') return arr.sort(compareImageNames)
  if (mode === 'name') return arr.sort((a, b) => stripImagePrefix(a).localeCompare(stripImagePrefix(b)))
  // recent
  return arr.sort((a, b) => extractTimestamp(b) - extractTimestamp(a))
}
