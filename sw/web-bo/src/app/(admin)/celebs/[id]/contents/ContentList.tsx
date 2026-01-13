'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { deleteCelebContent, updateCelebContent, CelebContent } from '@/actions/admin/celebs'
import { Star, Edit2, Trash2, Loader2, X, Check, BookOpen, Film, Gamepad2, Music, Award } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Props {
  contents: CelebContent[]
  celebId: string
}

const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  BOOK: BookOpen,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  BOOK: '도서',
  VIDEO: '영상',
  GAME: '게임',
  MUSIC: '음악',
  CERTIFICATE: '자격증',
}

const STATUS_OPTIONS = [
  { value: 'WANT', label: '보고 싶음' },
  { value: 'WATCHING', label: '보는 중' },
  { value: 'FINISHED', label: '완료' },
  { value: 'DROPPED', label: '중단' },
]

export default function ContentList({ contents, celebId }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    status: string
    rating: string
    review: string
    source_url: string
  } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  function startEdit(content: CelebContent) {
    setEditingId(content.id)
    setEditForm({
      status: content.status,
      rating: content.rating?.toString() || '',
      review: content.review || '',
      source_url: content.source_url || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function handleSave(contentId: string) {
    if (!editForm) return

    setLoading(contentId)
    try {
      await updateCelebContent({
        id: contentId,
        celeb_id: celebId,
        status: editForm.status,
        rating: editForm.rating ? Number(editForm.rating) : null,
        review: editForm.review || null,
        source_url: editForm.source_url || null,
      })
      setEditingId(null)
      setEditForm(null)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(contentId: string) {
    if (!confirm('정말로 이 콘텐츠를 삭제하시겠습니까?')) return

    setLoading(contentId)
    try {
      await deleteCelebContent(contentId, celebId)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setLoading(null)
    }
  }

  if (contents.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-12 text-center text-text-secondary">
        등록된 콘텐츠가 없습니다.
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
      {contents.map((content) => {
        const Icon = CONTENT_TYPE_ICONS[content.content.type] || Star
        const isEditing = editingId === content.id
        const isLoading = loading === content.id

        return (
          <div key={content.id} className="p-4">
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div className="relative w-16 h-20 bg-bg-secondary rounded overflow-hidden shrink-0 flex items-center justify-center">
                {content.content.thumbnail_url ? (
                  <Image
                    src={content.content.thumbnail_url}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <Icon className="w-6 h-6 text-text-secondary" />
                )}
              </div>

              {/* Content Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-text-primary font-medium truncate">
                      {content.content.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                      {content.content.creator && <span>{content.content.creator}</span>}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        {CONTENT_TYPE_LABELS[content.content.type]}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(content)}
                        className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded"
                        disabled={isLoading}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(content.id)}
                        className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* View Mode */}
                {!isEditing && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-3 text-sm">
                      <StatusBadge status={content.status} />
                      {content.rating && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{content.rating}</span>
                        </div>
                      )}
                    </div>
                    {content.review && (
                      <p className="text-sm text-text-secondary line-clamp-2">{content.review}</p>
                    )}
                    {content.source_url && (
                      <a
                        href={content.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        출처 보기
                      </a>
                    )}
                  </div>
                )}

                {/* Edit Mode */}
                {isEditing && editForm && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="px-3 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={editForm.rating}
                        onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                        placeholder="평점"
                        className="w-20 px-3 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                      />
                    </div>
                    <textarea
                      value={editForm.review}
                      onChange={(e) => setEditForm({ ...editForm, review: e.target.value })}
                      placeholder="리뷰"
                      rows={2}
                      className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
                    />
                    <input
                      type="url"
                      value={editForm.source_url}
                      onChange={(e) => setEditForm({ ...editForm, source_url: e.target.value })}
                      placeholder="출처 URL (선택)"
                      className="w-full px-3 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(content.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        저장
                      </Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={isLoading}>
                        <X className="w-3 h-3" />
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    WANT: { label: '보고 싶음', className: 'bg-yellow-500/10 text-yellow-400' },
    WATCHING: { label: '보는 중', className: 'bg-blue-500/10 text-blue-400' },
    FINISHED: { label: '완료', className: 'bg-green-500/10 text-green-400' },
    DROPPED: { label: '중단', className: 'bg-red-500/10 text-red-400' },
    RECOMMENDED: { label: '추천', className: 'bg-purple-500/10 text-purple-400' },
    NOT_RECOMMENDED: { label: '비추천', className: 'bg-gray-500/10 text-gray-400' },
  }

  const { label, className } = config[status] || { label: status, className: 'bg-gray-500/10 text-gray-400' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
