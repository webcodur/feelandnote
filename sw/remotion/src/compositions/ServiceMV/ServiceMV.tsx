import React from 'react'
import {
  AbsoluteFill, Audio, Img,
  interpolate, useCurrentFrame, useVideoConfig,
  spring, staticFile,
} from 'remotion'
import { subtitles, SONG_DURATION_SEC } from './subtitles'
import { celebAvatars, alexander } from '../ServiceIntro/data'

/* ═══════════════ CONSTANTS ═══════════════ */

const FPS = 30
const TOTAL_FRAMES = SONG_DURATION_SEC * FPS
const toF = (sec: number) => Math.round(sec * FPS)

const FONT_KR = "'MaruBuri', 'Pretendard Variable', serif"
const FONT_EN = "'Cinzel', 'Cormorant Garamond', serif"
const FONT_BODY = "'Cormorant Garamond', Georgia, serif"

// Browser frame
const BW = 1440
const BH = 810
const CHROME_H = 42
const VP_H = BH - CHROME_H // 768

// Sections
const S_H = VP_H
const SECTION_COUNT = 7
const MAX_SCROLL = S_H * SECTION_COUNT - VP_H

// Design tokens (actual site)
const ACCENT = '#d4af37'
const BG = '#121212'
const BG_CARD = '#1a1a1a'
const BG_DEEP = '#0a0a0a'
const TX = '#e0e0e0'
const TX_DIM = '#a0a0a0'
const TX_MUTED = '#666'
const BD = 'rgba(255,255,255,0.06)'

/* ═══════════════ SCROLL CURVE ═══════════════ */

function useScrollY(): number {
  const frame = useCurrentFrame()
  return interpolate(
    frame,
    [toF(0), toF(16), toF(18), toF(30), toF(49), toF(70), toF(85), toF(89), toF(91), toF(105), toF(121), toF(162)],
    [0, 0, 0, S_H, S_H * 2, S_H * 3, S_H * 4, S_H * 4, S_H * 4, S_H * 5, MAX_SCROLL, MAX_SCROLL],
    { extrapolateRight: 'clamp' },
  )
}

/* ═══════════════ SITE SECTIONS ═══════════════ */

const sectionBox = (bg = BG): React.CSSProperties => ({
  width: '100%', height: S_H, background: bg, position: 'relative',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  overflow: 'hidden',
})

/** Hub section accent bar + label */
const HubLabel: React.FC<{ num: number; total: number; title: string }> = ({ num, total, title }) => (
  <div style={{ width: '100%', padding: '0 60px', marginBottom: 36 }}>
    <div style={{ height: 2, width: 36, background: ACCENT, marginBottom: 14, boxShadow: `0 0 12px ${ACCENT}40` }} />
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span style={{ color: TX_MUTED, fontSize: 12, fontFamily: FONT_EN, letterSpacing: 1 }}>{num}/{total}</span>
      <span style={{ color: TX, fontSize: 20, fontWeight: 600, fontFamily: FONT_KR }}>{title}</span>
    </div>
  </div>
)

/* ── 1. Hero ── */
const SiteHero: React.FC = () => (
  <div style={{ ...sectionBox(BG_DEEP), gap: 18 }}>
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'linear-gradient(rgba(212,175,55,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.015) 1px,transparent 1px)',
      backgroundSize: '60px 60px',
    }} />
    <div style={{ color: ACCENT, fontSize: 48, fontWeight: 700, fontFamily: FONT_EN, letterSpacing: 14, textShadow: `0 0 50px ${ACCENT}30` }}>
      FEEL & NOTE
    </div>
    <div style={{ color: TX_DIM, fontSize: 15, fontFamily: FONT_EN, letterSpacing: 8 }}>YOUR CULTURAL LEGACY</div>
    <div style={{ width: 36, height: 1, background: `${ACCENT}30`, margin: '10px 0' }} />
    <div style={{ color: TX_MUTED, fontSize: 14, fontFamily: FONT_KR, letterSpacing: 4 }}>기록은 감각이 된다</div>
    <div style={{ position: 'absolute', bottom: 36, color: TX_MUTED, fontSize: 18, opacity: 0.5 }}>▽</div>
  </div>
)

