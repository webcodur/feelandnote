/**
 * CelebProfile 오버레이 — 서재탐방과 동일한 테두리 + 프로그레스 + 섹션 라벨
 */
import { interpolate, useCurrentFrame } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'
import { BrandLogo } from '../../BookRecommend/utils'
import { f, BRAND_FRAMES } from '../timing'

export type Section = { start: number; end: number; label: string }

const ACCENT = '#c8a46e'
const MARGIN = 24

const Corner: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br' }> = ({ position }) => {
  const size = 24, weight = 2
  const isTop = position[0] === 't', isLeft = position[1] === 'l'
  return (
    <div style={{
      position: 'absolute',
      ...(isTop ? { top: -1 } : { bottom: -1 }),
      ...(isLeft ? { left: -1 } : { right: -1 }),
      width: size, height: size,
      ...(isTop ? { borderTop: `${weight}px double ${ACCENT}` } : { borderBottom: `${weight}px double ${ACCENT}` }),
      ...(isLeft ? { borderLeft: `${weight}px double ${ACCENT}` } : { borderRight: `${weight}px double ${ACCENT}` }),
    }} />
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

type Props = { sections: Section[]; totalFrames: number }

export const ProfileOverlay: React.FC<Props> = ({ sections, totalFrames }) => {
  const frame = useCurrentFrame()
  const globalProgress = Math.min(1, Math.max(0, frame / totalFrames))
  const current = sections.find((s) => frame >= s.start && frame < s.end) ?? sections[sections.length - 1]
  const sectionProgress = current ? Math.min(1, (frame - current.start) / (current.end - current.start)) : 0

  const borderOpacity = interpolate(frame, [BRAND_FRAMES - f(1), BRAND_FRAMES], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const lastSection = sections[sections.length - 1]
  const outroFade = frame > lastSection.start
    ? interpolate(frame, [lastSection.end - f(1), lastSection.end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  const opacity = borderOpacity * outroFade

  return (
    <>
      {/* 테두리 */}
      <div style={{ position: 'absolute', inset: 0, margin: MARGIN, borderRadius: 2, border: '1px double rgba(200,164,110,0.15)', pointerEvents: 'none', opacity, zIndex: 50 }}>
        <Corner position="tl" /><Corner position="tr" /><Corner position="bl" /><Corner position="br" />
        <CornerTick position="tl" axis="h" /><CornerTick position="tl" axis="v" />
        <CornerTick position="tr" axis="h" /><CornerTick position="tr" axis="v" />
        <CornerTick position="bl" axis="h" /><CornerTick position="bl" axis="v" />
        <CornerTick position="br" axis="h" /><CornerTick position="br" axis="v" />
      </div>

      {/* 글로벌 프로그레스 */}
      <div style={{ position: 'absolute', bottom: MARGIN, left: MARGIN, right: MARGIN, height: 1, backgroundColor: 'rgba(200,164,110,0.08)', opacity, zIndex: 60 }}>
        <div style={{ width: `${globalProgress * 100}%`, height: '100%', backgroundColor: ACCENT, opacity: 0.5 }} />
      </div>

      {/* 섹션 라벨 + 미니 프로그레스 */}
      {current.label && opacity > 0 && (
        <div style={{ position: 'absolute', bottom: MARGIN + 10, right: MARGIN + 16, opacity: opacity * 0.6, zIndex: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: ACCENT, fontSize: 12, fontFamily: FONT.cinzel, letterSpacing: 2 }}>{current.label}</div>
          <div style={{ width: 50, height: 1, backgroundColor: 'rgba(200,164,110,0.15)' }}>
            <div style={{ width: `${sectionProgress * 100}%`, height: '100%', backgroundColor: ACCENT, opacity: 0.7 }} />
          </div>
        </div>
      )}

      {/* 워터마크 */}
      {opacity > 0 && (
        <div style={{ position: 'absolute', bottom: MARGIN + 8, left: MARGIN + 16, opacity: opacity * 0.3, zIndex: 60 }}>
          <BrandLogo variant="watermark" />
        </div>
      )}
    </>
  )
}
