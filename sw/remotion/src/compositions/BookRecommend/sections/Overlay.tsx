/**
 * Overlay — 영상 HUD 레이어
 *
 * 1. DecorFrame   — 장식 테두리 (코너 + 틱)
 * 2. ProgressBar  — 하단 돌판 안쪽 구간별 진행바
 *
 * 진행바 구간(ProgressSegment)은 buildProgressSegments()로 생성.
 */
import { useMemo } from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from '../types'
import {
  toFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  BOOK_GAP, RECAP_FRAMES, INTERLUDE_FRAMES, bookTotalFrames,
  CELEB_INTRO_FALLBACK, BRIDGE_FALLBACK, OUTRO_FALLBACK, RETURN_INTRO_FALLBACK, PREV_RECAP_FALLBACK, f,
} from '../timing'
import { isContinuation } from '../script'
import { FONT } from '../fonts'

type ProgressSegment = {
  start: number; end: number; label: string
  /** 도서 세그먼트 내 context 구간 비율 [시작, 끝] (0~1) */
  contextRange?: [number, number]
}

function buildProgressSegments(script: BookRecommendScript): ProgressSegment[] {
  const { narrator, host, books } = script
  const cont = isContinuation(script)
  const segments: ProgressSegment[] = []

  const celebIntroFrames = cont ? 0 : (CELEB_VISUAL_DELAY + ((narrator.celebIntroDuration ?? 0) > 0 ? toFrames(narrator.celebIntroDuration!) : CELEB_INTRO_FALLBACK))
  const philosophyFrames = cont ? 0 : toFrames(host.voiceDuration ?? 0)
  const hostIntroFrames = cont ? 0 : (celebIntroFrames + f(1) + philosophyFrames)
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK

  const sgd = narrator.serviceGreetingDuration ?? 0
  const svcGreetingFrames = cont ? 0 : (sgd > 0 ? toFrames(sgd) : 0)
  const svcIntroFrames = cont ? 0 : ((narrator.serviceIntroDuration ?? 0) > 0 ? toFrames(narrator.serviceIntroDuration!) : 0)
  const fQuoteFrames = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0

  const returnIntroFrames = cont ? ((narrator.returnIntroDuration ?? 0) > 0 ? toFrames(narrator.returnIntroDuration!) : RETURN_INTRO_FALLBACK) : 0
  const prevRecapFrames = cont ? ((narrator.prevRecapDuration ?? 0) > 0 ? toFrames(narrator.prevRecapDuration!) : PREV_RECAP_FALLBACK) : 0

  let cursor = 0
  segments.push({ start: cursor, end: cursor + BRAND_FRAMES, label: '' })
  cursor += BRAND_FRAMES

  if (returnIntroFrames > 0) {
    segments.push({ start: cursor, end: cursor + returnIntroFrames, label: '' })
    cursor += returnIntroFrames
  }

  if (svcGreetingFrames > 0) {
    segments.push({ start: cursor, end: cursor + svcGreetingFrames, label: '' })
    cursor += svcGreetingFrames
  }

  if (svcIntroFrames > 0) {
    segments.push({ start: cursor, end: cursor + svcIntroFrames, label: '' })
    cursor += svcIntroFrames
  }

  if (fQuoteFrames > 0) {
    segments.push({ start: cursor, end: cursor + fQuoteFrames, label: '' })
    cursor += fQuoteFrames
  }

  if (prevRecapFrames > 0) {
    segments.push({ start: cursor, end: cursor + prevRecapFrames, label: '' })
    cursor += prevRecapFrames
  }

  if (hostIntroFrames > 0) {
    segments.push({ start: cursor, end: cursor + hostIntroFrames, label: host.nickname })
    cursor += hostIntroFrames
  }
  cursor += bridgeFrames

  const hasInterlude = books.length > 10
  const interludeIndex = hasInterlude ? Math.ceil(books.length / 2) : -1
  const interludeFrames = hasInterlude
    ? (narrator.interludeDuration && narrator.interludeDuration > 0 ? toFrames(narrator.interludeDuration) : INTERLUDE_FRAMES)
    : 0

  for (let i = 0; i < books.length; i++) {
    if (i > 0) cursor += BOOK_GAP
    if (i === interludeIndex) {
      // 중간 리캡 → 인터루드
      segments.push({ start: cursor, end: cursor + RECAP_FRAMES, label: 'PART I' })
      cursor += RECAP_FRAMES
      segments.push({ start: cursor, end: cursor + interludeFrames, label: 'PART II' })
      cursor += interludeFrames
    }
    const b = books[i]
    const total = bookTotalFrames(b)
    // context 구간 비율 — summary 이후 전체 (context + quote + contextAfter)
    const td = b.titleDuration, sd = b.summaryDuration
    const durSum = td + sd + b.contextDuration + (b.quoteDuration ?? 0) + (b.contextAfterDuration ?? 0)
    const ctxStart = durSum > 0 ? (td + sd) / durSum : 0
    segments.push({
      start: cursor, end: cursor + total,
      label: `${i + 1}/${books.length}`,
      contextRange: b.contextDuration > 0 ? [ctxStart, 1] : undefined,
    })
    cursor += total
  }

  segments.push({ start: cursor, end: cursor + RECAP_FRAMES, label: 'RECAP' })
  cursor += RECAP_FRAMES

  const outroFrames = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : OUTRO_FALLBACK
  segments.push({ start: cursor, end: cursor + outroFrames, label: '' })

  return segments
}

