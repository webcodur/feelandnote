'use client'

import { useEffect, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '../../../../../../voice-utils'
import { Mic } from '../../../../../shared/icons'
import {
  FactionExpandedVoicePanel,
  FACTION_VOICE_MODE_LABEL,
  type FactionVoiceMode,
} from './FactionExpandedVoicePanel'
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
  // 작업 모드 — 헤더 탭이 소유하고 본체(FactionExpandedVoicePanel)에 내려준다.
  const [mode, setMode] = useState<FactionVoiceMode>('main')
  const modes = (['main', 'sync', 'breath'] as const).filter(m => slot.hasSync || m !== 'sync')

  // Esc 로 닫기, 1·2·3 으로 모드 전환
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '1') setMode('main')
      if (e.key === '2' && slot.hasSync) setMode('sync')
      if (e.key === '3') setMode('breath')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, slot.hasSync])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl"
        style={{ width: 'min(96vw, 1800px)', height: 'min(94vh, 1100px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Mic size={15} className="shrink-0 text-text-dim" />
          <h3 className="truncate text-sm font-semibold text-text-primary">{person.name || '인물'} · {slot.label}</h3>
          {/* 모드 탭 — 헤더 빈 공간에 세그먼티드 컨트롤로. 단축키 1·2·3 */}
          <div
            role="group"
            className="ml-4 inline-flex items-center gap-0.5 rounded border border-border bg-bg-main p-0.5"
            title="작업 모드 전환 (단축키 1·2·3)"
          >
            {modes.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                  mode === m
                    ? 'bg-accent/10 text-accent shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className={`mr-1.5 font-mono text-[10px] ${mode === m ? 'opacity-80' : 'opacity-50'}`}>
                  {m === 'main' ? '1' : m === 'sync' ? '2' : '3'}
                </span>
                {FACTION_VOICE_MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded border border-border bg-bg-main px-2.5 py-1 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            title="닫기 (Esc)"
          >✕</button>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <FactionExpandedVoicePanel
            person={person}
            onChange={onChange}
            series={series}
            episodeName={episodeName}
            voiceFile={voiceFile}
            activeFile={activeFile}
            onRefresh={onRefresh}
            slot={slot}
            mode={mode}
          />
        </div>
      </div>
    </div>
  )
}
