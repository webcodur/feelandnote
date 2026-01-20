'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Star, Check, X, Loader2, Trash2 } from 'lucide-react'
import { updateCelebTitle, deleteCeleb, type CelebTitleItem } from '@/actions/admin/celebs'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { useToast } from '@/contexts/ToastContext'

interface Props {
  celebs: CelebTitleItem[]
}

export default function CelebTitleEditor({ celebs }: Props) {
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [titles, setTitles] = useState<Record<string, string | null>>(() =>
    celebs.reduce((acc, c) => ({ ...acc, [c.id]: c.title }), {})
  )
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  function startEdit(celeb: CelebTitleItem) {
    setEditingId(celeb.id)
    setEditValue(celeb.title || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveTitle(celebId: string) {
    const newTitle = editValue.trim() || null
    const oldTitle = titles[celebId]

    if (newTitle === oldTitle) {
      cancelEdit()
      return
    }

    setSaving(true)
    try {
      await updateCelebTitle(celebId, newTitle)
      setTitles((prev) => ({ ...prev, [celebId]: newTitle }))
      showToast('success', '수식어가 저장되었습니다.')
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
      saveTitle(celebId)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  async function handleDelete(celebId: string, nickname: string | null) {
    if (!confirm(`"${nickname || '닉네임 없음'}" 셀럽을 삭제하시겠습니까?`)) return

    setDeletingId(celebId)
    try {
      await deleteCeleb(celebId)
      setDeletedIds((prev) => new Set(prev).add(celebId))
      showToast('success', '셀럽이 삭제되었습니다.')
    } catch {
      showToast('error', '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-bg-secondary border-b border-border">
          <tr>
            <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary w-[280px]">셀럽</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary">수식어</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary w-16">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {celebs.filter((c) => !deletedIds.has(c.id)).map((celeb) => {
            const isEditing = editingId === celeb.id
            const currentTitle = titles[celeb.id]
            const isDeleting = deletingId === celeb.id

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
                        onBlur={() => !saving && saveTitle(celeb.id)}
                        placeholder="예: 테슬라 창립자"
                        disabled={saving}
                        className="flex-1 px-3 py-1.5 bg-bg-secondary border border-accent rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none disabled:opacity-50"
                      />
                      {saving ? (
                        <Loader2 className="w-4 h-4 text-accent animate-spin" />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => saveTitle(celeb.id)}
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
                      {currentTitle ? (
                        <span className="text-text-primary">{currentTitle}</span>
                      ) : (
                        <span className="text-text-secondary group-hover:text-text-primary">클릭하여 입력...</span>
                      )}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(celeb.id, celeb.nickname)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
