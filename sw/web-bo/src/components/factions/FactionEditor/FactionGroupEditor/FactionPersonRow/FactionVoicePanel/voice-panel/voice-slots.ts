import type { FactionPerson } from '@/lib/faction-types'
import type { EditLang } from '@feelandnote/shared/bo/editor'

/**
 * 편집 언어에 따라 갈리는 필드 — 합성 엔진과 ElevenLabs 목소리 둘뿐이다.
 *
 * 나머지(발화 스타일·감정 표식·끝 패딩·길이·음량·배속)는 **가르지 않는다.** 음원 파일이 언어 공용
 * (`voice/FxxCxxPxx-quote.wav` 한 자리)이라 길이·음량·배속은 언어를 나눌 자리 자체가 없고,
 * 스타일·감정은 인물의 말투라 언어가 달라도 같은 값을 쓰는 편이 자연스럽다.
 */
export interface FactionVoiceLangFields {
  eleVoiceId: keyof FactionPerson
}

/**
 * 목소리를 가르는 언어는 둘뿐이다. 편집 언어에는 「양쪽 함께 보기」가 있지만 목소리는 하나만 골라야 하므로
 * 그 상태는 국문으로 본다(글은 양쪽을 나란히 고치되 목소리는 국문 칸을 만진다).
 */
export type FactionVoiceLang = 'ko' | 'en'

/** 편집 언어 → 목소리 언어. 「양쪽 함께」는 국문으로 접는다 */
export function voiceLangOf(lang: EditLang | undefined): FactionVoiceLang {
  return lang === 'en' ? 'en' : 'ko'
}

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
  /**
   * 언어별 필드 — 편집 언어(ko/en)에 따라 ElevenLabs 목소리를 다른 칸에 읽고 쓴다.
   * `fields.engine`·`fields.eleVoiceId` 는 국문 칸과 같은 값이라, 언어를 모르는 옛 호출부는 그대로 국문을 본다.
   */
  langFields: Record<FactionVoiceLang, FactionVoiceLangFields>
}

/** 편집 언어에 맞는 ElevenLabs 목소리 칸 — 언어를 모르거나 「양쪽 함께」면 국문 칸 */
export function langFieldsOf(slot: FactionVoiceSlot, lang: EditLang | undefined): FactionVoiceLangFields {
  return slot.langFields[voiceLangOf(lang)]
}

/**
 * 보이스를 배정할 때 인물에 적을 값 — 목소리 칸과, 비어 있으면 도감 음량까지.
 *
 * 음량을 함께 적는 이유: 영상 렌더는 대본 파일의 인물 음량만 읽고 보이스 도감을 모른다.
 * 내보내기가 도감을 참조해 파일에 끼워 넣으면 DB에 없는 값이 파일에 생겨 왕복 검증이 깨지므로,
 * **배정하는 이 순간 데이터에 명시적으로 남긴다.** 이미 사람이 정한 음량이 있으면 건드리지 않는다.
 *
 * 순수 함수로 뺀 이유는 화면 없이도 규칙을 검증할 수 있어야 하기 때문이다.
 */
export function buildVoiceAssignPatch(
  person: Partial<Record<string, unknown>>,
  slot: FactionVoiceSlot,
  lang: EditLang | undefined,
  voiceId: string,
  catalogGainDb: number | undefined,
): Record<string, unknown> {
  const L = langFieldsOf(slot, lang)
  const id = voiceId.trim()
  const patch: Record<string, unknown> = { [L.eleVoiceId]: id || undefined }
  if (id && catalogGainDb != null && person[slot.fields.gain] == null) {
    patch[slot.fields.gain] = catalogGainDb
  }
  return patch
}

export const QUOTE_SLOT: FactionVoiceSlot = {
  id: 'quote',
  label: '대사 음성',
  fileKind: 'quote',
  hasSync: true,
  text: p => (p.quoteChunks?.map(c => c.trim()).filter(Boolean).join(' ') || p.quote || '').trim(),
  fields: {
    speaker: 'quoteSpeaker', style: 'quoteStyle',
    eleVoiceId: 'quoteElevenlabsVoiceId', eleOptions: 'quoteEleOptions',
    eleEmotions: 'quoteEleEmotions', eleTrail: 'quoteEleTrail',
    duration: 'quoteDuration', gain: 'quoteGainDb', rate: 'quotePlaybackRate',
  },
  langFields: {
    ko: { eleVoiceId: 'quoteElevenlabsVoiceId' },
    en: { eleVoiceId: 'quoteElevenlabsVoiceIdEn' },
  },
}

export const EPITHET_SLOT: FactionVoiceSlot = {
  id: 'epithet',
  label: '수식어 음성',
  fileKind: 'epithet',
  hasSync: false,
  text: p => (p.epithet ?? '').trim(),
  fields: {
    speaker: 'epithetSpeaker', style: 'epithetStyle',
    eleVoiceId: 'epithetElevenlabsVoiceId', eleOptions: 'epithetEleOptions',
    eleEmotions: 'epithetEleEmotions', eleTrail: 'epithetEleTrail',
    duration: 'epithetDuration', gain: 'epithetGainDb', rate: 'epithetPlaybackRate',
  },
  langFields: {
    ko: { eleVoiceId: 'epithetElevenlabsVoiceId' },
    en: { eleVoiceId: 'epithetElevenlabsVoiceIdEn' },
  },
}
