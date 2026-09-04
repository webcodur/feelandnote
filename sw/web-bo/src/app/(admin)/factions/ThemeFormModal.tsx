'use client'

/**
 * 새 웹 전용 테마 만들기 — 이름·설명·색·주소·노출만 받는다.
 *
 * 영상 편 없이 글만으로 테마를 세우는 창구다. 인물 명단과 사진은 만든 뒤
 * 그 테마의 화면(`/factions/<테마>`)에서 채운다(여기서 다 받으면 화면이 두 벌이 된다).
 */

import { useState } from 'react'
import { X, Sparkles, BookOpenText } from 'lucide-react'
import { type CelebTag, createTag } from '@/actions/admin/tags'

interface Props {
  /** 지금은 만들기 전용이라 항상 null 이다 — 수정은 테마 화면(통합 편집 진입점)이 맡는다 */
  tag: CelebTag | null
  onClose: (newTag?: CelebTag) => void
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

export default function ThemeFormModal({ tag, onClose }: Props) {
  const [name, setName] = useState(tag?.name ?? '')
  const [nameEn, setNameEn] = useState(tag?.name_en ?? '')
  const [description, setDescription] = useState(tag?.description ?? '')
  const [descriptionEn, setDescriptionEn] = useState(tag?.description_en ?? '')
  const [color, setColor] = useState(tag?.color ?? '#7c4dff')
  const [slug, setSlug] = useState(tag?.slug ?? '')
  const [isFeatured, setIsFeatured] = useState(tag?.is_featured ?? false)
  const [atlasPublished, setAtlasPublished] = useState(tag?.atlas_published ?? false)
  const [startDate, setStartDate] = useState(tag?.start_date ?? '')
  const [endDate, setEndDate] = useState(tag?.end_date ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('테마 이름을 입력해야 합니다.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const tagData = {
      name,
      name_en: nameEn || null,
      description,
      description_en: descriptionEn || null,
      color,
      slug: slug.trim() || null,
      is_featured: isFeatured,
      atlas_published: atlasPublished,
      start_date: startDate || null,
      end_date: endDate || null,
    }

    const result = await createTag(tagData)

    if ('id' in result) {
      onClose({
        id: result.id,
        ...tagData,
        team_images: [],
        // 신화 갈래인지는 편집 화면에서 정한다
        is_fiction: false,
        // 새 테마는 언제나 무소속으로 시작한다 — 묶음 소속은 편집 화면에서 정한다
        parent_id: null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">새 웹 전용 테마</h2>
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
              테마 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 정복자, 실존주의자"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="EN (e.g. Conquerors, Existentialists)"
              className="mt-1.5 w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
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
              placeholder="테마에 대한 간단한 설명"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <input
              type="text"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="EN description (optional)"
              className="mt-1.5 w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* 주소(slug) */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              주소 (slug, 선택)
            </label>
            <div className="flex items-center px-3 bg-bg-secondary border border-border rounded-lg focus-within:ring-2 focus-within:ring-accent/50">
              <span className="text-sm text-text-tertiary shrink-0">/explore/faction/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, ''))}
                placeholder="xai"
                className="flex-1 py-2 bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-text-tertiary">테마별 고유 주소. 비우면 주소로 접근할 수 없습니다.</p>
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

          {/* 세력도감 노출 */}
          <div className="border border-border rounded-lg p-3 space-y-3 bg-bg-secondary/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-text-primary">세력도감에 노출</span>
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

            {/* 신화 아틀라스 공개 — 세력도감 노출과 다른 축이다.
                이 값이 꺼지면 전승 칩이 잠기고 「작업 예정」이 붙는다 */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <BookOpenText className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-text-primary">신화의 세계에 공개</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={atlasPublished}
                  onChange={(e) => setAtlasPublished(e.target.checked)}
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
              {name || '테마 이름'}
            </span>
            {isFeatured && (
              <span className="ml-2 text-xs text-accent">⭐ 세력도감 노출</span>
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
              {isSubmitting ? '만드는 중...' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
