/**
 * 타이밍 상수 + 계산 함수 — 단일원천(SSoT)
 *
 * BookRecommend.tsx, BookCardVisual.tsx, Subtitles.tsx, Overlay.tsx가 모두 이 파일에서 import한다.
 * 상수 변경 시 이 파일만 수정하면 된다.
 */

export const FPS = 60

/** 초 → 프레임 변환 (애니메이션용, 버퍼 없음) */
export const f = (sec: number) => Math.round(sec * FPS)

/** 섹션 프레임 (오디오 + 1.5초 버퍼). 타이밍 배치용. fadeOut(1초) + 여운(0.5초). */
export const toFrames = (sec: number) => Math.ceil(sec * FPS) + Math.round(1.5 * FPS)
/** 인용(quote/after) 전용 섹션 프레임. 짧은 0.5초 버퍼만 사용.
 *  연속 인용 사이에 긴 무음이 쌓이는 것을 방지한다. fadeOut(0.25초) + 여운(0.25초). */
export const toQuoteFrames = (sec: number) => Math.ceil(sec * FPS) + Math.round(0.5 * FPS)
/** 순수 오디오 프레임 (버퍼 없음). 자막·하이라이트 분배용. */
export const toAudioFrames = (sec: number) => Math.ceil(sec * FPS)

export const BRAND_FRAMES = f(2.5)         // 150
export const CELEB_VISUAL_DELAY = f(2.5)   // 150

// --- 섹션 라벨 타이밍 ---
// 흐름: 이전 오디오 끝 → PRE_LABEL_GAP → 라벨 읽기(LABEL_FRAMES) → POST_LABEL_GAP → 본문 오디오
/** 라벨 오디오 전 무음 */
export const PRE_LABEL_GAP = f(0.4)        // 24
/** "핵심 요약" 라벨 기본 프레임 (JSON duration 없을 때 폴백) */
export const LABEL_FRAMES = f(1.33)        // 80
/** "감상경위" 라벨 기본 프레임 (JSON duration 없을 때 폴백) */
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

/** 맥락 → 셀럽 인용 사이 갭 (인용 있을 때만).
 *  toQuoteFrames(0.5초 버퍼)와 합쳐 각 인용 앞 총 ~1.0초 무음을 확보한다. */
export const CONTEXT_QUOTE_GAP = f(0.5)    // 30
/** 인용 → 후속 맥락 사이 갭 */
export const QUOTE_CONTEXTAFTER_GAP = f(0.4) // 24
/** 책 사이 전환 프레임 */
export const BOOK_GAP = f(3)               // 180
/** 중간안내 프레임 (10개 초과 시 삽입) */
export const INTERLUDE_FRAMES = f(4)       // 240
/** 리캡 섹션 프레임 (포스터형 + 테이블형) */
export const RECAP_FRAMES = f(9)           // 540
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

export type QuotePairDurations = {
  quoteDuration?: number
  afterDuration?: number
}

