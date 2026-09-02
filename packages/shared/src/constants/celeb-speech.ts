/** 셀럽 말투와 상황 대사의 서비스 공용 허용값. */
export const CELEB_SPEECH_TONES = [
  'loyal',
  'composed',
  'bold',
  'humble',
  'gentle',
  'free',
] as const

export type CelebSpeechTone = (typeof CELEB_SPEECH_TONES)[number]

export const CELEB_SPEECH_TONE_LABELS_KO: Record<CelebSpeechTone, string> = {
  loyal: '충의',
  composed: '침착',
  bold: '당돌',
  humble: '겸양',
  gentle: '온화',
  free: '호방',
}

export const CELEB_DIALOGUE_SITUATIONS = [
  'greeting',
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
] as const

export type CelebDialogueSituation = (typeof CELEB_DIALOGUE_SITUATIONS)[number]

export const CELEB_DIALOGUE_VARIANTS = [1, 2, 3] as const
export const CELEB_DIALOGUE_VARIANTS_PER_SITUATION = CELEB_DIALOGUE_VARIANTS.length

export function isCelebSpeechTone(value: unknown): value is CelebSpeechTone {
  return typeof value === 'string'
    && (CELEB_SPEECH_TONES as readonly string[]).includes(value)
}
