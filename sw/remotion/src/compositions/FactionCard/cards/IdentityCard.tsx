import React, { useContext } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { CardImg, factionSrc, colorOf, groupPeople, GraphicBg, rgba, FramePadContext, CardPropsBase } from '../shared'

export const IdentityCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)
  const { top: markPad, bottom: guidePad } = useContext(FramePadContext)

  const g = script.groups[card.groupIndex]
  const p = groupPeople(g)[card.personIndex]
  const c = colorOf(g)
  const lines = p.lines ?? []
  const faceSrc = img(card.face ?? p.cardFace ?? p.image)

  return (
    <AbsoluteFill style={{ ...base, overflow: 'hidden' }}>
      <GraphicBg c={c} r={r} />
      <AbsoluteFill style={{ zIndex: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: r(20), paddingRight: r(20), paddingTop: markPad, paddingBottom: r(16) + guidePad }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: r(20) }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: r(12), flexShrink: 0 }}>
            <CardImg src={faceSrc} style={{ width: r(92), height: r(92), borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 16%', border: `${r(2.5)}px solid ${rgba(c, 0.65)}` }} />
            <div style={{ fontSize: r(24), fontWeight: 900, lineHeight: 1.1, letterSpacing: r(-0.6), color: '#fff', textAlign: 'center' }}>{p.name}</div>
          </div>
          {lines.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: r(13), minWidth: 0, flex: 1 }}>
              {lines.map((line: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: r(10) }}>
                  <span style={{ width: r(6), height: r(6), borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: r(17), fontWeight: 600, lineHeight: 1.5, color: '#ece9e2' }}>{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