export type BookDurations = {
  titleDuration: number
  summaryDuration: number
  contextDuration: number
  quotePairs?: QuotePairDurations[]
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

/** 모든 quotePairs를 순회하여 마지막 프레임 위치를 반환 */
export function quotePairsEnd(b: BookDurations, ld?: LabelDurations): number {
  const ctxEnd = contextPhaseEnd(b, ld)
  if (!b.quotePairs?.length) return ctxEnd
  let cursor = ctxEnd
  for (const pair of b.quotePairs) {
    if (pair.quoteDuration) {
      cursor += CONTEXT_QUOTE_GAP + toQuoteFrames(pair.quoteDuration)
    }
    if (pair.afterDuration) {
      cursor += QUOTE_CONTEXTAFTER_GAP + toQuoteFrames(pair.afterDuration)
    }
  }
  return cursor
}

/** 전체 (context + quotePairs 전부 포함) */
export const bookTotalFrames = (b: BookDurations, ld?: LabelDurations) =>
  quotePairsEnd(b, ld)

// --- 쇼츠(9:16) 타이밍 ---

import type { BookRecommendScript, ShortSegment } from './types'

/** continuation(2부 이상) 판별 */
export const isContinuation = (ep: BookRecommendScript) => (ep.series?.part ?? 1) > 1

/** 쇼츠 세그먼트 프레임 (오디오 + 0.3초 여운) */
export const toShortFrames = (sec: number) => Math.ceil(sec * FPS) + f(0.3)
/** 세그먼트 간 전환 프레임 */
export const SHORT_GAP = f(0.2)            // 12
/** hook → 다음 세그먼트 전환 갭 — 훅 여운 + 인트로 호흡 (부드럽고 천천히) */
export const SHORT_HOOK_GAP = f(0.6)       // 36
/** celeb 인용 세그먼트 앞 전환 갭 — 화자 전환 호흡 (narrator → celeb) */
export const SHORT_PRE_CELEB_GAP = f(0.7)  // 42
/** celeb 인용 세그먼트 후 전환 갭 — 인용 여운 + 화자 전환 호흡 */
export const SHORT_CELEB_GAP = f(1.05)     // 63
/** 마지막 세그먼트 이미지 홀드 — 나레이션 끝난 뒤 닫힘 전 여운 */
export const SHORT_OUTRO_HOLD = f(1.2)     // 72
/** 마지막 세그먼트 → 로고 갭 (= 닫힘 페이즈 길이) */
export const SHORT_OUTRO_GAP = f(0.5)      // 30
/** duration 없는 세그먼트 폴백 프레임 */
export const SHORT_FALLBACK = f(2.5)       // 75
/** hook 프레임 — 텍스트 떠오름 + 여운 */
export const SHORT_HOOK_FRAMES = f(3.5)    // 105
export const SHORT_BRAND_FRAMES = f(2.5)   // 150
/** 로고 프레임 (기본) */
export const SHORT_LOGO_FRAMES = f(3)      // 180
/** 로고 프레임 (BGM 있을 때 — 느린 페이드아웃) */
export const SHORT_LOGO_FRAMES_BGM = f(5)  // 300
/** 오프닝 리빌 (chime + 아바타+포스터) */
export const SHORT_REVEAL_FRAMES = f(2.0)  // 120
/** 리빌 → 첫 세그먼트 갭 (배경 전환 여유) */
export const SHORT_REVEAL_GAP = f(1.0)     // 60
/** 아웃트로 닫힘 페이즈 — BG 소멸 + 다크 블록 진입 (SHORT_OUTRO_GAP과 매칭) */
export const SHORT_OUTRO_CLOSE = f(0.5)    // 30
/** 아웃트로 열림 페이즈 — 닫힘 완료 후 logoStart부터 로고(인물·책·정보) 전체 페이드인 */
export const SHORT_OUTRO_OPEN = f(1.1)     // 66
/** 로고 콘텐츠 페이드아웃 (BGM 유무) */
export const SHORT_LOGO_FADE_OUT = f(0.5)      // 30
export const SHORT_LOGO_FADE_OUT_BGM = f(1.5)  // 90
/** 세그먼트 레이아웃 — 단일원천. BookRecommendShort, generate-srt 모두 이 함수를 사용한다.
 *
 * duration 우선순위: seg.duration(TTS) > imageMinFrames(이미지당 2초) > fallback
 * imageMinFrames는 duration 미설정 프리뷰에서 이미지가 크로스페이드 안에 묻히지 않도록 보장한다. */
export function shortSegLayout(segments: ShortSegment[]) {
  const segTimings = segments.map((seg, i) => {
    const fallback = i === 0 ? SHORT_HOOK_FRAMES : SHORT_FALLBACK
    // imageChangeAt이 있으면 이미지당 최소 2초 확보 (크로스페이드 0.5초 고려)
    const imageCount = seg.imageChangeAt
      ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt.length : 1)
      : 0
    const imageMinFrames = imageCount > 0 ? f(imageCount * 2) : 0

    const base = seg.duration ? toShortFrames(seg.duration) : fallback
    // 마지막 세그먼트: outro hold — 로고 전환 완충
    const isLast = i === segments.length - 1
    const tailHold = isLast ? SHORT_OUTRO_HOLD : 0
    return Math.max(base, imageMinFrames) + tailHold
  })

  const segStarts: number[] = []
  let cursor = SHORT_REVEAL_FRAMES + SHORT_REVEAL_GAP
  for (let i = 0; i < segTimings.length; i++) {
    segStarts.push(cursor)
    const next = segments[i + 1]
    const gap = !next
      ? SHORT_OUTRO_GAP
      : segments[i].visual === 'hook'
      ? SHORT_HOOK_GAP
      : segments[i].role === 'celeb'
      ? SHORT_CELEB_GAP
      : next.role === 'celeb'
      ? SHORT_PRE_CELEB_GAP
      : SHORT_GAP
    // 사용자 지정 추가 멈춤 — 자동 gap에 더해진다.
    const extraGap = (segments[i].gapAfter && Number.isFinite(segments[i].gapAfter))
      ? Math.max(0, f(segments[i].gapAfter as number))
      : 0
    if (typeof window !== 'undefined' && extraGap > 0) {
      // eslint-disable-next-line no-console
      console.log(`[shortSegLayout] seg#${i} id=${segments[i].id} gapAfter=${segments[i].gapAfter}s → +${extraGap}f`)
    }
    cursor += segTimings[i] + gap + extraGap
  }

  return { segTimings, segStarts, logoStart: cursor }
}

/** 세그먼트 배열 → 총 프레임. BGM 있으면 로고 구간 확장 */
export const shortTotalFrames = (segments: ShortSegment[], hasBgm = false) =>
  shortSegLayout(segments).logoStart + (hasBgm ? SHORT_LOGO_FRAMES_BGM : SHORT_LOGO_FRAMES)

