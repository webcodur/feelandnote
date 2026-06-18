'use client'

import { useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '../voice-utils'
import { VOICE } from '@feelandnote/shared/lib/voice-policy'
import { Mic } from './icons'
import { useFactionVoice } from './FactionVoiceContext'
import { FactionExpandedVoicePanel } from './voice-panel'

/**
 * 인물 한 명의 대사 음성 패널 — 접기/펼치기 헤더 + 북리커맨드 음성 패널 통복제 본체.
 *
 * 본체(FactionExpandedVoicePanel)는 북리커맨드 ExpandedVoicePanel 을 화면 그대로 옮긴 것이다
 * (저장된 음원·트림·새 음원 생성·미리듣기·생성 및 저장까지 동일 슬레이트 톤·레이아웃).
 * 데이터만 인물 1명(quote 음성)으로 연결했다.
 *
 * 헤더는 행을 컴팩트하게 유지하기 위한 접기/펼치기 토글이며, 펼치면 북리커맨드와 같은 화면이 나온다.
 */
export function FactionVoicePanel({
  person,
  onChange,
  series,
  episodeName,
  voiceFile,
  hasQuote,
}: {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  series: string
  episodeName: string
  /** 이 인물 음원 파일명 (예 F01P01-quote.wav) — 저장·재생 대상 */
  voiceFile: string
  /** 대사가 있는지 — 없으면 패널 자체 미노출 */
  hasQuote: boolean
}) {
  const voiceCtx = useFactionVoice()
  const [open, setOpen] = useState(false)

  if (!hasQuote) return null

  const engine = person.quoteEngine ?? 'gemini'
  const engineLabel = engine === 'elevenlabs' ? 'ELE' : engine === 'gemini-v3' ? 'GEM 3.1' : 'GEM 2.5'
  const voiceSummary = engine === 'elevenlabs'
    ? (person.quoteElevenlabsVoiceId || 'ID 미설정')
    : (person.quoteSpeaker || VOICE.celeb)

  // 저장된 음원 메타 → 북리커맨드 VoiceFile 형태로 어댑트(존재 시).
  const meta = voiceCtx?.byFile.get(voiceFile)
  const activeFile: VoiceFile | undefined = meta
    ? { name: voiceFile, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' }
    : undefined

  return (
    <div className="rounded-md border border-border bg-bg-main/40">
      {/* 헤더 — 펼침 토글 + 현재 엔진/보이스 요약 */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
        title="이 인물 음성 설정 펼치기/접기"
      >
        <Mic size={13} className="shrink-0 text-text-dim" />
        <span className="text-xs font-semibold text-text-secondary">음성 설정</span>
        <span className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
          {engineLabel}
        </span>
        <span className="truncate font-mono text-[10px] text-text-dim">{voiceSummary}</span>
        {meta && (
          <span className="font-mono text-[10px] text-accent">{meta.duration.toFixed(1)}s</span>
        )}
        <span className="ml-auto text-[10px] text-text-dim">{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {open && (
        <div className="border-t border-border p-2">
          <FactionExpandedVoicePanel
            person={person}
            onChange={onChange}
            series={series}
            episodeName={episodeName}
            voiceFile={voiceFile}
            activeFile={activeFile}
            onRefresh={() => voiceCtx?.reload?.()}
          />
        </div>
      )}
    </div>
  )
}
