'use client'

/**
 * 새 도감 행 만들기 — 세력(L2) 또는 분류(L1)를 고르고 이름·설명·색·주소·노출만 받는다.
 *
 * 세력은 반드시 분류 하나에 속한다(lv1_id 필수). 인물 명단과 사진은 만든 뒤
 * 그 세력의 화면(`/factions/<id>`)에서 채운다(여기서 다 받으면 화면이 두 벌이 된다).
 */

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { type FactionEntry, createFactionEntry } from '@/actions/admin/factions/entries'
import type { Lv1Option } from '@/actions/admin/factions/board'

interface Props {
  /** 지금은 만들기 전용이라 항상 null 이다 — 수정은 편집 화면(통합 편집 진입점)이 맡는다 */
  entry: FactionEntry | null
  /** 세력의 소속 분류 선택지(L1) */
  lv1Options: Lv1Option[]
  onClose: (newEntry?: FactionEntry) => void
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

export default function FactionFormModal({ entry, lv1Options, onClose }: Props) {
  const [level, setLevel] = useState<1 | 2>(2)
  const [lv1Id, setLv1Id] = useState(lv1Options[0]?.id ?? '')
  const [name, setName] = useState(entry?.name ?? '')
  const [nameEn, setNameEn] = useState(entry?.name_en ?? '')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [descriptionEn, setDescriptionEn] = useState(entry?.description_en ?? '')
  const [color, setColor] = useState(entry?.color ?? '#7c4dff')
  const [slug, setSlug] = useState(entry?.slug ?? '')
  const [isFeatured, setIsFeatured] = useState(entry?.is_featured ?? false)
  const [startDate, setStartDate] = useState(entry?.start_date ?? '')
  const [endDate, setEndDate] = useState(entry?.end_date ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('이름을 입력해야 합니다.')
      return
    }
    if (level === 2 && !lv1Id) {
      setError('세력은 소속 분류를 골라야 합니다.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const lv1 = lv1Options.find(o => o.id === lv1Id)
    const entryData = {
      name,
      name_en: nameEn || null,
      description,
      description_en: descriptionEn || null,
      color,
      slug: slug.trim() || null,
      level,
      lv1_id: level === 2 ? lv1Id : null,
      is_featured: isFeatured,
      start_date: startDate || null,
      end_date: endDate || null,
    }

    const result = await createFactionEntry(entryData)

    if ('id' in result) {
      onClose({
        id: result.id,
        ...entryData,
        team_images: [],
        lead_person_ids: [],
        // 신화 분류 아래의 세력은 신화이자 이야기 속 세력이다(서버도 같은 규칙으로 잡는다)
        is_myth: level === 2 && lv1?.is_myth === true,
        is_fiction: level === 2 && lv1?.is_myth === true,
        published: false,
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
          <h2 className="text-lg font-semibold text-text-primary">새 도감 행</h2>
          <button
            onClick={() => onClose()}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* 층 선택 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">만들 것</label>
            <div className="grid grid-cols-2 gap-2">
              {([2, 1] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setLevel(v)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    level === v
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-bg-secondary text-text-secondary hover:border-accent/60'
                  }`}
                >
                  {v === 2 ? '세력 카드' : '분류(테마)'}
                </button>
              ))}
            </div>
          </div>

          {/* 소속 분류 — 세력만 */}
          {level === 2 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                소속 분류 <span className="text-red-500">*</span>
              </label>
              <select
                value={lv1Id}
                onChange={(e) => setLv1Id(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {lv1Options.length === 0 && <option value="">분류가 없습니다</option>}
                {lv1Options.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.childCount > 0 ? ` — 세력 ${o.childCount}개` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-tertiary">세력은 반드시 분류 하나에 속합니다.</p>
            </div>
          )}

          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={level === 2 ? '예: 정복자, 서유기' : '예: 역사, 아프리카'}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="EN (e.g. Conquerors, Journey to the West)"
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
              placeholder="간단한 설명"
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
            <p className="mt-1 text-xs text-text-tertiary">행별 고유 주소. 비우면 주소로 접근할 수 없습니다.</p>
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

            {isFeatured && level === 2 && (
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
              {name || '이름'}
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
