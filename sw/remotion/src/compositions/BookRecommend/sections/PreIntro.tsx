/**
 * PreIntro — 서비스 인사 + 인트로 비주얼 (Part 1 전용)
 * 나레이션 동기화 시퀀스: 라벨 → 책 등장 → 아바타 reveal → 명언
 */
import React from 'react'
import { AbsoluteFill, Img, interpolate } from 'remotion'
import type { CelebHost, BookEntry } from '../types'
import { fadeInOut, safeImg } from '../utils'
import { f } from '../timing'
import { FONT } from '../fonts'
import { SpeakingIndicator } from './SpeakingIndicator'

interface Props {
  frame: number
  svcGreetingStart: number
  svcGreetingFrames: number
  svcIntroFrames: number
  fQuoteFrames: number
  host: CelebHost
  books: BookEntry[]
  locale?: 'ko' | 'en'
  /** 대표 명언 오디오 URL (SpeakingIndicator 파형용) */
  fQuoteAudioSrc?: string
}

export const PreIntro: React.FC<Props> = ({
  frame, svcGreetingStart, svcGreetingFrames, svcIntroFrames, fQuoteFrames,
  host, books, locale, fQuoteAudioSrc,
}) => {
  const libraryTourText = locale === 'en' ? 'Library Tour' : '서재 탐방'
  const totalPreIntro = svcGreetingFrames + svcIntroFrames + fQuoteFrames
  if (totalPreIntro <= 0) return null
  const local = frame - svcGreetingStart
  if (local < -5 || local > totalPreIntro + 5) return null

  const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

  // ── parts 기반 정확한 타이밍 ──
  const gf = svcGreetingFrames
  const CORNER = 0
  const LIBRARY = Math.round(gf * 0.35)
  const INTRODUCE = Math.round(gf * 0.55)

  // 책 등장
  const shelfAppear = f(0.17)
  const shelfBright = INTRODUCE
  const svcTotalEnd = svcGreetingFrames + svcIntroFrames
  const avatarAppear = svcGreetingFrames
  const revealAt = svcGreetingFrames + Math.round(svcIntroFrames * 0.5)

  // ── "서재 탐방" 라벨 ──
  const labelOp = fadeInOut(local, CORNER, svcTotalEnd - CORNER, f(0.67), f(0.67))

  // ── 책 표지: shelfAppear에서 등장, shelfBright에서 밝아짐 ──
  const shelfOp = interpolate(local,
    [shelfAppear, shelfAppear + f(0.67), svcTotalEnd - f(0.5), svcTotalEnd],
    [0, 1, 1, 0], CL)
  const brightStart = Math.max(shelfAppear + 1, LIBRARY)
  const baseBrightness = interpolate(local, [shelfAppear, brightStart, brightStart + f(0.67)], [0.35, 0.35, 0.85], CL)
  const shelfBrightness = Math.max(0.3, baseBrightness)

  // ── 책 순차 점프 ──
  const jumpStart = shelfBright
  const jumpEnd = svcGreetingFrames
  const jumpDuration = jumpEnd - jumpStart
  const bookCount = Math.min(books.length, 7)

  // ── 아바타 ──
  const avatarIn = interpolate(local, [avatarAppear, avatarAppear + f(0.67)], [0, 1], CL)
  const avatarOut = interpolate(local, [totalPreIntro - f(0.83), totalPreIntro], [1, 0], CL)
  const avatarOp = Math.min(avatarIn, avatarOut)
  const revealProgress = interpolate(local, [revealAt, revealAt + f(0.83)], [0, 1], CL)
  const imgBrightness = interpolate(revealProgress, [0, 1], [0.08, 1])
  const borderAlpha = interpolate(revealProgress, [0, 1], [0.15, 0.35])
  const questionOp = interpolate(revealProgress, [0, 0.5], [1, 0], CL)

  // ── 이름: reveal 후 등장 ──
  const nameOp = interpolate(local,
    [revealAt + f(0.33), revealAt + f(1), totalPreIntro - f(0.83), totalPreIntro],
    [0, 1, 1, 0], CL)

  // ── 명언 (fQuote 구간) ──
  const hasFQ = fQuoteFrames > 0 && !!host.featuredQuote
  const quoteVisualStart = svcTotalEnd + f(0.5)
  const quoteOp = hasFQ
    ? interpolate(local,
        [quoteVisualStart, quoteVisualStart + f(0.83), totalPreIntro - f(1.5), totalPreIntro - f(0.5)],
        [0, 1, 1, 0], CL)
    : 0

  if (avatarOp <= 0 && labelOp <= 0 && shelfOp <= 0 && quoteOp <= 0) return null

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* 아바타 블록 */}
      {(() => {
        const spaceStart = avatarAppear - f(0.5)
        const avatarHeight = 180 + 14 + 48 + 12
        const spaceH = interpolate(local, [spaceStart, avatarAppear], [0, avatarHeight], CL)
        const avatarDelay = f(0.33)
        const avatarFadeIn = interpolate(local, [avatarAppear + avatarDelay, avatarAppear + avatarDelay + f(0.5)], [0, 1], CL)
        const showSpace = local >= spaceStart && (avatarOp > 0 || spaceH > 0)
        if (!showSpace) return null
        return <div style={{ height: spaceH, minHeight: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          {avatarOp > 0 && <div style={{ opacity: Math.min(avatarFadeIn, avatarOp), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 180, height: 180, borderRadius: '50%', overflow: 'hidden',
              backgroundColor: 'rgba(30,24,16,0.9)',
              border: `2px solid rgba(200,164,110,${borderAlpha})`,
              boxShadow: revealProgress > 0.5
                ? '0 16px 50px rgba(0,0,0,0.5)'
                : '0 8px 30px rgba(0,0,0,0.3)',
            }}>
              <Img src={host.avatar_url} style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: `brightness(${imgBrightness})`,
              }} />
            </div>
            {/* "?" 오버레이 */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: questionOp,
            }}>
              <div style={{ color: '#c8a46e', fontSize: 48, fontWeight: 700, fontFamily: FONT.serif }}>?</div>
            </div>
            {quoteOp > 0 && <SpeakingIndicator size={32} opacity={quoteOp} audioSrc={fQuoteAudioSrc} audioStartFrame={svcGreetingStart + svcGreetingFrames + svcIntroFrames + f(1)} />}
          </div>
          {/* 이름 슬롯 */}
          <div style={{ minHeight: 48, minWidth: 300, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', opacity: questionOp, color: '#c8a46e', fontSize: 24, fontWeight: 700, fontFamily: FONT.serif, letterSpacing: 6, whiteSpace: 'nowrap' }}>
              ???
            </div>
            <div style={{ position: 'absolute', opacity: nameOp, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <div style={{ color: '#e8e0d0', fontSize: 26, fontWeight: 700, fontFamily: FONT.sans }}>{host.nickname}</div>
              <div style={{ color: '#777', fontSize: 14, fontFamily: FONT.cormorant, letterSpacing: 2 }}>{locale === 'en' ? host.title : host.nickname_en}</div>
            </div>
          </div>
        </div>}
        </div>
      })()}

      {/* 하단 슬롯 */}
      <div style={{
        position: 'relative', width: '100%',
        minHeight: interpolate(local, [svcTotalEnd - f(0.33), svcTotalEnd + f(0.67)], [300, 80], CL),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* 서재 탐방 라벨 + 책 표지 */}
        <div style={{
          position: 'absolute', opacity: Math.max(labelOp, shelfOp),
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          <div style={{ opacity: labelOp, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
            <div style={{ color: '#c8a46e', fontSize: 18, fontWeight: 600, fontFamily: FONT.cinzel, letterSpacing: 6 }}>
              {libraryTourText}
            </div>
            <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
          </div>
          {/* 책 표지 */}
          {shelfOp > 0 && (
            <div style={{
              opacity: shelfOp, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              gap: 10, perspective: 800,
            }}>
              {books.slice(0, bookCount).map((b, bi) => {
                const mid = bookCount / 2
                const dist = Math.abs(bi - mid)
                const delay = shelfAppear + dist * f(0.2)
                const bookOp = interpolate(local, [delay, delay + f(0.67)], [0, 1], CL)
                const brightness = shelfBrightness
                const jumpDelay = jumpStart + Math.round((bi / bookCount) * jumpDuration * 0.8)
                const jumpLocal = local - jumpDelay
                const jumpY = jumpLocal >= 0 && jumpLocal < f(0.67)
                  ? -Math.sin((jumpLocal / f(0.67)) * Math.PI) * 10
                  : 0
                return (
                  <div key={bi} style={{
                    opacity: bookOp,
                    transform: `scale(1) translateY(${jumpY}px)`,
                    transformOrigin: 'bottom center',
                  }}>
                    <div style={{
                      width: 120, height: 180, borderRadius: 6, overflow: 'hidden',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                      border: '1px solid rgba(200,164,110,0.1)',
                    }}>
                      <Img src={safeImg(b.thumbnail_url)} style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        filter: `brightness(${brightness}) saturate(0.75)`,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ opacity: shelfOp, color: '#666', fontSize: 14, fontFamily: FONT.sans, letterSpacing: 2 }}>
            {books.length} BOOKS
          </div>
        </div>
        {/* 명언 */}
        {quoteOp > 0 && (
          <div style={{
            position: 'absolute', top: 20, opacity: quoteOp,
            maxWidth: 800, textAlign: 'center', padding: '0 40px',
          }}>
            <div style={{ color: '#c8a46e', fontSize: 30, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.7 }}>
              &ldquo;{host.featuredQuote}&rdquo;
            </div>
            <div style={{ color: '#777', fontSize: 14, fontFamily: FONT.sans, marginTop: 14 }}>
              &mdash; {host.nickname}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
