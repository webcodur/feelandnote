'use client'

import { createContext, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { useCountries } from '@/hooks/useCountries'
import { useCelebTableQuery } from './CelebTableQuery'

// 글자는 상자 전체 폭 기준으로 가운데, 화살표는 오른쪽 끝에 붙인다 — 네이티브 select와 같은 자리다.
const CONTROL_CLASS = 'relative flex h-7 w-full min-w-16 items-center justify-center rounded border bg-bg-card px-1.5 text-center text-[11px] font-normal hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50'
const INPUT_CLASS = 'h-8 w-full min-w-0 rounded border border-border bg-bg-secondary px-2 text-xs text-text-primary hover:border-accent focus:border-accent focus:outline-none'
const TEXT_BUTTON_CLASS = 'rounded px-2 py-1.5 text-xs text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent'

const ClosePopoverContext = createContext<() => void>(() => {})

function FilterPopover({ label, summary, active, children }: { label: string; summary: string; active: boolean; children: ReactNode }) {
  const { pending } = useCelebTableQuery()
  const id = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>('input')?.focus()
    const closeOnMove = (event: Event) => {
      if (event.target instanceof Node && panel?.contains(event.target)) return
      panel?.hidePopover()
    }
    window.addEventListener('resize', closeOnMove)
    window.addEventListener('scroll', closeOnMove, true)
    return () => {
      window.removeEventListener('resize', closeOnMove)
      window.removeEventListener('scroll', closeOnMove, true)
    }
  }, [open])

  const close = () => {
    panelRef.current?.hidePopover()
    buttonRef.current?.focus()
  }

  const toggle = () => {
    const panel = panelRef.current
    const button = buttonRef.current
    if (!panel || !button) return
    if (panel.matches(':popover-open')) { close(); return }
    panel.showPopover()
    const triggerRect = button.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    panel.style.left = `${Math.max(8, Math.min(triggerRect.left, window.innerWidth - panelRect.width - 8))}px`
    const below = triggerRect.bottom + 6
    panel.style.top = `${Math.max(8, below + panelRect.height <= window.innerHeight - 8 ? below : triggerRect.top - panelRect.height - 6)}px`
  }

  return (
    <>
      <button ref={buttonRef} type="button" disabled={pending} aria-label={`${label} 필터: ${summary}`} aria-expanded={open} aria-haspopup="dialog" aria-controls={id} title={summary} onClick={toggle} className={`${CONTROL_CLASS} ${active ? 'border-accent/60 text-accent' : 'border-border text-text-tertiary'}`}>
        <span className="truncate px-3">{summary}</span><ChevronDown className="absolute right-1.5 size-3" />
      </button>
      <div ref={panelRef} id={id} popover="auto" role="dialog" aria-label={`${label} 필터`} onToggle={(event) => setOpen(event.newState === 'open')} className="fixed m-0 w-72 max-w-[calc(100vw-16px)] rounded-lg border border-border bg-bg-card p-3 text-left text-text-primary shadow-xl" style={{ margin: 0 }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium">{label}</span>
          <button type="button" onClick={close} aria-label="필터 닫기" className="rounded p-1 text-text-tertiary hover:bg-white/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"><X className="size-3.5" /></button>
        </div>
        <ClosePopoverContext.Provider value={close}><div key={String(open)}>{children}</div></ClosePopoverContext.Provider>
      </div>
    </>
  )
}

interface RangeFilterProps {
  label: string
  from: string
  to: string
  minimum?: number
  date?: boolean
}

export function RangeFilter({ label, from, to, minimum = 0, date = false }: RangeFilterProps) {
  const { params, update } = useCelebTableQuery()
  const low = params.get(from) || ''
  const high = params.get(to) || ''
  const active = Boolean(low || high)
  const format = (value: string) => date ? value.slice(2).replaceAll('-', '.') : value
  const summary = low && high ? low === high ? format(low) : `${format(low)} ~ ${format(high)}`
    : low ? `${format(low)} ${date ? '이후' : '이상'}`
      : high ? `${format(high)} ${date ? '이전' : '이하'}` : '전체'
  return (
    <FilterPopover label={label} summary={summary} active={active}>
      <RangeForm key={`${low}:${high}`} {...{ label, low, high, minimum, date }} onApply={(newLow, newHigh) => update({ [from]: newLow, [to]: newHigh })} />
    </FilterPopover>
  )
}

