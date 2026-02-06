'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { deleteCelebContent, updateCelebContent, CelebContent } from '@/actions/admin/celebs'
import { createContentFromExternal } from '@/actions/admin/external-search'
import { Star, Edit2, Trash2, Loader2, X, Check, RefreshCw, Hash, Database, Link2, Copy } from 'lucide-react'
import Button from '@/components/ui/Button'
import ContentSelector, { type SelectedContent } from '@/components/content/ContentSelector'
import { CONTENT_TYPE_CONFIG, CONTENT_TYPES, type ContentType } from '@/constants/contentTypes'
import { STATUS_OPTIONS } from '@/constants/statuses'

interface Props {
  contents: CelebContent[]
  celebId: string
}

interface EditFormState {
  status: string
  rating: string
  review: string
  source_url: string
  content_type: string
  content_title: string
  content_creator: string
}

export default function ContentList({ contents, celebId }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [showContentSelector, setShowContentSelector] = useState(false)
  const [replacementContent, setReplacementContent] = useState<SelectedContent | null>(null)
  const [currentContentDbId, setCurrentContentDbId] = useState<string | null>(null)

  function startEdit(content: CelebContent) {
    setEditingId(content.id)
    setCurrentContentDbId(content.content.id)
    setEditForm({
      status: content.status,
      rating: content.rating?.toString() || '',
      review: content.review || '',
      source_url: content.source_url || '',
      content_type: content.content.type,
      content_title: content.content.title,
      content_creator: content.content.creator || '',
    })
    setReplacementContent(null)
    setShowContentSelector(false)
  }

  function handleContentSelect(content: SelectedContent) {
    setReplacementContent(content)
    setShowContentSelector(false)
    // 선택된 콘텐츠 정보로 폼 업데이트
    if (editForm) {
      if (content.source === 'db') {
        setEditForm({
          ...editForm,
          content_type: content.data.type,
          content_title: content.data.title,
          content_creator: content.data.creator || '',
        })
      } else {
        // 외부 검색 결과는 타입을 유지
        setEditForm({
          ...editForm,
          content_title: content.data.title,
          content_creator: content.data.creator || '',
        })
      }
    }
  }

  async function handleSave(userContentId: string) {
    if (!editForm) return
    setLoading(userContentId)

    try {
      let finalContentId = currentContentDbId!

      // 콘텐츠 교체가 있는 경우
      if (replacementContent) {
        if (replacementContent.source === 'db') {
          finalContentId = replacementContent.data.id
        } else {
          // 외부 검색 결과를 DB에 등록
          const extData = replacementContent.data
          const createResult = await createContentFromExternal(
            {
              externalId: extData.externalId,
              externalSource: extData.externalSource,
              title: extData.title,
              creator: extData.creator,
              coverImageUrl: extData.coverImageUrl,
              metadata: extData.metadata as Record<string, unknown>,
            },
            editForm.content_type as ContentType
          )
          if (!createResult.success) throw new Error(createResult.error || '콘텐츠 생성에 실패했습니다.')
          finalContentId = createResult.contentId!
        }
      }

      await updateCelebContent({
        id: userContentId,
        celeb_id: celebId,
        status: editForm.status,
        rating: editForm.rating ? Number(editForm.rating) : null,
        review: editForm.review || null,
        source_url: editForm.source_url || null,
        content_id: finalContentId,
        content_type: editForm.content_type,
        content_title: editForm.content_title,
        content_creator: editForm.content_creator || null,
        // 콘텐츠 교체 시 새 content_id로 user_contents 업데이트
        new_content_id: replacementContent ? finalContentId : undefined,
      })

      cancelEdit()
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setLoading(null)
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
    setReplacementContent(null)
    setShowContentSelector(false)
    setCurrentContentDbId(null)
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
    return <div className="bg-bg-card border border-border rounded-lg p-12 text-center text-text-secondary">등록된 콘텐츠가 없습니다.</div>
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
      {contents.map((content) => {
        const typeConfig = CONTENT_TYPE_CONFIG[content.content.type as ContentType]
        const Icon = typeConfig?.icon || Star
        const isEditing = editingId === content.id
        const isLoading = loading === content.id

        // 수정 모드에서 표시할 콘텐츠 정보 (교체된 경우 새 콘텐츠)
        const displayContent = isEditing && replacementContent
          ? {
              title: replacementContent.data.title,
              creator: replacementContent.data.creator,
              thumbnail_url: replacementContent.source === 'db' ? replacementContent.data.thumbnail_url : replacementContent.data.coverImageUrl,
              type: replacementContent.source === 'db' ? replacementContent.data.type : editForm?.content_type,
              isNew: replacementContent.source === 'external',
            }
          : {
              title: content.content.title,
              creator: content.content.creator,
              thumbnail_url: content.content.thumbnail_url,
              type: content.content.type,
              isNew: false,
            }

        const displayTypeConfig = CONTENT_TYPE_CONFIG[displayContent.type as ContentType]
        const DisplayIcon = displayTypeConfig?.icon || Star

        return (
          <div key={content.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="relative w-32 h-40 bg-bg-secondary rounded overflow-hidden shrink-0 flex items-center justify-center">
                {displayContent.thumbnail_url ? (
                  <Image src={displayContent.thumbnail_url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <DisplayIcon className="w-10 h-10 text-text-secondary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-text-primary font-medium truncate">{displayContent.title}</h3>
                      {displayContent.isNew && <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">새 콘텐츠</span>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                      {displayContent.creator && <span>{displayContent.creator}</span>}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <DisplayIcon className="w-3 h-3" />
                        {displayTypeConfig?.label || displayContent.type}
                      </span>
                    </div>
                    {/* 콘텐츠 메타 정보 */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                      <button
                        onClick={() => navigator.clipboard.writeText(content.content.id)}
                        className="inline-flex items-center gap-1 text-text-secondary/70 hover:text-accent font-mono group"
                        title="ID 복사"
                      >
                        <Hash className="w-3 h-3" />
                        <span className="max-w-[120px] truncate">{content.content.id}</span>
                        <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                      </button>
                      {content.content.external_source && (
                        <span className="inline-flex items-center gap-1 text-text-secondary/50">
                          <Database className="w-3 h-3" />
                          {content.content.external_source}
                        </span>
                      )}
                      {content.content.thumbnail_url && (
                        <button
                          onClick={() => navigator.clipboard.writeText(content.content.thumbnail_url || '')}
                          className="inline-flex items-center gap-1 text-text-secondary/70 hover:text-accent group"
                          title="이미지 URL 복사"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>이미지 URL</span>
                          <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEdit(content)} className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded" disabled={isLoading}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(content.id)} className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

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
                    {content.review && <p className="text-sm text-text-secondary whitespace-pre-line">{content.review}</p>}
                    <div className="text-xs">
                      <span className="text-text-secondary">출처: </span>
                      {content.source_url ? (
                        <a href={content.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">
                          {content.source_url}
                        </a>
                      ) : (
                        <span className="text-text-secondary/50">없음</span>
                      )}
                    </div>
                  </div>
                )}

                {isEditing && editForm && (
                  <div className="mt-3 space-y-3">
                    {/* 콘텐츠 교체 버튼 */}
                    {!showContentSelector && (
                      <button
                        type="button"
                        onClick={() => setShowContentSelector(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-accent"
                      >
                        <RefreshCw className="w-4 h-4" />
                        다른 콘텐츠로 교체
                      </button>
                    )}

                    {/* 콘텐츠 검색 UI */}
                    {showContentSelector && (
                      <div className="p-3 bg-bg-secondary/50 border border-border/50 rounded-lg">
                        <ContentSelector
                          onSelect={handleContentSelect}
                          onCancel={() => setShowContentSelector(false)}
                          initialType={editForm.content_type as ContentType}
                          showTypeSelector={true}
                        />
                      </div>
                    )}

                    {/* 콘텐츠 정보 수정 (교체하지 않은 경우만 수동 편집 가능) */}
                    {!showContentSelector && !replacementContent && (
                      <div className="p-3 bg-bg-secondary/50 border border-border/50 rounded-lg space-y-2">
                        <p className="text-xs text-text-secondary font-medium">콘텐츠 정보 직접 수정</p>
                        <div className="flex items-center gap-2">
                          <select
                            value={editForm.content_type}
                            onChange={(e) => setEditForm({ ...editForm, content_type: e.target.value })}
                            className="px-3 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                          >
                            {CONTENT_TYPES.map((type) => {
                              const config = CONTENT_TYPE_CONFIG[type]
                              return (
                                <option key={type} value={type}>
                                  {config.label}
                                </option>
                              )
                            })}
                          </select>
                          <input
                            type="text"
                            value={editForm.content_title}
                            onChange={(e) => setEditForm({ ...editForm, content_title: e.target.value })}
                            placeholder="제목"
                            className="flex-1 px-3 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          value={editForm.content_creator}
                          onChange={(e) => setEditForm({ ...editForm, content_creator: e.target.value })}
                          placeholder="작성자/감독/아티스트 (선택)"
                          className="w-full px-3 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                        />
                      </div>
                    )}

                    {/* 기록 정보 수정 (user_contents 테이블) */}
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
                      <Button size="sm" onClick={() => handleSave(content.id)} disabled={isLoading}>
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
  const statusConfig = STATUS_OPTIONS.find((opt) => opt.value === status)
  const label = statusConfig?.label || status
  const color = statusConfig?.color || 'text-gray-400'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/5 ${color}`}>{label}</span>
}
