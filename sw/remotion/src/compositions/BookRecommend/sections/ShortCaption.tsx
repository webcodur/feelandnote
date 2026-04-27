/**
 * ShortCaption — 쇼츠 자막 컴포넌트
 *
 * 긴 텍스트는 자동 페이징 — 문장 단위로 끊어서 순차 표시.
 *
 * 페이징 휴리스틱:
 * - 한국어: 1페이지 ≈ 30자 (약 2줄)
 * - 영문: 1페이지 ≈ 50자 (약 2줄)
 * - 문장 경계에서만 끊음 (단어 중간 절단 없음)
 * - 짧은 텍스트(1페이지 이내)는 페이징 없이 전체 표시
 */
import React, { useMemo } from 'react'
import { useCurrentFrame } from 'remotion'
import { FPS } from '../timing'
import { expandSubTimings, paginateSentences, slicePageTimings, isTimingsStale, sliceOriginalByTimings } from '../utils'
import { FONT } from '../fonts'
import type { VoiceTimingSegment } from '../types'

type Props = {
  text: string
  startFrame: number
  spreadFrames: number
  /** 텍스트 채움 색상 */
  color?: string
  /** 아웃라인 색상 */
  strokeColor?: string
  /** 아웃라인 두께 (px) */
  strokeWidth?: number
  fontSize?: number
  fontWeight?: number
  /** voiceTimings 세그먼트 */
  timings?: VoiceTimingSegment[]
  /** 로케일 — 페이징 글자 수 결정 */
  locale?: 'ko' | 'en'
  /** 컨테이너 스타일 */
  style?: React.CSSProperties
}

export const ShortCaption: React.FC<Props> = ({
  text,
  startFrame,
  spreadFrames,
  color = '#e8e0d0',
  strokeColor = 'transparent',
  strokeWidth = 0,
  fontSize = 44,
  fontWeight = 600,
  timings,
  locale,
  style,
}) => {
  const frame = useCurrentFrame()
  const isEn = locale === 'en'

  // 텍스트·타이밍이 불변이므로 한 번만 계산 — 매 프레임 문자열 분할/페이징 방지
  const { pages, pageTiming, hasSub: singlePage_ } = useMemo(() => {
    const fresh = !isTimingsStale(text, timings) ? timings : undefined
    const expanded = fresh ? expandSubTimings(fresh) : undefined
    const hasSub = fresh?.some(t => t.sub && t.sub.length > 1) ?? false
    const CHARS_PER_PAGE = isEn ? 50 : 30

    let pg: string[]
    let pr: { startIdx: number; endIdx: number }[]
    if (hasSub && expanded && expanded.length > 1) {
      // sub 수에 맞춰 원고 raw slice — Whisper STT 오인식 노출 방지
      pg = sliceOriginalByTimings(text, expanded)
      pr = expanded.map((_, i) => ({ startIdx: i, endIdx: i + 1 }))
    } else {
      const result = paginateSentences(text, CHARS_PER_PAGE, expanded, true)
      pg = result.pages
      pr = result.ranges
    }
    return { pages: pg, pageTiming: slicePageTimings(pr, expanded), hasSub: pg.length <= 1 }
  }, [text, timings, isEn])
  const singlePage = singlePage_

  const textShadowStyle: React.CSSProperties = strokeWidth > 0 ? {
    WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
    paintOrder: 'stroke fill',
  } : {}

  const baseStyle: React.CSSProperties = {
    fontSize,
    fontWeight,
    fontFamily: FONT.sans,
    lineHeight: 1.35,
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    wordBreak: 'keep-all',
    color,

    // Glass Tablet 스타일 — 다크 반투명 + 골드 하단 액센트
    background: 'rgba(10, 9, 7, 0.72)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(200, 164, 110, 0.1)',
    borderBottom: 'none',
    borderRadius: 14,
    padding: '10px 22px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
    textShadow: '0 1px 4px rgba(0,0,0,0.4)',
    width: 'fit-content',
    margin: '0 auto',

    ...textShadowStyle,
    ...style,
  }

  const stripDot = (s: string) => s.replace(/\./g, '').replace(/,\s*$/, '')

  // ── 단일 페이지 ──
  if (singlePage) {
    return <div style={baseStyle}>{stripDot(text)}</div>
  }

  // ── 멀티페이지: 즉시 전환 ──
  return (
    <div style={{ position: 'relative', ...style }}>
      {pages.map((pageText, pi) => {
        const spt = pageTiming?.[pi]
        const sptNext = pageTiming?.[pi + 1]

        // 페이지 시작 프레임 (voiceTimings 우선, 없으면 비율 분배)
        // 기본 종료점은 "다음 페이지 시작" — 발화 사이 공백에도 자막을 유지하여
        // 페이지가 잠깐 보였다 사라지는 깜빡임을 방지한다.
        // 단 페이지 자체 발화 끝과 다음 페이지 시작 사이 간격이 길면(의도적 포즈)
        // 자막도 함께 내려 시각적 공백을 확보한다.
        const charsBefore = pages.slice(0, pi).reduce((s, p) => s + p.length, 0)
        const charsBeforeNext = charsBefore + pageText.length
        const ratio = charsBefore / text.length
        const nextRatio = charsBeforeNext / text.length
        const ps = spt ? startFrame + Math.round(spt.absStart * FPS) : startFrame + Math.round(spreadFrames * ratio)
        const nextPs = sptNext
          ? startFrame + Math.round(sptNext.absStart * FPS)
          : startFrame + Math.round(spreadFrames * nextRatio)
        const ownEnd = spt ? startFrame + Math.round(spt.absEnd * FPS) : nextPs
        const GAP_THRESHOLD = Math.round(1.5 * FPS)
        const gapFrames = nextPs - ownEnd
        // 적응형 TRAIL: 갭의 절반(linger) ↔ 최대 1.5s. 짧은 포즈는 짧게, 긴 포즈는 1.5s까지.
        const trailFrames = Math.min(Math.round(gapFrames * 0.5), Math.round(1.5 * FPS))
        const cutoff = gapFrames > GAP_THRESHOLD ? ownEnd + trailFrames : nextPs

        // 즉시 전환 — 컷오프 직전까지 유지
        const isLast = pi === pages.length - 1
        const visible = frame >= ps && (isLast || frame < cutoff)
        if (!visible) return null

        return (
          <div key={pi} style={baseStyle}>
            {stripDot(pageText)}
          </div>
        )
      })}
    </div>
  )
}