const ACCENT = '#c8a46e'
const MARGIN = 24

/* ── DecorFrame 서브 컴포넌트 ── */

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

type Props = { script: BookRecommendScript; stoneBarH?: string }

export const Overlay: React.FC<Props> = ({ script, stoneBarH }) => {
  const frame = useCurrentFrame()
  const segments = useMemo(() => buildProgressSegments(script), [script])
  const totalFrames = segments[segments.length - 1].end

  const fadeIn = interpolate(frame, [BRAND_FRAMES - f(1), BRAND_FRAMES], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const outroSegment = segments[segments.length - 1]
  const outroFade = frame > outroSegment.start
    ? interpolate(frame, [outroSegment.end - f(1), outroSegment.end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  const decorOpacity = fadeIn * outroFade   // DecorFrame — 아웃트로에서 퇴장
  const progressOpacity = fadeIn             // ProgressBar — 끝까지 유지

  // 돌판이 있으면: border 프레임은 돌판 위에서 끊고, 하단 요소는 돌판 안쪽에 배치
  const hasStone = !!stoneBarH
  const borderBottom = hasStone ? `calc(${stoneBarH} + ${MARGIN}px)` : MARGIN
  // 하단 요소 위치: 돌판 안쪽 중앙
  const bottomElY = hasStone ? `calc(${stoneBarH} / 2)` : `${MARGIN + 12}px`

  return (
    <>
      {/* DecorFrame — 장식 테두리, 돌판 위 콘텐츠 영역 */}
      <div style={{
        position: 'absolute', top: MARGIN, left: MARGIN, right: MARGIN,
        bottom: borderBottom,
        borderRadius: 2, border: '1px double rgba(200,164,110,0.15)', pointerEvents: 'none', opacity: decorOpacity, zIndex: 50,
      }}>
        <Corner position="tl" /><Corner position="tr" /><Corner position="bl" /><Corner position="br" />
        <CornerTick position="tl" axis="h" /><CornerTick position="tl" axis="v" />
        <CornerTick position="tr" axis="h" /><CornerTick position="tr" axis="v" />
        <CornerTick position="bl" axis="h" /><CornerTick position="bl" axis="v" />
        <CornerTick position="br" axis="h" /><CornerTick position="br" axis="v" />
      </div>
      {/* ProgressBar — 돌판 안쪽, 구간별 색상 진행바 */}
      {(() => {
        const BOOK_HUES = ['#c8a46e', '#6ea4c8', '#a46ec8', '#6ec8a4', '#c86e6e', '#c8b86e', '#6e8fc8', '#c87ea4']
        // 현재 재생 중인 세그먼트
        const activeIdx = segments.findIndex(s => frame >= s.start && frame < s.end)

        return (
          <div style={{
            position: 'absolute', bottom: bottomElY, left: 0, right: 0,
            height: 20, display: 'flex', alignItems: 'stretch', opacity: progressOpacity, zIndex: 60,
            transform: 'translateY(50%)',
          }}>
            {segments.map((seg, i) => {
              const w = ((seg.end - seg.start) / totalFrames) * 100
              const filled = Math.min(1, Math.max(0, (frame - seg.start) / (seg.end - seg.start)))
              const isBook = /^\d+\/\d+$/.test(seg.label)
              const bookIdx = isBook ? parseInt(seg.label) - 1 : -1
              const isActive = i === activeIdx
              const isPast = frame >= seg.end

              const gap = i === 0 ? 0 : 2

              const hue = isBook ? BOOK_HUES[bookIdx % BOOK_HUES.length] : '#555'
              const filledColor = isBook
                ? `linear-gradient(180deg, ${hue}, ${hue}cc)`
                : 'linear-gradient(180deg, #666, #444)'
              const trackColor = isBook ? `${hue}18` : 'rgba(255,255,255,0.04)'

              return (
                <div key={i} style={{
                  flex: `${w} 0 0`, height: '100%',
                  marginLeft: gap,
                  backgroundColor: trackColor,
                  borderRadius: 2,
                  position: 'relative', overflow: 'hidden',
                  border: isActive ? `1px solid ${isBook ? hue : '#888'}` : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isActive ? `0 0 8px ${isBook ? `${hue}60` : 'rgba(255,255,255,0.1)'}` : 'none',
                  boxSizing: 'border-box',
                }}>
                  {/* filled — 세로 그라디언트로 입체감 */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0,
                    width: `${filled * 100}%`,
                    background: filledColor,
                    borderRadius: 'inherit',
                  }} />
                  {/* 완료 세그먼트 상단 하이라이트 */}
                  {isPast && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.1), transparent)',
                      borderRadius: 'inherit',
                    }} />
                  )}
                  {/* context 사선 텍스처 */}
                  {seg.contextRange && (
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${seg.contextRange[0] * 100}%`,
                      width: `${(seg.contextRange[1] - seg.contextRange[0]) * 100}%`,
                      background: 'repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)',
                      borderRadius: 'inherit',
                    }} />
                  )}
                  {/* 도서 번호 라벨 */}
                  {isBook && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontFamily: FONT.cinzel, fontWeight: 700,
                      color: '#fff',
                      textShadow: '0 0 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.8)',
                      pointerEvents: 'none',
                    }}>
                      {bookIdx + 1}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}
    </>
  )
}
