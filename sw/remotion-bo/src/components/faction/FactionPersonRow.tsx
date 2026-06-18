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
    <div className="flex items-start gap-2 rounded-md border border-border bg-bg-card p-2">
      {/* 썸네일 — 세로 인물샷 */}
      <button
        onClick={() => setPickerOpen(true)}
        className="shrink-0 overflow-hidden rounded-md border border-border"
        title="이미지 변경"
      >
        {src ? (
          <img src={src} alt="" className="h-36 w-28 object-cover" />
        ) : (
          <span className="flex h-36 w-28 items-center justify-center bg-bg-secondary text-2xl font-bold text-text-secondary">
            {initial(person.name)}
          </span>
        )}
      </button>

      {/* 이름·직책·소속 + 설명 3줄 */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-xs text-text-dim">이름 -</label>
          <input
            type="text"
            placeholder="이름"
            value={person.name}
            onChange={e => set('name', e.target.value)}
            className="w-full rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-xs text-text-dim">이름(영문) -</label>
          <input
            type="text"
            placeholder="EN 이름 (영문)"
            value={person.nameEn ?? ''}
            onChange={e => set('nameEn', e.target.value)}
            className="w-full rounded-md border border-border/60 bg-bg-main/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-xs text-text-dim">소속 -</label>
          <input
            type="text"
            placeholder="소속"
            value={person.org ?? ''}
            onChange={e => set('org', e.target.value)}
            className="w-full rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-start gap-2">
          <label className="w-20 shrink-0 pt-1.5 text-xs text-text-dim">수식어·설명 -</label>
          <textarea
            placeholder="설명 (줄바꿈으로 3줄 — 한 줄씩 수직 회전하며 등장)"
            value={person.lines?.join('\n') ?? ''}
            onChange={e => onChange({ ...person, lines: e.target.value.split('\n') })}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-snug focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-start gap-2">
          <label className="w-20 shrink-0 pt-1.5 text-xs text-text-dim">설명(영문) -</label>
          <textarea
            placeholder="EN 설명 (영문 — 줄바꿈으로 줄 구분)"
            value={person.linesEn?.join('\n') ?? ''}
            onChange={e => onChange({ ...person, linesEn: e.target.value.split('\n') })}
            rows={3}
            className="w-full resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-start gap-2">
          <label className="w-20 shrink-0 pt-1.5 text-xs text-text-dim">한마디 대사 -</label>
          <div className="w-full space-y-1">
            <textarea
              placeholder="한마디 대사 (줄바꿈으로 의미 덩어리 구분)"
              value={person.quoteChunks?.join('\n') ?? person.quote ?? ''}
              onChange={e => { const ch = e.target.value.split('\n'); onChange({ ...person, quoteChunks: ch, quote: ch.map(s => s.trim()).filter(Boolean).join(' ') }) }}
              rows={4}
              className="w-full resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm italic leading-snug focus:border-accent focus:outline-none"
            />
            <p className="text-[11px] leading-tight text-text-dim">
              줄바꿈(Enter)으로 의미 덩어리를 끊으세요. 너무 길면 한 호흡 단위로 나눕니다.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <label className="w-20 shrink-0 pt-1.5 text-xs text-text-dim">대사 원문 -</label>
          <div className="w-full space-y-1">
            <textarea
              placeholder="대사 원문 (실제 발언 영어 원문)"
              value={person.quoteOrigin ?? ''}
              onChange={e => set('quoteOrigin', e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1 text-xs italic leading-snug text-text-secondary focus:border-accent focus:outline-none"
            />
            <p className="text-[11px] leading-tight text-text-dim">
              실제 발언 영어 원문 (한국어 영상에 보조 표기)
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <label className="w-20 shrink-0 pt-1.5 text-xs text-text-dim">대사(영문) -</label>
          <textarea
            placeholder="EN 대사 (영문 — 줄바꿈으로 의미 덩어리 구분)"
            value={person.quoteEnChunks?.join('\n') ?? person.quoteEn ?? ''}
            onChange={e => { const ch = e.target.value.split('\n'); onChange({ ...person, quoteEnChunks: ch, quoteEn: ch.map(s => s.trim()).filter(Boolean).join(' ') }) }}
            rows={4}
            className="w-full resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1 text-xs italic leading-snug text-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
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
