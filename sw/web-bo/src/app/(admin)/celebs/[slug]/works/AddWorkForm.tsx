'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { addCelebWork } from '@/actions/admin/celebs'

const ROLE_OPTIONS = [
  { value: 'author', label: '저자' },
  { value: 'director', label: '감독' },
  { value: 'composer', label: '작곡' },
  { value: 'artist', label: '작가' },
  { value: 'editor', label: '편저' },
  { value: 'screenwriter', label: '각본' },
  { value: 'developer', label: '개발' },
  { value: 'performer', label: '연주' },
]

const TYPE_OPTIONS = [
  { value: 'BOOK', label: '도서' },
  { value: 'VIDEO', label: '영상' },
  { value: 'MUSIC', label: '음악' },
  { value: 'GAME', label: '게임' },
  { value: 'ART', label: '미술' },
]

interface AddWorkFormProps {
  celebId: string
}

export default function AddWorkForm({ celebId }: AddWorkFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [role, setRole] = useState('author')
  const [workType, setWorkType] = useState('BOOK')
  const [releaseYear, setReleaseYear] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [contentId, setContentId] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const reset = () => {
    setTitle('')
    setTitleEn('')
    setRole('author')
    setWorkType('BOOK')
    setReleaseYear('')
    setDescription('')
    setDescriptionEn('')
    setContentId('')
    setSearchKeyword('')
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)

    const result = await addCelebWork({
      celebId,
      contentId: contentId.trim() || null,
      title: title.trim(),
      titleEn: titleEn.trim() || null,
      role,
      description: description.trim() || null,
      descriptionEn: descriptionEn.trim() || null,
      workType,
      releaseYear: releaseYear ? Number(releaseYear) : null,
      searchKeyword: searchKeyword.trim() || null,
    })

    setIsSubmitting(false)

    if (result.success) {
      reset()
      setIsOpen(false)
      router.refresh()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-accent/80"
      >
        <Plus className="w-4 h-4" /> 창작물 추가
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary">창작물 추가</h3>
          <button onClick={() => setIsOpen(false)} className="text-text-tertiary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary col-span-2"
            placeholder="제목 (한국어) *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary col-span-2"
            placeholder="제목 (영문)"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
          />
          <select
            className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
            placeholder="발표 연도 (BC는 음수)"
            type="number"
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
          />
          <input
            className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary"
            placeholder="콘텐츠 ID (연결, 선택)"
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
          />
          <input
            className="bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary col-span-2"
            placeholder="검색 키워드 (미입력 시 제목 사용)"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>

        <textarea
          className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary resize-none"
          rows={3}
          placeholder="창작 배경 (한국어)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <textarea
          className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text-primary resize-none"
          rows={3}
          placeholder="창작 배경 (영문)"
          value={descriptionEn}
          onChange={(e) => setDescriptionEn(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={() => { reset(); setIsOpen(false) }}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50"
          >
            {isSubmitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}