function RangeForm({ label, low, high, minimum, date, onApply }: { label: string; low: string; high: string; minimum: number; date: boolean; onApply: (low: string, high: string) => void }) {
  const [from, setFrom] = useState(low)
  const [to, setTo] = useState(high)
  const [error, setError] = useState('')
  const errorId = useId()
  const close = useContext(ClosePopoverContext)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!date && [from, to].some((value) => value !== '' && (!Number.isSafeInteger(Number(value)) || Number(value) < minimum))) {
      setError(`${minimum} 이상의 정수를 입력하세요.`)
      return
    }
    if (from && to && (date ? from > to : Number(from) > Number(to))) {
      setError(date ? '시작일은 종료일보다 늦을 수 없습니다.' : '최솟값은 최댓값보다 클 수 없습니다.')
      return
    }
    onApply(date || !from ? from : String(Number(from)), date || !to ? to : String(Number(to)))
    close()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-[11px] text-text-secondary"><span>{date ? '시작일' : '최솟값'}</span>
          <input type={date ? 'date' : 'number'} aria-label={`${label} ${date ? '시작일' : '최솟값'}`} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} value={from} onChange={(event) => { setFrom(event.target.value); setError('') }} min={date ? '0001-01-01' : minimum} max={date ? '9999-12-31' : Number.MAX_SAFE_INTEGER} step={date ? undefined : 1} placeholder="제한 없음" className={INPUT_CLASS} />
        </label>
        <label className="space-y-1 text-[11px] text-text-secondary"><span>{date ? '종료일' : '최댓값'}</span>
          <input type={date ? 'date' : 'number'} aria-label={`${label} ${date ? '종료일' : '최댓값'}`} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} value={to} onChange={(event) => { setTo(event.target.value); setError('') }} min={date ? '0001-01-01' : minimum} max={date ? '9999-12-31' : Number.MAX_SAFE_INTEGER} step={date ? undefined : 1} placeholder="제한 없음" className={INPUT_CLASS} />
        </label>
      </div>
      {minimum < 0 ? <p className="text-[11px] text-text-tertiary">-1: 조사 완료·콘텐츠 없음</p> : null}
      {date ? <p className="text-[11px] text-text-tertiary">한국 시간 기준, 시작일과 종료일을 포함합니다.</p> : null}
      {error ? <p id={errorId} role="alert" className="text-xs text-red-400">{error}</p> : null}
      <div className="flex items-center justify-between border-t border-border pt-2">
        <button type="button" onClick={() => { onApply('', ''); close() }} className={TEXT_BUTTON_CLASS}>해제</button>
        <button type="submit" className="rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:border-accent hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-accent">담기</button>
      </div>
    </form>
  )
}

export function NationalityFilter() {
  const { params, update } = useCelebTableQuery()
  const { countries, loading, error } = useCountries()
  const nationality = params.get('nationality') || ''
  const country = countries.find((item) => item.code === nationality)
  return (
    <FilterPopover label="국적" summary={country?.name || nationality || '전체'} active={Boolean(nationality)}>
      <NationalityOptions countries={countries} loading={loading} error={error} selected={nationality} onChoose={(value) => update({ nationality: value })} />
    </FilterPopover>
  )
}

function NationalityOptions({ countries, loading, error, selected, onChoose }: { countries: { code: string; name: string; name_en: string }[]; loading: boolean; error: string | null; selected: string; onChoose: (value: string) => void }) {
  const [search, setSearch] = useState('')
  const close = useContext(ClosePopoverContext)
  const choose = (value: string) => { onChoose(value); close() }
  const needle = search.trim().toLocaleLowerCase()
  const matches = countries.filter((country) => `${country.name} ${country.name_en} ${country.code}`.toLocaleLowerCase().includes(needle))
  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2 top-2.5 size-3 text-text-tertiary" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="국가명·코드 검색" placeholder="국가명·코드 검색" className={`${INPUT_CLASS} pl-7`} />
      </div>
      <div className="max-h-56 overflow-y-auto" role="group" aria-label="국적 선택">
        <button type="button" onClick={() => choose('')} aria-pressed={!selected} className={`w-full text-left ${TEXT_BUTTON_CLASS} ${!selected ? 'bg-accent/10 text-accent' : ''}`}>전체</button>
        {loading ? <p role="status" className="px-2 py-3 text-xs text-text-tertiary">국가 목록을 불러오는 중</p> : error ? <p role="alert" className="px-2 py-3 text-xs text-red-400">국가 목록을 불러오지 못했습니다.</p> : matches.length === 0 ? <p className="px-2 py-3 text-xs text-text-tertiary">일치하는 국가가 없습니다.</p> : matches.map((country) => (
          <button key={country.code} type="button" onClick={() => choose(country.code)} aria-pressed={selected === country.code} className={`flex w-full items-center justify-between gap-2 text-left ${TEXT_BUTTON_CLASS} ${selected === country.code ? 'bg-accent/10 text-accent' : ''}`}>
            <span>{country.name}</span><span className="text-[10px] text-text-tertiary">{country.code}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
