'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, ImageIcon } from './icons'
import type { FactionPerson } from '@/lib/faction-types'
import { imageSrc, initial } from './timing'
import { FactionImagePicker } from './FactionImagePicker'

type Props = {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
}

export function FactionPersonRow({ person, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const src = imageSrc(series, episodeName, person.image)

  // 단일 필드 갱신 헬퍼
  const set = (key: keyof FactionPerson, val: string) => onChange({ ...person, [key]: val })

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-bg-card p-2">
      {/* 썸네일 */}
      <button
        onClick={() => setPickerOpen(true)}
        className="shrink-0 overflow-hidden rounded-full border border-border"
        title="이미지 변경"
      >
        {src ? (
          <img src={src} alt="" className="h-12 w-12 object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center bg-bg-secondary text-base font-bold text-text-secondary">
            {initial(person.name)}
          </span>
        )}
      </button>

      {/* 이름·직책·소속 */}
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="이름"
          value={person.name}
          onChange={e => set('name', e.target.value)}
          className="rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          placeholder="수식어·직책"
          value={person.role ?? ''}
          onChange={e => set('role', e.target.value)}
          className="rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          placeholder="소속"
          value={person.org ?? ''}
          onChange={e => set('org', e.target.value)}
          className="rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      {/* 조작 버튼 */}
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => setPickerOpen(true)} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="이미지">
          <ImageIcon size={15} />
        </button>
        <button onClick={onMoveUp} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
          <ChevronUp size={15} />
        </button>
        <button onClick={onMoveDown} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
          <ChevronDown size={15} />
        </button>
        <button onClick={onDelete} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="삭제">
          <Trash2 size={15} />
        </button>
      </div>

      {pickerOpen && (
        <FactionImagePicker
          value={person.image}
          onChange={next => onChange({ ...person, image: next })}
          series={series}
          episodeName={episodeName}
          slug={person.slug}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
