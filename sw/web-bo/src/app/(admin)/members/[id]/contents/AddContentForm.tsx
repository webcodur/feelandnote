'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { addCelebContent } from '@/actions/admin/celebs'
import { createContentFromExternal } from '@/actions/admin/external-search'
import { Plus, Loader2, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import ContentSelector, { type SelectedContent } from '@/components/content/ContentSelector'
import { STATUS_OPTIONS } from '@/constants/statuses'
import type { ContentType } from '@feelandnote/content-search/types'

interface Props {
  celebId: string
}

export default function AddContentForm({ celebId }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null)
  const [contentType, setContentType] = useState<ContentType>('BOOK')
  const [form, setForm] = useState({ status: 'FINISHED', rating: '', review: '', source_url: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedContent) {
      setError('콘텐츠를 선택해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let contentId: string
      if (selectedContent.source === 'db') {
        contentId = selectedContent.data.id
      } else {
        const extData = selectedContent.data
        const createResult = await createContentFromExternal(
          {
            externalId: extData.externalId,
            externalSource: extData.externalSource,
            title: extData.title,
            creator: extData.creator,
            coverImageUrl: extData.coverImageUrl,
            metadata: extData.metadata as Record<string, unknown>,
          },
          contentType
        )
        if (!createResult.success) throw new Error(createResult.error || '콘텐츠 생성에 실패했습니다.')
        contentId = createResult.contentId!
      }

      await addCelebContent({
        celeb_id: celebId,
        content_id: contentId,
        status: form.status,
        rating: form.rating ? Number(form.rating) : undefined,
        review: form.review || undefined,
        source_url: form.source_url || undefined,
      })
      handleClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleContentSelect(content: SelectedContent) {
    setSelectedContent(content)
    // 선택된 콘텐츠의 타입 저장 (외부 검색 시 필요)
    if (content.source === 'db') {
      setContentType(content.data.type as ContentType)
    }
  }

  function handleClose() {
    setIsOpen(false)
    setSelectedContent(null)
    setError(null)
    setForm({ status: 'FINISHED', rating: '', review: '', source_url: '' })
  }

  const thumbnailUrl = selectedContent?.source === 'db' ? selectedContent.data.thumbnail_url : selectedContent?.data.coverImageUrl

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4" />
        콘텐츠 추가
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">콘텐츠 추가</h2>
              <button onClick={handleClose} className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

              {!selectedContent ? (
                <ContentSelector onSelect={handleContentSelect} initialType={contentType} />
              ) : (
                <div className="space-y-4">
                  {/* 선택된 콘텐츠 표시 */}
                  <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
                    <div className="relative w-10 h-12 bg-bg-card rounded overflow-hidden shrink-0">
                      {thumbnailUrl && <Image src={thumbnailUrl} alt="" fill unoptimized className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{selectedContent.data.title}</p>
                      <p className="text-xs text-text-secondary">{selectedContent.data.creator}</p>
                    </div>
                    {selectedContent.source === 'external' && <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded shrink-0">새로 등록</span>}
                    <button type="button" onClick={() => setSelectedContent(null)} className="p-1 text-text-secondary hover:text-text-primary shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">상태</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">
                      평점 <span className="text-text-secondary/60">(선택)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.5"
                      value={form.rating}
                      onChange={(e) => setForm({ ...form, rating: e.target.value })}
                      placeholder="입력 안 함"
                      className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">
                      리뷰 <span className="text-text-secondary/60">(선택)</span>
                    </label>
                    <textarea
                      value={form.review}
                      onChange={(e) => setForm({ ...form, review: e.target.value })}
                      placeholder="리뷰 내용"
                      rows={3}
                      className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">
                      출처 URL <span className="text-text-secondary/60">(선택)</span>
                    </label>
                    <input
                      type="url"
                      value={form.source_url}
                      onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                      placeholder="https://example.com/interview"
                      className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={handleClose}>
                취소
              </Button>
              <Button type="submit" disabled={loading || !selectedContent} onClick={handleSubmit}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    추가 중...
                  </>
                ) : (
                  '추가'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
