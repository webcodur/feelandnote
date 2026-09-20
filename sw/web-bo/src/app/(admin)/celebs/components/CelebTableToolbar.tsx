'use client'

import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { ExternalLink, Loader2, RotateCcw, Search } from 'lucide-react'
import {
  CELEB_LIST_BLOCK_SIZE,
  CELEB_LIST_PAGE_SIZES,
  DEFAULT_CELEB_LIST_PAGE_SIZE,
  getCelebBlockLabel,
  parseCelebPageSize,
} from '@/lib/celeb-list-filters'
import { resolveFactionSelection, type FactionTheme } from './factionOptions'
import { useCelebTableQuery } from './columnFilters/CelebTableQuery'

const SELECT_CLASS = 'h-8 max-w-48 rounded border border-border bg-bg-secondary px-2 text-xs text-text-secondary hover:border-accent hover:text-text-primary focus:border-accent focus:outline-none disabled:cursor-wait disabled:opacity-50'

/** 검색 결과가 한 명일 때만 채워진다. 그 사람을 새 탭으로 여는 데 쓴다. */
export interface SoleResult {
  href: string
  name: string
}

interface Props {
  factionThemes: FactionTheme[]
  soleResult?: SoleResult | null
  /** 등록순 구간 선택지의 기준 인원. 검색·필터와 무관한 관리 대상 전체다. */
  managedTotal: number
  children?: ReactNode
}

export default function CelebTableToolbar({ factionThemes, soleResult, managedTotal, children }: Props) {
  const { params, pending, update, commit, reset } = useCelebTableQuery()
  const [searchResetVersion, setSearchResetVersion] = useState(0)
  const selection = resolveFactionSelection(factionThemes, params.get('faction') || 'all')
  const theme = factionThemes.find((item) => item.id === selection.theme)
  const blockCount = Math.ceil(managedTotal / CELEB_LIST_BLOCK_SIZE)
  const block = params.get('block') || 'all'
  const pageSize = parseCelebPageSize(params.get('pageSize') || undefined)

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 md:px-4" aria-busy={pending}>
      <SearchForm key={`${params.get('search') || ''}:${searchResetVersion}`} initialValue={params.get('search') || ''} pending={pending} soleResult={soleResult ?? null} onSearch={(search) => commit({ search })} />
      <Divider />
      {/* 보는 범위: 초기화해도 남는다 */}
      {/* 검색 말고는 고른 즉시 불러오지 않는다 — 담아 두었다가 「적용」에서 한 번에 간다 */}
      <select
        aria-label="등록순 구간"
        title="등록된 순서로 천 명씩 끊은 구간. 초기화해도 유지된다"
        value={block}
        onChange={(event) => update({ block: event.target.value })}
        disabled={pending}
        className={`${SELECT_CLASS} ${block !== 'all' ? 'border-accent/60 text-accent' : ''}`}
      >
        <option value="all">등록순 전체</option>
        {Array.from({ length: blockCount }, (_, index) => index + 1).map((number) => (
          <option key={number} value={number}>{getCelebBlockLabel(number, managedTotal)}</option>
        ))}
      </select>
      <select
        aria-label="한 화면 인원"
        value={pageSize}
        onChange={(event) => update({ pageSize: Number(event.target.value) === DEFAULT_CELEB_LIST_PAGE_SIZE ? null : event.target.value })}
        disabled={pending}
        className={SELECT_CLASS}
      >
        {CELEB_LIST_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}명씩</option>)}
      </select>
      <Divider />
      {/* 도감 필터: 초기화 대상 */}
      <select
        aria-label="테마 필터"
        value={selection.theme}
        onChange={(event) => update({ faction: event.target.value })}
        disabled={pending}
        className={`${SELECT_CLASS} ${selection.theme !== 'all' ? 'border-accent/60 text-accent' : ''}`}
      >
        <option value="all">모든 테마</option>
        {factionThemes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {theme?.factions.length ? (
        <select
          aria-label="세력 필터"
          value={selection.faction}
          onChange={(event) => update({ faction: event.target.value === 'all' ? selection.theme : event.target.value })}
          disabled={pending}
          className={`${SELECT_CLASS} ${selection.faction !== 'all' ? 'border-accent/60 text-accent' : ''}`}
        >
          <option value="all">테마 전체</option>
          {theme.factions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      ) : null}
      <button type="button" onClick={() => { setSearchResetVersion((version) => version + 1); reset() }} disabled={pending} className="inline-flex h-8 items-center gap-1 rounded px-2 text-xs text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50" title="검색·필터·정렬 초기화">
        <RotateCcw className="size-3.5" />초기화
      </button>
      <span role="status" className="text-xs text-text-tertiary">
        {pending ? <><Loader2 className="size-3.5 animate-spin" /><span className="sr-only">목록을 불러오는 중</span></> : null}
      </span>
      {children ? <div className="ml-auto">{children}</div> : null}
    </div>
  )
}

function Divider() {
  return <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
}

function SearchForm({ initialValue, pending, soleResult, onSearch }: { initialValue: string; pending: boolean; soleResult: SoleResult | null; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(initialValue)
  // 지금 보이는 한 명은 적용된 검색어의 결과다. 고쳐 쓰는 중이면 그 사람을 열지 않는다.
  const openable = soleResult && !pending && value.trim() === initialValue ? soleResult : null

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(value.trim())
  }
  const openInNewTab = () => {
    if (!openable) return
    window.open(openable.href, '_blank', 'noopener')
  }
  // Shift+Enter는 새 탭으로 연다. 검색어를 고쳐 썼으면 먼저 검색부터 한다.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (value.trim() !== initialValue) onSearch(value.trim())
    else openInNewTab()
  }

  return (
    <form onSubmit={submit} role="search" className="flex h-8 min-w-48 flex-1 items-center gap-1 rounded border border-border bg-bg-secondary pl-2 hover:border-accent focus-within:border-accent sm:max-w-80">
      <input
        type="search"
        aria-label="이름·영문명·수식어 검색"
        placeholder="이름·영문명·수식어 검색"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={pending}
        className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-50"
      />
      <button type="submit" aria-label="검색 적용" disabled={pending} className="flex h-full w-8 shrink-0 items-center justify-center text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50">
        <Search className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={openInNewTab}
        disabled={!openable}
        aria-label={openable ? `«${openable.name}» 새 탭에서 열기` : '새 탭에서 열기'}
        title={openable ? `«${openable.name}» 새 탭에서 열기 (Shift+Enter)` : '검색 결과가 한 명일 때 새 탭으로 열 수 있습니다'}
        className="flex h-full w-8 shrink-0 items-center justify-center rounded-r border-l border-border text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ExternalLink className="size-3.5" />
      </button>
    </form>
  )
}
