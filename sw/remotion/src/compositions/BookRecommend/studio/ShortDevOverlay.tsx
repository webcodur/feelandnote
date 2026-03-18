/**
 * ShortDevOverlay -- studio-only segment label for shorts
 */
import React from 'react'
import type { ShortSegment } from '../types'

interface Props {
  frame: number
  brandStart: number
  brandFrames: number
  logoStart: number
  logoFrames: number
  currentSeg: number
  segments: ShortSegment[]
}

export const ShortDevOverlay: React.FC<Props> = ({
  frame, brandStart, brandFrames, logoStart, logoFrames, currentSeg, segments,
}) => {
  const brandActive = frame >= brandStart && frame < brandStart + brandFrames
  const logoActive = frame >= logoStart && frame < logoStart + logoFrames
  const segNum = currentSeg >= 0 ? currentSeg + 1 : 0
  const totalSegs = segments.length
  let label = '--'
  let sub = ''
  if (brandActive) {
    label = 'BRAND'
    sub = 'hook -> intro'
  } else if (logoActive) {
    label = 'LOGO'
    sub = 'ending'
  } else if (currentSeg >= 0) {
    const seg = segments[currentSeg]
    const names: Record<string, string> = {
      hook: 'HOOK',
      intro: seg.role === 'celeb' ? 'monologue' : 'INTRO',
      book: 'BOOK',
      cta: 'CTA',
    }
    label = `${segNum}/${totalSegs}  ${names[seg.visual] ?? seg.visual}`
    sub = seg.role === 'celeb' ? 'celeb' : 'narrator'
  }
  return (
    <div style={{
      position: 'absolute', top: 24, right: 24, zIndex: 999,
      backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 10,
      padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ color: '#c8a46e', fontSize: 36, fontFamily: 'monospace', fontWeight: 700 }}>
        {label}
      </div>
      {sub && <div style={{ color: '#aaa', fontSize: 24, fontFamily: 'monospace' }}>{sub}</div>}
    </div>
  )
}
