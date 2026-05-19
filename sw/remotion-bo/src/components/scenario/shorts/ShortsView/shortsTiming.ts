/**
 * 쇼츠 세그먼트 타이밍 계산 — Remotion timing.ts SSoT의 초 단위 미러.
 *
 * Remotion 측 BookRecommend/timing.ts shortSegLayout 과 같은 규칙을 사용하되
 * BO에서는 프레임 대신 초로 계산해 화면 표시·복사용 텍스트에 그대로 쓴다.
 * 두 곳이 어긋나지 않도록 상수와 분기는 동일하게 유지한다.
 */

const SHORT_GAP = 0.2
const SHORT_HOOK_GAP = 0.6
const SHORT_PRE_CELEB_GAP = 0.7
const SHORT_CELEB_GAP = 1.05
const SHORT_OUTRO_HOLD = 1.2
const SHORT_OUTRO_GAP = 0.5
const SHORT_FALLBACK = 2.5
const SHORT_HOOK_FRAMES = 3.5
const SHORT_REVEAL_FRAMES = 3.0
const SHORT_REVEAL_GAP = 1.0
/** 로고 기본 길이 (초). 사용자 미입력 시 BGM 유무로 폴백. Remotion timing.ts와 동일 */
const SHORT_LOGO_SEC = 3
const SHORT_LOGO_SEC_BGM = 5
export const SHORT_LOGO_MIN_SEC = 0.5
export const SHORT_LOGO_MAX_SEC = 10

/** 사용자 지정값(초) → 클램프 후 반환. 미지정 시 BGM 유무로 폴백. */
export function resolveLogoSec(logoDurationSec: number | undefined, hasBgm: boolean): number {
  if (typeof logoDurationSec === 'number' && Number.isFinite(logoDurationSec)) {
    return Math.min(SHORT_LOGO_MAX_SEC, Math.max(SHORT_LOGO_MIN_SEC, logoDurationSec))
  }
  return hasBgm ? SHORT_LOGO_SEC_BGM : SHORT_LOGO_SEC
}

const TAIL = 0.3 // toShortFrames의 여운 (오디오 + 0.3초)

export type SegLayoutEntry = {
  id: string
  /** 음성 자체 길이(초). 없으면 0 */
  voiceSec: number
  /** 음성 + 여운 + 이미지 보장 + 마지막 outro hold 까지 합친 표시 길이 */
  displaySec: number
  /** 이 세그먼트가 끝나고 다음으로 넘어가기 전 gap(초). 마지막은 outro gap. */
  gapSec: number
  /** 사용자 추가 멈춤(초). 0 이면 미사용 */
  extraGapSec: number
}

export type SegLayoutResult = {
  entries: SegLayoutEntry[]
  /** reveal(3.0) + reveal-gap(1.0) — 인트로 chime + 인물·책 등장 구간 */
  revealSec: number
  /** 첫 구간이 hook이면 hook 종료 직후 reveal이 들어감을 알리는 플래그 */
  revealAfterHook: boolean
  /** 모든 세그먼트 + gap + reveal 누적이 끝나는 시점(=로고 시작 시점) */
  bodyEndSec: number
}

export function shortSegLayoutSec(segments: any[]): SegLayoutResult {
  const entries: SegLayoutEntry[] = []
  const revealSec = SHORT_REVEAL_FRAMES + SHORT_REVEAL_GAP
  // 시작 순서: 훅이 첫 세그먼트이고 후속 세그먼트가 있을 때는 hook → hookGap → reveal → 나머지 순.
  // 훅이 없으면 옛 순서(reveal → 세그먼트)로 폴백.
  const hookFirst = segments[0]?.visual === 'hook' && segments.length > 1
  let cursor = hookFirst ? 0 : revealSec
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const fallback = i === 0 ? SHORT_HOOK_FRAMES : SHORT_FALLBACK
    const imageCount = seg.imageChangeAt
      ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt.length : 1)
      : 0
    const imageMin = imageCount > 0 ? imageCount * 2 : 0
    const voiceSec = (typeof seg.duration === 'number' && Number.isFinite(seg.duration)) ? seg.duration : 0
    const base = voiceSec > 0 ? voiceSec + TAIL : fallback
    const isLast = i === segments.length - 1
    const tailHold = isLast ? SHORT_OUTRO_HOLD : 0
    const displaySec = Math.max(base, imageMin) + tailHold

    const next = segments[i + 1]
    const gap = !next
      ? SHORT_OUTRO_GAP
      : seg.visual === 'hook'
      ? SHORT_HOOK_GAP
      : seg.role === 'celeb'
      ? SHORT_CELEB_GAP
      : next.role === 'celeb'
      ? SHORT_PRE_CELEB_GAP
      : SHORT_GAP
    const extraGap = (seg.gapAfter && Number.isFinite(seg.gapAfter))
      ? Math.max(0, seg.gapAfter)
      : 0

    entries.push({
      id: typeof seg.id === 'string' ? seg.id : `#${i + 1}`,
      voiceSec,
      displaySec,
      gapSec: gap,
      extraGapSec: extraGap,
    })

    cursor += displaySec + gap + extraGap
    // hook 종료 + 훅갭 직후 reveal(인물·책 등장) 구간 삽입
    if (hookFirst && i === 0) {
      cursor += revealSec
    }
  }

  return { entries, revealSec, revealAfterHook: hookFirst, bodyEndSec: cursor }
}

export const formatSec = (s: number) => `${s.toFixed(2)}s`
