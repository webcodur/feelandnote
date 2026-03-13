import { useMemo } from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { FONT } from './fonts'
import type { BookRecommendScript } from './types'
import {
  toFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  TITLE_SUMMARY_GAP, SUMMARY_CONTEXT_GAP, CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  BOOK_GAP, RECAP_FRAMES, bookTotalFrames,
} from './timing'

type Section = { start: number; end: number; label: string }

function buildSections(script: BookRecommendScript): Section[] {
  const { narrator, host, books } = script
  const sections: Section[] = []

  const celebIntroFrames = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : 150)
  const philosophyFrames = toFrames(host.voiceDuration)
  const hostIntroFrames = celebIntroFrames + philosophyFrames
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : 105

  let cursor = 0
  sections.push({ start: cursor, end: cursor + BRAND_FRAMES, label: '' })
  cursor += BRAND_FRAMES

  sections.push({ start: cursor, end: cursor + hostIntroFrames, label: host.nickname })
  cursor += hostIntroFrames + bridgeFrames

  for (let i = 0; i < books.length; i++) {
    if (i > 0) cursor += BOOK_GAP
    const total = bookTotalFrames(books[i])
    sections.push({ start: cursor, end: cursor + total, label: `${i + 1}/${books.length}` })
    cursor += total
  }

  sections.push({ start: cursor, end: cursor + RECAP_FRAMES, label: 'RECAP' })
  cursor += RECAP_FRAMES

  const outroFrames = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : 120
  sections.push({ start: cursor, end: cursor + outroFrames, label: '' })

  return sections
}

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

type Props = { script: BookRecommendScript }

export const Overlay: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()
  const sections = useMemo(() => buildSections(script), [script])
  const totalFrames = sections[sections.length - 1].end
  const globalProgress = Math.min(1, Math.max(0, frame / totalFrames))
  const current = sections.find((s) => frame >= s.start && frame < s.end) ?? sections[sections.length - 1]
  const sectionProgress = current ? Math.min(1, (frame - current.start) / (current.end - current.start)) : 0

  const borderOpacity = interpolate(frame, [BRAND_FRAMES - 30, BRAND_FRAMES], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const outroSection = sections[sections.length - 1]
  const outroFade = frame > outroSection.start
    ? interpolate(frame, [outroSection.end - 30, outroSection.end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  const opacity = borderOpacity * outroFade

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, margin: MARGIN, borderRadius: 2, border: '1px double rgba(200,164,110,0.15)', pointerEvents: 'none', opacity, zIndex: 50 }}>
        <Corner position="tl" /><Corner position="tr" /><Corner position="bl" /><Corner position="br" />
        <CornerTick position="tl" axis="h" /><CornerTick position="tl" axis="v" />
        <CornerTick position="tr" axis="h" /><CornerTick position="tr" axis="v" />
        <CornerTick position="bl" axis="h" /><CornerTick position="bl" axis="v" />
        <CornerTick position="br" axis="h" /><CornerTick position="br" axis="v" />
      </div>
      <div style={{ position: 'absolute', bottom: MARGIN, left: MARGIN, right: MARGIN, height: 1, backgroundColor: 'rgba(200,164,110,0.08)', opacity, zIndex: 60 }}>
        <div style={{ width: `${globalProgress * 100}%`, height: '100%', backgroundColor: ACCENT, opacity: 0.5 }} />
      </div>
      {current.label && opacity > 0 && (
        <div style={{ position: 'absolute', bottom: MARGIN + 10, right: MARGIN + 16, opacity: opacity * 0.6, zIndex: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: ACCENT, fontSize: 12, fontFamily: FONT.cinzel, letterSpacing: 2 }}>{current.label}</div>
          <div style={{ width: 50, height: 1, backgroundColor: 'rgba(200,164,110,0.15)' }}>
            <div style={{ width: `${sectionProgress * 100}%`, height: '100%', backgroundColor: ACCENT, opacity: 0.7 }} />
          </div>
        </div>
      )}
      {opacity > 0 && (
        <div style={{ position: 'absolute', bottom: MARGIN + 8, left: MARGIN + 16, opacity: opacity * 0.3, zIndex: 60, color: ACCENT, fontSize: 10, fontFamily: FONT.cinzel, letterSpacing: 3 }}>
          FEEL AND NOTE
        </div>
      )}
    </>
  )
}