/* ── 2. Explore: Celeb Grid ── */
const SiteExplore: React.FC = () => (
  <div style={sectionBox()}>
    <HubLabel num={1} total={6} title="왕성한 탐구자" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, padding: '0 80px', width: '100%', maxWidth: 860 }}>
      {celebAvatars.slice(0, 8).map((c, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%', overflow: 'hidden',
            border: `1.5px solid ${ACCENT}25`,
            boxShadow: `0 0 16px ${ACCENT}10`,
          }}>
            <Img src={c.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ color: TX, fontSize: 11, fontFamily: FONT_KR, textAlign: 'center' }}>{c.name}</div>
        </div>
      ))}
    </div>
    <div style={{ color: TX_MUTED, fontSize: 12, fontFamily: FONT_KR, marginTop: 28, letterSpacing: 3 }}>
      1,000명 이상의 위인들이 남긴 기록
    </div>
  </div>
)

/* ── 3. Profile ── */
const SiteProfile: React.FC = () => (
  <div style={{ ...sectionBox(), gap: 0 }}>
    {/* Avatar + Name */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
        border: `2px solid ${ACCENT}30`, boxShadow: `0 0 30px ${ACCENT}15`,
      }}>
        <Img src={alexander.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ color: TX, fontSize: 22, fontWeight: 600, fontFamily: FONT_KR }}>{alexander.nickname}</div>
      <div style={{
        color: ACCENT, fontSize: 11, fontFamily: FONT_EN, letterSpacing: 2,
        padding: '3px 12px', border: `1px solid ${ACCENT}25`, borderRadius: 20,
      }}>
        {alexander.nickname_en}
      </div>
    </div>
    {/* Quote */}
    <div style={{
      background: `${ACCENT}06`, border: `1px solid ${ACCENT}10`, borderRadius: 12,
      padding: '14px 20px', maxWidth: 420, marginBottom: 20, textAlign: 'center',
    }}>
      <div style={{ color: ACCENT, fontSize: 9, fontFamily: FONT_EN, letterSpacing: 3, fontWeight: 600, marginBottom: 8 }}>QUOTE</div>
      <div style={{ color: TX_DIM, fontSize: 13, fontFamily: FONT_BODY, fontStyle: 'italic', lineHeight: 1.7 }}>
        "{alexander.quote}"
      </div>
    </div>
    {/* Stats */}
    <div style={{ display: 'flex', gap: 16, maxWidth: 380, width: '100%', marginBottom: 20 }}>
      {[{ l: '정치', v: 0.9 }, { l: '전략', v: 0.95 }, { l: '문화', v: 0.6 }].map(({ l, v }) => (
        <div key={l} style={{ flex: 1 }}>
          <div style={{ color: TX_MUTED, fontSize: 10, fontFamily: FONT_KR, marginBottom: 5 }}>{l}</div>
          <div style={{ height: 4, background: `${ACCENT}10`, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${v * 100}%`, height: '100%', background: `linear-gradient(90deg, ${ACCENT}40, ${ACCENT}80)`, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
    {/* Books */}
    <div>
      <div style={{ color: TX_MUTED, fontSize: 9, fontFamily: FONT_EN, letterSpacing: 2, marginBottom: 8 }}>READING</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['일리아스', '키루스의 교육', '아이스킬로스 비극'].map(t => (
          <div key={t} style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}10`, borderRadius: 8, padding: '5px 10px', color: TX_DIM, fontSize: 11, fontFamily: FONT_KR }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  </div>
)

/* ── 4. Books ── */
const bookData = [
  { title: '일리아스', author: '호메로스', grad: 'linear-gradient(145deg, #2a1810, #4a2820)', stars: 5 },
  { title: '키루스의 교육', author: '크세노폰', grad: 'linear-gradient(145deg, #1a2428, #2a3a40)', stars: 4 },
  { title: '아이스킬로스 비극', author: '아이스킬로스', grad: 'linear-gradient(145deg, #1a1830, #2a2840)', stars: 5 },
]

const SiteBooks: React.FC = () => (
  <div style={sectionBox()}>
    <HubLabel num={2} total={6} title="추천 도서" />
    <div style={{ display: 'flex', gap: 20, padding: '0 60px' }}>
      {bookData.map((b, i) => (
        <div key={i} style={{ width: 200, background: BG_CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Poster */}
          <div style={{ height: 260, background: b.grad, display: 'flex', alignItems: 'flex-end', padding: 14 }}>
            <div style={{ color: TX, fontSize: 14, fontWeight: 600, fontFamily: FONT_KR, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              {b.title}
            </div>
          </div>
          {/* Info */}
          <div style={{ padding: '10px 14px' }}>
            <div style={{ color: TX_DIM, fontSize: 11, fontFamily: FONT_KR }}>{b.author}</div>
            <div style={{ color: ACCENT, fontSize: 11, marginTop: 4, letterSpacing: 1 }}>
              {'★'.repeat(b.stars)}{'☆'.repeat(5 - b.stars)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

/* ── 5. Scriptures ── */
const eras = [
  { period: '고대', range: 'BC ~ 5C', celebs: 127, contents: 892, accent: '#c8a46e' },
  { period: '중세', range: '5C ~ 15C', celebs: 203, contents: 1340, accent: '#8bb8a8' },
  { period: '근대', range: '15C ~ 19C', celebs: 341, contents: 2156, accent: '#a0a0c8' },
]

const SiteScriptures: React.FC = () => (
  <div style={sectionBox()}>
    <HubLabel num={1} total={5} title="불후의 명작" />
    <div style={{ display: 'flex', gap: 20, padding: '0 60px' }}>
      {eras.map((e, i) => (
        <div key={i} style={{
          width: 220, background: BG_CARD, border: `1px solid ${BD}`, borderRadius: 12,
          padding: 20, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: e.accent }} />
          <div style={{ color: TX, fontSize: 20, fontWeight: 600, fontFamily: FONT_KR, marginBottom: 4 }}>{e.period}</div>
          <div style={{ color: TX_MUTED, fontSize: 12, fontFamily: FONT_EN, marginBottom: 16, letterSpacing: 1 }}>{e.range}</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ color: e.accent, fontSize: 20, fontWeight: 700, fontFamily: FONT_EN }}>{e.celebs}</div>
              <div style={{ color: TX_MUTED, fontSize: 10, fontFamily: FONT_KR }}>인물</div>
            </div>
            <div>
              <div style={{ color: TX_DIM, fontSize: 20, fontWeight: 700, fontFamily: FONT_EN }}>{e.contents}</div>
              <div style={{ color: TX_MUTED, fontSize: 10, fontFamily: FONT_KR }}>콘텐츠</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

/* ── 6. Library ── */
const shelfColors = [
  ['#8b4513', '#a0522d', '#6b3a2a', '#4a2a1a', '#7b5b3a'],
  ['#2a3a4a', '#3a2a1a', '#5a3a2a', '#1a3a5a', '#4a3a2a'],
]

const SiteLibrary: React.FC = () => (
  <div style={sectionBox()}>
    <div style={{ color: TX, fontSize: 20, fontWeight: 600, fontFamily: FONT_KR, marginBottom: 8 }}>나의 기록관</div>
    <div style={{ color: TX_MUTED, fontSize: 12, fontFamily: FONT_KR, marginBottom: 28, letterSpacing: 2 }}>
      읽은 책 47 · 본 영화 23 · 들은 음악 12
    </div>
    {/* Bookshelf */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {shelfColors.map((row, ri) => (
        <div key={ri}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {row.map((color, ci) => (
              <div key={ci} style={{
                width: 36, height: 140, borderRadius: 3,
                background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.3), 2px 0 4px rgba(0,0,0,0.2)',
              }} />
            ))}
          </div>
          <div style={{
            height: 6, marginLeft: 40, marginRight: 40,
            background: 'linear-gradient(180deg, #3a3020, #2a2018)',
            borderRadius: 2, boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
          }} />
        </div>
      ))}
    </div>
    {/* Recent Activity */}
    <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
      {['플루타르코스 영웅전을 서재에 담았습니다', '호메로스 오디세이아 ★★★★★'].map((text, i) => (
        <div key={i} style={{
          background: BG_CARD, border: `1px solid ${BD}`, borderRadius: 10,
          padding: '10px 16px', color: TX_DIM, fontSize: 11, fontFamily: FONT_KR,
        }}>
          {text}
        </div>
      ))}
    </div>
  </div>
)

/* ── 7. CTA ── */
const SiteCTA: React.FC = () => (
  <div style={{ ...sectionBox(BG_DEEP), gap: 20 }}>
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'linear-gradient(rgba(212,175,55,0.01) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.01) 1px,transparent 1px)',
      backgroundSize: '60px 60px',
    }} />
    <div style={{ color: ACCENT, fontSize: 56, fontWeight: 700, fontFamily: FONT_EN, letterSpacing: 12, textShadow: `0 0 60px ${ACCENT}30` }}>
      FEEL AND NOTE
    </div>
    <div style={{ color: TX_DIM, fontSize: 18, fontFamily: FONT_KR, letterSpacing: 5 }}>기록은 감각이 된다</div>
    <div style={{ width: 40, height: 1, background: `${ACCENT}30`, margin: '8px 0' }} />
    <div style={{ color: TX_MUTED, fontSize: 14, fontFamily: FONT_EN, letterSpacing: 3 }}>feelandnote.com</div>
  </div>
)

/* ═══════════════ BROWSER FRAME ═══════════════ */

/** Site header (fixed inside browser) */
const SiteHeader: React.FC<{ opacity: number }> = ({ opacity }) => {
  const scrollY = useScrollY()
  const activeIdx = Math.floor(scrollY / S_H)
  const navItems = ['탐색', '서고', '쉼터']
  const activeMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 1, 5: -1, 6: -1 } // section → nav index

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: CHROME_H,
      background: `${BG}f0`, backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${BD}`, zIndex: 10,
      display: 'flex', alignItems: 'center', padding: '0 20px',
      opacity,
    }}>
      {/* Window dots */}
      <div style={{ display: 'flex', gap: 6, marginRight: 16 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
        ))}
      </div>
      {/* URL bar */}
      <div style={{
        flex: 1, display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 20px',
          color: TX_DIM, fontSize: 12, fontFamily: 'system-ui', letterSpacing: 0.5,
        }}>
          feelandnote.com
        </div>
      </div>
      {/* Nav items */}
      <div style={{ display: 'flex', gap: 16 }}>
        {navItems.map((item, i) => (
          <div key={i} style={{
            color: activeMap[activeIdx] === i ? ACCENT : TX_MUTED,
            fontSize: 12, fontFamily: FONT_KR, fontWeight: activeMap[activeIdx] === i ? 600 : 400,
          }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Scrollbar thumb */
const ScrollBar: React.FC = () => {
  const scrollY = useScrollY()
  const thumbH = Math.max(30, VP_H * (VP_H / (S_H * SECTION_COUNT)))
  const thumbY = (scrollY / MAX_SCROLL) * (VP_H - thumbH)

  return (
    <div style={{ position: 'absolute', right: 2, top: CHROME_H, width: 5, height: VP_H, zIndex: 5 }}>
      <div style={{
        position: 'absolute', top: thumbY, width: 5, height: thumbH,
        background: 'rgba(255,255,255,0.12)', borderRadius: 3,
      }} />
    </div>
  )
}

/** Gold scan line on section transitions */
const ScanLines: React.FC = () => {
  const frame = useCurrentFrame()
  const triggers = [18, 30, 49, 70, 91, 105, 121]

  return (
    <div style={{ position: 'absolute', top: CHROME_H, left: 0, right: 0, height: VP_H, overflow: 'hidden', pointerEvents: 'none', zIndex: 6 }}>
      {triggers.map((sec, i) => {
        const f0 = toF(sec)
        const local = frame - f0
        if (local < 0 || local > 25) return null
        const y = interpolate(local, [0, 25], [-4, VP_H + 4])
        const op = interpolate(local, [0, 4, 20, 25], [0, 0.5, 0.5, 0])
        return (
          <div key={i} style={{
            position: 'absolute', left: 0, right: 0, top: y, height: 2,
            background: `linear-gradient(90deg, transparent 5%, rgba(212,175,55,${op}) 50%, transparent 95%)`,
            boxShadow: `0 0 20px rgba(212,175,55,${op * 0.4})`,
          }} />
        )
      })}
    </div>
  )
}

/** Browser frame wrapper */
const BrowserFrame: React.FC = () => {
  const frame = useCurrentFrame()
  const scrollY = useScrollY()

  // Fade in at 14-17s, fade out at 150-155s
  const frameOpacity = interpolate(frame,
    [toF(14), toF(17), toF(150), toF(155)],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // Chrome fades out during zoom (140-148s)
  const chromeOpacity = interpolate(frame, [toF(140), toF(148)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Zoom to fill during Chorus 2 (121-148s): 1 → 1920/1440
  const zoomScale = interpolate(frame, [toF(121), toF(148)], [1, 1920 / BW], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Subtle 3D perspective rotation
  const rotY = interpolate(frame, [toF(16), toF(85), toF(155)], [-0.6, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  if (frameOpacity <= 0) return null

  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      width: BW, height: BH,
      transform: `translate(-50%, -50%) perspective(3000px) rotateY(${rotY}deg) scale(${zoomScale})`,
      borderRadius: zoomScale > 1.05 ? 0 : 14,
      overflow: 'hidden',
      border: `1px solid rgba(255,255,255,${0.08 * chromeOpacity})`,
      boxShadow: `0 40px 120px rgba(0,0,0,${0.8 * chromeOpacity})`,
      opacity: frameOpacity,
    }}>
      {/* Scrolling content */}
      <div style={{
        position: 'absolute', top: CHROME_H, left: 0, right: 0, bottom: 0,
        overflow: 'hidden',
      }}>
        <div style={{ transform: `translateY(${-scrollY}px)` }}>
          <SiteHero />
          <SiteExplore />
          <SiteProfile />
          <SiteBooks />
          <SiteScriptures />
          <SiteLibrary />
          <SiteCTA />
        </div>
      </div>

      {/* Fixed overlays */}
      <SiteHeader opacity={chromeOpacity} />
      <ScrollBar />
      <ScanLines />
    </div>
  )
}

/* ═══════════════ BACKGROUND ═══════════════ */

const Background: React.FC = () => {
  const frame = useCurrentFrame()
  const progress = frame / TOTAL_FRAMES
  const scale = interpolate(progress, [0, 1], [1, 1.12])
  const ty = interpolate(progress, [0, 1], [0, -30])

  return (
    <AbsoluteFill>
      <Img
        src={staticFile('images/olympus-bg.jpg')}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateY(${ty}px)` }}
      />
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.9) 100%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)' }} />
    </AbsoluteFill>
  )
}

/* ═══════════════ PARTICLES ═══════════════ */

const Particles: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 20 }, (_, i) => {
        const t = Math.max(0, frame - (i * 13) % 60)
        const y = (((i * 47 + 31) % 100) + t * (0.12 + (i % 5) * 0.06) * -0.3) % 110
        const x = ((i * 73 + 17) % 100) + Math.sin(t * 0.02 + i) * 1.5
        const op = (0.1 + (i % 3) * 0.08) * (Math.sin(t * 0.08 + i * 2) * 0.3 + 0.7)
        const sz = 1.5 + (i % 4) * 0.7
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: sz, height: sz, borderRadius: '50%',
            backgroundColor: `rgba(200,164,110,${op})`,
            boxShadow: `0 0 ${sz * 3}px rgba(200,164,110,${op * 0.5})`,
          }} />
        )
      })}
    </div>
  )
}

