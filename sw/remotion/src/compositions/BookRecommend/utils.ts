import React from 'react'
import { interpolate, staticFile } from 'remotion'
import { FONT } from './fonts'
import { f } from './timing'

/** 정적 파일 경로 헬퍼 — Remotion 내장 staticFile 사용 */
export const sf = (path: string) => staticFile(path)

/** 에피소드별 음성 경로 팩토리 */
export const makeVf = (epName: string, voiceSelect: { default: string; slots?: Record<string, string> } | null) => {
  return (file: string) => {
    if (voiceSelect) {
      const engine = voiceSelect.slots?.[file] ?? voiceSelect.default
      return sf(`voice/${epName}/${engine}/${file}`)
    }
    return sf(`voice/${epName}/${file}`)
  }
}

/** 1x1 투명 PNG — 빈 thumbnail_url 폴백 */
const PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/** Remotion <Img>의 빈 src 방어 */
export const safeImg = (src?: string) => src || PLACEHOLDER

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

/**
 * 안전한 fadeInOut — inputRange 단조 증가 보장
 * [start, start+fadeIn, start+dur-fadeOut, start+dur] 패턴에서
 * dur이 짧으면 fadeIn/fadeOut을 자동 축소하여 겹침 방지
 */
export const fadeInOut = (
  frame: number,
  start: number,
  dur: number,
  fadeIn = f(0.27),
  fadeOut = f(0.33),
): number => {
  if (dur <= 0) return 0
  // dur의 1/3로 제한하되 최소 1프레임
  const fi = Math.max(1, Math.min(fadeIn, Math.floor(dur / 3)))
  const fo = Math.max(1, Math.min(fadeOut, Math.floor(dur / 3)))
  return interpolate(frame, [start, start + fi, start + dur - fo, start + dur], [0, 1, 1, 0], CL)
}

/** 로고 기본 크기 — 롱폼/쇼츠 공용 */
export const BRAND_LOGO_SIZE = 52

/**
 * Feel & Note 로고 — 공통 컴포넌트
 * variant:
 *   'full'  — FEEL & NOTE + 구분선 + feelandnote.com (outro/CTA용)
 *   'brand' — FEEL & NOTE 단색 (BrandIntro용)
 *   'watermark' — FEEL & NOTE 소형 (Overlay용)
 */
type LogoProps = {
  variant?: 'full' | 'brand' | 'watermark'
  fontSize?: number
  style?: React.CSSProperties
}

export const BrandLogo: React.FC<LogoProps> = ({ variant = 'full', fontSize, style }) => {
  if (variant === 'watermark') {
    return React.createElement('span', {
      style: { color: '#c8a46e', fontSize: fontSize ?? 10, fontFamily: FONT.cinzel, letterSpacing: 3, ...style },
    }, 'FEEL & NOTE')
  }

  if (variant === 'brand') {
    return React.createElement('div', {
      style: { color: '#c8a46e', fontSize: fontSize ?? 52, fontWeight: 700, fontFamily: FONT.brand, letterSpacing: 8, ...style },
    }, 'FEEL & NOTE')
  }

  // full
  const sz = fontSize ?? BRAND_LOGO_SIZE
  return React.createElement('div', {
    style: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: Math.round(sz * 0.3), ...style },
  },
    React.createElement('div', {
      style: { fontSize: sz, fontWeight: 600, fontFamily: FONT.cormorant, letterSpacing: Math.round(sz * 0.15), display: 'flex', alignItems: 'center' },
    },
      React.createElement('span', { style: { color: '#f8f4ed' } }, 'FEEL'),
      React.createElement('span', { style: { color: '#d4a828', margin: `0 ${Math.round(sz * 0.25)}px` } }, '&'),
      React.createElement('span', { style: { color: '#f8f4ed' } }, 'NOTE'),
    ),
    React.createElement('div', {
      style: { width: Math.round(sz * 2.8), height: 1, backgroundColor: '#d4a828', opacity: 0.5 },
    }),
    React.createElement('div', {
      style: { color: '#999', fontSize: Math.round(sz * 0.55), fontFamily: FONT.cormorant, letterSpacing: Math.round(sz * 0.1) },
    }, 'feelandnote.com'),
  )
}
