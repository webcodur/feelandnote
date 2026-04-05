/**
 * Overlay — 영상 HUD 레이어
 *
 * DecorFrame — 장식 테두리 (코너 이미지 + 틱)
 */
import { useMemo } from 'react'
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from '../types'
import { BRAND_FRAMES, f } from '../timing'
import { buildTimeline } from '../useTimeline'
import { useIsPortrait } from '../utils'

const ACCENT = '#c8a46e'
const MARGIN = 36
const CORNER_SIZE = 90

/* ── Gilded Crest — 금박 모서리 문장 ── */

const CREST_IMGS = {
  tl: staticFile('common/images/deco/LT.png'),
  tr: staticFile('common/images/deco/RT.png'),
  bl: staticFile('common/images/deco/LB.png'),
  br: staticFile('common/images/deco/RB.png'),
} as const

const CREST_OFFSET = CORNER_SIZE / 3 // 30px

const GildedCrest: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br' }> = ({ position }) => {
  const isTop = position[0] === 't', isLeft = position[1] === 'l'
  return (
    <Img
      src={CREST_IMGS[position]}
      style={{
        position: 'absolute',
        ...(isTop ? { top: -CREST_OFFSET } : { bottom: -CREST_OFFSET }),
        ...(isLeft ? { left: -CREST_OFFSET } : { right: -CREST_OFFSET }),
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        opacity: 0.85,
      }}
    />
  )
}

const CornerTick: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br'; axis: 'h' | 'v' }> = ({ position, axis }) => {
  const isTop = position[0] === 't', isLeft = position[1] === 'l', isH = axis === 'h'
  return (
    <div style={{
      position: 'absolute',
      ...(isTop ? { top: -1 } : { bottom: -1 }),
      ...(isLeft ? { left: -1 } : { right: -1 }),
      width: isH ? 20 : 2, height: isH ? 2 : 20,
      backgroundColor: ACCENT, opacity: 0.5,
    }} />
  )
}

type Props = { script: BookRecommendScript }

export const Overlay: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()
  const portrait = useIsPortrait()
  const tl = useMemo(() => buildTimeline(script), [script])
  const margin = portrait ? 24 : MARGIN

  const fadeIn = interpolate(frame, [BRAND_FRAMES - f(1), BRAND_FRAMES], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const outroFade = frame > tl.outroStart
    ? interpolate(frame, [tl.outroStart + tl.outroFrames - f(1), tl.outroStart + tl.outroFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  const decorOpacity = fadeIn * outroFade

  return (
    <div style={{
      position: 'absolute', top: margin, left: margin, right: margin,
      bottom: margin,
      borderRadius: 2, border: '1px double rgba(200,164,110,0.15)', pointerEvents: 'none', opacity: decorOpacity, zIndex: 50,
    }}>
      {/* Gilded Crest — 인물별 커스텀 예정, 필요 시 활성화
      <GildedCrest position="tl" /><GildedCrest position="tr" />
      <GildedCrest position="bl" /><GildedCrest position="br" />
      */}
      <CornerTick position="tl" axis="h" /><CornerTick position="tl" axis="v" />
      <CornerTick position="tr" axis="h" /><CornerTick position="tr" axis="v" />
      <CornerTick position="bl" axis="h" /><CornerTick position="bl" axis="v" />
      <CornerTick position="br" axis="h" /><CornerTick position="br" axis="v" />
    </div>
  )
}
