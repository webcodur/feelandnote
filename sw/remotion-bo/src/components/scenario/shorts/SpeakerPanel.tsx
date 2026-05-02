'use client'

import React, { useState } from 'react'

export interface Speaker {
  id: string
  label: string
  color: string
  elevenlabsVoiceId?: string
}

const DEFAULT_COLORS = ['#3b82f6', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2', '#db2777', '#65a30d']

function nextColor(existing: Speaker[]): string {
  const used = new Set(existing.map(s => s.color))
  return DEFAULT_COLORS.find(c => !used.has(c)) ?? DEFAULT_COLORS[existing.length % DEFAULT_COLORS.length]
}

export function SpeakerPanel({ speakers, onChange }: {
  speakers: Speaker[]
  onChange: (next: Speaker[]) => void
}) {
  const [open, setOpen] = useState(speakers.length > 0)

  const addSpeaker = () => {
    const idBase = `speaker${speakers.length + 1}`
    const next: Speaker = { id: idBase, label: '새 화자', color: nextColor(speakers) }
    onChange([...speakers, next])
    setOpen(true)
  }
  const updateSpeaker = (i: number, patch: Partial<Speaker>) => {
    const next = [...speakers]
    next[i] = { ...next[i], ...patch }
    // 빈 voiceId는 제거
    if (patch.elevenlabsVoiceId === '') {
      const { elevenlabsVoiceId: _, ...rest } = next[i]
      next[i] = rest as Speaker
    }
    onChange(next)
  }
  const removeSpeaker = (i: number) => {
    if (!confirm(`화자 "${speakers[i].label}" 삭제? (이 화자에 연결된 구간은 미지정으로 돌아간다)`)) return
    onChange(speakers.filter((_, j) => j !== i))
  }

  return (
    <div className="mb-2 rounded border border-border/40 bg-bg-card/30">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <span>{open ? '▼' : '▶'}</span>
          <span className="font-semibold">화자 설정</span>
          <span className="text-[10px] opacity-70">({speakers.length})</span>
          {!open && speakers.length > 0 && (
            <span className="flex items-center gap-1 ml-2">
              {speakers.map(s => (
                <span key={s.id} className="flex items-center gap-1 text-[10px]">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span>{s.label}</span>
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="text-[10px] opacity-70">화자별 ElevenLabs voiceId·색상 관리</span>
      </button>

      {open && (
        <div className="px-3 pb-2 pt-1 space-y-1.5">
          {speakers.length === 0 && (
            <div className="text-[11px] text-text-secondary/70 italic py-1">아직 등록된 화자가 없다. 아래 + 버튼으로 추가하라.</div>
          )}
          {speakers.map((s, i) => (
            <div key={i} className="grid grid-cols-[24px_120px_120px_1fr_24px] gap-2 items-center text-[11px]">
              <input
                type="color"
                value={s.color}
                onChange={e => updateSpeaker(i, { color: e.target.value })}
                title="화자 색상"
                className="w-6 h-6 rounded cursor-pointer border border-border/40 bg-transparent p-0"
              />
              <input
                type="text"
                value={s.id}
                onChange={e => updateSpeaker(i, { id: e.target.value })}
                placeholder="id (영문)"
                title="화자 ID — segment.speaker가 이 값을 참조"
                className="bg-bg-card border border-border/40 rounded px-2 py-1 font-mono"
              />
              <input
                type="text"
                value={s.label}
                onChange={e => updateSpeaker(i, { label: e.target.value })}
                placeholder="라벨"
                title="화면 표시용 라벨"
                className="bg-bg-card border border-border/40 rounded px-2 py-1"
              />
              <input
                type="text"
                value={s.elevenlabsVoiceId ?? ''}
                onChange={e => updateSpeaker(i, { elevenlabsVoiceId: e.target.value })}
                placeholder="ElevenLabs voiceId (예: jYRFO0PzP6wFrc2adnGY)"
                title="ElevenLabs 보이스 ID — 비우면 host 기본값 사용"
                className="bg-bg-card border border-border/40 rounded px-2 py-1 font-mono"
              />
              <button
                type="button"
                onClick={() => removeSpeaker(i)}
                title="이 화자 삭제"
                className="text-text-secondary hover:text-red-400 cursor-pointer"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSpeaker}
            className="text-[11px] px-2 py-1 rounded border border-accent/40 text-accent hover:bg-accent/10 cursor-pointer"
          >+ 화자 추가</button>
        </div>
      )}
    </div>
  )
}
