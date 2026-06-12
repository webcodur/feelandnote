import type { EpisodeData } from '../../EpisodeEditor'
import type { VoiceFile, VoiceSection, EngineKind } from '../../voice-utils'
import { type EleSettings, type EleSendOpts, BTN_SM } from '../types'

export const BTN_GEM = `${BTN_SM} bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed`

/** 생성 엔진 선택값 — 저장 슬롯(EngineKind)과 별개. gemini-v3(3.1)도 gemini 슬롯에 저장된다. */
export type GenEngine = EngineKind | 'gemini-v3'

export type ExpandedVoicePanelProps = {
  sectionKey: string
  section: VoiceSection
  episode: EpisodeData
  series: string
  name: string
  voiceId?: string
  eleSettings: EleSettings
  eleSendOpts: EleSendOpts
  onEleSendOptsChange: (o: EleSendOpts) => void
  activeEngine: string
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<unknown>
  onRefresh: () => void
  /** 음원을 슬롯에 저장한 직후, 그 엔진을 활성 슬롯으로 전환. 모달 밖 재생이 방금 만든 음원을 내보내게 한다. */
  onActivateEngine?: (engine: EngineKind) => void | Promise<void>
  /** 외부에서 제어되는 TRIM/SYNC/BREATH 모드. 모달 헤더의 탭 버튼이 이 상태를 가짐. */
  expandMode?: 'trim' | 'sync' | 'breath'
  /** 입력 텍스트 직접 주입 — episode 본문에서 못 찾는 구간(솔로 자유섹션 등)의 합성 원문. */
  overrideText?: string
  /** 캐릭터 보이스(Gemini 보이스명) 저장처 외부 주입 — 솔로 자유섹션처럼 episode 밖에 저장하는 구간용.
   *  주어지면 캐릭터 보이스 select 가 활성화되고, 선택값이 합성 spec·이 콜백에 모두 반영된다. */
  voiceOverride?: { value: string; onChange: (v: string) => void } | null
}

export type TempPreview = {
  engine: EngineKind
  key: string
  blobUrl: string
  base64: string
  duration: number
  /** 'wav' | 'mp3' — Gemini는 wav, ElevenLabs preview는 mp3 */
  format: 'wav' | 'mp3'
}
