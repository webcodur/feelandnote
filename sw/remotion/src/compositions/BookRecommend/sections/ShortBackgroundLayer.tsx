/**
 * 쇼츠 배경 이미지 레이어 — dimFilter 계산, revealBg, imageGroups 크로스페이드, 비네팅.
 * book-context 구간 이미지는 dim 해제하여 일관된 밝기 유지.
 */
import { Img, interpolate, useCurrentFrame } from 'remotion'
import { sf } from '../utils'
import { f } from '../timing'
import {
  SHORT_HEADER_H as HEADER_H, SHORT_W as W, SHORT_MID_H as MID_H, CL,
} from '../shorts-constants'

type ImageGroup = { image: string; start: number }

type Props = {
  /** 세그먼트 opacity 계산 함수 */
  segOp: (i: number) => number
  segments: { role?: string; visual?: string }[]
  segStarts: number[]
  segTimings: number[]
  bookSegIdx: number
  logoStart: number
  imageGroups: ImageGroup[]
  revealBgUrl: string | null
}

export const ShortBackgroundLayer: React.FC<Props> = ({
  segOp, segments, segStarts, segTimings,
  bookSegIdx, logoStart, imageGroups, revealBgUrl,
}) => {
  const frame = useCurrentFrame()

  const lastContentIdx = segments.reduce((last, s, i) => s.visual !== 'cta' ? i : last, -1)
  const contentEnd = lastContentIdx >= 0 ? segStarts[lastContentIdx] + segTimings[lastContentIdx] : logoStart
  const bgOp = interpolate(frame, [contentEnd - f(0.5), contentEnd], [1, 0], CL)
  if (bgOp <= 0) return null

  // --- dimFilter: celeb/hook 구간 어둡게, book 구간 해제 ---
  // bookOp: 내레이션 book 세그먼트(role=narrator, visual=book) 전체에 대한 활성도.
  // 중간 quote(celeb, visual=book) 이후의 book-context-N에서도 vignette·dim이 올바르게 해제되도록
  // findIndex 방식(첫 book 세그먼트만 추적) 대신 narrator-book 전체를 max로 집계한다.
  // celeb role의 book-visual 세그먼트(중간 인용)는 제외하여 인용 연출의 dim은 유지한다.
  const hookEnd = (segStarts[0] ?? 0) + (segTimings[0] ?? 0)
  const initialDim = interpolate(frame, [hookEnd - f(0.5), hookEnd], [1, 0], CL)
  const bookOp = segments.reduce(
    (m, s, i) => (s.visual === 'book' && s.role !== 'celeb') ? Math.max(m, segOp(i)) : m,
    0,
  )
  // celeb/hook dim을 세그먼트 gap까지 연장 — 다음 세그먼트 시작 전까지 유지하여
  // celeb 이미지가 gap에서 밝게 튀어나오는 현상 방지
  const celebDimRaw = segments.reduce((d, s, i) => {
    if (s.role !== 'celeb' && s.visual !== 'hook') return d
    const dimEnd = i + 1 < segments.length ? segStarts[i + 1] : segStarts[i] + segTimings[i]
    const dur = dimEnd - segStarts[i]
    if (dur <= 0) return d
    const fi = Math.max(1, Math.min(f(0.27), Math.floor(dur / 3)))
    const fo = Math.max(1, Math.min(f(0.33), Math.floor(dur / 3)))
    const dimOp = interpolate(frame, [segStarts[i], segStarts[i] + fi, dimEnd - fo, dimEnd], [0, 1, 1, 0], CL)
    return Math.max(d, dimOp)
  }, initialDim)
  const celebDim = Math.max(0, celebDimRaw * (1 - bookOp))
  const imgBright = interpolate(celebDim, [0, 1], [1, 0.35], CL)
  const imgSat = interpolate(celebDim, [0, 1], [1, 0.5], CL)
  const dimFilter = celebDim > 0 ? `brightness(${imgBright}) saturate(${imgSat})` : undefined

  // --- revealBg 페이드아웃 ---
  const firstImgStart = imageGroups.length > 0 ? imageGroups[0].start : null
  const fadeOutAt = firstImgStart != null
    ? firstImgStart
    : (bookSegIdx >= 0 ? segStarts[bookSegIdx] : null)
  const revealBlend = fadeOutAt != null
    ? interpolate(frame, [fadeOutAt - f(0.3), fadeOutAt + f(0.2)], [1, 0], CL)
    : 1

  return (
    <>
      {/* 기본 배경 (revealBg) */}
      {revealBlend > 0 && revealBgUrl && (
        <Img src={revealBgUrl} style={{
          position: 'absolute', top: HEADER_H, left: 0,
          width: W, height: MID_H,
          objectFit: 'cover',
          filter: dimFilter,
          zIndex: 1, opacity: bgOp * revealBlend,
        }} />
      )}

      {/* imageGroups 크로스페이드 + Ken Burns */}
      {imageGroups.map(({ image, start }, gi) => {
        const nextStart = gi < imageGroups.length - 1 ? imageGroups[gi + 1].start : null
        const spacing = nextStart != null ? nextStart - start : Infinity

        const maxFadeIn = f(0.5)
        const realFadeIn = Math.min(maxFadeIn, Math.floor(spacing * 0.4))
        const inPre = Math.floor(realFadeIn * (0.3 / 0.5))
        const inPost = realFadeIn - inPre
        const fadeIn = interpolate(frame, [start - inPre, start + inPost], [0, 1], CL)

        const maxFadeOut = f(0.2)
        const realFadeOut = Math.min(maxFadeOut, Math.floor(spacing * 0.4))
        const fadeOut = nextStart != null
          ? interpolate(frame, [nextStart, nextStart + realFadeOut], [1, 0], CL)
          : 1

        const op = Math.min(bgOp, fadeIn, fadeOut)
        if (op <= 0) return null

        const imgDuration = nextStart != null ? nextStart - start : f(5)
        const zoom = interpolate(frame, [start, start + imgDuration], [1, 1.08], CL)

        return (
          <Img key={`${image}-${start}`} src={sf(image)} style={{
            position: 'absolute', top: HEADER_H, left: 0,
            width: W, height: MID_H,
            objectFit: 'cover',
            filter: dimFilter,
            zIndex: 1, opacity: op,
            transform: `scale(${zoom})`,
          }} />
        )
      })}

      {/* 비네팅 오버레이 — book 구간에서 해제 */}
      <div style={{
        position: 'absolute', top: HEADER_H, left: 0, width: W, height: MID_H,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(26,21,16,0.3) 0%, rgba(10,10,10,0.6) 70%)',
        zIndex: 2, opacity: bgOp * (1 - bookOp),
      }} />
    </>
  )
}
