import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { factionSrc, colorOf, groupPeople, rgba, CardPropsBase } from '../shared'

export const EpithetCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)

  const g = script.groups[card.groupIndex]
  const p = groupPeople(g)[card.personIndex]
  const c = colorOf(g)
  const text = p.epithet ?? ''

  return (
    <AbsoluteFill style={{ ...base, overflow: 'hidden' }}>
      <img src={img(p.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(10px) brightness(0.42) saturate(1.05)', transform: 'scale(1.14)' }} />
      <AbsoluteFill style={{ zIndex: 2, background: `radial-gradient(120% 90% at 50% 32%, ${rgba(c, 0.14)}, rgba(7,7,5,0.6))` }} />
      <AbsoluteFill style={{ zIndex: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${r(32)}px ${r(28)}px` }}>
        <div style={{ width: r(42), height: r(3), marginBottom: r(20), background: c }} />
        <div style={{ fontSize: r(21), fontWeight: 800, lineHeight: 1.5, letterSpacing: r(-0.4), color: '#fff' }}>{text}</div>
        <div style={{ marginTop: r(24), fontSize: r(13), fontWeight: 800, color: c }}>{p.name}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
