'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CELEB_COLUMN_FILTER_KEYS } from '@/lib/celeb-list-filters'

/** null·''·'all'은 그 조건을 지운다는 뜻이다. */
type QueryChanges = Record<string, string | null>

/**
 * 정렬·필터는 고르는 즉시 목록을 다시 불러오지 않는다. 담아 두었다가(draft) 「적용」에서 한 번에 URL로 보낸다.
 * 컨트롤이 보는 params에는 담아 둔 값이 이미 덮여 있어, 적용 전에도 고른 상태가 화면에 보인다.
 */
interface CelebTableQueryValue {
  /** URL 값 위에 담아 둔 변경을 덮은 조회 조건. 컨트롤은 이것을 보고 그린다. */
  params: URLSearchParams
  /** 실제로 URL에 적용된 조건. 칩이 "무엇에서 무엇으로"를 보여 줄 때 쓴다. */
  applied: URLSearchParams
  pending: boolean
  /** 담아 둔 변경. 키 순서는 담은 순서다. */
  staged: [string, string | null][]
  /** 변경을 담아 둔다. 적용된 값과 같아지면 담아 둔 것에서 빠진다. */
  update: (changes: QueryChanges) => void
  /** 담아 둔 변경 중 일부를 되돌린다. */
  unstage: (keys: string[]) => void
  /** 담아 둔 변경을 URL에 적용해 목록을 다시 불러온다. */
  apply: () => void
  /** 담아 둔 변경을 모두 버린다. */
  discard: () => void
  /** 담기와 적용을 한 번에 한다. 검색처럼 실행 버튼이 따로 있는 컨트롤이 쓴다. */
  commit: (changes: QueryChanges) => void
  /** 검색·필터·정렬을 지우고 바로 적용한다. 등록순 구간과 표시 인원은 남긴다. */
  reset: () => void
}

const QueryContext = createContext<CelebTableQueryValue | null>(null)

const RESET_KEYS = [
  ...CELEB_COLUMN_FILTER_KEYS,
  'search', 'status', 'profession', 'tier', 'reality', 'image', 'faction', 'sort', 'sortOrder',
]

function isClearing(value: string | null) {
  return value === null || value === '' || value === 'all'
}

/** 옛 image=missing-* 주소를 열별 필터로 옮긴다. */
function migrateLegacyImageParam(params: URLSearchParams) {
  const legacyImage = params.get('image')
  const legacyField = legacyImage === 'missing-avatar' ? 'avatar'
    : legacyImage === 'missing-portrait' ? 'portrait'
      : legacyImage === 'missing-awakened' ? 'awakened' : null
  if (legacyField && !params.has(legacyField)) params.set(legacyField, 'missing')
  params.delete('image')
}

function applyChanges(params: URLSearchParams, changes: Iterable<[string, string | null]>) {
  for (const [key, value] of changes) {
    if (isClearing(value)) params.delete(key)
    else params.set(key, value)
  }
}

export function CelebTableQueryProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState<Map<string, string | null>>(() => new Map())
  const latestQuery = useRef(searchParams.toString())

  useEffect(() => {
    if (!pending) latestQuery.current = searchParams.toString()
  }, [searchParams, pending])

  const navigate = (params: URLSearchParams) => {
    params.set('page', '1')
    latestQuery.current = params.toString()
    setDraft(new Map())
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }))
  }

  const update = (changes: QueryChanges) => {
    const applied = new URLSearchParams(latestQuery.current)
    migrateLegacyImageParam(applied)
    setDraft((previous) => {
      const next = new Map(previous)
      for (const [key, value] of Object.entries(changes)) {
        const appliedValue = applied.get(key)
        const sameAsApplied = isClearing(value) ? appliedValue === null : appliedValue === value
        if (sameAsApplied) next.delete(key)
        else next.set(key, isClearing(value) ? null : value)
      }
      return next
    })
  }

  const unstage = (keys: string[]) => {
    setDraft((previous) => {
      const next = new Map(previous)
      for (const key of keys) next.delete(key)
      return next
    })
  }

  const apply = () => {
    if (draft.size === 0) return
    const params = new URLSearchParams(latestQuery.current)
    migrateLegacyImageParam(params)
    applyChanges(params, draft)
    navigate(params)
  }

  const commit = (changes: QueryChanges) => {
    const params = new URLSearchParams(latestQuery.current)
    migrateLegacyImageParam(params)
    applyChanges(params, draft)
    applyChanges(params, Object.entries(changes))
    navigate(params)
  }

  const reset = () => {
    const params = new URLSearchParams(latestQuery.current)
    for (const key of RESET_KEYS) params.delete(key)
    navigate(params)
  }

  const value = useMemo<CelebTableQueryValue>(() => {
    const applied = new URLSearchParams(searchParams.toString())
    const params = new URLSearchParams(searchParams.toString())
    migrateLegacyImageParam(params)
    applyChanges(params, draft)
    return { params, applied, pending, staged: [...draft], update, unstage, apply, discard: () => setDraft(new Map()), commit, reset }
    // 함수들은 ref·setState만 닫고 있어 값이 바뀌지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, draft, pending])

  return (
    <QueryContext.Provider value={value}>
      {children}
    </QueryContext.Provider>
  )
}

export function useCelebTableQuery() {
  const context = useContext(QueryContext)
  if (!context) throw new Error('Celeb table controls require CelebTableQueryProvider')
  return context
}
