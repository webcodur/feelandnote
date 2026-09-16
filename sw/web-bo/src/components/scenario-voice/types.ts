import { ELEVENLABS_TTS_DEFAULTS, type EleSettings } from '@feelandnote/shared/bo/voice-utils'

// ── Types ──

export type VoiceSelect = { default: string; slots?: Record<string, string> } | null
export type EleSendOpts = { emotionEnabled: boolean; emotions: string[]; trailEnabled: boolean }

// ── Constants ──

export const DEFAULT_ELE_SETTINGS: EleSettings = {
  stability: ELEVENLABS_TTS_DEFAULTS.stability,
  similarity_boost: ELEVENLABS_TTS_DEFAULTS.similarity_boost,
  style: ELEVENLABS_TTS_DEFAULTS.style,
  speed: ELEVENLABS_TTS_DEFAULTS.speed,
  volumeBoost: 0,
}
export const DEFAULT_ELE_SEND_OPTS: EleSendOpts = { emotionEnabled: true, emotions: [], trailEnabled: true }

// Gemini TTS 보이스 목록 — 단일 원천은 shared/lib/voice-policy.ts.
// segment.geminiVoice 오버라이드 / 캐릭터 보이스 단일 생성 양쪽에서 공용.
export { GEMINI_VOICES_MALE, GEMINI_VOICES_FEMALE } from '@feelandnote/shared/lib/voice-policy'

export function buildEleText(text: string, opts: EleSendOpts): string {
  let t = text
  if (opts.emotionEnabled && opts.emotions.length > 0) t = `[${opts.emotions.join(', ')}] ${t}`
  if (opts.trailEnabled) t = `${t} ... ... ...`
  return t
}

export const BTN_SM = 'px-2 py-0.5 rounded text-[10px] font-semibold'
export const BTN_ELE = `${BTN_SM} bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30`

// ── Voice meta types (신규, 추후 신기능 활용) ──

/** 셀럽 발화별 voice 메타 (locale 공용) */
export type VoiceMeta = {
  /** ElevenLabs 합성 prefix 감정 태그. 0~2개. 감정 어휘 목록은 components/voice 의 ELE_EMOTIONS. */
  tags?: string[]
  /** 본문 끝에 ' ... ... ...' 추가 여부. */
  trail?: boolean
  /** 자막 단어 강조. wordIndex는 본문 단어 0-based. ko·en 단어수 다르므로 locale별 저장. */
  emphasis?: Array<{
    wordIndex: number[]
    type: 'bold' | 'italic'
  }>
}

/** voice.tags 비어있을 때 적용되는 panel default fallback */
export type VoiceMetaContext = {
  defaultTags: string[]
  defaultTrail: boolean
}
