/**
 * 음성 타이밍 공통 타입 — 시리즈 무관 단일원천(SSoT).
 *
 * BookRecommend·Faction 등 모든 시리즈가 이 타입을 공유한다.
 * 각 시리즈의 types.ts는 여기서 재export 한다(명목 일치 유지).
 */

/** 음성 한 구간의 타이밍 — 단위는 초(second). */
export type VoiceTimingSegment = {
  start: number; end: number; text?: string
  /** 자막 표시용 의미 단위 분할 — LLM이 지정. 없으면 text 그대로 사용 */
  sub?: string[]
  /** sub 경계 시점 (초) — analyze가 단어 타이밍에서 산출. sub.length - 1개. 없으면 글자수 비례 폴백 */
  subTimings?: number[]
  /** 단어 단위 타이밍 — anchor의 word-level 매칭에 사용. analyze가 자동 채움 */
  words?: { text: string; start: number; end: number }[]
}

/** wav 키(파일 stem) → 구간 배열 */
export type VoiceTimings = Record<string, VoiceTimingSegment[]>

/** 자막 한 조각 — start/end 는 프레임(frame). 자막·SRT 생성 공통. */
export type Sub = { start: number; end: number; speaker: string; text: string; synthetic?: boolean }
