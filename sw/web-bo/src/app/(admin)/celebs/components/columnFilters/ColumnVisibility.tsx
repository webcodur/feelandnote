'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Columns3 } from 'lucide-react'
import { COLUMNS } from './columns'

/** 보는 사람마다 다른 취향이라 브라우저에만 남긴다. 값이 없으면 기본 숨김 목록을 쓴다. */
const STORAGE_KEY = 'bo.celebs.hiddenColumns'
const DEFAULT_HIDDEN_JSON = JSON.stringify(['follower_count'])

interface ColumnVisibilityValue {
  hidden: ReadonlySet<string>
  isVisible: (field: string) => boolean
  toggle: (field: string) => void
}

const VisibilityContext = createContext<ColumnVisibilityValue | null>(null)

// localStorage를 외부 저장소로 구독한다. 서버 스냅샷은 기본값이라 첫 화면이 서버와 같다.
const listeners = new Set<() => void>()
// 저장이 막힌 환경(시크릿 창 등)에서도 이번 화면에는 반영되도록 메모리 사본을 둔다.
let memoryFallback: string | null = null
function readSnapshot(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? memoryFallback ?? DEFAULT_HIDDEN_JSON } catch { return memoryFallback ?? DEFAULT_HIDDEN_JSON }
}
function writeSnapshot(next: string) {
  memoryFallback = next
  try { localStorage.setItem(STORAGE_KEY, next) } catch { /* 메모리 사본으로 버틴다 */ }
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function parseHidden(json: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(json)
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set()
  }
}

export function ColumnVisibilityProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => DEFAULT_HIDDEN_JSON)
  const hidden = useMemo(() => parseHidden(snapshot), [snapshot])

  const toggle = (field: string) => {
    const next = new Set(hidden)
    if (next.has(field)) next.delete(field)
    else next.add(field)
    writeSnapshot(JSON.stringify([...next]))
  }

  return (
    <VisibilityContext.Provider value={{ hidden, isVisible: (field) => !hidden.has(field), toggle }}>
      {children}
    </VisibilityContext.Provider>
  )
}

export function useColumnVisibility() {
  const context = useContext(VisibilityContext)
  if (!context) throw new Error('Celeb table columns require ColumnVisibilityProvider')
  return context
}

/** 열을 켜고 끄는 목록. 이름 열은 표의 기준이라 끌 수 없다. */
export function ColumnPicker() {
  const { hidden, toggle } = useColumnVisibility()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        title="보이는 열 고르기"
        className={`inline-flex h-8 items-center gap-1 rounded border px-2 text-xs hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent ${hidden.size ? 'border-accent/60 text-accent' : 'border-border text-text-secondary'}`}
      >
        <Columns3 className="size-3.5" />열{hidden.size ? ` ${hidden.size}개 숨김` : ''}
      </button>
      {open ? (
        <div role="group" aria-label="보이는 열" className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-bg-card p-2 shadow-xl">
          {COLUMNS.map((column) => (
            <label key={column.field} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary">
              <input
                type="checkbox"
                checked={!hidden.has(column.field)}
                disabled={column.field === 'nickname'}
                onChange={() => toggle(column.field)}
                className="accent-accent"
              />
              {column.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}
