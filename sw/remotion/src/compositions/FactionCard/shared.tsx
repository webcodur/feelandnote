import React, { createContext } from 'react'
import { AbsoluteFill, staticFile, Img } from 'remotion'
import type { FactionScript, FactionGroup, FactionPerson } from '../Faction/types'
import { FONT } from '../Faction/constants'

// #region 자산 경로 해석
export const factionSrc = (episodeName: string, image: string, assetBase?: string): string => {
  if (!image) return ''
  if (/^https?:\/\//.test(image)) return image
  const rel = image.includes('/')
    ? `factions/${episodeName}/${image}`
    : `factions/${episodeName}/images/${image}`
  return assetBase ? `${assetBase.replace(/\/$/, '')}/${rel}` : staticFile(rel)
}

export const CardImg: React.FC<{ src: string; style: React.CSSProperties }> = ({ src, style }) =>
  src ? <Img src={src} style={style} /> : <div style={{ ...style, background: '#15161a' }} />
// #endregion

// #region 색 유틸
export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgba = (hex: string, a: number): string => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export const mix = (hex: string, hex2: string, t: number): string => {
  const a = hexToRgb(hex), b = hexToRgb(hex2)
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`
}

export const lighten = (hex: string, t: number): string => mix(hex, '#ffffff', t)
// #endregion

// #region 데이터 헬퍼
export const DEFAULT_COLOR = '#00ff00'
export const groupPeople = (g: FactionGroup): FactionPerson[] =>
  g.clusters.flatMap(c => c.people).filter(person => person.isPerson !== false)
export const groupCoverImage = (g: FactionGroup): string | undefined => g.logoImg
export const colorOf = (g: FactionGroup): string => g.color ?? DEFAULT_COLOR
export const roleOf = (p: FactionPerson): string => p.lines?.[0] ?? p.org ?? ''
export const kicker = (script: FactionScript, groupIndex: number): string =>
  `${script.titleEn ?? script.title} · ${String(groupIndex + 1).padStart(2, '0')}`
export { clustersOf } from '../Faction/utils'
// #endregion

// #region 그래픽 공용
export const GraphicBg: React.FC<{ c: string; r: (n: number) => number }> = ({ c, r }) => (
  <>
    <AbsoluteFill style={{ background: '#06070a' }} />
    <AbsoluteFill style={{ background: `radial-gradient(135% 115% at 14% 6%, ${rgba(c, 0.24)}, transparent 56%)` }} />
    <AbsoluteFill style={{ background: `linear-gradient(150deg, transparent 42%, ${rgba(c, 0.09)} 100%)` }} />
    <AbsoluteFill style={{
      opacity: 0.055,
      backgroundImage:
        `repeating-linear-gradient(0deg, ${c} 0, ${c} 1px, transparent 1px, transparent ${r(30)}px),` +
        `repeating-linear-gradient(90deg, ${c} 0, ${c} 1px, transparent 1px, transparent ${r(30)}px)`,
    }} />
    <AbsoluteFill style={{ background: 'radial-gradient(120% 85% at 50% 55%, transparent 32%, rgba(3,4,6,0.62) 100%)' }} />
  </>
)

export const MissingLogoBg: React.FC<{ c: string; r: (n: number) => number; label?: string }> = ({ c, r, label }) => (
  <AbsoluteFill style={{ background: '#0c0b08', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '68%', aspectRatio: '1 / 1', border: `${r(1.5)}px dashed ${c}`, borderRadius: r(8),
      color: c, fontSize: r(15), fontWeight: 800, letterSpacing: r(1),
    }}>
      {label ?? '로고 이미지 없음'}
    </div>
  </AbsoluteFill>
)
// #endregion

// #region 프레임 컨텍스트 및 하단 나레이션 가이드바
export const FramePadContext = createContext({ top: 0, bottom: 0 })
export const FRAME_GAP = 8

export const GuideBar: React.FC<{ text: string; c: string; r: (n: number) => number; innerRef?: React.Ref<HTMLDivElement> }> = ({ text, c, r, innerRef }) => {
  const parts = text.split('\n').filter(t => t.trim())
  return (
    <div ref={innerRef} style={{
      position: 'absolute', zIndex: 10, left: 0, right: 0, bottom: 0,
      padding: `${r(13)}px ${r(24)}px ${r(14)}px`,
      background: 'rgba(10,12,16,0.46)',
      backdropFilter: 'blur(10px)',
      borderTop: `${r(1.5)}px solid ${rgba(c, 0.5)}`,
      boxShadow: `0 ${-r(6)}px ${r(18)}px rgba(0,0,0,0.3)`,
    }}>
      <span style={{ fontFamily: FONT, fontSize: r(15), fontWeight: 600, lineHeight: 1.72, letterSpacing: r(-0.2), color: '#f2efe9', display: 'block' }}>
        {parts.map((t, i) => (
          <span key={i} style={i === 0 && parts.length > 1 ? { color: lighten(c, 0.32), fontWeight: 800 } : undefined}>
            {t}
            {i < parts.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </div>
  )
}
// #endregion

export type CardPropsBase = {
  script: FactionScript;
  episodeName: string;
  assetBase?: string;
  card: any; // 구체적인 카드 타입은 개별 컴포넌트에서 override (또는 그대로 사용)
}
