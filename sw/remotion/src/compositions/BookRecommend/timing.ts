/**
 * 타이밍 상수 + 계산 함수 — 단일원천(SSoT)
 *
 * BookRecommend.tsx, BookCard.tsx, Subtitles.tsx, Overlay.tsx가 모두 이 파일에서 import한다.
 * 상수 변경 시 이 파일만 수정하면 된다.
 */

export const FPS = 30
/** 섹션 프레임 (오디오 + 15프레임 버퍼). 타이밍 배치용. */
export const toFrames = (sec: number) => Math.ceil(sec * FPS) + 15
/** 순수 오디오 프레임 (버퍼 없음). 자막·하이라이트 분배용. */
export const toAudioFrames = (sec: number) => Math.ceil(sec * FPS)

export const BRAND_FRAMES = 120
export const CELEB_VISUAL_DELAY = 75

// --- 섹션 라벨 타이밍 ---
// 흐름: 이전 오디오 끝 → PRE_LABEL_GAP → 라벨 읽기(LABEL_FRAMES) → POST_LABEL_GAP → 본문 오디오
/** 라벨 오디오 전 무음 */
export const PRE_LABEL_GAP = 12
/** 라벨 오디오 프레임 (~1.3초) */
export const LABEL_FRAMES = 40
/** 라벨 오디오 후 무음 */
export const POST_LABEL_GAP = 12

/** 제목 → 요약 사이 총 갭 (라벨 포함) */
export const TITLE_SUMMARY_GAP = PRE_LABEL_GAP + LABEL_FRAMES + POST_LABEL_GAP  // 64
/** 요약 → 경위 사이 총 갭 (라벨 포함) */
export const SUMMARY_CONTEXT_GAP = PRE_LABEL_GAP + LABEL_FRAMES + POST_LABEL_GAP  // 64

/** 맥락 → 셀럽 인용 사이 갭 (인용 있을 때만) */
export const CONTEXT_QUOTE_GAP = 20
/** 인용 → 후속 맥락 사이 갭 */
export const QUOTE_CONTEXTAFTER_GAP = 20
/** 책 사이 전환 프레임 */
export const BOOK_GAP = 60
/** 리캡 섹션 프레임 */
export const RECAP_FRAMES = 150

// --- 계산 함수 ---

export type BookDurations = {
  titleDuration: number
  summaryDuration: number
  contextDuration: number
  quoteDuration?: number
  contextAfterDuration?: number
}

/** title + gap(라벨 포함) + summary 끝 */
export const summaryPhaseEnd = (b: BookDurations) =>
  toFrames(b.titleDuration) + TITLE_SUMMARY_GAP + toFrames(b.summaryDuration)

/** summary + gap(라벨 포함) + context 끝 */
export const contextPhaseEnd = (b: BookDurations) =>
  summaryPhaseEnd(b) + SUMMARY_CONTEXT_GAP + toFrames(b.contextDuration)

/** 인용문 끝 */
export const quotePhaseEnd = (b: BookDurations) =>
  b.quoteDuration
    ? contextPhaseEnd(b) + CONTEXT_QUOTE_GAP + toFrames(b.quoteDuration)
    : contextPhaseEnd(b)

/** 전체 (인용문 + 후속 맥락 포함) */
export const bookTotalFrames = (b: BookDurations) => {
  if (!b.quoteDuration) return contextPhaseEnd(b)
  const qEnd = quotePhaseEnd(b)
  if (!b.contextAfterDuration) return qEnd
  return qEnd + QUOTE_CONTEXTAFTER_GAP + toFrames(b.contextAfterDuration)
}
