/**
 * FEEL & NOTE 브랜드 로고 — 공통 컴포넌트(독립 모듈).
 * utils.ts 에서 분리한 이유: utils 는 에피소드 로더(script.ts, require.context)를 끌고 들어와
 * remotion-bo 등 웹팩 환경 밖 소비자의 타입체크를 깨뜨린다. 로고만 쓰는 쪽은 이 모듈을 직접 import 한다.
 * variant:
 *   'full'  — FEEL & NOTE + feelandnote.com (outro용)
 *   'brand' — FEEL & NOTE 단독 (BrandIntro·카드용)
 *   'watermark' — FEEL & NOTE 소형 (Overlay용)
 */
import React from 'react'
import { staticFile } from 'remotion'
import { FONT } from './fonts'

export const BRAND_LOGO_SIZE = 68

/** 정적 파일 경로 헬퍼 — 이미 변환된 경로(외부 URL·데이터 URI·절대경로)는 그대로 통과 */
const sf = (path: string) => {
  if (!path) return path
  if (/^(https?:|blob:|data:|\/)/.test(path)) return path
  return staticFile(path)
}

type LogoProps = {
  variant?: 'full' | 'brand' | 'watermark'
  fontSize?: number
  style?: React.CSSProperties
}

export const BrandLogo: React.FC<LogoProps> = ({ variant = 'full', fontSize, style }) => {
  const ampGap = (sz: number) => Math.max(1, Math.round(sz * 0.06))

  if (variant === 'watermark') {
    const sz = fontSize ?? 10
    return React.createElement('span', {
      style: { fontSize: sz, fontFamily: FONT.cinzel, letterSpacing: 3, display: 'inline-flex', alignItems: 'center', gap: ampGap(sz), ...style },
    },
      React.createElement('span', { style: { color: '#c8a46e' } }, 'FEEL'),
      React.createElement('span', { style: { color: '#f8f4ed' } }, '&'),
      React.createElement('span', { style: { color: '#c8a46e' } }, 'NOTE'),
    )
  }

  const goldStyle: React.CSSProperties = {
    backgroundImage: `url('${sf('common/images/noise.svg')}'), linear-gradient(180deg, #fad482 0%, #c1922c 40%, #856015 55%, #d6a848 100%)`,
    backgroundBlendMode: 'overlay', // texture 덮기
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8)) drop-shadow(0px -1px 1px rgba(255,255,255,0.2))',
  }
  const silverStyle: React.CSSProperties = {
    backgroundImage: `url('${sf('common/images/noise.svg')}'), linear-gradient(180deg, #ffffff 0%, #dfdbd2 45%, #a8a49c 60%, #f2efe9 100%)`,
    backgroundBlendMode: 'overlay',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8)) drop-shadow(0px -1px 1px rgba(255,255,255,0.2))',
  }

  if (variant === 'brand') {
    const sz = fontSize ?? 68
    return React.createElement('div', {
      style: { fontSize: sz, fontWeight: 700, fontFamily: FONT.brand, letterSpacing: Math.round(sz * 0.08), display: 'flex', alignItems: 'center', gap: ampGap(sz), ...style },
    },
      React.createElement('span', { style: goldStyle }, 'FEEL'),
      React.createElement('span', { style: { ...silverStyle, fontSize: Math.round(sz * 0.9) } }, '&'),
      React.createElement('span', { style: goldStyle }, 'NOTE'),
    )
  }

  // full — FEEL & NOTE (with URL)
  const sz = fontSize ?? BRAND_LOGO_SIZE
  return React.createElement('div', {
    style: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: Math.round(sz * 0.4), ...style },
  },
    React.createElement('div', {
      style: { fontSize: sz, fontWeight: 700, fontFamily: FONT.brand, letterSpacing: Math.round(sz * 0.08), display: 'flex', alignItems: 'center', gap: ampGap(sz) },
    },
      React.createElement('span', { style: goldStyle }, 'FEEL'),
      React.createElement('span', { style: { ...silverStyle, fontSize: Math.round(sz * 0.9) } }, '&'),
      React.createElement('span', { style: goldStyle }, 'NOTE'),
    ),
    React.createElement('div', {
      style: { fontSize: Math.round(sz * 0.28), fontFamily: FONT.sans, color: '#a0a0a0', letterSpacing: 4 },
    }, 'feelandnote.com'),
  )
}
