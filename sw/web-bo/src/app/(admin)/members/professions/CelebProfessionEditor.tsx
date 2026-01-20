'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Star, Check, ChevronDown, Loader2, Trash2, Search, X } from 'lucide-react'
import { updateCelebProfession, deleteCeleb, type CelebTitleItem } from '@/actions/admin/celebs'
import { CELEB_PROFESSIONS, getCelebProfessionLabel } from '@/constants/celebCategories'
import { useToast } from '@/contexts/ToastContext'

interface Props {
  celebs: CelebTitleItem[]
}

export default function CelebProfessionEditor({ celebs }: Props) {
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [professions, setProfessions] = useState<Record<string, string | null>>(() =>
    celebs.reduce((acc, c) => ({ ...acc, [c.id]: c.profession }), {})
  )
  const comboboxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setEditingId(null)
        setSearchValue('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingId])

  function startEdit(celebId: string) {
    setEditingId(celebId)
    setSearchValue('')
  }

  function cancelEdit() {
    setEditingId(null)
    setSearchValue('')
  }

  async function selectProfession(celebId: string, profession: string | null) {
    const oldProfession = professions[celebId]

    if (profession === oldProfession) {
      cancelEdit()
      return
    }

    setSaving(true)
    try {
      await updateCelebProfession(celebId, profession)
      setProfessions((prev) => ({ ...prev, [celebId]: profession }))
      showToast('success', '직군이 저장되었습니다.')
      cancelEdit()
    } catch {
      showToast('error', '저장에 실패했습니다.')
    } finally {
      setSaving(false)
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

  // 검색어로 필터링된 직군 목록
  const filteredProfessions = CELEB_PROFESSIONS.filter((p) =>
    p.label.toLowerCase().includes(searchValue.toLowerCase()) ||
    p.value.toLowerCase().includes(searchValue.toLowerCase())
  )

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-bg-secondary border-b border-border">
          <tr>
            <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary w-[280px]">셀럽</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary">직군</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary w-16">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {celebs.filter((c) => !deletedIds.has(c.id)).map((celeb) => {
            const isEditing = editingId === celeb.id
            const currentProfession = professions[celeb.id]
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
                      <p className="text-xs text-text-secondary truncate">{celeb.title || '수식어 없음'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <div ref={comboboxRef} className="relative">
                      {/* 콤보박스 입력 */}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-accent rounded-lg">
                        <Search className="w-4 h-4 text-text-secondary shrink-0" />
                        <input
                          ref={inputRef}
                          type="text"
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          placeholder="직군 검색..."
                          disabled={saving}
                          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary focus:outline-none disabled:opacity-50"
                        />
                        {saving ? (
                          <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-0.5 rounded text-text-secondary hover:text-text-primary"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* 드롭다운 목록 */}
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {/* 미분류 옵션 */}
                        <button
                          type="button"
                          onClick={() => selectProfession(celeb.id, null)}
                          disabled={saving}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-white/5 disabled:opacity-50"
                        >
                          <span>미분류</span>
                          {currentProfession === null && <Check className="w-4 h-4 text-accent" />}
                        </button>

                        {filteredProfessions.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-text-secondary">검색 결과 없음</p>
                        ) : (
                          filteredProfessions.map((prof) => (
                            <button
                              key={prof.value}
                              type="button"
                              onClick={() => selectProfession(celeb.id, prof.value)}
                              disabled={saving}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-primary hover:bg-white/5 disabled:opacity-50"
                            >
                              <span>{prof.label}</span>
                              {currentProfession === prof.value && <Check className="w-4 h-4 text-accent" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(celeb.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 group"
                    >
                      {currentProfession ? (
                        <span className="text-text-primary">{getCelebProfessionLabel(currentProfession)}</span>
                      ) : (
                        <span className="text-text-secondary group-hover:text-text-primary">클릭하여 선택...</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-text-secondary group-hover:text-text-primary" />
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
