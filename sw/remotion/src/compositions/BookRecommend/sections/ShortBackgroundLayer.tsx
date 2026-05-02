/**
 * 쇼츠 배경 이미지 레이어 — dimFilter 계산, revealBg, imageGroups 크로스페이드, 비네팅.
 * 어두움 처리는 segment.darken === true 명시 세그먼트에만 적용.
 */
import { Img, interpolate, useCurrentFrame } from 'remotion'
import { sf } from '../utils'
import { f, SHORT_OUTRO_CLOSE } from '../timing'
import {
  SHORT_HEADER_H as HEADER_H, SHORT_W as W, SHORT_MID_H as MID_H, CL,
} from '../shorts-constants'
import { DARK } from '../../theme'

type ImageGroup = { image: string; start: number; noZoom?: boolean }

type Props = {
  /** 세그먼트 opacity 계산 함수 */
  segOp: (i: number) => number
  segments: { role?: string; visual?: string; darken?: boolean | 'light'; topRight?: 'avatar' | 'book' | 'none' }[]
  segStarts: number[]
  segTimings: number[]
  bookSegIdx: number
  logoStart: number
  imageGroups: ImageGroup[]
  revealBgUrl: string | null
}

export const ShortBackgroundLayer: React.FC<Props> = ({
  segments, segStarts, segTimings,
  bookSegIdx, logoStart, imageGroups, revealBgUrl,
}) => {
  const frame = useCurrentFrame()

  // 로고 진입까지 배경 유지하다가 닫힘 페이즈 동안 페이드아웃 → 로고 풀스크린으로 크로스 전환
  const bgOp = interpolate(frame, [logoStart - SHORT_OUTRO_CLOSE, logoStart], [1, 0], CL)
  if (bgOp <= 0) return null

  // --- dimFilter: darken 명시 세그먼트만 어둡게 + 비네팅 ---
  // true(heavy): 1.0 강도, 'light': 0.5 강도. 세그먼트 gap까지 유지하여 밝게 튀는 현상 방지.
  // 첫 세그먼트(hook)가 darken이면 fade-in 0 — 처음부터 어두운 톤 즉시 유지(밝게 시작했다 어두워지는 것 방지).
  const dim = segments.reduce((d, s, i) => {
    const intensity = s.darken === true ? 1 : s.darken === 'light' ? 0.5 : 0
    if (intensity === 0) return d
    const dimEnd = i + 1 < segments.length ? segStarts[i + 1] : segStarts[i] + segTimings[i]
    const dur = dimEnd - segStarts[i]
    if (dur <= 0) return d
    const fi = i === 0 ? 0 : Math.max(1, Math.min(f(0.27), Math.floor(dur / 3)))
    const fo = Math.max(1, Math.min(f(0.33), Math.floor(dur / 3)))
    // fi=0(첫 세그먼트 즉시 dim)인 경우 inputRange 단조성을 위해 3점으로 축약
    const dimOp = fi === 0
      ? interpolate(frame, [segStarts[i], dimEnd - fo, dimEnd], [1, 1, 0], CL)
      : interpolate(frame, [segStarts[i], segStarts[i] + fi, dimEnd - fo, dimEnd], [0, 1, 1, 0], CL)
    return Math.max(d, dimOp * intensity)
  }, 0)
  const imgBright = interpolate(dim, [0, 1], [1, 0.35], CL)
  const imgSat = interpolate(dim, [0, 1], [1, 0.5], CL)
  const dimFilter = dim > 0 ? `brightness(${imgBright}) saturate(${imgSat})` : undefined

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
      {imageGroups.map(({ image, start, noZoom }, gi) => {
        // 방어: 상류 파이프라인 버그로 start가 비-유한수면 렌더 스킵 (interpolate NaN 크래시 방지)
        if (!Number.isFinite(start)) return null
        const nextStart = gi < imageGroups.length - 1 ? imageGroups[gi + 1].start : null
        const spacing = nextStart != null && Number.isFinite(nextStart) ? nextStart - start : Infinity

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

        // 시간 비례 선형 확대 — clamp 없이 이미지가 보이는 내내 계속 줌인
        // 기준 속도: 5초당 +0.08 (= 초당 1.6%)
        const zoomRate = 0.08 / f(5)
        const zoom = noZoom ? 1 : 1 + Math.max(0, frame - start) * zoomRate

        // overflow:hidden 래퍼로 MID 영역 클리핑 — scale 확대 시 상하 경계 밖으로 삐져나가 header/footer 뒤로 비치는 현상 방지
        return (
          <div key={`${image}-${start}`} style={{
            position: 'absolute', top: HEADER_H, left: 0,
            width: W, height: MID_H,
            backgroundColor: DARK.base,
            overflow: 'hidden',
            zIndex: 1, opacity: op,
          }}>
            <Img src={sf(image)} style={{
              width: '100%', height: '100%',
              objectFit: 'contain',
              filter: dimFilter,
              transform: `scale(${zoom})`,
            }} />
          </div>
        )
      })}

      {/* 비네팅 오버레이 — darken 명시 세그먼트에서만 표시 (dim 비례) */}
      {dim > 0 && (
        <div style={{
          position: 'absolute', top: HEADER_H, left: 0, width: W, height: MID_H,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(26,21,16,0.3) 0%, rgba(10,10,10,0.6) 70%)',
          zIndex: 2, opacity: bgOp * dim,
        }} />
      )}
    </>
  )
}
