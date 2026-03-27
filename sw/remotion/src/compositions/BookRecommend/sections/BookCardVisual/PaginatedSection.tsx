/**
 * PaginatedSection — 페이지 분할 텍스트 렌더러
 *
 * summary / context 공통 패턴:
 *   단일 페이지: 인라인 마커 + Typewriter
 *   복수 페이지: 페이지별 slide-in/out 전환 + 마커는 첫 페이지만
 */
import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import type { VoiceTimingSegment } from '../../types'
import { Typewriter } from '../Typewriter'
import { FONT } from '../../fonts'
import { f, FPS } from '../../timing'

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }
const FLIP_F = f(0.4)
const BODY_LH = 1.5

export type PageTiming = {
  absStart: number
  absEnd: number
  timings: VoiceTimingSegment[]
}

type Props = {
  /** 원본 전체 텍스트 */
  text: string
  /** paginateSentences 결과 */
  pages: string[]
  /** slicePageTimings 결과 */
  pageTimings?: PageTiming[]
  /** 섹션 음성 시작 프레임 */
  startFrame: number
  /** Typewriter spread (보통 sectionFrames - f(0.5)) */
  spreadFrames: number
  /** 섹션 전체 bodyOp (부모 interpolate 결과) */
  bodyOp: number
  /** 인라인 마커 opacity (부모 interpolate 결과) */
  labelOp: number
  /** 마커 라벨 */
  markerLabel: string
  /** 본문 텍스트 색상 */
  textColor: string
  /** 전체 voiceTimings (단일 페이지용) */
  timings?: VoiceTimingSegment[]
}

export const PaginatedSection: React.FC<Props> = ({
  text, pages, pageTimings, startFrame, spreadFrames,
  bodyOp, labelOp, markerLabel, textColor, timings,
}) => {
  const frame = useCurrentFrame()

  const marker = (op: number) => (
    <span style={{ display: 'inline', marginRight: 14, opacity: op }}>
      <span style={{ color: '#c8a46e', fontSize: 38, fontFamily: FONT.sans, lineHeight: BODY_LH, verticalAlign: 'baseline' }}>{markerLabel}</span>
    </span>
  )

  if (pages.length === 1) {
    return (
      <div style={{ opacity: bodyOp, fontFamily: FONT.sans }}>
        {marker(labelOp)}
        <Typewriter text={text} startFrame={startFrame} spreadFrames={spreadFrames} color={textColor} fontSize={38} style={{ lineHeight: BODY_LH, display: 'inline' }} timings={timings} />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {pages.map((pt, pi) => {
        const spt = pageTimings?.[pi]
        const cb = pages.slice(0, pi).reduce((s, p) => s + p.length, 0)
        const ratio = cb / text.length
        const endRatio = (cb + pt.length) / text.length
        const ps = spt ? startFrame + Math.round(spt.absStart * FPS) : startFrame + Math.round(spreadFrames * ratio)
        const pe = spt ? startFrame + Math.round(spt.absEnd * FPS) : startFrame + Math.round(spreadFrames * endRatio)
        const isFirst = pi === 0, isLast = pi === pages.length - 1
        const pIn = isFirst ? bodyOp : interpolate(frame, [ps - FLIP_F, ps], [0, 1], CL)
        const pOut = isLast ? 1 : interpolate(frame, [pe, pe + FLIP_F], [1, 0], CL)
        const op = bodyOp * Math.min(pIn, pOut)
        const xIn = isFirst ? 0 : interpolate(frame, [ps - FLIP_F, ps], [80, 0], CL)
        const xOut = isLast ? 0 : interpolate(frame, [pe, pe + FLIP_F], [0, -80], CL)
        if (op <= 0 && pi > 0) return null
        return (
          <div key={pi} style={{
            position: pi === 0 ? 'relative' as const : 'absolute' as const,
            top: pi === 0 ? undefined : 0, left: 0, right: 0,
            opacity: Math.max(op, 0), transform: `translateX(${xIn + xOut}px)`,
            fontFamily: FONT.sans,
          }}>
            {isFirst && marker(labelOp)}
            <Typewriter text={pt} startFrame={ps} spreadFrames={pe - ps} color={textColor} fontSize={38} style={{ lineHeight: BODY_LH, display: isFirst ? 'inline' : undefined }} timings={spt?.timings} />
          </div>
        )
      })}
    </div>
  )
}
