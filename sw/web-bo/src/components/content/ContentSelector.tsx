'use client'

import { useState } from 'react'
import Image from 'next/image'
import { searchExternalContent, searchDbContent } from '@/actions/admin/external-search'
import { Search, Loader2, Database, Globe, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { CONTENT_TYPE_CONFIG, CONTENT_TYPES } from '@/constants/contentTypes'
import type { ExternalSearchResult } from '@feelandnote/content-search/unified-search'
import type { ContentType } from '@feelandnote/content-search/types'

// #region Types
export interface DbSearchResult {
  id: string
  title: string
  type: string
  creator: string | null
  thumbnail_url: string | null
}

export type SelectedContent =
  | { source: 'db'; data: DbSearchResult }
  | { source: 'external'; data: ExternalSearchResult }

type SearchMode = 'db' | 'external'
type SearchApi = 'google' | 'naver'
// #endregion

// #region Props
interface Props {
  onSelect: (content: SelectedContent) => void
  onCancel?: () => void
  initialType?: ContentType
  showTypeSelector?: boolean
  className?: string
}
// #endregion

export default function ContentSelector({ onSelect, onCancel, initialType = 'BOOK', showTypeSelector = true, className = '' }: Props) {
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('external')
  const [searchApi, setSearchApi] = useState<SearchApi>('naver')
  const [contentType, setContentType] = useState<ContentType>(initialType)
  const [dbResults, setDbResults] = useState<DbSearchResult[]>([])
  const [externalResults, setExternalResults] = useState<ExternalSearchResult[]>([])

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setError(null)
    setDbResults([])
    setExternalResults([])

    try {
      if (searchMode === 'db') {
        const result = await searchDbContent(searchQuery, contentType)
        if (!result.success) throw new Error(result.error)
        setDbResults(result.items || [])
      } else {
        const preferGoogle = contentType === 'BOOK' ? searchApi === 'google' : true
        const result = await searchExternalContent(contentType, searchQuery, 1, { preferGoogle })
        if (!result.success) throw new Error(result.error)
        setExternalResults(result.items || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색에 실패했습니다.')
    } finally {
      setSearchLoading(false)
    }
  }

  function handleSelect(content: SelectedContent) {
    onSelect(content)
  }

  function resetSearch() {
    setSearchQuery('')
    setDbResults([])
    setExternalResults([])
    setError(null)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

      {/* 필터 영역 */}
      <div className="flex gap-2 flex-wrap">
        {showTypeSelector && (
          <select
            value={contentType}
            onChange={(e) => {
              setContentType(e.target.value as ContentType)
              resetSearch()
            }}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm focus:border-accent focus:outline-none"
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {CONTENT_TYPE_CONFIG[type].label}
              </option>
            ))}
          </select>
        )}

        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setSearchMode('external')
              resetSearch()
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${searchMode === 'external' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
          >
            <Globe className="w-4 h-4" />
            외부
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchMode('db')
              resetSearch()
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${searchMode === 'db' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
          >
            <Database className="w-4 h-4" />
            DB
          </button>
        </div>

        {/* API 선택 (외부 + BOOK만) */}
        {searchMode === 'external' && contentType === 'BOOK' && (
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setSearchApi('google')}
              className={`px-3 py-2 text-sm ${searchApi === 'google' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => setSearchApi('naver')}
              className={`px-3 py-2 text-sm ${searchApi === 'naver' ? 'bg-green-500 text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
            >
              네이버
            </button>
          </div>
        )}
      </div>

      {/* 검색 입력 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder={searchMode === 'external' ? '외부 API에서 검색...' : 'DB에서 검색...'}
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
        <Button type="button" onClick={handleSearch} disabled={searchLoading}>
          {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 검색 결과 */}
      {(dbResults.length > 0 || externalResults.length > 0) && (
        <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-auto">
          {searchMode === 'db'
            ? dbResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect({ source: 'db', data: c })}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-secondary"
                >
                  <div className="relative w-10 h-12 bg-bg-secondary rounded overflow-hidden shrink-0">
                    {c.thumbnail_url && <Image src={c.thumbnail_url} alt="" fill unoptimized className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{c.title}</p>
                    <p className="text-xs text-text-secondary">
                      {c.creator} · {c.type}
                    </p>
                  </div>
                  <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">DB</span>
                </button>
              ))
            : externalResults.map((c) => (
                <button
                  key={c.externalId}
                  type="button"
                  onClick={() => handleSelect({ source: 'external', data: c })}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-secondary"
                >
                  <div className="relative w-10 h-12 bg-bg-secondary rounded overflow-hidden shrink-0">
                    {c.coverImageUrl && <Image src={c.coverImageUrl} alt="" fill unoptimized className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{c.title}</p>
                    <p className="text-xs text-text-secondary">{c.creator}</p>
                  </div>
                  <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">외부</span>
                </button>
              ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {searchQuery && !searchLoading && dbResults.length === 0 && externalResults.length === 0 && (
        <div className="text-center py-6 text-text-secondary text-sm">검색 결과가 없습니다.</div>
      )}
    </div>
  )
}
