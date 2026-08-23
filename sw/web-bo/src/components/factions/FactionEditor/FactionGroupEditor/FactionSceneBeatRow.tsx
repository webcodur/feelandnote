'use client'

import { useState } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronDown, ChevronUp, Trash2 } from '@feelandnote/shared/bo/icons'
import type { FactionSceneBeat } from '@/lib/faction-types'
import { GEMINI_VOICES_FEMALE, GEMINI_VOICES_MALE } from '@/components/scenario-voice/types'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'
import { sequenceCardIconButtonClass } from './FactionSequenceCard'

const inputClass = 'w-full rounded-md border border-border bg-bg-main px-2.5 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none'
const smallInputClass = 'rounded-md border border-border bg-bg-main px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none'

type Props = {
  beat: FactionSceneBeat
  index: number
  total: number
  onChange: (index: number, next: FactionSceneBeat) => void
  onMove: (index: number, direction: -1 | 1) => void
  onDelete: (index: number) => void
  editLang: EditLang
  series: string
  episodeName: string
  idPrefix: string
}

/**
 * 장면 안의 덩어리 한 줄.
 *
 * 화자를 적으면 그 인물의 대사가 되고, 비우면 나레이터 해설이 된다. 화자는 셀럽 등록과 무관한
 * 자유 문자열이라 인물 카드로 세우지 않은 배역도 여기서 말할 수 있다.
 */
export function FactionSceneBeatRow({
  beat, index, total, onChange, onMove, onDelete, editLang, series, episodeName, idPrefix,
}: Props) {
  const [voiceOpen, setVoiceOpen] = useState(false)
  const set = (patch: Partial<FactionSceneBeat>) => onChange(index, { ...beat, ...patch })
  const isLine = !!beat.speaker?.trim()
  const rowId = `${idPrefix}-beat-${index}`

  return (
    <div className="rounded-md border border-border/70 bg-bg-sub/40 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isLine
            ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
            : 'border border-border bg-bg-main text-text-tertiary'}`}
        >
          {isLine ? '대사' : '해설'}
        </span>

        {editLang !== 'en' ? (
          <input
            value={beat.speaker ?? ''}
            onChange={e => set({ speaker: e.target.value || undefined })}
            placeholder="화자 (비우면 해설)"
            aria-label={`${index + 1}번 덩어리 화자`}
            className={`${smallInputClass} w-36`}
          />
        ) : null}
        {editLang !== 'ko' ? (
          <input
            value={beat.speakerEn ?? ''}
            onChange={e => set({ speakerEn: e.target.value || undefined })}
            placeholder="Speaker"
            aria-label={`Beat ${index + 1} speaker`}
            className={`${smallInputClass} w-36 text-text-secondary`}
          />
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVoiceOpen(o => !o)}
            aria-expanded={voiceOpen}
            aria-controls={`${rowId}-voice`}
            className={`${sequenceCardIconButtonClass} w-auto px-2 text-[11px] font-semibold`}
            title="음성 설정"
          >
            음성{beat.voiceSpeaker || beat.voiceElevenlabsVoiceId || beat.voiceStyle ? ' •' : ''}
          </button>
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} className={sequenceCardIconButtonClass} title="위로" aria-label={`${index + 1}번 덩어리 위로`}><ChevronUp size={14} /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 1)} className={sequenceCardIconButtonClass} title="아래로" aria-label={`${index + 1}번 덩어리 아래로`}><ChevronDown size={14} /></button>
          <button type="button" onClick={() => onDelete(index)} className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger-text hover:border-danger/70 hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger" title="덩어리 삭제" aria-label={`${index + 1}번 덩어리 삭제`}><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <div className="w-28 shrink-0 space-y-1.5">
          <CoverPickerButton
            value={beat.media}
            onChange={media => set({ media, mediaAt: media ? beat.mediaAt : undefined })}
            crop={beat.mediaCrop}
            onCropChange={mediaCrop => set({ mediaCrop })}
            label={beat.speaker || '해설'}
            emptyText="배경 유지"
            series={series}
            episodeName={episodeName}
            className="h-20 w-full"
          />
          {beat.media ? (
            <label className="block space-y-1 text-[10px] font-semibold text-text-tertiary">
              사진 전환
              <select
                value={beat.mediaAt ?? 'beat'}
                onChange={event => set({ mediaAt: event.target.value === 'text' ? 'text' : undefined })}
                className="w-full rounded-md border border-border bg-bg-main px-1.5 py-1 text-[10px] text-text-secondary hover:border-accent hover:bg-bg-hover focus:border-accent focus:outline-none"
                aria-label={`${index + 1}번 덩어리 사진 전환 시점`}
              >
                <option value="beat">덩어리 시작</option>
                <option value="text">본문·음성 시작</option>
              </select>
            </label>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {editLang !== 'en' ? (
            <textarea
              value={beat.text ?? ''}
              onChange={e => set({ text: e.target.value })}
              rows={3}
              placeholder={isLine ? '대사 · Enter 두 번은 다음 화면' : '해설 · Enter 두 번은 다음 화면'}
              aria-label={`${index + 1}번 덩어리 본문`}
              className={`${inputClass} resize-y leading-snug`}
            />
          ) : null}
          {editLang !== 'ko' ? (
            <textarea
              value={beat.textEn ?? ''}
              onChange={e => set({ textEn: e.target.value || undefined })}
              rows={3}
              placeholder="English · blank line starts the next screen"
              aria-label={`Beat ${index + 1} text`}
              className={`${inputClass} resize-y leading-snug text-text-secondary`}
            />
          ) : null}
        </div>
      </div>

      {voiceOpen ? (
        <div id={`${rowId}-voice`} className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
          <label className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
            보이스
            <select
              value={beat.voiceSpeaker ?? ''}
              onChange={e => set({ voiceSpeaker: e.target.value || undefined })}
              className={`${smallInputClass} w-36`}
            >
              <option value="">기본</option>
              <optgroup label="남성">
                {GEMINI_VOICES_MALE.map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="여성">
                {GEMINI_VOICES_FEMALE.map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
            </select>
          </label>
          <input
            value={beat.voiceStyle ?? ''}
            onChange={e => set({ voiceStyle: e.target.value || undefined })}
            placeholder="발화 스타일 (예: 낮고 간절하게)"
            aria-label={`${index + 1}번 덩어리 발화 스타일`}
            className={`${smallInputClass} min-w-48 flex-1`}
          />
          <input
            value={beat.voiceElevenlabsVoiceId ?? ''}
            onChange={e => set({ voiceElevenlabsVoiceId: e.target.value || undefined })}
            placeholder="ELE 보이스 ID (인물 카드와 맞출 때)"
            aria-label={`${index + 1}번 덩어리 ElevenLabs 보이스 ID`}
            className={`${smallInputClass} min-w-56 flex-1 font-mono`}
          />
          <span className="text-[11px] text-text-tertiary">
            {beat.voiceDuration ? `음원 ${beat.voiceDuration.toFixed(2)}초` : '음원 없음'}
          </span>
        </div>
      ) : null}
    </div>
  )
}
