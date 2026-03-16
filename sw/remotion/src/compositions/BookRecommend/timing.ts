/**
 * 타이밍 상수 + 계산 함수 — 단일원천(SSoT)
 *
 * BookRecommend.tsx, BookCardVisual.tsx, Subtitles.tsx, Overlay.tsx가 모두 이 파일에서 import한다.
 * 상수 변경 시 이 파일만 수정하면 된다.
 */

export const FPS = 60

/** 초 → 프레임 변환 (애니메이션용, 버퍼 없음) */
export const f = (sec: number) => Math.round(sec * FPS)

/** 섹션 프레임 (오디오 + 0.5초 버퍼). 타이밍 배치용. */
export const toFrames = (sec: number) => Math.ceil(sec * FPS) + Math.round(0.5 * FPS)
/** 순수 오디오 프레임 (버퍼 없음). 자막·하이라이트 분배용. */
export const toAudioFrames = (sec: number) => Math.ceil(sec * FPS)

export const BRAND_FRAMES = f(4)           // 240
export const CELEB_VISUAL_DELAY = f(2.5)   // 150

// --- 섹션 라벨 타이밍 ---
// 흐름: 이전 오디오 끝 → PRE_LABEL_GAP → 라벨 읽기(LABEL_FRAMES) → POST_LABEL_GAP → 본문 오디오
/** 라벨 오디오 전 무음 */
export const PRE_LABEL_GAP = f(0.4)        // 24
/** "핵심 요약" 라벨 기본 프레임 (JSON duration 없을 때 폴백) */
export const LABEL_FRAMES = f(1.33)        // 80
/** "추천 및 감상경위" 라벨 기본 프레임 (JSON duration 없을 때 폴백) */
export const LABEL_CONTEXT_FRAMES = f(1.83) // 110
/** 라벨 오디오 후 무음 */
export const POST_LABEL_GAP = f(0.4)       // 24

/** JSON duration → 라벨 프레임 변환 (duration 있으면 사용, 없으면 폴백) */
export const labelSummaryFrames = (dur?: number) => dur ? toAudioFrames(dur) + f(0.33) : LABEL_FRAMES
export const labelContextFrames = (dur?: number) => dur ? toAudioFrames(dur) + f(0.33) : LABEL_CONTEXT_FRAMES

/** 제목 → 요약 사이 총 갭 (라벨 포함) */
export const titleSummaryGap = (labelDur?: number) => PRE_LABEL_GAP + labelSummaryFrames(labelDur) + POST_LABEL_GAP
/** 요약 → 경위 사이 총 갭 (라벨 포함) */
export const summaryContextGap = (labelDur?: number) => PRE_LABEL_GAP + labelContextFrames(labelDur) + POST_LABEL_GAP

/** 하위호환: 고정값 (JSON duration 없는 에피소드용) */
export const TITLE_SUMMARY_GAP = PRE_LABEL_GAP + LABEL_FRAMES + POST_LABEL_GAP
export const SUMMARY_CONTEXT_GAP = PRE_LABEL_GAP + LABEL_CONTEXT_FRAMES + POST_LABEL_GAP

/** 맥락 → 셀럽 인용 사이 갭 (인용 있을 때만) */
export const CONTEXT_QUOTE_GAP = f(3)      // 180
/** 인용 → 후속 맥락 사이 갭 */
export const QUOTE_CONTEXTAFTER_GAP = f(0.67) // 40
/** 책 사이 전환 프레임 */
export const BOOK_GAP = f(3)               // 180
/** 중간안내 프레임 (10개 초과 시 삽입) */
export const INTERLUDE_FRAMES = f(4)       // 240
/** 리캡 섹션 프레임 */
export const RECAP_FRAMES = f(5)           // 300
/** 로고 섹션 프레임 */
export const LOGO_FRAMES = f(3)            // 180

// --- 폴백 프레임 (JSON duration 없는 에피소드용) ---
/** 셀럽 소개 폴백 (celebIntroDuration 없을 때) */
export const CELEB_INTRO_FALLBACK = f(5)   // 300
/** 브릿지 폴백 (bridgeDuration 없을 때) */
export const BRIDGE_FALLBACK = f(3.5)      // 210
/** 아웃트로 폴백 (outroDuration 없을 때) */
export const OUTRO_FALLBACK = f(4)         // 240
/** continuation: returnIntro 폴백 */
export const RETURN_INTRO_FALLBACK = f(3)  // 180
/** continuation: prevRecap 폴백 */
export const PREV_RECAP_FALLBACK = f(5)    // 300

/** 문장 간 호흡 프레임 — TTS가 문장 사이에 쉬는 시간 보정 */
export const SENTENCE_BREATH = f(0.27)     // 16

// --- 계산 함수 ---

export type BookDurations = {
  titleDuration: number
  summaryDuration: number
  contextDuration: number
  quoteDuration?: number
  contextAfterDuration?: number
}

/** 라벨 duration 쌍 (narrator에서 추출) */
export type LabelDurations = {
  labelSummaryDuration?: number
  labelContextDuration?: number
}

/** title + gap(라벨 포함) + summary 끝 */
export const summaryPhaseEnd = (b: BookDurations, ld?: LabelDurations) =>
  toFrames(b.titleDuration) + titleSummaryGap(ld?.labelSummaryDuration) + toFrames(b.summaryDuration)

/** summary + gap(라벨 포함) + context 끝 */
export const contextPhaseEnd = (b: BookDurations, ld?: LabelDurations) =>
  summaryPhaseEnd(b, ld) + summaryContextGap(ld?.labelContextDuration) + toFrames(b.contextDuration)

/** 인용문 끝 */
export const quotePhaseEnd = (b: BookDurations, ld?: LabelDurations) =>
  b.quoteDuration
    ? contextPhaseEnd(b, ld) + CONTEXT_QUOTE_GAP + toFrames(b.quoteDuration)
    : contextPhaseEnd(b, ld)

/** 전체 (인용문 + 후속 맥락 포함) */
export const bookTotalFrames = (b: BookDurations, ld?: LabelDurations) => {
  if (!b.quoteDuration) return contextPhaseEnd(b, ld)
  const qEnd = quotePhaseEnd(b, ld)
  if (!b.contextAfterDuration) return qEnd
  return qEnd + QUOTE_CONTEXTAFTER_GAP + toFrames(b.contextAfterDuration)
}

// --- 쇼츠(9:16) 타이밍 ---

import type { ShortSegment } from './types'

/** 세그먼트 간 전환 프레임 */
export const SHORT_GAP = f(0.4)            // 24
/** duration 없는 세그먼트 폴백 프레임 */
export const SHORT_FALLBACK = f(2.5)       // 150
/** 채널 안내 (BrandIntro) 프레임 — hook 직후 삽입 */
export const SHORT_BRAND_FRAMES = f(2.5)   // 150
/** 로고 프레임 */
export const SHORT_LOGO_FRAMES = f(3)      // 180

/** 세그먼트 배열 → 총 프레임 (hook 뒤 BrandIntro 포함) */
export const shortTotalFrames = (segments: ShortSegment[]) => {
  let total = 0
  for (let i = 0; i < segments.length; i++) {
    total += segments[i].duration ? toFrames(segments[i].duration!) : SHORT_FALLBACK
    total += SHORT_GAP
    // hook 세그먼트 뒤에 BrandIntro 삽입
    if (i === 0) total += SHORT_BRAND_FRAMES + SHORT_GAP
  }
  total += SHORT_LOGO_FRAMES
  return total
}
