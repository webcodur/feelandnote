// 세력도 미리보기용 길이·컷 계산. 실제 렌더 타이밍과 별개의 추정치.

import type { FactionScript } from '@/lib/faction-types'

export const INTRO_SEC = 2.5
export const GROUP_SEC = 1.8
export const PERSON_SEC = 1.1
export const OUTRO_SEC = 3.0

/** 등장 인물 총수 */
export function totalPeople(script: FactionScript): number {
  return (script.groups ?? []).reduce((sum, g) => sum + (g.people?.length ?? 0), 0)
}

/** 영상 총 길이(초) 추정 */
export function totalSec(script: FactionScript): number {
  const groups = script.groups ?? []
  const groupsSec = groups.reduce(
    (sum, g) => sum + GROUP_SEC + PERSON_SEC * (g.people?.length ?? 0),
    0,
  )
  return INTRO_SEC + groupsSec + OUTRO_SEC
}

/** 컷 수 추정 (타이틀 + 세력들 + 인물들 + 엔딩) */
export function cueCount(script: FactionScript): number {
  const groups = script.groups ?? []
  return 1 + groups.length + totalPeople(script) + 1
}

/** 초 → mm:ss */
export function formatMmss(sec: number): string {
  const total = Math.max(0, Math.round(sec))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * 이미지 표시 src 계산.
 * http로 시작하면 그대로, 아니면 에피소드 이미지 서빙 경로로 변환.
 */
export function imageSrc(series: string, episodeName: string, image?: string): string | undefined {
  if (!image) return undefined
  if (image.startsWith('http')) return image
  return `/api/${series}/faction-image/${episodeName}/${image}`
}

/** 이름에서 이니셜 한 글자 추출 */
export function initial(name: string): string {
  const trimmed = (name ?? '').trim()
  return trimmed ? trimmed[0] : '?'
}
