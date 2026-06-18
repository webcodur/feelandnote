'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, ImageIcon, Eye, EyeOff } from './icons'
import type { FactionPerson } from '@/lib/faction-types'
import { factionVoiceFile } from '@/lib/faction-voice'
import { imageSrc, initial } from './timing'
import { FactionImagePicker } from './FactionImagePicker'
import { FactionVoiceControls } from './FactionVoiceControls'
import { useFactionVoice } from './FactionVoiceContext'

type Props = {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
  /** 세력 인덱스 (0-based) — 음성 파일명 계산용 */
  groupIndex: number
  /** 묶음(또는 묶음 없을 때 세력) 내 로컬 인물 인덱스 (0-based) */
  personIndex: number
  /** 묶음 인덱스 (분할 세력) — 단일 모드면 미지정 */
  clusterIndex?: number
  /** 무소속 개인군 여부 — 파일명에 C 부착 여부 결정 */
  solo: boolean
}

export function FactionPersonRow({ person, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName, groupIndex, personIndex, clusterIndex, solo }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const src = imageSrc(series, episodeName, person.image)
  const disabled = !!person.disabled
  const voice = useFactionVoice()

  // 단일 필드 갱신 헬퍼
  const set = (key: keyof FactionPerson, val: string) => onChange({ ...person, [key]: val })

  // 이 인물 음성 파일명 — 렌더 인덱싱(vnPersonQuote)과 동일 규칙
  const voiceFile = factionVoiceFile(groupIndex, personIndex, solo, clusterIndex)
  const voiceMeta = voice?.byFile.get(voiceFile)
  const hasQuote = !!(person.quoteChunks?.some(c => c.trim()) || person.quote?.trim())
  // 길이: 파일 스캔 길이 우선, 없으면 data.json quoteDuration
  const voiceDuration = voiceMeta?.duration ?? person.quoteDuration ?? 0

  return (
    <div
      className="flex items-start gap-2 rounded-md border border-border bg-bg-card p-2"
      style={disabled ? { opacity: 0.5, filter: 'saturate(0.4)' } : undefined}
    >
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

      {/* 필드 — 한/영 쌍은 한 줄에 좌우로 나란히. 단독 필드(대사 원문·소속)는 한 줄 전체 */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* 이름 + 이름(영문) — 한 줄 나란히 */}
        <div className="flex items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-text-dim">이름</span>
            <input type="text" placeholder="이름" value={person.name} onChange={e => set('name', e.target.value)} className="w-full rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-text-dim">이름 (영문)</span>
            <input type="text" placeholder="EN 이름" value={person.nameEn ?? ''} onChange={e => set('nameEn', e.target.value)} className="w-full rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none" />
          </label>
        </div>
        {/* 수식어·설명 + 설명(영문) — 한 줄 나란히 */}
        <div className="flex items-stretch gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-text-dim">수식어·설명 (줄바꿈 구분)</span>
            <textarea placeholder="줄바꿈으로 줄 구분" value={person.lines?.join('\n') ?? ''} onChange={e => onChange({ ...person, lines: e.target.value.split('\n') })} rows={3} className="h-full w-full resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-snug focus:border-accent focus:outline-none" />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-text-dim">설명 (영문)</span>
            <textarea placeholder="EN 설명 (줄바꿈 구분)" value={person.linesEn?.join('\n') ?? ''} onChange={e => onChange({ ...person, linesEn: e.target.value.split('\n') })} rows={3} className="h-full w-full resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none" />
          </label>
        </div>
        {/* 한마디 대사 + 대사(영문) — 한 줄 나란히 */}
        <div className="flex items-stretch gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-text-dim">한마디 대사 (줄바꿈=덩어리)</span>
            <textarea placeholder="줄바꿈으로 의미 덩어리 구분" value={person.quoteChunks?.join('\n') ?? person.quote ?? ''} onChange={e => { const ch = e.target.value.split('\n'); onChange({ ...person, quoteChunks: ch, quote: ch.map(s => s.trim()).filter(Boolean).join(' ') }) }} rows={4} className="h-full w-full resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm italic leading-snug focus:border-accent focus:outline-none" />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-text-dim">대사 (영문, 줄바꿈=덩어리)</span>
            <textarea placeholder="EN 대사 (줄바꿈으로 덩어리)" value={person.quoteEnChunks?.join('\n') ?? person.quoteEn ?? ''} onChange={e => { const ch = e.target.value.split('\n'); onChange({ ...person, quoteEnChunks: ch, quoteEn: ch.map(s => s.trim()).filter(Boolean).join(' ') }) }} rows={4} className="h-full w-full resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs italic leading-snug text-text-secondary focus:border-accent focus:outline-none" />
          </label>
        </div>
        {/* 단독 필드 — 대사 원문 + 소속 */}
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-text-dim">대사 원문 (실제 발언)</span>
          <textarea placeholder="실제 발언 영어 원문" value={person.quoteOrigin ?? ''} onChange={e => set('quoteOrigin', e.target.value)} rows={2} className="w-full resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs italic leading-snug text-text-secondary focus:border-accent focus:outline-none" />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-text-dim">소속</span>
          <input type="text" placeholder="소속" value={person.org ?? ''} onChange={e => set('org', e.target.value)} className="w-full rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
        </label>

        {/* 대사 음성 — 재생·재생성 (대사가 있을 때만 노출) */}
        {voice && hasQuote && (
          <FactionVoiceControls
            voiceUrl={voiceMeta ? voice.voiceUrl(voiceFile) : null}
            fileExists={!!voiceMeta}
            duration={voiceDuration}
            hasQuote={hasQuote}
            regenerating={voice.regeneratingFile === voiceFile}
            onRegenerate={() => voice.regenerate(voiceFile)}
          />
        )}
      </div>

      {/* 조작 버튼 */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => onChange({ ...person, disabled: disabled ? undefined : true })}
          className={`rounded-md border p-1.5 ${disabled ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
          title={disabled ? '이 인물을 다시 영상에 포함' : '이 인물을 영상에서 제외 (데이터는 보존)'}
        >
          {disabled ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
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
