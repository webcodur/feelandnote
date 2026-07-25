'use client'

/**
 * 음성 설정 한 벌 — 인물 기본값(Speaker.voice)과 발언 덮어쓰기(Turn.voice)가 같은 폼을 쓴다.
 *
 * 담화는 인물 1명이 여러 번 말하므로 설정을 인물에 두고 발언이 필요할 때만 덮어쓴다
 * (팩션은 인물 필드에 대사·수식어 두 벌을 평면으로 늘어놓는다 — 담화는 묶어서 계승한다).
 * 보이스 목록은 이미 있는 선택기(GeminiVoiceSelect)를 그대로 쓴다.
 */

import type { DiscourseVoice, DiscourseEngine } from '@/lib/discourse-types'
import { GeminiVoiceSelect } from '@/components/scenario-voice/GeminiVoiceSelect'
import { EleEmotionPicker } from '@/components/voice'

type Props = {
  title: string
  hint?: string
  voice?: DiscourseVoice
  onChange: (next?: DiscourseVoice) => void
  /** 상위(인물) 설정 — 발언 덮어쓰기 폼에서 "따로 정하지 않으면 무엇이 쓰이는지" 알린다 */
  inherited?: DiscourseVoice
}

const ENGINES: { value: DiscourseEngine; label: string }[] = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'gemini-v3', label: 'Gemini v3' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
]

export function VoiceFields({ title, hint, voice, onChange, inherited }: Props) {
  const v = voice ?? {}
  const engine = v.engine ?? inherited?.engine ?? 'gemini'
  const isEle = engine === 'elevenlabs'

  // 설정이 텅 비면 필드째 지운다 — 데이터 파일에 빈 껍데기를 남기지 않는다
  const set = (patch: Partial<DiscourseVoice>) => {
    const next = { ...v, ...patch }
    const empty = Object.values(next).every(x => x == null || x === '' || (Array.isArray(x) && x.length === 0))
    onChange(empty ? undefined : next)
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-bg-main/40 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text-secondary">{title}</span>
        {voice && (
          <button onClick={() => onChange(undefined)} className="text-[11px] text-text-secondary hover:text-accent">
            설정 비우기
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
          엔진
          <select
            value={v.engine ?? ''}
            onChange={e => set({ engine: (e.target.value || undefined) as DiscourseEngine | undefined })}
            className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
          >
            <option value="">{inherited?.engine ? `따름 (${inherited.engine})` : '기본 (Gemini)'}</option>
            {ENGINES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </span>

        {!isEle && (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
            보이스
            <GeminiVoiceSelect
              value={v.speaker ?? ''}
              onChange={next => set({ speaker: next || undefined })}
              placeholderLabel={inherited?.speaker ? `따름 (${inherited.speaker})` : '기본'}
            />
          </span>
        )}

        {isEle && (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
            보이스 ID
            <input
              value={v.elevenlabsVoiceId ?? ''} placeholder="ElevenLabs voice id"
              onChange={e => set({ elevenlabsVoiceId: e.target.value || undefined })}
              className="w-52 rounded-md border border-border bg-bg-card px-2 py-1 font-mono text-[11px] focus:border-accent focus:outline-none"
            />
          </span>
        )}
      </div>

      <div className="flex items-start gap-2">
        <label className="mt-1.5 w-16 shrink-0 text-xs text-text-dim">말투 지시</label>
        <input
          value={v.style ?? ''} placeholder={inherited?.style ? `따름 — ${inherited.style}` : '낮고 단단하게, 감정을 누른 채'}
          onChange={e => set({ style: e.target.value || undefined })}
          className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
        />
      </div>

      {isEle && (
        <div className="space-y-2 border-t border-border pt-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="낮을수록 표현이 살고, 높을수록 안정적이다">
              안정도
              <input
                type="range" min={0} max={1} step={0.05}
                value={v.eleOptions?.stability ?? 0.5}
                onChange={e => set({ eleOptions: { ...v.eleOptions, stability: Number(e.target.value) } })}
                className="w-24 accent-accent"
              />
              <span className="w-8 text-right font-mono text-[10px]">{(v.eleOptions?.stability ?? 0.5).toFixed(2)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
              표현 강도
              <input
                type="range" min={0} max={1} step={0.05}
                value={v.eleOptions?.style ?? 0}
                onChange={e => set({ eleOptions: { ...v.eleOptions, style: Number(e.target.value) } })}
                className="w-24 accent-accent"
              />
              <span className="w-8 text-right font-mono text-[10px]">{(v.eleOptions?.style ?? 0).toFixed(2)}</span>
            </span>
            <label className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="끝 음절이 잘리지 않게 뒤에 여백을 붙인다">
              <input
                type="checkbox"
                checked={v.eleTrail !== false}
                onChange={e => set({ eleTrail: e.target.checked ? undefined : false })}
                className="accent-accent"
              />
              끝 여백 붙이기
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-text-dim">감정 표식 (2개까지)</span>
            <EleEmotionPicker
              value={v.eleEmotions ?? []}
              onChange={next => set({ eleEmotions: next.length ? next : undefined })}
              tone="dark"
            />
          </div>
          <p className="text-[11px] text-text-dim">
            감정 표식이 대사 맨 앞에 붙으면 첫 구절이 통째로 빠져 들립니다. 첫 마디가 잘리면 이 표식부터 확인하세요.
          </p>
        </div>
      )}

      {hint && <p className="text-[11px] text-text-dim">{hint}</p>}
    </div>
  )
}
