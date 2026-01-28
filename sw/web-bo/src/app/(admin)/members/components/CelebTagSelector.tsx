'use client'

import { useEffect, useState } from 'react'
import { X, Plus, Tag, Edit2, Check } from 'lucide-react'
import { getTags, type CelebTag, type CelebTagInput } from '@/actions/admin/tags'

interface Props {
  selectedTags: CelebTagInput[]
  onTagsChange: (tags: CelebTagInput[]) => void
}

export default function CelebTagSelector({ selectedTags, onTagsChange }: Props) {
  const [allTags, setAllTags] = useState<CelebTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingShortDesc, setEditingShortDesc] = useState('')
  const [editingLongDesc, setEditingLongDesc] = useState('')

  useEffect(() => {
    getTags().then(({ tags }) => {
      setAllTags(tags)
      setIsLoading(false)
    })
  }, [])

  const selectedTagIds = selectedTags.map(t => t.tagId)
  const selectedTagsWithInfo = selectedTags.map(t => ({
    ...t,
    tag: allTags.find(at => at.id === t.tagId),
  }))
  const availableTags = allTags.filter(t => !selectedTagIds.includes(t.id))

  const handleAdd = (tagId: string) => {
    onTagsChange([...selectedTags, { tagId, short_desc: null, long_desc: null }])
    setIsDropdownOpen(false)
  }

  const handleRemove = (tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.tagId !== tagId))
  }

  const handleStartEditDesc = (tagId: string, short_desc: string | null, long_desc: string | null) => {
    setEditingTagId(tagId)
    setEditingShortDesc(short_desc ?? '')
    setEditingLongDesc(long_desc ?? '')
  }

  const handleSaveDesc = () => {
    if (!editingTagId) return
    onTagsChange(
      selectedTags.map(t =>
        t.tagId === editingTagId
          ? { ...t, short_desc: editingShortDesc.trim() || null, long_desc: editingLongDesc.trim() || null }
          : t
      )
    )
    setEditingTagId(null)
    setEditingShortDesc('')
    setEditingLongDesc('')
  }

  const handleCancelEditDesc = () => {
    setEditingTagId(null)
    setEditingShortDesc('')
    setEditingLongDesc('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Tag className="w-4 h-4 animate-pulse" />
        태그 로딩 중...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 선택된 태그 */}
      <div className="space-y-2 min-h-[32px]">
        {selectedTagsWithInfo.length === 0 && (
          <span className="text-sm text-text-tertiary">선택된 태그 없음</span>
        )}
        {selectedTagsWithInfo.map(({ tagId, short_desc, long_desc, tag }) => {
          if (!tag) return null
          const isEditing = editingTagId === tagId

          return (
            <div
              key={tagId}
              className="flex items-start gap-2 p-2 rounded-lg bg-bg-secondary/50 border border-border/50"
            >
              {/* 태그 뱃지 */}
              <span
                className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>

              {/* 부여 사유 */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingShortDesc}
                      onChange={(e) => setEditingShortDesc(e.target.value)}
                      placeholder="짧은 문구 (예: 맨손으로 테슬라 창업)"
                      className="w-full px-2 py-1 text-sm bg-bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') handleCancelEditDesc()
                      }}
                    />
                    <textarea
                      value={editingLongDesc}
                      onChange={(e) => setEditingLongDesc(e.target.value)}
                      placeholder="상세 설명 (선택)"
                      rows={2}
                      className="w-full px-2 py-1 text-sm bg-bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') handleCancelEditDesc()
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDesc}
                        className="px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditDesc}
                        className="px-2 py-1 text-xs text-text-secondary hover:bg-bg-secondary rounded"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {short_desc && (
                        <p className="text-xs text-accent font-medium truncate">{short_desc}</p>
                      )}
                      {long_desc && (
                        <p className="text-xs text-text-secondary truncate">{long_desc}</p>
                      )}
                      {!short_desc && !long_desc && (
                        <span className="text-xs text-text-tertiary">(설명 없음)</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartEditDesc(tagId, short_desc ?? null, long_desc ?? null)}
                      className="shrink-0 p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 삭제 버튼 */}
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => handleRemove(tagId)}
                  className="shrink-0 p-1 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 태그 추가 드롭다운 */}
      {availableTags.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-bg-secondary border border-border rounded-lg hover:bg-bg-tertiary"
          >
            <Plus className="w-4 h-4" />
            태그 추가
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-20 w-64 max-h-64 overflow-y-auto bg-bg-card border border-border rounded-xl shadow-xl">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAdd(tag.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-secondary"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm text-text-primary">{tag.name}</span>
                    {tag.celeb_count !== undefined && (
                      <span className="ml-auto text-xs text-text-tertiary">
                        {tag.celeb_count}명
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {allTags.length === 0 && (
        <p className="text-sm text-text-tertiary">
          등록된 태그가 없다.{' '}
          <a href="/members/tags" className="text-accent hover:underline">
            태그 관리
          </a>
          에서 태그를 추가하자.
        </p>
      )}
    </div>
  )
}
