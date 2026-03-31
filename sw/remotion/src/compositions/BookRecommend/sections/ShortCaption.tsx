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
import React from 'react'
import { useCurrentFrame } from 'remotion'
import { FPS } from '../timing'
import { expandSubTimings, paginateSentences, slicePageTimings, isTimingsStale } from '../utils'
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

  // ── stale 감지: 텍스트 변경 시 이전 voiceTimings 무시 ──
  const fresh = !isTimingsStale(text, timings) ? timings : undefined

  // ── sub 필드가 있으면 확장 → 더 세밀한 페이징 ──
  const expanded = fresh ? expandSubTimings(fresh) : undefined
  const hasSub = fresh?.some(t => t.sub && t.sub.length > 1) ?? false

  // ── 페이징 ──
  // sub 정의됨 → 각 확장 세그먼트가 곧 페이지 (휴리스틱 우회)
  // sub 없음 → 글자수 기반 자동 페이징
  const CHARS_PER_PAGE = isEn ? 50 : 30

  let pages: string[]
  let pageRanges: { startIdx: number; endIdx: number }[]

  if (hasSub && expanded && expanded.length > 1) {
    pages = expanded.map(t => t.text ?? '')
    pageRanges = expanded.map((_, i) => ({ startIdx: i, endIdx: i + 1 }))
  } else {
    const result = paginateSentences(text, CHARS_PER_PAGE, expanded, true)
    pages = result.pages
    pageRanges = result.ranges
  }

  const pageTiming = slicePageTimings(pageRanges, expanded)
  const singlePage = pages.length <= 1

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

  // ── 단일 페이지 ──
  if (singlePage) {
    return <div style={baseStyle}>{text}</div>
  }

  // ── 멀티페이지: 즉시 전환 ──
  return (
    <div style={{ position: 'relative', ...style }}>
      {pages.map((pageText, pi) => {
        const spt = pageTiming?.[pi]

        // 페이지 시작/끝 프레임 (voiceTimings 우선, 없으면 비율 분배)
        const charsBefore = pages.slice(0, pi).reduce((s, p) => s + p.length, 0)
        const ratio = charsBefore / text.length
        const endRatio = (charsBefore + pageText.length) / text.length
        const ps = spt ? startFrame + Math.round(spt.absStart * FPS) : startFrame + Math.round(spreadFrames * ratio)
        const pe = spt ? startFrame + Math.round(spt.absEnd * FPS) : startFrame + Math.round(spreadFrames * endRatio)

        // 즉시 전환 — 겹침 없음
        const isLast = pi === pages.length - 1
        const visible = frame >= ps && (isLast || frame < pe)
        if (!visible) return null

        return (
          <div key={pi} style={baseStyle}>
            {pageText}
          </div>
        )
      })}
    </div>
  )
}
