'use client'

import { useId } from 'react'
import { ImagePlus, Search } from 'lucide-react'
import CelebSearchSuggestion from './celeb-search/CelebSearchSuggestion'
import { useCelebSearch } from './celeb-search/useCelebSearch'
import type { CelebSearchBarProps, CelebSearchItem } from './celeb-search/types'

export type { CelebSearchItem } from './celeb-search/types'

export const DEFAULT_CELEB_SEARCH_PLACEHOLDER = '셀럽 이름 검색 후 Enter로 상세 이동'
export const DEFAULT_CELEB_SEARCH_EMPTY_MESSAGE = '검색 결과가 없습니다.'

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
  const listId = useId()
  const {
    rootRef,
    inputRef,
    query,
    results,
    isOpen,
    selectedIndex,
    shouldOpenOnFocus,
    setQuery,
    setIsOpen,
    setSelectedIndex,
    prepareSelection,
    commitSelection,
  } = useCelebSearch({
    initialQuery,
    items,
    maxResults,
    autoFocus,
    clearOnSelect,
    openOnFocus,
    detailPathTemplate,
    onSelect,
  })
  const showDropdown = isOpen && (results.length > 0 || query.trim().length > 0)

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    const highlighted = selectedIndex >= 0 ? results[selectedIndex] : null
    const singleMatch = results.length === 1 ? results[0] : null
    const target = highlighted || singleMatch
    if (!target) return
    event.preventDefault()
    commitSelection(target)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        name={name}
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          setSelectedIndex(-1)
          setIsOpen(Boolean(nextQuery.trim()) || shouldOpenOnFocus)
        }}
        onFocus={() => {
          if (shouldOpenOnFocus || query.trim()) setIsOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            if (results.length === 0) return
            event.preventDefault()
            setIsOpen(true)
            setSelectedIndex((previous) => previous < results.length - 1 ? previous + 1 : 0)
            return
          }
          if (event.key === 'ArrowUp') {
            if (results.length === 0) return
            event.preventDefault()
            setIsOpen(true)
            setSelectedIndex((previous) => previous > 0 ? previous - 1 : results.length - 1)
            return
          }
          if (event.key === 'Enter') {
            handleEnter(event)
            return
          }
          if (event.key === 'Escape') setIsOpen(false)
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={`h-11 w-full rounded-lg border border-border bg-bg-secondary pe-4 ps-10 text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none ${inputClassName}`}
      />

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-[200] mt-1 overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl shadow-black/40">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">{emptyMessage}</p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border bg-bg-secondary/70 px-4 py-2.5 text-[11px] text-text-tertiary">
                <span>검색 결과 {results.length}명</span>
                <span className="flex items-center gap-1.5"><ImagePlus className="h-3.5 w-3.5" />아바타·대표사진 칸을 눌러 등록</span>
              </div>
              <ul id={listId} role="listbox" className="max-h-[min(68vh,640px)] overflow-y-auto py-1">
                {results.map((item, index) => (
                  <CelebSearchSuggestion
                    key={`${item.slug || item.id || item.nickname || 'celeb'}-${index}`}
                    item={item}
                    selected={index === selectedIndex}
                    detailPathTemplate={detailPathTemplate}
                    extra={renderSuggestionExtra?.(item)}
                    actionMode={Boolean(onSelect)}
                    onAction={() => commitSelection(item)}
                    onLinkClick={prepareSelection}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
