import type { FactionPerson } from '@/lib/faction-types'

/**
 * 음성 슬롯 — 한 인물의 '대사' 또는 '수식어' 나레이션 설정 한 벌.
 * 같은 음성 패널 UI(엔진·보이스·스타일·감정·미리듣기·트림)를 두 슬롯이 공유하되,
 * 읽고 쓰는 인물 필드와 음원 파일만 슬롯별로 다르다.
 */
export interface FactionVoiceSlot {
  id: 'quote' | 'epithet'
  /** 패널·모달 라벨 (예: '대사 음성' / '수식어 음성') */
  label: string
  /** 음원 파일 종류 — factionVoiceFile 의 kind */
  fileKind: 'quote' | 'epithet'
  /** 발화 시각 보정(싱크) 탭 노출 여부 — 수식어는 청크가 없어 미노출 */
  hasSync: boolean
  /** 합성 텍스트 산출 */
  text: (p: FactionPerson) => string
  /** 인물 필드 키 매핑 (대사·수식어 1:1 대응) */
  fields: {
    engine: 'quoteEngine' | 'epithetEngine'
    speaker: 'quoteSpeaker' | 'epithetSpeaker'
    style: 'quoteStyle' | 'epithetStyle'
    eleVoiceId: 'quoteElevenlabsVoiceId' | 'epithetElevenlabsVoiceId'
    eleOptions: 'quoteEleOptions' | 'epithetEleOptions'
    eleEmotions: 'quoteEleEmotions' | 'epithetEleEmotions'
    eleTrail: 'quoteEleTrail' | 'epithetEleTrail'
    duration: 'quoteDuration' | 'epithetDuration'
    gain: 'quoteGainDb' | 'epithetGainDb'
    rate: 'quotePlaybackRate' | 'epithetPlaybackRate'
  }
}

export const QUOTE_SLOT: FactionVoiceSlot = {
  id: 'quote',
  label: '대사 음성',
  fileKind: 'quote',
  hasSync: true,
  text: p => (p.quoteChunks?.map(c => c.trim()).filter(Boolean).join(' ') || p.quote || '').trim(),
  fields: {
    engine: 'quoteEngine', speaker: 'quoteSpeaker', style: 'quoteStyle',
    eleVoiceId: 'quoteElevenlabsVoiceId', eleOptions: 'quoteEleOptions',
    eleEmotions: 'quoteEleEmotions', eleTrail: 'quoteEleTrail',
    duration: 'quoteDuration', gain: 'quoteGainDb', rate: 'quotePlaybackRate',
  },
}

export const EPITHET_SLOT: FactionVoiceSlot = {
  id: 'epithet',
  label: '수식어 음성',
  fileKind: 'epithet',
  hasSync: false,
  text: p => (p.epithet ?? '').trim(),
  fields: {
    engine: 'epithetEngine', speaker: 'epithetSpeaker', style: 'epithetStyle',
    eleVoiceId: 'epithetElevenlabsVoiceId', eleOptions: 'epithetEleOptions',
    eleEmotions: 'epithetEleEmotions', eleTrail: 'epithetEleTrail',
    duration: 'epithetDuration', gain: 'epithetGainDb', rate: 'epithetPlaybackRate',
  },
}
