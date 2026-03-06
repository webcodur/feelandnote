'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import Button from '@/components/ui/Button'

interface CelebFilterProps {
  defaultValues: {
    search: string
    status: string
    profession: string
    tier: string
  }
}

interface CelebSuggestion {
  slug: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
}

export default function CelebFilter({ defaultValues }: CelebFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { search, status, profession, tier } = defaultValues

  const [query, setQuery] = useState(search)
  const [suggestions, setSuggestions] = useState<CelebSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    try {
      const res = await fetch(`/api/celebs/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      const celebs: CelebSuggestion[] = data.celebs || []
      setSuggestions(celebs)
      setSelectedIndex(-1)

      if (celebs.length === 1) {
        router.push(`/celebs/${celebs[0].slug}`)
        setShowDropdown(false)
        return
      }
      setShowDropdown(celebs.length > 0)
    } catch {
      setSuggestions([])
      setShowDropdown(false)
    }
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(val), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      router.push(`/celebs/${suggestions[selectedIndex].slug}`)
      setShowDropdown(false)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleSelect = (slug: string) => {
    router.push(`/celebs/${slug}`)
    setShowDropdown(false)
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 md:p-4">
      <form action="/celebs" className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
        <div className="flex-1 min-w-0 sm:min-w-[200px]" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              ref={inputRef}
              type="text"
              name="search"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 1 && setShowDropdown(true)}
              placeholder="셀럽 이름 검색..."
              autoComplete="off"
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            />

            {/* Suggestions dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {suggestions.map((celeb, i) => (
                  <button
                    key={celeb.slug}
                    type="button"
                    onClick={() => handleSelect(celeb.slug)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bg-secondary transition-colors ${
                      i === selectedIndex ? 'bg-bg-secondary' : ''
                    }`}
                  >
                    {celeb.avatar_url ? (
                      <img
                        src={celeb.avatar_url}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-bg-tertiary flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-text-primary truncate">{celeb.nickname}</p>
                      {celeb.nickname_en && (
                        <p className="text-xs text-text-tertiary truncate">{celeb.nickname_en}</p>
                      )}
                    </div>
                    {celeb.profession && (
                      <span className="ml-auto text-xs text-text-secondary flex-shrink-0">
                        {celeb.profession}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:flex gap-2 md:gap-3">
          <select
            name="status"
            defaultValue={status}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">미검수</option>
            <option value="suspended">정지</option>
          </select>

          <select
            name="profession"
            defaultValue={profession}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 직군</option>
            {CELEB_PROFESSIONS.map((prof) => (
              <option key={prof.value} value={prof.value}>
                {prof.label}
              </option>
            ))}
          </select>

          <select
            name="tier"
            defaultValue={tier}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 티어</option>
            <option value="full">full</option>
            <option value="light">light</option>
          </select>
        </div>

        <Button type="submit" size="sm" className="w-full sm:w-auto">
          검색
        </Button>
      </form>
    </div>
  )
}
