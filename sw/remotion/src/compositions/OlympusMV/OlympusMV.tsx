import React from 'react'
import {
  AbsoluteFill, Audio, Img,
  interpolate, useCurrentFrame,
  staticFile,
} from 'remotion'
import { subtitles, SONG_DURATION_SEC } from './subtitles'
import { DARK } from '../theme'

/* ═══════════════ CONSTANTS ═══════════════ */

const FPS = 60
const TOTAL_FRAMES = SONG_DURATION_SEC * FPS
const toF = (sec: number) => Math.round(sec * FPS)

const FONT_KR = "'MaruBuri', 'Pretendard Variable', serif"
const ACCENT = '#d4af37'

/* ═══════════════ BACKGROUND ═══════════════ */

const Background: React.FC = () => {
  const frame = useCurrentFrame()
  const scale = interpolate(frame, [0, TOTAL_FRAMES], [1.0, 1.08])
  const y = interpolate(frame, [0, TOTAL_FRAMES], [0, 60])
  return (
    <AbsoluteFill>
      <Img
        src={staticFile('common/images/olympus-bg.jpg')}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${scale}) translateY(${y}px)`,
        }}
      />
    </AbsoluteFill>
  )
}

/* ═══════════════ PARTICLES ═══════════════ */

const Particles: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 35 }, (_, i) => {
        const speed = 0.12 + (i % 5) * 0.07
        const x0 = (i * 73 + 17) % 100
        const y0 = (i * 47 + 31) % 100
        const y = y0 - frame * speed * 0.25
        const x = x0 + Math.sin(frame * 0.02 + i * 1.5) * 1.8
        const pulse = Math.sin(frame * 0.05 + i * 2) * 0.3 + 0.7
        const op = (0.1 + (i % 3) * 0.07) * pulse
        const sz = 1.2 + (i % 4) * 0.6
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${((x % 100) + 100) % 100}%`,
            top: `${((y % 120) + 120) % 120}%`,
            width: sz, height: sz, borderRadius: '50%',
            background: `rgba(200,164,110,${op})`,
            boxShadow: `0 0 ${sz * 4}px rgba(200,164,110,${op * 0.5})`,
          }} />
        )
      })}
    </AbsoluteFill>
  )
}

/* ═══════════════ TITLE ═══════════════ */

const Title: React.FC = () => {
  const frame = useCurrentFrame()
  const titleOp = interpolate(frame, [toF(1), toF(3), toF(155), toF(160)], [0, 0.6, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{
      position: 'absolute', top: 120, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', opacity: titleOp,
    }}>
      <div style={{
        color: `${ACCENT}90`, fontSize: 18, fontFamily: "'Cinzel', serif",
        letterSpacing: 10, textShadow: `0 0 30px ${ACCENT}20`,
      }}>
        FEEL AND NOTE
      </div>
    </div>
  )
}

/* ═══════════════ LYRICS ═══════════════ */

const Lyrics: React.FC = () => {
  const frame = useCurrentFrame()

  // 현재 프레임에서 가장 적합한 자막 1개만 선택
  const sec = frame / FPS
  const active = subtitles.findIndex((sub) => sec >= sub.startSec && sec < sub.endSec)
  if (active < 0) return null

  const sub = subtitles[active]
  const sF = toF(sub.startSec)
  const eF = toF(sub.endSec)

  const fadeIn = interpolate(frame, [sF, sF + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [eF - 8, eF + 5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const y = interpolate(frame, [sF, sF + 15], [24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const scaleIn = interpolate(frame, [sF, sF + 12], [0.96, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const isC = sub.section === 'chorus'
  const isI = sub.section === 'intro'

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        opacity: Math.min(fadeIn, fadeOut),
        transform: `translateY(${y}px) scale(${scaleIn})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '0 48px',
      }}>
        {sub.lines.map((line, li) => (
          <div key={li} style={{
            color: isC ? '#ede4d4' : isI ? '#b8a888' : '#d8d0c0',
            fontSize: isC ? 58 : isI ? 40 : 50,
            fontWeight: isC ? 700 : 400,
            fontFamily: FONT_KR, textAlign: 'center',
            letterSpacing: isC ? 4 : 3, lineHeight: 1.6,
            textShadow: isC
              ? `0 0 40px ${ACCENT}30, 0 4px 20px rgba(0,0,0,0.9)`
              : '0 4px 20px rgba(0,0,0,0.9)',
          }}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

/* ═══════════════ OUTRO LOGO ═══════════════ */

const LOGO_START = 157
const LOGO_DUR = 5

const OutroLogo: React.FC = () => {
  const frame = useCurrentFrame()
  const s = toF(LOGO_START)
  const e = toF(LOGO_START + LOGO_DUR)
  if (frame < s || frame > e) return null

  const op = interpolate(frame, [s, s + toF(1), e - toF(1), e], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, opacity: op }}>
      <div style={{ fontSize: 88, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", letterSpacing: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#f8f4ed' }}>FEEL</span>
        <span style={{ color: '#d4a828' }}>&</span>
        <span style={{ color: '#f8f4ed' }}>NOTE</span>
      </div>
      <div style={{ width: 240, height: 1, backgroundColor: '#d4a828', opacity: 0.5 }} />
      <div style={{ fontSize: 40, fontFamily: "'Pretendard Variable', sans-serif", color: '#999', letterSpacing: 4 }}>
        feelandnote.com
      </div>
    </AbsoluteFill>
  )
}

/* ═══════════════ MAIN ═══════════════ */

export const OlympusMV: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: DARK.base }}>
    <Background />
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse 80% 35% at 50% 50%, rgba(0,0,0,0.55) 0%, transparent 100%)',
      pointerEvents: 'none',
    }} />
    <Particles />
    <Title />
    <Lyrics />
    <OutroLogo />
    <Audio src={staticFile('music/olympus-theme.mp3')} />
  </AbsoluteFill>
)

export const totalFrames = TOTAL_FRAMES
