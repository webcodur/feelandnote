import type { EleSettings } from '../types'

// ── ELE 슬라이더 설정 ──

export const ELE_SLIDER_KEYS = ['stability', 'similarity_boost', 'style', 'speed', 'volumeBoost'] as const

export const ELE_SLIDER_CFG: Record<
  keyof EleSettings,
  { min: number; max: number; step: number; suffix?: string; def: number }
> = {
  stability: { min: 0, max: 1, step: 0.01, def: 0.75 },
  similarity_boost: { min: 0, max: 1, step: 0.01, def: 0.75 },
  style: { min: 0, max: 1, step: 0.01, def: 0.0 },
  speed: { min: 0.5, max: 2, step: 0.1, def: 1.0 },
  volumeBoost: { min: 0, max: 12, step: 1, suffix: 'dB', def: 0 },
}
