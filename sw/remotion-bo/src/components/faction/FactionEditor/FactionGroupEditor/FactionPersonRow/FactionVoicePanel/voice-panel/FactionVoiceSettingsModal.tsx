'use client'

import { useEffect } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '../../../../../../voice-utils'
import { Mic } from '../../../../../shared/icons'
import { FactionExpandedVoicePanel } from './FactionExpandedVoicePanel'
import { QUOTE_SLOT, type FactionVoiceSlot } from './voice-slots'

/**
 * 인물 한 명의 음성 설정 모달 — 본체(FactionExpandedVoicePanel)를 띄우는 다이얼로그.
 *
 * 아코디언을 펼치지 않고도 인물 행 헤더에서 바로 열 수 있도록 행(FactionPersonRow) 레벨에서 소유한다.
 * 펼친 폼 안의 음성 패널(FactionVoicePanel) 헤더 버튼도 같은 모달을 연다.
 */
export function FactionVoiceSettingsModal({
  person,
  onChange,
  series,
  episodeName,
  voiceFile,
  activeFile,
  onRefresh,
  onClose,
  slot = QUOTE_SLOT,
}: {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  series: string
  episodeName: string
  voiceFile: string
  activeFile: VoiceFile | undefined
  onRefresh: () => void
  onClose: () => void
  /** 음성 슬롯 — 대사(기본) 또는 수식어 */
  slot?: FactionVoiceSlot
}) {
  // Esc 로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Mic size={15} className="shrink-0 text-text-dim" />
          <h3 className="truncate text-sm font-semibold text-text-primary">{person.name || '인물'} · {slot.label}</h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded p-1 text-text-secondary hover:bg-bg-hover"
            title="닫기 (Esc)"
          >✕</button>
        </div>
        <div className="overflow-auto p-3">
          <FactionExpandedVoicePanel
            person={person}
            onChange={onChange}
            series={series}
            episodeName={episodeName}
            voiceFile={voiceFile}
            activeFile={activeFile}
            onRefresh={onRefresh}
            slot={slot}
          />
        </div>
      </div>
    </div>
  )
}
