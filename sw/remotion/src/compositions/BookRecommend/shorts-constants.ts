/** 쇼츠(9:16) 레이아웃 상수 — BookRecommendShort · ShortDevOverlay 공용 */

export const SHORT_W = 1080
export const SHORT_HEADER_H = 320    // 썸네일 TOP_H와 통일
export const SHORT_SAFE_BOTTOM = 460 // 썸네일 BOT_H와 통일
export const SHORT_MID_H = 1920 - SHORT_HEADER_H - SHORT_SAFE_BOTTOM
export const SHORT_RIGHT_STRIP_W = 280
export const SHORT_CONTENT_PAD = 48

export const REVEAL_BG = 'common/images/reveal-bg.jpg'
export const CTA_BG = 'common/images/cta-bg.jpg'

/** Remotion interpolate clamp 옵션 — 매번 리터럴 객체 생성 방지 */
export const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }
