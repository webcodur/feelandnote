'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Check, X, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { updateCelebPhilosophy, deleteCeleb, type CelebTitleItem } from '@/actions/admin/celebs'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { useToast } from '@/contexts/ToastContext'

interface Props {
  celebs: CelebTitleItem[]
  page: number
  total: number
  limit: number
}

export default function CelebPhilosophyEditor({ celebs, page, total, limit }: Props) {
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  
  // celebs가 바뀌면 state도 업데이트 되어야 함 (페이지 이동 시)
  const [philosophies, setPhilosophies] = useState<Record<string, string | null>>({})
  
  useEffect(() => {
    setPhilosophies(
        celebs.reduce((acc, c) => ({ ...acc, [c.id]: c.consumption_philosophy }), {})
    )
  }, [celebs])

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editingId])

  function startEdit(celeb: CelebTitleItem) {
    setEditingId(celeb.id)
    setEditValue(celeb.consumption_philosophy || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function savePhilosophy(celebId: string) {
    const newPhilosophy = editValue.trim() || null
    const oldPhilosophy = philosophies[celebId]

    if (newPhilosophy === oldPhilosophy) {
      cancelEdit()
      return
    }

    setSaving(true)
    try {
      await updateCelebPhilosophy(celebId, newPhilosophy)
      setPhilosophies((prev) => ({ ...prev, [celebId]: newPhilosophy }))
      showToast('success', '감상 철학이 저장되었습니다.')
      cancelEdit()
    } catch {
      showToast('error', '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, celebId: string) {
    if (e.key === 'Escape') {
      cancelEdit()
    }
    // Ctrl/Cmd + Enter로 저장
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      savePhilosophy(celebId)
      return
    }
  }

  async function handleDelete(celebId: string, nickname: string | null) {
    if (!confirm(`${nickname || '닉네임 없음'} 셀럽을 삭제하시겠습니까?`)) return

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

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary w-[200px]">셀럽</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary">감상 철학</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary w-16">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {celebs.filter((c) => !deletedIds.has(c.id)).map((celeb) => {
              const isEditing = editingId === celeb.id
              const currentPhilosophy = philosophies[celeb.id]
              const isDeleting = deletingId === celeb.id

              return (
                <tr key={celeb.id} className="hover:bg-bg-secondary/50 align-top">
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
                      <div className="space-y-2">
                        <textarea
                          ref={textareaRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, celeb.id)}
                          placeholder="이 셀럽이 콘텐츠를 감상하는 태도와 관점을 서술하세요. (3~4 문단 권장)"
                          disabled={saving}
                          rows={8}
                          maxLength={2000}
                          className="w-full px-3 py-2 bg-bg-secondary border border-accent rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none disabled:opacity-50 resize-y"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-secondary">
                            {editValue.length}/2000자 · Ctrl+Enter로 저장
                          </span>
                          <div className="flex items-center gap-2">
                            {saving ? (
                              <Loader2 className="w-4 h-4 text-accent animate-spin" />
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => savePhilosophy(celeb.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-green-400 hover:bg-green-400/10"
                                >
                                  <Check className="w-4 h-4" />저장
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-400/10"
                                >
                                  <X className="w-4 h-4" />취소
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(celeb)}
                        className="w-full text-start px-3 py-2 rounded-lg text-sm hover:bg-white/5 group"
                      >
                        {currentPhilosophy ? (
                          <span className="text-text-primary whitespace-pre-wrap block">{currentPhilosophy}</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/members/philosophies?page=${page - 1}`}
            className={`p-2 rounded-lg border border-border ${page <= 1 ? 'pointer-events-none opacity-50 bg-bg-secondary' : 'hover:bg-bg-secondary bg-bg-card'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-medium text-text-secondary px-2">
            {page} / {totalPages}
          </span>
          <Link
            href={`/members/philosophies?page=${page + 1}`}
            className={`p-2 rounded-lg border border-border ${page >= totalPages ? 'pointer-events-none opacity-50 bg-bg-secondary' : 'hover:bg-bg-secondary bg-bg-card'}`}
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
