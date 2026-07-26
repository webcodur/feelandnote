'use client'

/**
 * 새 영상 편 만들기 — 폴더명과 제목만 받는다.
 *
 * 폴더명은 사진·음원 경로에 그대로 쓰이는 고유키라 나중에 바꾸면 그 폴더들도 함께 옮겨진다.
 * 세력·인물·대사는 만든 뒤 편집기에서 채운다.
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import { createFactionEpisode } from '@/actions/admin/factions/episodes'

export default function EpisodeFormModal({
  onClose,
}: {
  /** 만들어졌으면 새 폴더명을 준다 */
  onClose: (createdFolder?: string) => void
}) {
  const [folder, setFolder] = useState('')
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folder.trim()) {
      setError('폴더명을 입력해야 합니다.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const r = await createFactionEpisode(folder, title)
      onClose(r.folder)
    } catch (err) {
      setError(err instanceof Error ? err.message : '만들기에 실패했습니다.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-bg-card">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-text-primary">새 영상 편</h2>
          <button
            onClick={() => onClose()}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              폴더명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={folder}
              onChange={e => setFolder(e.target.value)}
              placeholder="예: llm-wars"
              autoFocus
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              사진·음원 경로에 그대로 쓰입니다. 영문·숫자·하이픈만 쓰고, 영문이나 숫자로 시작해야 합니다.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">영상 제목 (선택)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="비우면 폴더명을 그대로 씁니다"
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose()}
              className="flex-1 rounded-lg bg-bg-secondary px-4 py-2 text-text-primary hover:bg-bg-tertiary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {isSubmitting ? '만드는 중...' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
