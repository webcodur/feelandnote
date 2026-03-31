/**
 * BookCarousel — 책 전환 캐러셀 (브릿지 · 책 사이 전환)
 */
import React from 'react'
import { AbsoluteFill, Img, interpolate } from 'remotion'
import type { BookEntry } from '../types'
import { fadeInOut, safeImg } from '../utils'
import { f } from '../timing'
import { FONT } from '../fonts'

interface Props {
  books: BookEntry[]
  localFrame: number
  duration: number
  fromIdx: number
  toIdx: number
  opacity: number
}

export const BookCarousel: React.FC<Props> = ({
  books, localFrame, duration, fromIdx, toIdx, opacity,
}) => {
  if (opacity <= 0) return null
  const CARD_W = 150, CARD_H = 225, CARD_GAP = 24
  const CARD_STEP = CARD_W + CARD_GAP
  const VIEWPORT_W = CARD_STEP * 5
  const POINTER_W = 160

  // 타이밍: 정지(15%) → 스크롤(35%) → 정지(50%)
  const holdEnd = Math.round(duration * 0.15)
  const scrollEnd = Math.round(duration * 0.5)
  const scrollProgress = interpolate(localFrame, [holdEnd, scrollEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const centerPos = interpolate(scrollProgress, [0, 1], [fromIdx, toIdx])
  const scrollX = centerPos * CARD_STEP

  const numStyle = { color: '#c8a46e', fontSize: 32, fontFamily: FONT.cinzel, fontWeight: 600 } as const
  const numFrom = fromIdx + 1
  const numTo = toIdx + 1
  const numProgress = scrollProgress
  const maxNum = Math.max(numFrom, numTo)
  const slotW = maxNum >= 10 ? 32 : 18
  const slotH = 28

  const labelOp = fadeInOut(localFrame, f(0.17), duration - f(0.33), f(0.5), f(0.5))

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity, gap: 0 }}>
      {/* BOOK SHELF 라벨 */}
      <div style={{ color: '#c8a46e', fontSize: 20, fontFamily: FONT.cinzel, letterSpacing: 8, fontWeight: 600, opacity: labelOp, marginBottom: 16 }}>
        BOOK SHELF
      </div>

      {/* 넘버링 */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          ...numStyle,
          opacity: fromIdx === toIdx ? 1 : interpolate(numProgress, [0, 0.4, 0.6, 1], [1, 0, 0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          {fromIdx === toIdx || numProgress < 0.5 ? numFrom : numTo}/{books.length}
        </span>
      </div>

      {/* 상단 포인터 */}
      <div style={{ width: POINTER_W, height: 2, backgroundColor: '#c8a46e', opacity: 0.5, marginBottom: 16 }} />

      {/* 캐러셀 */}
      <div style={{
        width: VIEWPORT_W, overflow: 'hidden', position: 'relative',
        maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', gap: CARD_GAP, alignItems: 'center', transform: `translateX(${-scrollX + VIEWPORT_W / 2 - CARD_W / 2}px)` }}>
          {books.map((b, bi) => {
            const dist = Math.abs(bi - centerPos)
            if (dist > 4) return <div key={bi} style={{ width: CARD_W, flexShrink: 0 }} />
            const isCurrent = Math.round(centerPos) === bi
            const scale = interpolate(dist, [0, 1, 2], [1.05, 0.9, 0.75], { extrapolateRight: 'clamp' })
            return (
              <div key={bi} style={{ flexShrink: 0, width: CARD_W, transform: `scale(${scale})` }}>
                <div style={{
                  width: CARD_W, height: CARD_H, borderRadius: 6, overflow: 'hidden',
                  boxShadow: isCurrent ? '0 8px 30px rgba(200,164,110,0.25)' : '0 4px 12px rgba(0,0,0,0.4)',
                  border: isCurrent ? '2px solid rgba(200,164,110,0.6)' : '1px solid rgba(200,164,110,0.08)',
                }}>
                  <Img src={safeImg(b.thumbnail_url)} style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: isCurrent ? 'brightness(1)' : 'brightness(0.4)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 하단 포인터 */}
      <div style={{ width: POINTER_W, height: 2, backgroundColor: '#c8a46e', opacity: 0.5, marginTop: 16 }} />
    </AbsoluteFill>
  )
}
