import type { DbVoice } from './types'

// 외부에서 DB 미러 비교용으로도 쓰는 헬퍼 — currentEleId vs DB 불일치 판정
export function isVoiceMismatch(currentEleId: string, dbVoice: DbVoice | null, locale: 'ko' | 'en'): boolean {
  if (!currentEleId) return false
  const dbId = locale === 'ko' ? dbVoice?.voice_id_ko : dbVoice?.voice_id_en
  if (!dbId) return false
  return currentEleId !== dbId
}
