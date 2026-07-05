import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { CardImg, factionSrc, colorOf, groupPeople, CardPropsBase } from '../shared'

export const HookCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)

  const g = script.groups[card.groupIndex]
  const p = groupPeople(g)[card.personIndex ?? 0]
  const c = colorOf(g)
  const headline = card.headline ?? p.cardHeadline ?? p.lines?.[0] ?? ''
  const kicker = card.kicker ?? 'WHO IS THIS?'

  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#0c0b08' }}>
      <CardImg src={img(p.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%' }} />
      <AbsoluteFill style={{ zIndex: 2, background: 'linear-gradient(180deg, rgba(6,6,4,0.1) 0%, transparent 26%, rgba(8,8,6,0.6) 58%, rgba(8,8,6,0.97) 100%)' }} />
      <div style={{ position: 'absolute', zIndex: 4, top: r(18), right: r(20), fontSize: r(10), fontWeight: 700, letterSpacing: r(2.5), textTransform: 'uppercase', color: c }}>{kicker}</div>
      <div style={{ position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0, padding: `${r(24)}px ${r(22)}px ${r(30)}px` }}>
        <div style={{ fontSize: r(30), fontWeight: 900, lineHeight: 1.22, letterSpacing: r(-0.8), color: '#fff', whiteSpace: 'pre-line' }}>{headline}</div>
        {card.sub && <div style={{ marginTop: r(14), fontSize: r(14.5), fontWeight: 700, lineHeight: 1.45, color: c }}>{card.sub}</div>}
      </div>
    </AbsoluteFill>
  )
}
