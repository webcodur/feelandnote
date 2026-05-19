'use client'

import type { SpeakerEngine } from './SpeakerPanel'

const TITLES: Record<SpeakerEngine, string> = {
  gemini: 'Gemini 엔진',
  elevenlabs: 'ElevenLabs 엔진',
}

const ACTIVE_CLS: Record<SpeakerEngine, string> = {
  gemini: 'bg-blue-500/30 text-blue-200',
  elevenlabs: 'bg-purple-500/30 text-purple-200',
}

/**
 * GEM · ELE 두 버튼으로 화자 엔진을 토글한다.
 * 인물 본인 줄과 일반 화자 줄이 같은 모양으로 사용한다.
 */
export function SpeakerEngineToggle({
  engine,
  onChange,
  titles,
}: {
  engine: SpeakerEngine
  onChange: (next: SpeakerEngine) => void
  /** 엔진별 부연 설명이 필요할 때 title 툴팁을 덮어쓴다. */
  titles?: Partial<Record<SpeakerEngine, string>>
}) {
  const t = { ...TITLES, ...titles }
  const cell = (eng: SpeakerEngine, label: string) => (
    <button
      type="button"
      onClick={() => onChange(eng)}
      title={t[eng]}
      className={`px-2 py-1 text-[11px] font-bold cursor-pointer ${engine === eng ? ACTIVE_CLS[eng] : 'text-text-dim hover:text-text-secondary'}`}
    >{label}</button>
  )
  return (
    <div className="flex items-center gap-0.5 rounded border border-border/40 bg-bg-card overflow-hidden">
      {cell('gemini', 'GEM')}
      {cell('elevenlabs', 'ELE')}
    </div>
  )
}
