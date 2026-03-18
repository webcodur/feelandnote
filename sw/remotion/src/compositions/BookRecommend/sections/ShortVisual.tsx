/**
 * ShortVisual -- segment visual type renderer (hook / intro / book / cta)
 */
import React from 'react'
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion'
import type { ShortSegment, CelebHost, BookEntry } from '../types'
import { safeImg } from '../utils'
import { FPS, SHORT_FALLBACK, f } from '../timing'
import { FONT } from '../fonts'
import { KoreanTypewriter } from './KoreanTypewriter'

const AVATAR = 200
const avatarStyle = {
  width: AVATAR, height: AVATAR, borderRadius: '50%', overflow: 'hidden' as const,
  border: '3px solid rgba(200,164,110,0.35)',
  boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
}
const COVER = { w: 240, h: 360 } as const

const SHORTS = {
  headline: 60,
  name: 52,
  meta: 32,
  quote: 52,
  body: 50,
  caption: 50,
  cta: 50,
} as const

interface Props {
  seg: ShortSegment
  opacity: number
  startFrame: number
  safePad: string
  host: CelebHost
  book: BookEntry
  coverScale: number
  locale?: 'ko' | 'en'
  timings?: { start: number; end: number }[]
}

export const ShortVisual: React.FC<Props> = ({
  seg, opacity, startFrame, safePad, host, book, coverScale, locale, timings,
}) => {
  const frame = useCurrentFrame()
  if (opacity <= 0) return null
  const isCeleb = seg.role === 'celeb'
  const textColor = isCeleb ? '#c8a46e' : '#e8e0d0'
  const spreadFrames = seg.duration ? Math.ceil(seg.duration * FPS) : SHORT_FALLBACK

  switch (seg.visual) {
    case 'hook':
      return (
        <AbsoluteFill style={{
          opacity,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 32, padding: safePad,
        }}>
          <div style={avatarStyle}>
            <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{
            color: '#f0ece4', fontSize: SHORTS.headline, fontWeight: 800,
            fontFamily: FONT.serif, textAlign: 'center', lineHeight: 1.4,
          }}>
            {seg.text}
          </div>
        </AbsoluteFill>
      )

    case 'intro':
      return (
        <AbsoluteFill style={{
          opacity,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: safePad,
        }}>
          <div style={avatarStyle}>
            <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {!isCeleb && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ color: '#e8e0d0', fontSize: SHORTS.name, fontWeight: 700, fontFamily: FONT.sans }}>
                {host.nickname}
              </div>
              <div style={{ color: '#c8a46e', fontSize: 32, fontWeight: 700, fontFamily: FONT.cormorant, letterSpacing: 5 }}>
                {locale === 'en' ? host.title : host.nickname_en}
              </div>
            </div>
          )}
          <div style={{
            maxWidth: 780,
            ...(isCeleb ? { borderLeft: '4px solid rgba(200,164,110,0.4)', paddingLeft: 24 } : {}),
          }}>
            <KoreanTypewriter
              text={seg.text}
              startFrame={startFrame}
              spreadFrames={spreadFrames}
              color={textColor}
              fontSize={isCeleb ? SHORTS.quote : SHORTS.body}
              style={{
                fontFamily: isCeleb ? FONT.serif : FONT.sans,
                fontWeight: isCeleb ? 700 : 400,
                textAlign: isCeleb ? 'left' : 'center',
                lineHeight: 1.7,
              }}
              timings={timings}
            />
          </div>
        </AbsoluteFill>
      )

    case 'book': {
      const isEn = locale === 'en'
      const cw = isEn ? 280 : COVER.w
      const ch = isEn ? 420 : COVER.h
      const fontSize = isEn ? 42 : SHORTS.caption

      // 문장 분할 → 전반/후반 페이지
      const sentences = seg.text.split(/(?<=[.?!。])\s+/).filter(Boolean)
      const mid = Math.ceil(sentences.length / 2)
      const page1 = sentences.slice(0, mid).join(' ')
      const page2 = sentences.slice(mid).join(' ')
      const needsPaging = page2.length > 0 && seg.text.length > (isEn ? 150 : 80)

      // 페이지 전환 시점: 오디오의 mid 문장 시작에 맞춤
      const midAudioStart = timings && timings.length > mid ? timings[mid].start : 0
      const switchFrame = needsPaging && midAudioStart > 0
        ? Math.round(midAudioStart * FPS)
        : Math.floor(spreadFrames / 2)
      const fadeLen = f(0.5)
      const elapsed = frame - startFrame
      const page1Op = needsPaging
        ? interpolate(elapsed, [switchFrame - fadeLen, switchFrame], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        : 1
      const page2Op = needsPaging
        ? interpolate(elapsed, [switchFrame, switchFrame + fadeLen], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        : 0

      // safePad 파싱 — 상단/좌우/하단 분리
      const padParts = safePad.split(' ')
      const topPad = parseInt(padParts[0])
      const sidePad = parseInt(padParts[1])
      const bottomPad = parseInt(padParts[2])
      // 포스터~텍스트 간격 = 상단 헤더~포스터 간격과 동일
      const GAP = 60

      return (
        <AbsoluteFill style={{
          opacity,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          paddingTop: topPad + GAP,
          paddingLeft: sidePad,
          paddingRight: sidePad,
          paddingBottom: bottomPad,
        }}>
          {/* 포스터 */}
          <div style={{ transform: `scale(${coverScale})`, flexShrink: 0, marginBottom: GAP }}>
            <div style={{
              width: cw, height: ch, borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 50px rgba(200,164,110,0.1)',
            }}>
              <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div style={{ maxWidth: 780, textAlign: 'center', position: 'relative' }}>
            {needsPaging ? (<>
              <div style={{ opacity: page1Op }}>
                <KoreanTypewriter
                  text={page1}
                  startFrame={startFrame}
                  spreadFrames={switchFrame}
                  color="#e8e0d0"
                  fontSize={fontSize}
                  style={{ fontFamily: FONT.sans, lineHeight: 1.8 }}
                  timings={timings?.slice(0, mid)}
                />
              </div>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: page2Op }}>
                <KoreanTypewriter
                  text={page2}
                  startFrame={startFrame + switchFrame}
                  spreadFrames={spreadFrames - switchFrame}
                  color="#e8e0d0"
                  fontSize={fontSize}
                  style={{ fontFamily: FONT.sans, lineHeight: 1.8 }}
                  timings={timings?.slice(mid).map(t => ({ start: t.start - midAudioStart, end: t.end - midAudioStart }))}
                />
              </div>
            </>) : (
              <KoreanTypewriter
                text={seg.text}
                startFrame={startFrame}
                spreadFrames={spreadFrames}
                color="#e8e0d0"
                fontSize={fontSize}
                style={{ fontFamily: FONT.sans, lineHeight: 1.8 }}
                timings={timings}
              />
            )}
          </div>
        </AbsoluteFill>
      )
    }

    case 'cta':
      return (
        <AbsoluteFill style={{
          opacity,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 24, padding: safePad,
        }}>
          {isCeleb && (
            <div style={avatarStyle}>
              <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ maxWidth: 780 }}>
            <KoreanTypewriter
              text={seg.text}
              startFrame={startFrame}
              spreadFrames={spreadFrames}
              color={isCeleb ? '#c8a46e' : '#ccc'}
              fontSize={isCeleb ? SHORTS.quote : SHORTS.cta}
              timings={timings}
              style={{
                fontFamily: isCeleb ? FONT.serif : FONT.sans,
                fontWeight: isCeleb ? 700 : 400,
                textAlign: 'center',
                lineHeight: 1.65,
              }}
            />
          </div>
        </AbsoluteFill>
      )

    default:
      return null
  }
}
