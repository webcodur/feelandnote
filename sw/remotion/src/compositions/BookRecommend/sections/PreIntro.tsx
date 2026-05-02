/**
 * PreIntro — 서비스 인사 + 인트로 비주얼 (Part 1 전용)
 * 나레이션 동기화 시퀀스: 라벨 → 책 등장 → 아바타 reveal → 명언
 */
import React from 'react'
import { AbsoluteFill, Img, interpolate, staticFile } from 'remotion'
import type { CelebHost, BookEntry } from '../types'
import { fadeInOut, safeImg, BALANCED, SUBTITLE_STYLE, useIsPortrait } from '../utils'
import { f } from '../timing'
import { FONT } from '../fonts'
import { freshAvatarUrl } from '../../../lib/avatar'
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
  const portrait = useIsPortrait()
  const libraryTourText = locale === 'en' ? 'Library Tour' : '서재 탐방'
  const totalPreIntro = svcGreetingFrames + svcIntroFrames + fQuoteFrames
  if (totalPreIntro <= 0) return null
  const local = frame - svcGreetingStart
  if (local < -5 || local > totalPreIntro + 5) return null

  const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

  // ── parts 기반 정확한 타이밍 (짧은 고정 인사 대응) ──
  const gf = svcGreetingFrames
  const CORNER = 0
  const LIBRARY = Math.round(gf * 0.2)
  const INTRODUCE = Math.round(gf * 0.45)

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
  const baseBrightness = interpolate(local, [shelfAppear, brightStart, brightStart + f(0.5)], [0.5, 0.5, 0.9], CL)
  const shelfBrightness = Math.max(0.4, baseBrightness)

  // ── 책 순차 점프 ──
  const jumpStart = shelfBright
  const jumpEnd = svcGreetingFrames
  const jumpDuration = jumpEnd - jumpStart
  const bookCount = books.length

  // ── 부채형 배치: 책 수에 따라 크기·간격·회전각 동적 조정 ──
  const manyBooks = bookCount > 7
  const bookW = portrait ? (manyBooks ? 120 : 140) : (manyBooks ? 150 : 170)
  const bookH = Math.round(bookW * 1.5)
  const bookGap = manyBooks ? Math.max(6, 14 - (bookCount - 7) * 2) : 14
  const maxAngle = bookCount > 1 ? Math.min(22, 6 + bookCount * 1.5) : 0
  const centerIdx = (bookCount - 1) / 2

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
        const avatarSize = portrait ? 240 : 300
        const avatarHeight = avatarSize + 14 + 92 + 32
        const spaceH = interpolate(local, [spaceStart, avatarAppear], [0, avatarHeight], CL)
        const avatarDelay = f(0.33)
        const avatarFadeIn = interpolate(local, [avatarAppear + avatarDelay, avatarAppear + avatarDelay + f(0.5)], [0, 1], CL)
        const showSpace = local >= spaceStart && (avatarOp > 0 || spaceH > 0)
        if (!showSpace) return null
        return <div style={{ height: spaceH, minHeight: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          {avatarOp > 0 && <div style={{ opacity: Math.min(avatarFadeIn, avatarOp), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'relative',
              width: avatarSize, height: avatarSize, borderRadius: '50%', overflow: 'hidden',
              border: `2px solid rgba(200,164,110,${borderAlpha})`,
              boxShadow: revealProgress > 0.5
                ? '0 16px 50px rgba(0,0,0,0.5)'
                : '0 8px 30px rgba(0,0,0,0.3)',
            }}>
              <Img src={freshAvatarUrl(host.avatar_url)} style={{
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
              <div style={{ color: '#c8a46e', fontSize: 72, fontWeight: 700, fontFamily: FONT.serif }}>?</div>
            </div>
            {quoteOp > 0 && <SpeakingIndicator size={48} opacity={quoteOp} audioSrc={fQuoteAudioSrc} audioStartFrame={svcGreetingStart + svcGreetingFrames + svcIntroFrames + f(1)} />}
          </div>
          {/* 이름 슬롯 */}
          <div style={{ minHeight: 92, minWidth: 300, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', opacity: questionOp, color: '#c8a46e', fontSize: 38, fontWeight: 700, fontFamily: FONT.serif, letterSpacing: 6, whiteSpace: 'nowrap' }}>
              ???
            </div>
            <div style={{ position: 'absolute', opacity: nameOp, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <div style={{ color: '#e8e0d0', fontSize: portrait ? 34 : 40, fontWeight: 700, fontFamily: FONT.sans }}>{host.nickname}</div>
              <div style={{ ...SUBTITLE_STYLE, fontSize: portrait ? 26 : 32 }}>{locale === 'en' ? host.title : host.nickname_en}</div>
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
            <div style={{ color: '#c8a46e', fontSize: portrait ? 20 : 24, fontWeight: 600, fontFamily: FONT.cinzel, letterSpacing: 6 }}>
              {libraryTourText}
            </div>
            <div style={{ width: 40, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
          </div>
          {/* 책 표지 */}
          {shelfOp > 0 && (
            <div style={{
              opacity: shelfOp, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              gap: bookGap, perspective: 800,
            }}>
              {books.map((b, bi) => {
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
                const rotY = centerIdx > 0 ? ((bi - centerIdx) / centerIdx) * maxAngle : 0
                const normDist = centerIdx > 0 ? Math.abs(bi - centerIdx) / centerIdx : 0
                const edgeRatio = 1 - normDist * 0.12
                const bw = Math.round(bookW * edgeRatio)
                const bh = Math.round(bw * 1.5)
                // rotateY로 시각적으로 벌어진 간격을 보상
                const pullPx = normDist * bookW * 0.08
                return (
                  <div key={bi} style={{
                    opacity: bookOp,
                    transform: `rotateY(${rotY}deg)`,
                    transformStyle: 'preserve-3d',
                    marginLeft: -pullPx,
                    marginRight: -pullPx,
                  }}>
                    <div style={{
                      transform: `translateY(${jumpY}px)`,
                      transformOrigin: 'bottom center',
                    }}>
                      <div style={{
                        width: bw, height: bh, borderRadius: 6, overflow: 'hidden',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(200,164,110,0.1)',
                      }}>
                        <Img src={safeImg(b.thumbnail_url)} style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          filter: `brightness(${brightness}) saturate(0.75)`,
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ opacity: shelfOp, color: '#666', fontSize: 20, fontFamily: FONT.sans, letterSpacing: 2 }}>
            {books.length} BOOKS
          </div>
        </div>
        {/* 명언 */}
        {quoteOp > 0 && (
          <div style={{
            position: 'absolute', top: -10, opacity: quoteOp,
            maxWidth: portrait ? 900 : 1200, textAlign: 'center', padding: '0 40px',
          }}>
            <div style={{ color: '#c8a46e', fontSize: portrait ? 38 : 46, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.7, ...BALANCED }}>
              {`\u201C${host.featuredQuote ?? ''}\u201D`}
            </div>
            <div style={{ color: '#777', fontSize: 22, fontFamily: FONT.sans, marginTop: 14 }}>
              &mdash; {host.nickname}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
