/**
 * BookRecommendShort -- shorts (9:16)
 *
 * segment array driven. narration flows, visuals follow.
 * each segment's visual type determines the screen:
 *   hook  -- avatar + hook text
 *   intro -- avatar + name + subtitle
 *   book  -- cover + subtitle
 *   cta   -- celeb quote + logo
 *
 * @see docs/project/shorts-design.md
 */
import React, { useEffect } from 'react'
import { AbsoluteFill, Audio, getRemotionEnvironment, Img, prefetch, Series, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookRecommendScript } from './types'
import { fadeInOut, BrandLogo, BRAND_LOGO_SIZE, sf, makeVf, imageBase } from './utils'
import { FONT } from './fonts'
import { toFrames, SHORT_GAP, SHORT_FALLBACK, SHORT_BRAND_FRAMES, SHORT_LOGO_FRAMES, shortTotalFrames, FPS, f } from './timing'
import { EPISODE_NAME, loadVoiceSelect, isVoiceReady } from './script'
import { ShortVisual } from './sections/ShortVisual'
import { ShortDevOverlay } from './studio/ShortDevOverlay'
import { t } from './i18n'
import { vnShort, vnTimingKey } from './voice-names'

/** safe zone — top/bottom 40% 축소, 좌우 여유 확대 (YouTube 버튼 회피) */
const SAFE_TOP = 230
const SAFE_BOTTOM = 300
const HEADER_H = Math.round(SAFE_TOP * 1.5) + 140
const SAFE_PAD = `${HEADER_H + 20}px 140px ${SAFE_BOTTOM + 40}px`

type Props = { script: BookRecommendScript; episodeName?: string }

export const calcShortTotalFrames = (script: BookRecommendScript) => {
  if (!script.shorts?.segments) return 300
  return shortTotalFrames(script.shorts.segments)
}

