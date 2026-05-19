'use client'

import type { EpisodeData } from '../EpisodeEditor'
import type { Speaker, SpeakerEngine } from './SpeakerPanel'

/** 에피소드 파일명 → 인물 slug. -en 접미사, -숫자 변형 제거. */
export function nameToSlug(name: string): string {
  const base = name.endsWith('-en') ? name.slice(0, -3) : name
  const m = base.match(/^(.+)-\d+$/)
  return m ? m[1] : base
}

/**
 * 인물 본인의 활성 엔진 추론. 명시값(voiceEngine) 우선, 없으면 ELE 보이스 보유 여부로 추정한다.
 *
 * 인물 본인 줄(HostSpeakerRow)과 가상 화자 합성(buildHostSpeaker)이 같은 결정 규칙을 따라야
 * 한쪽만 바뀌어도 다른 한쪽의 행동이 갈리지 않는다.
 */
export function inferHostEngine(
  host: { voiceEngine?: SpeakerEngine; elevenlabsVoiceId?: string } | null | undefined,
): SpeakerEngine {
  return host?.voiceEngine ?? (host?.elevenlabsVoiceId ? 'elevenlabs' : 'gemini')
}

/** 인물 본인을 가상 Speaker로 합성한다. id='host' 고정, 색상은 accent gold. */
export function buildHostSpeaker(episode: EpisodeData): Speaker {
  const h = (episode?.host ?? {}) as {
    nickname?: string
    nickname_en?: string
    elevenlabsVoiceId?: string
    geminiVoice?: string
    voiceEngine?: SpeakerEngine
  }
  const engine = inferHostEngine(h)
  const voiceId = engine === 'gemini' ? (h.geminiVoice ?? '') : (h.elevenlabsVoiceId ?? '')
  const nick = h.nickname ?? h.nickname_en ?? '본인'
  return {
    id: 'host',
    label: `HOST · ${nick}`,
    color: '#c8a46e',
    engine,
    voiceId,
    elevenlabsVoiceId: h.elevenlabsVoiceId,
  }
}
