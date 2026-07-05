import React, { useContext } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { CardImg, factionSrc, colorOf, groupPeople, roleOf, rgba, lighten, FramePadContext, CardPropsBase } from '../shared'

export const MysteryCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)
  const { top: markPad } = useContext(FramePadContext)

  const g = script.groups[card.groupIndex]
  const p = groupPeople(g)[card.personIndex]
  const c = colorOf(g)
  const headline = card.headline ?? p.cardHeadline ?? roleOf(p)
  const role = roleOf(p)
  const body = card.body ?? p.cardBody ?? p.epithet ?? ''

  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#06070a', overflow: 'hidden' }}>
      <CardImg src={img(p.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 24%', filter: 'blur(8px) brightness(0.62) saturate(1.05)', transform: 'scale(1.12)' }} />
      <AbsoluteFill style={{ zIndex: 2, background: `radial-gradient(125% 95% at 50% 22%, ${rgba(c, 0.1)}, transparent 55%)` }} />
      <AbsoluteFill style={{ zIndex: 2, background: 'linear-gradient(180deg, rgba(6,7,10,0.4) 0%, transparent 26%, rgba(6,7,10,0.74) 56%, rgba(6,7,10,0.98) 100%)' }} />
      <div style={{ position: 'absolute', zIndex: 3, top: r(2), right: r(14), fontSize: r(260), fontWeight: 900, lineHeight: 1, color: c, opacity: 0.13 }}>?</div>
      <div style={{ position: 'absolute', zIndex: 4, top: markPad, left: r(20), fontSize: r(10), fontWeight: 700, letterSpacing: r(2.5), textTransform: 'uppercase', color: c }}>WHO IS THIS?</div>
      <div style={{ position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0, padding: `${r(18)}px ${r(18)}px ${r(24)}px` }}>
        <div style={{ fontSize: r(35), fontWeight: 900, lineHeight: 1.18, letterSpacing: r(-1), color: '#fff', whiteSpace: 'pre-line' }}>{headline}</div>
        <div style={{ marginTop: r(13), display: 'flex', alignItems: 'baseline', gap: r(9), flexWrap: 'wrap' }}>
          <span style={{ fontSize: r(24), fontWeight: 900, letterSpacing: r(-0.5), color: c }}>{p.name}</span>
          {role && <span style={{ fontSize: r(13), fontWeight: 700, padding: `${r(3)}px ${r(9)}px`, borderRadius: r(5), background: rgba(c, 0.2), color: lighten(c, 0.45) }}>{role}</span>}
        </div>
        <div style={{ width: r(40), height: r(3), margin: `${r(14)}px 0 ${r(13)}px`, background: c }} />
        <div style={{ fontSize: r(17), fontWeight: 500, lineHeight: 1.72, letterSpacing: r(-0.2), color: '#ece9e2' }}>{body}</div>
      </div>
    </AbsoluteFill>
  )
}
