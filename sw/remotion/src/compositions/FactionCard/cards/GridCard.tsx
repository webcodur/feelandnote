import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { nameHead } from '../../Faction/utils'
import { CardImg, factionSrc, colorOf, groupPeople, mix, kicker, CardPropsBase } from '../shared'

export const GridCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)

  const g = script.groups[card.groupIndex]
  const c = colorOf(g)
  const people = groupPeople(g)
  const spanLast = people.length % 2 === 1

  return (
    <AbsoluteFill style={{ ...base, display: 'grid', gridTemplateRows: 'auto 1fr', background: `linear-gradient(180deg, ${mix(c, '#070809', 0.86)}, #070809)` }}>
      <div style={{ padding: `${r(20)}px ${r(20)}px ${r(12)}px` }}>
        <div style={{ fontSize: r(11), fontWeight: 700, letterSpacing: r(2), marginBottom: r(6), textTransform: 'uppercase', color: c }}>{kicker(script, card.groupIndex)}</div>
        <div style={{ fontSize: r(22), fontWeight: 900, letterSpacing: r(-0.5) }}>
          {nameHead(g.name)} <span style={{ fontSize: r(13), color: c, fontWeight: 700 }}>{people.length}인</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: r(3), padding: `0 ${r(12)}px ${r(14)}px`, alignContent: 'start' }}>
        {people.map((p, i) => {
          const span = spanLast && i === people.length - 1
          return (
            <div key={i} style={{ position: 'relative', borderRadius: r(9), overflow: 'hidden', aspectRatio: span ? '2 / 1' : '1', gridColumn: span ? 'span 2' : undefined }}>
              <CardImg src={img(p.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: span ? 'center 30%' : 'center' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `${r(14)}px ${r(9)}px ${r(7)}px`, fontSize: r(11), fontWeight: 700, color: '#fff', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.88))' }}>{p.name}</div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
