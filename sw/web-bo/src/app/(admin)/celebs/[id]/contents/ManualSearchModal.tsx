'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Search, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { searchExternalContent } from '@/actions/admin/external-search'
import type { ContentType } from '@feelnnote/api-clients'

interface SearchResult {
  externalId: string
  externalSource: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (result: SearchResult) => void
  contentType: ContentType
  initialQuery?: string
}

export default function ManualSearchModal({ isOpen, onClose, onSelect, contentType, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return

    setSearching(true)
    setSearched(true)

    try {
      const response = await searchExternalContent(contentType, query)
      // ExternalSearchResult를 SearchResult 형식으로 변환
      const items: SearchResult[] = (response.items || []).map((item) => ({
        externalId: item.externalId,
        externalSource: item.externalSource,
        title: item.title,
        creator: item.creator,
        coverImageUrl: item.coverImageUrl,
        metadata: item.metadata as Record<string, unknown>,
      }))
      setResults(items)
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleSelect(result: SearchResult) {
    onSelect(result)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border rounded-xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">직접 검색</h3>
          <Button unstyled onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary rounded">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="검색어 입력..."
              className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              autoFocus
            />
            <Button onClick={handleSearch} disabled={searching || !query.trim()} size="sm">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          {searching && (
            <div className="flex items-center justify-center py-8 text-text-secondary">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              검색 중...
            </div>
          )}

          {!searching && searched && results.length === 0 && (
            <div className="text-center py-8 text-text-secondary text-sm">
              검색 결과가 없습니다.
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => (
                <Button
                  unstyled
                  key={`${result.externalSource}-${result.externalId}`}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 p-3 bg-bg-secondary hover:bg-white/5 border border-border rounded-lg text-start"
                >
                  <div className="relative w-10 h-14 bg-bg-card rounded overflow-hidden shrink-0">
                    {result.coverImageUrl && (
                      <Image src={result.coverImageUrl} alt="" fill unoptimized className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{result.title}</p>
                    <p className="text-xs text-text-secondary truncate">{result.creator}</p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
