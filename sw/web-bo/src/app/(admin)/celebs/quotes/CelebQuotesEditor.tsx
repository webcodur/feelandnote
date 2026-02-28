'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Star, Check, X, Loader2, Search } from 'lucide-react'
import { updateCelebQuotes, type CelebQuotesItem } from '@/actions/admin/celebs'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { useToast } from '@/contexts/ToastContext'

interface Props {
  celebs: CelebQuotesItem[]
}

export default function CelebQuotesEditor({ celebs }: Props) {
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'empty' | 'filled'>('all')
  const [quotes, setQuotes] = useState<Record<string, string | null>>(() =>
    celebs.reduce((acc, c) => ({ ...acc, [c.id]: c.quotes }), {})
  )
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  function startEdit(celeb: CelebQuotesItem) {
    setEditingId(celeb.id)
    setEditValue(quotes[celeb.id] || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveQuotes(celebId: string) {
    const newQuotes = editValue.trim() || null
    const oldQuotes = quotes[celebId]

    if (newQuotes === oldQuotes) {
      cancelEdit()
      return
    }

    setSaving(true)
    try {
      await updateCelebQuotes(celebId, newQuotes)
      setQuotes((prev) => ({ ...prev, [celebId]: newQuotes }))
      showToast('success', '명언이 저장되었습니다.')
      cancelEdit()
    } catch {
      showToast('error', '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, celebId: string) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveQuotes(celebId)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const filtered = celebs.filter((c) => {
    const q = quotes[c.id]
    if (filter === 'empty' && q) return false
    if (filter === 'filled' && !q) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        c.nickname?.toLowerCase().includes(s) ||
        q?.toLowerCase().includes(s)
      )
    }
    return true
  })

  const emptyCount = celebs.filter((c) => !quotes[c.id]).length
  const filledCount = celebs.length - emptyCount

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 명언 검색..."
            className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm ${filter === 'all' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
          >
            전체 ({celebs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('filled')}
            className={`px-3 py-2 rounded-lg text-sm ${filter === 'filled' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
          >
            있음 ({filledCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('empty')}
            className={`px-3 py-2 rounded-lg text-sm ${filter === 'empty' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
          >
            없음 ({emptyCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary w-[240px]">셀럽</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary">명언</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((celeb) => {
              const isEditing = editingId === celeb.id
              const currentQuotes = quotes[celeb.id]

              return (
                <tr key={celeb.id} className="hover:bg-bg-secondary/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0">
                        {celeb.avatar_url
                          ? <Image src={celeb.avatar_url} alt="" fill unoptimized className="object-cover" />
                          : <Star className="w-4 h-4 text-yellow-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{celeb.nickname || '닉네임 없음'}</p>
                        <p className="text-xs text-text-secondary">{getCelebProfessionLabel(celeb.profession)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, celeb.id)}
                          onBlur={() => !saving && saveQuotes(celeb.id)}
                          placeholder="명언을 입력하세요 (50자 이내)"
                          maxLength={50}
                          disabled={saving}
                          className="flex-1 px-3 py-1.5 bg-bg-secondary border border-accent rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none disabled:opacity-50"
                        />
                        {saving ? (
                          <Loader2 className="w-4 h-4 text-accent animate-spin" />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => saveQuotes(celeb.id)}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(celeb)}
                        className="w-full text-start px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 group"
                      >
                        {currentQuotes ? (
                          <span className="text-text-primary">{currentQuotes}</span>
                        ) : (
                          <span className="text-text-secondary group-hover:text-text-primary">클릭하여 입력...</span>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-12 text-center text-sm text-text-secondary">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-secondary text-center">
        검색 결과: {filtered.length}명
      </p>
    </div>
  )
}
