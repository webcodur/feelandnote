/**
 * 셀럽 음성 R2 경로 단일 원천 (web-bo)
 *
 * R2 키: celebs/{id}/voice/{locale}/{prefix}{variant}.mp3 (고정 경로, 덮어쓰기)
 * URL:   {R2_PUBLIC_URL}/{key}?v={voice_v}                (캐시 버스터)
 *
 * voice_v는 경로가 아닌 쿼리 파라미터로만 사용.
 * 부분 업로드 시 나머지 파일이 404되는 문제를 원천 차단한다.
 */

import {
  CELEB_DIALOGUE_SITUATIONS,
  CELEB_DIALOGUE_VARIANTS,
  type CelebDialogueSituation,
} from '@feelandnote/shared/constants/celeb-speech'
import { R2_PUBLIC_URL } from '@/lib/r2'

export const DIALOGUE_TYPES = CELEB_DIALOGUE_SITUATIONS

export type DialogueType = CelebDialogueSituation

export const TYPE_PREFIX: Record<string, string> = {
  greeting: 'g', roll_call: 'r', deploy: 'd',
  battle_win: 'bw', battle_draw: 'bd', battle_lose: 'bl', clash_attack: 'c',
}

export const TYPE_LABELS: Record<string, string> = {
  greeting: '인사', roll_call: '호명', deploy: '출전',
  battle_win: '승리', battle_draw: '무승부', battle_lose: '패배', clash_attack: '공격',
}

export const VARIANTS = CELEB_DIALOGUE_VARIANTS
export const LOCALES = ['ko', 'en'] as const

/** 대사 유형 → 파일명 (e.g. "g1.mp3", "quote.mp3") */
export function voiceFileName(type: string, variant?: number): string | null {
  if (type === 'quote') return 'quote.mp3'
  const prefix = TYPE_PREFIX[type]
  if (!prefix || !variant) return null
  return `${prefix}${variant}.mp3`
}

/** R2 오브젝트 키 (고정 경로, 버전 없음) */
export function voiceR2Key(celebId: string, locale: string, fileName: string): string {
  return `celebs/${celebId}/voice/${locale}/${fileName}`
}

/** R2 퍼블릭 URL (voice_v를 쿼리 파라미터로 캐시 버스팅) */
export function voicePublicUrl(celebId: string, locale: string, fileName: string, voiceV = 0): string {
  const base = `${R2_PUBLIC_URL}/${voiceR2Key(celebId, locale, fileName)}`
  return voiceV > 0 ? `${base}?v=${voiceV}` : base
}

/** 전체 슬롯 목록 (대사 7종 × 3변형 + 명언 = 22개) */
export function allVoiceSlots(): { type: string; variant?: number; fileName: string; label: string }[] {
  const slots: { type: string; variant?: number; fileName: string; label: string }[] = []
  for (const type of DIALOGUE_TYPES) {
    const prefix = TYPE_PREFIX[type]
    for (const v of VARIANTS) {
      slots.push({ type, variant: v, fileName: `${prefix}${v}.mp3`, label: `${TYPE_LABELS[type]} ${v}` })
    }
  }
  slots.push({ type: 'quote', fileName: 'quote.mp3', label: '명언' })
  return slots
}
