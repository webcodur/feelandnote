'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, Star } from 'lucide-react'
import { getCelebProfessionLabel } from '@/constants/celebCategories'

export const DEFAULT_CELEB_SEARCH_PLACEHOLDER =
  '\uC140\uB7FD \uC774\uB984 \uAC80\uC0C9 \uD6C4 Enter\uB85C \uC0C1\uC138 \uC774\uB3D9'
export const DEFAULT_CELEB_SEARCH_EMPTY_MESSAGE =
  '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'

const NAMELESS_CELEB_LABEL = '\uC774\uB984 \uC5C6\uC74C'

export interface CelebSearchItem {
  id?: string
  slug: string | null
  nickname: string | null
  nickname_en?: string | null
  avatar_url?: string | null
  profession?: string | null
}

interface CelebSearchBarProps<T extends CelebSearchItem = CelebSearchItem> {
  name?: string
  placeholder?: string
  initialQuery?: string
  items?: T[]
  detailPathTemplate?: string
  maxResults?: number
  autoFocus?: boolean
  clearOnSelect?: boolean
  openOnFocus?: boolean
  className?: string
  inputClassName?: string
  emptyMessage?: string
  onSelect?: (item: T) => void
  renderSuggestionExtra?: (item: T) => ReactNode
}

function normalize(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function matchesQuery(item: CelebSearchItem, query: string): boolean {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return true

  return [item.nickname, item.nickname_en, item.slug]
    .some((value) => normalize(value).includes(normalizedQuery))
}

function getSecondaryText(item: CelebSearchItem): string {
  const parts: string[] = []

  if (item.slug) parts.push(item.slug)
  if (item.profession) parts.push(getCelebProfessionLabel(item.profession))
  if (parts.length > 0) return parts.join(' / ')

  return item.nickname_en || ''
}

export default function CelebSearchBar<T extends CelebSearchItem = CelebSearchItem>({
  name,
  placeholder = DEFAULT_CELEB_SEARCH_PLACEHOLDER,
  initialQuery = '',
  items,
  detailPathTemplate = '/celebs/[slug]',
  maxResults = 10,
  autoFocus = false,
  clearOnSelect = false,
  openOnFocus,
  className = '',
  inputClassName = '',
  emptyMessage = DEFAULT_CELEB_SEARCH_EMPTY_MESSAGE,
  onSelect,
  renderSuggestionExtra,
}: CelebSearchBarProps<T>) {
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
    const valueLength = inputRef.current.value.length
    inputRef.current.setSelectionRange(valueLength, valueLength)
  }, [autoFocus])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (items) {
      const nextResults = items.filter((item) => matchesQuery(item, query)).slice(0, maxResults)
      setResults(nextResults)
      return
    }

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setResults([])
      setSelectedIndex(-1)
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/celebs/search?q=${encodeURIComponent(trimmedQuery)}`)
        const data = await response.json()

        if (requestIdRef.current !== requestId) return

        const nextResults = ((data.celebs || []) as CelebSearchItem[]).slice(0, maxResults) as T[]
        setResults(nextResults)
      } catch {
        if (requestIdRef.current !== requestId) return
        setResults([])
        setSelectedIndex(-1)
      }
    }, 250)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [items, maxResults, query])

  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(results.length > 0 ? results.length - 1 : -1)
    }
  }, [results.length, selectedIndex])

  function commitSelection(item: T) {
    if (clearOnSelect) {
      setQuery('')
      setResults(items ? items.slice(0, maxResults) : [])
    }

    setIsOpen(false)
    setSelectedIndex(-1)

    if (onSelect) {
      onSelect(item)
      return
    }

    if (item.slug) {
      const encodedSlug = encodeURIComponent(item.slug)
      const href = detailPathTemplate.includes('[slug]')
        ? detailPathTemplate.replace('[slug]', encodedSlug)
        : `${detailPathTemplate.replace(/\/$/, '')}/${encodedSlug}`

      router.push(href)
    }
  }

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    const highlighted = selectedIndex >= 0 ? results[selectedIndex] : null
    const singleMatch = results.length === 1 ? results[0] : null
    const target = highlighted || singleMatch

    if (target) {
      event.preventDefault()
      commitSelection(target)
    }
  }

  const shouldOpenOnFocus = openOnFocus ?? Boolean(items)
  const showDropdown = isOpen && (results.length > 0 || query.trim().length > 0)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          setSelectedIndex(-1)
          setIsOpen(Boolean(nextQuery.trim()) || shouldOpenOnFocus)
        }}
        onFocus={() => {
          if (shouldOpenOnFocus || query.trim()) {
            setIsOpen(true)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            if (results.length === 0) return
            event.preventDefault()
            setIsOpen(true)
            setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
            return
          }

          if (event.key === 'ArrowUp') {
            if (results.length === 0) return
            event.preventDefault()
            setIsOpen(true)
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
            return
          }

          if (event.key === 'Enter') {
            handleEnter(event)
            return
          }

          if (event.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none ${inputClassName}`}
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">{emptyMessage}</p>
          ) : (
            results.map((item, index) => {
              const secondaryText = getSecondaryText(item)
              return (
                <button
                  key={`${item.slug || item.id || item.nickname || 'celeb'}-${index}`}
                  type="button"
                  onClick={() => commitSelection(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary ${
                    index === selectedIndex ? 'bg-bg-secondary' : ''
                  }`}
                >
                  <div className="relative w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0">
                    {item.avatar_url ? (
                      <Image src={item.avatar_url} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <Star className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary truncate">
                      {item.nickname || NAMELESS_CELEB_LABEL}
                    </p>
                    {secondaryText && (
                      <p className="text-xs text-text-tertiary truncate">{secondaryText}</p>
                    )}
                  </div>

                  {renderSuggestionExtra && (
                    <div className="shrink-0">{renderSuggestionExtra(item)}</div>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
