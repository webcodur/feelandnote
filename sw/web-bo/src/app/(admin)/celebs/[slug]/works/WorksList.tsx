'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, ExternalLink, Save, X } from 'lucide-react'
import { updateCelebWork, deleteCelebWork, type CelebWorkRow } from '@/actions/admin/celebs'

const ROLE_LABELS: Record<string, string> = {
  author: '저자',
  director: '감독',
  composer: '작곡',
  artist: '작가',
  editor: '편저',
  screenwriter: '각본',
  developer: '개발',
  performer: '연주',
}

const TYPE_LABELS: Record<string, string> = {
  BOOK: '도서',
  VIDEO: '영상',
  MUSIC: '음악',
  GAME: '게임',
  ART: '미술',
}

interface WorksListProps {
  works: CelebWorkRow[]
  celebId: string
}

export default function WorksList({ works, celebId }: WorksListProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<CelebWorkRow>>({})
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const startEdit = (work: CelebWorkRow) => {
    setEditingId(work.id)
    setEditData({ ...work })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const saveEdit = async () => {
    if (!editingId) return
    const result = await updateCelebWork({
      id: editingId,
      title: editData.title,
      titleEn: editData.title_en,
      role: editData.role,
      description: editData.description,
      descriptionEn: editData.description_en,
      workType: editData.work_type,
      releaseYear: editData.release_year,
      searchKeyword: editData.search_keyword,
    })
    if (result.success) {
      setEditingId(null)
      router.refresh()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 창작물을 삭제하시겠습니까?')) return
    setIsDeleting(id)
    await deleteCelebWork(id)
    setIsDeleting(null)
    router.refresh()
  }

  if (works.length === 0) {
    return <p className="text-text-tertiary text-center py-8">등록된 창작물이 없습니다.</p>
  }

  return (
    <div className="space-y-2">
      {works.map((work) => {
        const isEditing = editingId === work.id

        if (isEditing) {
          return (
            <div key={work.id} className="bg-bg-card border border-accent/30 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
                  placeholder="제목"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
                <input
                  className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
                  placeholder="영문 제목"
                  value={editData.title_en || ''}
                  onChange={(e) => setEditData({ ...editData, title_en: e.target.value })}
                />
                <select
                  className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
                  value={editData.role || 'author'}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                >
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
                  value={editData.work_type || 'BOOK'}
                  onChange={(e) => setEditData({ ...editData, work_type: e.target.value })}
                >
                  {Object.entries(TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <input
                  className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
                  placeholder="발표 연도"
                  type="number"
                  value={editData.release_year ?? ''}
                  onChange={(e) => setEditData({ ...editData, release_year: e.target.value ? Number(e.target.value) : null })}
                />
                <input
                  className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
                  placeholder="검색 키워드"
                  value={editData.search_keyword || ''}
                  onChange={(e) => setEditData({ ...editData, search_keyword: e.target.value })}
                />
              </div>
              <textarea
                className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary resize-none"
                rows={3}
                placeholder="창작 배경 (한국어)"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
              <textarea
                className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary resize-none"
                rows={3}
                placeholder="창작 배경 (영문)"
                value={editData.description_en || ''}
                onChange={(e) => setEditData({ ...editData, description_en: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary flex items-center gap-1">
                  <X className="w-4 h-4" /> 취소
                </button>
                <button onClick={saveEdit} className="px-3 py-1.5 text-sm bg-accent text-white rounded flex items-center gap-1 hover:bg-accent/80">
                  <Save className="w-4 h-4" /> 저장
                </button>
              </div>
            </div>
          )
        }

        const yearStr = work.release_year
          ? work.release_year < 0 ? `BC ${Math.abs(work.release_year)}` : `${work.release_year}`
          : null

        return (
          <div key={work.id} className="bg-bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">
                  {ROLE_LABELS[work.role] || work.role}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg-secondary text-text-tertiary">
                  {TYPE_LABELS[work.work_type] || work.work_type}
                </span>
                {yearStr && <span className="text-[10px] font-mono text-text-tertiary">{yearStr}</span>}
                {work.content_id && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400">
                    연결됨
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-text-primary">{work.title}</p>
              {work.title_en && <p className="text-xs text-text-tertiary">{work.title_en}</p>}
              {work.description && (
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">{work.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => startEdit(work)}
                className="p-1.5 text-text-tertiary hover:text-accent rounded"
                title="편집"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(work.id)}
                disabled={isDeleting === work.id}
                className="p-1.5 text-text-tertiary hover:text-red-400 rounded disabled:opacity-50"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
