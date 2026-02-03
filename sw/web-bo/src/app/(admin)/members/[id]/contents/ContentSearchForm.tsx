'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface Props {
  celebId: string
  currentSearch?: string
  currentType?: string
}

export default function ContentSearchForm({ celebId, currentSearch, currentType }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(currentSearch || '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('search', query.trim())
    if (currentType) params.set('type', currentType)
    const queryString = params.toString()
    router.push(`/members/${celebId}/contents${queryString ? `?${queryString}` : ''}`)
  }

  function handleClear() {
    setQuery('')
    const params = new URLSearchParams()
    if (currentType) params.set('type', currentType)
    const queryString = params.toString()
    router.push(`/members/${celebId}/contents${queryString ? `?${queryString}` : ''}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목 또는 작가로 검색..."
          className="w-full pl-10 pr-10 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary text-sm focus:border-accent focus:outline-none"
        />
        {query && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover">
        검색
      </button>
    </form>
  )
}
