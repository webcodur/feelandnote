'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { type CelebTag, createTag, updateTag } from '@/actions/admin/tags'

interface Props {
  tag: CelebTag | null
  onClose: (updatedTag?: CelebTag) => void
}

const PRESET_COLORS = [
  '#7c4dff', // accent (기본)
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
]

export default function TagFormModal({ tag, onClose }: Props) {
  const isEdit = !!tag

  const [name, setName] = useState(tag?.name ?? '')
  const [description, setDescription] = useState(tag?.description ?? '')
  const [color, setColor] = useState(tag?.color ?? '#7c4dff')
  const [isFeatured, setIsFeatured] = useState(tag?.is_featured ?? false)
  const [startDate, setStartDate] = useState(tag?.start_date ?? '')
  const [endDate, setEndDate] = useState(tag?.end_date ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('태그 이름을 입력해야 한다.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const tagData = {
      name,
      description,
      color,
      is_featured: isFeatured,
      start_date: startDate || null,
      end_date: endDate || null,
    }

    if (isEdit && tag) {
      const result = await updateTag({ id: tag.id, ...tagData })

      if (result.success) {
        onClose({
          ...tag,
          ...tagData,
          updated_at: new Date().toISOString(),
        })
      } else {
        setError(result.error ?? '수정 실패')
        setIsSubmitting(false)
      }
    } else {
      const result = await createTag(tagData)

      if ('id' in result) {
        onClose({
          id: result.id,
          ...tagData,
          sort_order: 999,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          celeb_count: 0,
        })
      } else {
        setError(result.error)
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEdit ? '태그 수정' : '태그 생성'}
          </h2>
          <button
            onClick={() => onClose()}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              태그 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 자수성가, 혁신가"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              설명 (선택)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="태그에 대한 간단한 설명"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* 색상 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              색상
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer"
              />
            </div>
          </div>

          {/* 기획전 설정 */}
          <div className="border border-border rounded-lg p-3 space-y-3 bg-bg-secondary/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-text-primary">메인 기획전 노출</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-bg-tertiary rounded-full peer peer-checked:bg-accent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>

            {isFeatured && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">
                    시작일 (선택)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">
                    종료일 (선택)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
                <p className="col-span-2 text-xs text-text-tertiary">
                  비워두면 항상 노출됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 미리보기 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              미리보기
            </label>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${color}20`, color: color }}
            >
              {name || '태그 이름'}
            </span>
            {isFeatured && (
              <span className="ml-2 text-xs text-accent">⭐ 기획전 노출</span>
            )}
          </div>

          {/* 에러 */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose()}
              className="flex-1 px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-tertiary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : isEdit ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