export const BookRecommendShort: React.FC<Props> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const epName = episodeName ?? EPISODE_NAME
  const vf = makeVf(epName, loadVoiceSelect(epName), script.locale)
  const { host, books } = script
  const hasVoice = isVoiceReady(script)
  const bi = script.shorts?.featuredBookIndex ?? 0
  const book = books[bi]
  const segments = script.shorts?.segments ?? []

  // --- segment timing ---
  const segTimings = segments.map(seg => seg.duration ? toFrames(seg.duration) : SHORT_FALLBACK)

  const segStarts: number[] = []
  let cursor = 0
  let brandStart = 0
  for (let i = 0; i < segTimings.length; i++) {
    segStarts.push(cursor)
    cursor += segTimings[i] + SHORT_GAP
    if (i === 0) {
      brandStart = cursor
      cursor += SHORT_BRAND_FRAMES + SHORT_GAP
    }
  }
  const logoStart = cursor

  // --- prefetch ---
  useEffect(() => {
    if (!hasVoice) return
    const urls = [
      sf('sfx/whoosh.wav'), sf('sfx/chime.wav'),
      sf(`images/${imageBase(epName)}/book-${bi}-summary.png`),
      ...segments.map((seg, i) => vf(vnShort(i, seg.id))),
    ]
    const cleanups = urls.map(u => {
      const { free } = prefetch(u, { method: 'blob-url', contentType: 'audio/wav' })
      return free
    })
    return () => cleanups.forEach(fn => fn())
  }, [segments.length, hasVoice])

  // --- helpers ---
  const segOp = (i: number) => {
    // 첫 세그먼트(hook): 페이드인 없이 즉시 표시 — frame 0 = 썸네일
    if (i === 0) {
      const local = frame - segStarts[0]
      if (local < 0 || local >= segTimings[0]) return 0
      if (local >= segTimings[0] - f(0.5)) return (segTimings[0] - local) / f(0.5)
      return 1
    }
    return fadeInOut(frame, segStarts[i], segTimings[i])
  }
  const logoOp = fadeInOut(frame, logoStart, SHORT_LOGO_FRAMES)

  const bookSegIdx = segments.findIndex(s => s.visual === 'book')
  const bookStart = bookSegIdx >= 0 ? segStarts[bookSegIdx] : 0
  const coverScale = spring({
    frame: Math.max(0, frame - bookStart - f(0.1)), fps,
    config: { damping: 14, stiffness: 140 },
  })

  // --- subtitle (sentence-level) ---
  const BREATH = f(0.27)
  const currentSeg = segments.findIndex((_, i) =>
    frame >= segStarts[i] && frame < segStarts[i] + segTimings[i]
  )

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* background image */}
      <Img src={sf(`images/${imageBase(epName)}/book-${bi}-summary.png`)} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: 'brightness(0.4) saturate(0.6)',
      }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(26,21,16,0.3) 0%, rgba(10,10,10,0.6) 70%)' }} />

      {/* ── fixed header (top safe zone) — 제목 고정, 1.5배 영역 ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
        background: '#080604',
        borderBottom: '1px solid rgba(200,164,110,0.25)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '160px 60px 0',
        zIndex: 10,
      }}>
        {(() => {
          const h = t(script).headerTitle(host.nickname, books.length)
          const isEn = script.locale === 'en'
          return isEn ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#e8e0d0', fontSize: 68, fontWeight: 700, fontFamily: FONT.sans, lineHeight: 1.3 }}>{h.line1}</div>
              <div style={{ color: '#e8e0d0', fontSize: 95, fontWeight: 700, fontFamily: FONT.sans, lineHeight: 1.3 }}>{h.line2}</div>
            </div>
          ) : (
            <div style={{ color: '#e8e0d0', fontSize: 95, fontWeight: 700, fontFamily: FONT.sans, textAlign: 'center', lineHeight: 1.3 }}>
              {h.line1}<br />{h.line2}
            </div>
          )
        })()}
      </div>

      {/* ── fixed logo — 본문 영역 우상단 ── */}
      <div style={{
        position: 'absolute', top: HEADER_H + 20, right: 50,
        zIndex: 10,
      }}>
        <BrandLogo variant="brand" fontSize={32} />
      </div>

      {/* ── fixed footer (bottom safe zone — empty for YouTube metadata) ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE_BOTTOM,
        background: '#050505',
        borderTop: '1px solid rgba(200,164,110,0.15)',
        zIndex: 10,
      }} />

      {/* audio -- Series sequential layout */}
      {hasVoice && (
        <Series>
          {segments.map((seg, i) => (
            <React.Fragment key={seg.id}>
              <Series.Sequence durationInFrames={segTimings[i]} offset={i > 0 ? SHORT_GAP : 0}>
                {i === 0 && <Audio src={sf('sfx/whoosh.wav')} volume={0.1} />}
                <Audio src={vf(vnShort(i, seg.id))} />
              </Series.Sequence>
              {i === 0 && (
                <Series.Sequence durationInFrames={SHORT_BRAND_FRAMES} offset={SHORT_GAP}>
                  <Audio src={sf('sfx/chime.wav')} volume={0.5} />
                </Series.Sequence>
              )}
            </React.Fragment>
          ))}
          <Series.Sequence durationInFrames={SHORT_LOGO_FRAMES} offset={SHORT_GAP}>
            <Audio src={sf('sfx/chime.wav')} volume={0.5} />
          </Series.Sequence>
        </Series>
      )}

      {/* brand intro */}
      {fadeInOut(frame, brandStart, SHORT_BRAND_FRAMES) > 0 && (
        <AbsoluteFill style={{
          opacity: fadeInOut(frame, brandStart, SHORT_BRAND_FRAMES),
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: SAFE_PAD,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
            <BrandLogo variant="brand" fontSize={40} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 50, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
              <div style={{ color: '#c8a46e', fontSize: 28, fontFamily: FONT.cinzel, letterSpacing: 6, opacity: 0.7 }}>{t(script).libraryTour}</div>
              <div style={{ width: 50, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <div style={{ color: '#c8a46e', fontSize: 56, fontWeight: 800, fontFamily: FONT.serif, textAlign: 'center', lineHeight: 1.4 }}>
                {t(script).brandSubtitle(host.nickname, books.length)}
              </div>
              <div style={{ color: '#e8e0d0', fontSize: 64, fontWeight: 800, fontFamily: FONT.serif }}>
                {t(script).brandCount(books.length)}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* segment visuals */}
      {segments.map((seg, i) => (
        <ShortVisual
          key={seg.id}
          seg={seg}
          opacity={segOp(i)}
          startFrame={segStarts[i]}
          safePad={SAFE_PAD}
          host={host}
          book={book}
          coverScale={coverScale}
          locale={script.locale}
          timings={script.voiceTimings?.[vnTimingKey(vnShort(i, seg.id))]}
          audioSrc={seg.role === 'celeb' ? vf(vnShort(i, seg.id)) : undefined}
        />
      ))}

      {/* logo + closing */}
      {logoOp > 0 && (
        <AbsoluteFill style={{
          opacity: logoOp,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 32, padding: SAFE_PAD,
        }}>
          <BrandLogo fontSize={BRAND_LOGO_SIZE * 2} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{ color: '#e8e0d0', fontSize: 52, fontFamily: FONT.sans, fontWeight: 600, textAlign: 'center', whiteSpace: 'pre-line' }}>
              {t(script).tagline}
            </div>
            <div style={{ color: '#999', fontSize: 40, fontFamily: FONT.sans }}>
              {t(script).ctaText}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* studio-only dev overlay */}
      {!getRemotionEnvironment().isRendering && (
        <ShortDevOverlay
          frame={frame}
          brandStart={brandStart}
          brandFrames={SHORT_BRAND_FRAMES}
          logoStart={logoStart}
          logoFrames={SHORT_LOGO_FRAMES}
          currentSeg={currentSeg}
          segments={segments}
        />
      )}
    </AbsoluteFill>
  )
}
