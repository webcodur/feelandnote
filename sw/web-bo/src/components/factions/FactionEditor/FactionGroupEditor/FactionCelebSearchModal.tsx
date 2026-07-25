'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// 셀럽 검색 결과 — /api/celebs/search 응답 형태
export type CelebResult = {
  id: string
  slug: string
  nickname: string
  nickname_en: string
  title: string | null
  profession: string | null
  nationality: string | null
  avatar_url: string | null
  celeb_tier: string | null
  voice_id_ko: string | null
  existingEpisode: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (celeb: CelebResult) => void
}

export function FactionCelebSearchModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CelebResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      params.set('limit', '100')
      params.set('includeFiction', '1')
      const res = await fetch(`/api/celebs/search?${params}`)
      const data = await res.json()
      // 이 앱의 검색 창구는 { celebs: [...] } 로 돌려준다(옛 대시보드는 배열이었다)
      setResults(Array.isArray(data?.celebs) ? data.celebs : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 입력 디바운스 검색
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => search(query), 300)
    return () => clearTimeout(id)
  }, [open, query, search])

  // 열릴 때 입력창 포커스
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-border bg-bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border p-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="인물 이름 검색..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 rounded-md border border-border bg-bg-main px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && <p className="p-4 text-sm text-text-dim">검색 중...</p>}
          {!loading && results.length === 0 && (
            <p className="p-4 text-sm text-text-dim">검색 결과가 없습니다.</p>
          )}
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); onClose() }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-start hover:bg-bg-hover"
            >
              {c.avatar_url ? (
                <img src={c.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-sm font-bold text-text-secondary">
                  {c.nickname?.[0] ?? '?'}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold text-text-primary">{c.nickname}</span>
                  {c.existingEpisode && (
                    <span className="shrink-0 rounded bg-info/15 px-1.5 py-px text-[11px] text-info-text">등록됨</span>
                  )}
                </span>
                <span className="block truncate text-xs text-text-secondary">
                  {c.title || c.profession || '–'}
                  {c.nationality ? ` · ${c.nationality}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