/* ═══════════════ INTRO / OUTRO LOGO ═══════════════ */

const FullScreenLogo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Intro: 0-14s
  const introOp = Math.min(
    interpolate(frame, [toF(0.5), toF(2.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(frame, [toF(12), toF(14)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  )
  // Outro: 155-162s
  const outroOp = interpolate(frame, [toF(155), toF(157)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const isIntro = frame < toF(14)
  const isOutro = frame >= toF(155)
  const opacity = isIntro ? introOp : isOutro ? outroOp : 0
  if (opacity <= 0) return null

  const s = spring({ frame: isOutro ? Math.max(0, frame - toF(155)) : frame, fps, config: { damping: 20, stiffness: 100 } })

  return (
    <div style={{
      position: 'absolute', top: isOutro ? '36%' : '30%', left: 0, right: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      opacity, transform: `scale(${s})`, zIndex: 20,
    }}>
      <div style={{
        color: ACCENT, fontSize: isOutro ? 64 : 56, fontWeight: 700, fontFamily: FONT_EN,
        letterSpacing: 12, textShadow: `0 0 60px ${ACCENT}40, 0 4px 30px rgba(0,0,0,0.9)`,
      }}>
        FEEL AND NOTE
      </div>
      <div style={{
        color: TX_DIM, fontSize: 20, fontFamily: FONT_KR, letterSpacing: 6,
        textShadow: '0 2px 20px rgba(0,0,0,0.8)',
      }}>
        {isOutro ? 'feelandnote.com' : '기록은 감각이 된다'}
      </div>
    </div>
  )
}

/* ═══════════════ LYRICS ═══════════════ */

const Lyrics: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <div style={{
      position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 30,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 100px',
    }}>
      {subtitles.map((sub, si) => {
        if (sub.section === 'marker') return null
        const sF = toF(sub.startSec)
        const eF = toF(sub.endSec)
        if (frame < sF - 2 || frame > eF + 10) return null

        const fadeIn = interpolate(frame, [sF, sF + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        const fadeOut = interpolate(frame, [eF - 10, eF], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        const y = interpolate(frame, [sF, sF + 12], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        const isC = sub.section === 'chorus'
        const isI = sub.section === 'intro'

        return (
          <div key={si} style={{
            opacity: Math.min(fadeIn, fadeOut), transform: `translateY(${y}px)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            {sub.lines.map((line, li) => (
              <div key={li} style={{
                color: isC ? '#e8dcc8' : isI ? '#b0a090' : '#d0c8b8',
                fontSize: isC ? 40 : isI ? 28 : 34,
                fontWeight: isC ? 600 : 400,
                fontFamily: FONT_KR, textAlign: 'center',
                letterSpacing: isC ? 3 : 2, lineHeight: 1.5,
                textShadow: isC
                  ? `0 0 30px ${ACCENT}25, 0 3px 15px rgba(0,0,0,0.9)`
                  : '0 3px 15px rgba(0,0,0,0.9)',
              }}>
                {line}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════ MAIN ═══════════════ */

export const ServiceMV: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
    <Background />
    <Particles />
    <BrowserFrame />
    <FullScreenLogo />
    <Lyrics />
    <Audio src={staticFile('music/olympus-theme.mp3')} />
  </AbsoluteFill>
)

export const totalFrames = TOTAL_FRAMES
