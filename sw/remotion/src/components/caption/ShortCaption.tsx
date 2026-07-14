/**
 * ShortCaption — 작은 자막(글래스 태블릿). 시리즈 무관 공통 컴포넌트.
 *
 * 긴 텍스트는 자동 페이징 — 문장 단위로 끊어서 순차 표시.
 * BookRecommend 쇼츠·솔로, Faction 인물 대사 등에서 공유한다.
 *
 * 페이징 휴리스틱:
 * - 한국어: 1페이지 ≈ 30자 (약 2줄)
 * - 영문: 1페이지 ≈ 50자 (약 2줄)
 * - 문장 경계에서만 끊음 (단어 중간 절단 없음)
 * - 짧은 텍스트(1페이지 이내)는 페이징 없이 전체 표시
 *
 * 패널 폭 조이기:
 * - canvas measureText로 줄바꿈 위치를 사전 계산 → 명시적 \n 삽입.
 * - 박스는 `whiteSpace: pre-wrap` + `width: fit-content`만으로 가장 긴 줄에 자동으로 맞춤.
 */
import React, { useMemo, useState, useLayoutEffect } from 'react'
import { useCurrentFrame } from 'remotion'
import {
  FPS,
  expandSubTimings,
  paginateSentences,
  slicePageTimings,
  isTimingsStale,
  sliceOriginalByTimings,
  type VoiceTimingSegment,
} from '../../lib/voice-timing'

const MAX_PANEL_WIDTH = 760
/** 기본 필체 — 한글 우선(BookRecommend FONT.sans 와 동일 스택) */
const DEFAULT_FONT = 'Inter, "Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif'

/** 자막 끝 구두점 정리 — 화면 자막 공통 */
export const stripCaptionPunct = (s: string) => s.replace(/[.,]+\s*$/, '')

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
  /** 폰트 스택. 미지정 시 기본 sans */
  fontFamily?: string
  /** voiceTimings 세그먼트 */
  timings?: VoiceTimingSegment[]
  /** 로케일 — 페이징 글자 수 결정 */
  locale?: 'ko' | 'en'
  /** 컨테이너 스타일 */
  style?: React.CSSProperties
  /** 페이지당 글자 수 오버라이드 — 미지정 시 로케일 기본(ko 30 / en 50) */
  charsPerPage?: number
  /** 패널 최대 폭(px) 오버라이드 — 미지정 시 760 */
  maxPanelWidth?: number
  /**
   * 가독 처리.
   * - 'glass'(기본): 다크 반투명 글래스 태블릿 배경
   * - 'shadow': 배경 없이 진한 텍스트 음영(+가벼운 외곽선)만
   */
  chrome?: 'glass' | 'shadow'
}

