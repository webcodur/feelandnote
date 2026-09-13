'use client'

import { createContext, useContext, useEffect, useRef, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CELEB_COLUMN_FILTER_KEYS } from '@/lib/celeb-list-filters'

type QueryChanges = Record<string, string | null>

interface CelebTableQueryValue {
  params: URLSearchParams
  pending: boolean
  update: (changes: QueryChanges) => void
  reset: () => void
}

const QueryContext = createContext<CelebTableQueryValue | null>(null)

export function CelebTableQueryProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const latestQuery = useRef(searchParams.toString())

  useEffect(() => {
    if (!pending) latestQuery.current = searchParams.toString()
  }, [searchParams, pending])

  const navigate = (params: URLSearchParams) => {
    params.set('page', '1')
    latestQuery.current = params.toString()
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }))
  }

  const update = (changes: QueryChanges) => {
    // Share the in-flight query across controls so quick edits cannot replace one another.
    const params = new URLSearchParams(latestQuery.current)
    const legacyImage = params.get('image')
    const legacyField = legacyImage === 'missing-avatar' ? 'avatar'
      : legacyImage === 'missing-portrait' ? 'portrait'
        : legacyImage === 'missing-awakened' ? 'awakened' : null
    if (legacyField && !params.has(legacyField)) params.set(legacyField, 'missing')
    params.delete('image')
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '' || value === 'all') params.delete(key)
      else params.set(key, value)
    }
    navigate(params)
  }

  const reset = () => {
    const params = new URLSearchParams(latestQuery.current)
    for (const key of [
      ...CELEB_COLUMN_FILTER_KEYS,
      'search', 'status', 'profession', 'tier', 'reality', 'image', 'faction', 'sort', 'sortOrder',
    ]) params.delete(key)
    navigate(params)
  }

  return (
    <QueryContext.Provider value={{ params: new URLSearchParams(searchParams.toString()), pending, update, reset }}>
      {children}
    </QueryContext.Provider>
  )
}

export function useCelebTableQuery() {
  const context = useContext(QueryContext)
  if (!context) throw new Error('Celeb table controls require CelebTableQueryProvider')
  return context
}
