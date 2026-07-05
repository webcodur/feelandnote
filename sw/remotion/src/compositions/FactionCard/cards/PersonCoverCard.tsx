import React, { useContext } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { nameHead, nameTail } from '../../Faction/utils'
import { CardImg, factionSrc, colorOf, groupPeople, FramePadContext, CardPropsBase } from '../shared'

export const PersonCoverCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)
  const { bottom: guidePad } = useContext(FramePadContext)

  const g = script.groups[card.groupIndex]
  const p = groupPeople(g)[card.personIndex]
  const c = colorOf(g)

  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#06070a', overflow: 'hidden' }}>
      <CardImg src={img(p.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 24%' }} />
      <AbsoluteFill style={{ zIndex: 2, background: 'linear-gradient(180deg, rgba(5,6,9,0.4) 0%, transparent 32%, rgba(5,6,9,0.45) 62%, rgba(5,6,9,0.74) 100%)' }} />
      <div style={{ position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0, padding: `${r(24)}px ${r(22)}px ${r(8) + guidePad}px` }}>
        <div style={{ fontSize: r(33), fontWeight: 900, lineHeight: 1.05, letterSpacing: r(-1), color: '#fff' }}>{p.name}</div>
        <div style={{ marginTop: r(10), paddingLeft: r(4), display: 'flex', alignItems: 'baseline', gap: r(8), flexWrap: 'wrap' }}>
          <span style={{ fontSize: r(13), fontWeight: 700, color: '#e8e6e0' }}>{nameHead(g.name)}</span>
          {nameTail(g.name) && (
            <span style={{ fontSize: r(12.5), fontWeight: 700, color: c }}>{nameTail(g.name)}</span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}
