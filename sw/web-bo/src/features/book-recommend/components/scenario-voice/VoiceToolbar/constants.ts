import { ELEVENLABS_TTS_DEFAULTS, type EleSettings } from '@feelandnote/shared/bo/voice-utils'

// ── ELE 슬라이더 설정 ──
// def는 "기본값과 다름" 표시의 기준선 — 실제 합성 기본값(ELEVENLABS_TTS_DEFAULTS)과 같아야 한다.

export const ELE_SLIDER_KEYS = ['stability', 'similarity_boost', 'style', 'speed', 'volumeBoost'] as const

export const ELE_SLIDER_CFG: Record<
  keyof EleSettings,
  { min: number; max: number; step: number; suffix?: string; def: number }
> = {
  stability: { min: 0, max: 1, step: 0.01, def: ELEVENLABS_TTS_DEFAULTS.stability },
  similarity_boost: { min: 0, max: 1, step: 0.01, def: ELEVENLABS_TTS_DEFAULTS.similarity_boost },
  style: { min: 0, max: 1, step: 0.01, def: ELEVENLABS_TTS_DEFAULTS.style },
  speed: { min: 0.5, max: 2, step: 0.1, def: ELEVENLABS_TTS_DEFAULTS.speed },
  volumeBoost: { min: 0, max: 12, step: 1, suffix: 'dB', def: 0 },
}
