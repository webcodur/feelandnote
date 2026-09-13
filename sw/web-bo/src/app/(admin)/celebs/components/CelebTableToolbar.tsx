'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, RotateCcw, Search } from 'lucide-react'
import { resolveFactionSelection, type FactionTheme } from './factionOptions'
import { useCelebTableQuery } from './columnFilters/CelebTableQuery'

const SELECT_CLASS = 'h-8 max-w-48 rounded border border-border bg-bg-secondary px-2 text-xs text-text-secondary hover:border-accent hover:text-text-primary focus:border-accent focus:outline-none disabled:cursor-wait disabled:opacity-50'

export default function CelebTableToolbar({ factionThemes, children }: { factionThemes: FactionTheme[]; children?: ReactNode }) {
  const { params, pending, update, reset } = useCelebTableQuery()
  const [searchResetVersion, setSearchResetVersion] = useState(0)
  const selection = resolveFactionSelection(factionThemes, params.get('faction') || 'all')
  const theme = factionThemes.find((item) => item.id === selection.theme)

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 md:px-4" aria-busy={pending}>
      <SearchForm key={`${params.get('search') || ''}:${searchResetVersion}`} initialValue={params.get('search') || ''} pending={pending} onSearch={(search) => update({ search })} />
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
      <select
        aria-label="세력 필터"
        value={selection.faction}
        onChange={(event) => update({ faction: event.target.value === 'all' ? selection.theme : event.target.value })}
        disabled={pending || !theme?.factions.length}
        className={`${SELECT_CLASS} ${selection.faction !== 'all' ? 'border-accent/60 text-accent' : ''}`}
      >
        <option value="all">{theme ? '테마 전체' : '모든 세력'}</option>
        {theme?.factions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
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

function SearchForm({ initialValue, pending, onSearch }: { initialValue: string; pending: boolean; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(initialValue)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(value.trim())
  }
  return (
    <form onSubmit={submit} role="search" className="flex h-8 min-w-48 flex-1 items-center gap-1 rounded border border-border bg-bg-secondary pl-2 hover:border-accent focus-within:border-accent sm:max-w-80">
      <input
        type="search"
        aria-label="이름·영문명·수식어 검색"
        placeholder="이름·영문명·수식어 검색"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={pending}
        className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-50"
      />
      <button type="submit" aria-label="검색 적용" disabled={pending} className="flex h-full w-8 shrink-0 items-center justify-center rounded-r text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50">
        <Search className="size-3.5" />
      </button>
    </form>
  )
}
