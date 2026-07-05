import React, { useContext } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { CardImg, factionSrc, colorOf, groupPeople, roleOf, lighten, rgba, MissingLogoBg, FramePadContext, FRAME_GAP, CardPropsBase } from '../shared'

export const QuoteCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)
  const { bottom: guidePad } = useContext(FramePadContext)

  const g = script.groups[card.groupIndex]
  const p = groupPeople(g)[card.personIndex]
  const c = colorOf(g)
  const text = card.quoteCard ?? p.quoteCard ?? p.quote ?? ''
  const isPhoto = (card.bg ?? 'photo') === 'photo'
  
  const len = text.length
  const qSize = isPhoto
    ? (len > 110 ? 16.5 : len > 80 ? 18.5 : 20.5)
    : (len > 110 ? 16 : len > 80 ? 17.5 : 19.5)
  const qLine = len > 80 ? 1.5 : 1.42

  if (isPhoto) {
    return (
      <AbsoluteFill style={{ ...base, backgroundColor: '#0c0b08', overflow: 'hidden' }}>
        <CardImg src={img(p.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%' }} />
        <AbsoluteFill style={{ zIndex: 2, background: 'linear-gradient(180deg, rgba(6,6,4,0.05) 0%, transparent 30%, rgba(7,8,6,0.7) 58%, rgba(7,8,6,0.98) 100%)' }} />
        <div style={{ position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0, padding: `${r(20)}px ${r(20)}px ${r(22) + guidePad}px` }}>
          <div style={{ fontSize: r(20.5), fontWeight: 700, lineHeight: 1.5, letterSpacing: r(-0.4), color: '#fff', wordBreak: 'break-all', whiteSpace: 'pre-line', textShadow: '0 3px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)' }}>
            <span style={{ color: c, fontWeight: 900, marginRight: r(8) }}>“</span>{text}<span style={{ color: c, fontWeight: 900, marginLeft: r(6) }}>”</span>
          </div>
          <div style={{ marginTop: r(20), display: 'flex', alignItems: 'center', gap: r(10) }}>
            <span style={{ width: r(12), height: r(2), background: c }} />
            <span style={{ fontSize: r(14), fontWeight: 800, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>{p.name}</span>
            <span style={{ fontSize: r(11.5), fontWeight: 600, padding: `${r(3)}px ${r(9)}px`, borderRadius: r(5), background: rgba(c, 0.22), color: lighten(c, 0.45) }}>{roleOf(p)}</span>
          </div>
        </div>
      </AbsoluteFill>
    )
  }

  const qImg = card.image
  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#0c0b08', overflow: 'hidden' }}>
      {qImg
        ? <CardImg src={img(qImg)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 24%' }} />
        : <MissingLogoBg c={c} r={r} label="대사 이미지 없음" />}
      <AbsoluteFill style={{ zIndex: 2, background: 'linear-gradient(180deg, rgba(6,6,4,0.05) 0%, transparent 32%, rgba(7,8,6,0.62) 60%, rgba(7,8,6,0.94) 100%)' }} />
      <div style={{ position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0, padding: `${r(26)}px ${r(34)}px ${r(FRAME_GAP) + guidePad}px` }}>
        <div style={{ position: 'relative', fontSize: r(qSize), fontWeight: 800, lineHeight: 1.6, letterSpacing: r(0.2), color: '#fff', wordBreak: 'break-all', whiteSpace: 'pre-line' }}>
          <span style={{ position: 'absolute', transform: 'translateX(-145%)', color: c }}>“</span>
          {text}
          <span style={{ color: c, marginLeft: r(11) }}>”</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