export const ShortCaption: React.FC<Props> = ({
  text,
  startFrame,
  spreadFrames,
  color = '#e8e0d0',
  strokeColor = 'transparent',
  strokeWidth = 0,
  fontSize = 48,
  fontWeight = 600,
  fontFamily = DEFAULT_FONT,
  timings,
  locale,
  style,
  charsPerPage,
  maxPanelWidth,
  chrome = 'glass',
}) => {
  const frame = useCurrentFrame()
  const isEn = locale === 'en'
  const PANEL_WIDTH = maxPanelWidth ?? MAX_PANEL_WIDTH
  const isShadow = chrome === 'shadow'

  const { pages, pageTiming, hasSub: singlePage_ } = useMemo(() => {
    const fresh = !isTimingsStale(text, timings) ? timings : undefined
    const expanded = fresh ? expandSubTimings(fresh) : undefined
    const CHARS_PER_PAGE = charsPerPage ?? (isEn ? 50 : 30)

    let pg: string[]
    let pr: { startIdx: number; endIdx: number }[]
    if (expanded && expanded.length > 1) {
      pg = sliceOriginalByTimings(text, expanded)
      pr = expanded.map((_, i) => ({ startIdx: i, endIdx: i + 1 }))
    } else {
      const result = paginateSentences(text, CHARS_PER_PAGE, expanded, true)
      pg = result.pages
      pr = result.ranges
    }
    return { pages: pg, pageTiming: slicePageTimings(pr, expanded), hasSub: pg.length <= 1 }
  }, [text, timings, isEn, charsPerPage])
  const singlePage = singlePage_

  // shadow 모드 — 배경 없이 검정 윤곽선+넓은 다층 음영으로 밝은 화면 가독 확보.
  // 명시 strokeWidth 가 있으면 그쪽 우선.
  const effectiveStrokeW = strokeWidth > 0 ? strokeWidth : (isShadow ? 2.4 : 0)
  const effectiveStrokeColor = strokeWidth > 0 ? strokeColor : (isShadow ? 'rgba(0,0,0,0.92)' : strokeColor)

  const textShadowStyle: React.CSSProperties = effectiveStrokeW > 0 ? {
    WebkitTextStroke: `${effectiveStrokeW}px ${effectiveStrokeColor}`,
    paintOrder: 'stroke fill',
  } : {}

  const chromeStyle: React.CSSProperties = isShadow
    ? {
        // 배경·보더 없음. 음영 반경을 넓혀 글자 주변에 어두운 후광 영역 확보.
        background: 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        border: 'none',
        borderRadius: 0,
        padding: '6px 12px',
        boxShadow: 'none',
        textShadow: [
          '0 0 6px rgba(0,0,0,0.95)',
          '0 0 14px rgba(0,0,0,0.88)',
          '0 0 24px rgba(0,0,0,0.72)',
          '0 0 36px rgba(0,0,0,0.5)',
          '0 1px 4px rgba(0,0,0,0.95)',
          '0 2px 10px rgba(0,0,0,0.85)',
          '0 4px 18px rgba(0,0,0,0.65)',
          '2px 0 0 rgba(0,0,0,0.8)',
          '-2px 0 0 rgba(0,0,0,0.8)',
          '0 2px 0 rgba(0,0,0,0.8)',
          '0 -2px 0 rgba(0,0,0,0.8)',
          '1px 1px 0 rgba(0,0,0,0.75)',
          '-1px -1px 0 rgba(0,0,0,0.75)',
        ].join(', '),
      }
    : {
        // Glass Tablet — 다크 반투명 + 골드 하단 액센트
        background: 'rgba(10, 9, 7, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(200, 164, 110, 0.1)',
        borderBottom: 'none',
        borderRadius: 14,
        padding: '10px 22px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
        textShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }

  const baseStyle: React.CSSProperties = {
    fontSize,
    fontWeight,
    fontFamily,
    lineHeight: 1.35,
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    wordBreak: 'keep-all',
    color,
    width: 'fit-content',
    maxWidth: PANEL_WIDTH,
    margin: '0 auto',
    ...chromeStyle,
    ...textShadowStyle,
    ...style,
  }

  if (singlePage) {
    return (
      <Panel style={baseStyle} fontSize={fontSize} fontWeight={fontWeight} maxWidth={PANEL_WIDTH} fontFamily={fontFamily}>
        {stripCaptionPunct(text)}
      </Panel>
    )
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      {pages.map((pageText, pi) => {
        const spt = pageTiming?.[pi]
        const sptNext = pageTiming?.[pi + 1]

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
        const trailFrames = Math.min(Math.round(gapFrames * 0.5), Math.round(1.5 * FPS))
        const cutoff = gapFrames > GAP_THRESHOLD ? ownEnd + trailFrames : nextPs

        const isLast = pi === pages.length - 1
        const visible = frame >= ps && (isLast || frame < cutoff)
        if (!visible) return null

        return (
          <Panel key={pi} style={baseStyle} fontSize={fontSize} fontWeight={fontWeight} maxWidth={PANEL_WIDTH} fontFamily={fontFamily}>
            {stripCaptionPunct(pageText)}
          </Panel>
        )
      })}
    </div>
  )
}

const wrapToLines = (text: string, fontSize: number, fontWeight: number, maxWidth: number, fontFamily: string): string => {
  if (typeof document === 'undefined') return text
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return text
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const safeMax = Math.max(80, maxWidth - 16)
  const tokens = text.split(/(\s+)/).filter(t => t !== '')
  const lines: string[] = []
  let cur = ''
  for (const tok of tokens) {
    const isSpace = /^\s+$/.test(tok)
    const trial = cur + tok
    if (cur.trim() === '' || ctx.measureText(trial).width <= safeMax) {
      cur = trial
    } else {
      lines.push(cur.trimEnd())
      cur = isSpace ? '' : tok
    }
  }
  if (cur.trim()) lines.push(cur.trimEnd())
  return lines.length > 0 ? lines.join('\n') : text
}

const Panel: React.FC<{
  children: string
  style: React.CSSProperties
  fontSize: number
  fontWeight: number
  maxWidth: number
  fontFamily: string
}> = ({ children, style, fontSize, fontWeight, maxWidth, fontFamily }) => {
  const [wrapped, setWrapped] = useState<string>(() => wrapToLines(children, fontSize, fontWeight, maxWidth, fontFamily))

  useLayoutEffect(() => {
    let cancelled = false
    const next = wrapToLines(children, fontSize, fontWeight, maxWidth, fontFamily)
    setWrapped(prev => prev === next ? prev : next)
    if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.ready?.then === 'function') {
      document.fonts.ready.then(() => {
        if (cancelled) return
        const after = wrapToLines(children, fontSize, fontWeight, maxWidth, fontFamily)
        setWrapped(prev => prev === after ? prev : after)
      }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [children, fontSize, fontWeight, maxWidth, fontFamily])

  return <div style={style}>{wrapped}</div>
}
