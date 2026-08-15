'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CelebSearchItem } from './types'
import { buildCelebDetailHref, matchesCelebQuery } from './utils'

interface Options<T extends CelebSearchItem> {
  initialQuery: string
  items?: T[]
  maxResults: number
  autoFocus: boolean
  clearOnSelect: boolean
  openOnFocus?: boolean
  detailPathTemplate: string
  onSelect?: (item: T) => void
}

interface ClosestTarget extends EventTarget {
  closest?: (selector: string) => Element | null
}

export function shouldCloseCelebSearch(
  root: HTMLDivElement | null,
  target: EventTarget | null,
): boolean {
  if (!target) return true
  if (root?.contains(target as Node)) return false
  return !(target as ClosestTarget).closest?.('[role="dialog"][aria-modal="true"]')
}

export function useCelebSearch<T extends CelebSearchItem>({
  initialQuery,
  items,
  maxResults,
  autoFocus,
  clearOnSelect,
  openOnFocus,
  detailPathTemplate,
  onSelect,
}: Options<T>) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<T[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    setQuery(initialQuery)
    setSelectedIndex(-1)
    setIsOpen(false)
  }, [initialQuery])

  useEffect(() => {
    if (!autoFocus || !inputRef.current) return
    inputRef.current.focus()
    const length = inputRef.current.value.length
    inputRef.current.setSelectionRange(length, length)
  }, [autoFocus])

  useEffect(() => {
    function closeWhenClickingOutside(event: MouseEvent) {
      if (shouldCloseCelebSearch(rootRef.current, event.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', closeWhenClickingOutside)
    return () => document.removeEventListener('mousedown', closeWhenClickingOutside)
  }, [])

  useEffect(() => {
    if (items) {
      setResults(items.filter((item) => matchesCelebQuery(item, query)).slice(0, maxResults))
      return
    }

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setResults([])
      setSelectedIndex(-1)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/celebs/search?q=${encodeURIComponent(trimmedQuery)}`)
        if (!response.ok) throw new Error('인물 검색에 실패했습니다.')
        const data = await response.json()
        if (requestIdRef.current !== requestId) return
        setResults(((data.celebs || []) as T[]).slice(0, maxResults))
      } catch {
        if (requestIdRef.current !== requestId) return
        setResults([])
        setSelectedIndex(-1)
      }
    }, 250)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [items, maxResults, query])

  useEffect(() => {
    if (selectedIndex < results.length) return
    setSelectedIndex(results.length > 0 ? results.length - 1 : -1)
  }, [results.length, selectedIndex])

  function prepareSelection() {
    if (clearOnSelect) {
      setQuery('')
      setResults(items ? items.slice(0, maxResults) : [])
    }
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  function commitSelection(item: T) {
    prepareSelection()
    if (onSelect) {
      onSelect(item)
      return
    }
    if (item.slug) router.push(buildCelebDetailHref(item.slug, detailPathTemplate))
  }

  return {
    rootRef,
    inputRef,
    query,
    results,
    isOpen,
    selectedIndex,
    shouldOpenOnFocus: openOnFocus ?? Boolean(items),
    setQuery,
    setIsOpen,
    setSelectedIndex,
    prepareSelection,
    commitSelection,
  }
}
