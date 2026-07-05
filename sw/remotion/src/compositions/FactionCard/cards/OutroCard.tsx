import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { CardImg, factionSrc, colorOf, clustersOf, rgba, GraphicBg, CardPropsBase } from '../shared'

export const OutroCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)

  const g = script.groups[card.groupIndex]
  const c = colorOf(g)
  const clusters = clustersOf(g)
  const artwork = clusters.length > 0 ? clusters[clusters.length - 1].image : undefined

  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#0c0b08', overflow: 'hidden' }}>
      {artwork ? (
        <>
          <CardImg src={img(artwork)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(32px) brightness(0.45) saturate(1.2)', transform: 'scale(1.15)' }} />
          <AbsoluteFill style={{ zIndex: 2, background: `radial-gradient(130% 100% at 50% 20%, ${rgba(c, 0.15)}, transparent 60%)` }} />
        </>
      ) : (
        <GraphicBg c={c} r={r} />
      )}
      <AbsoluteFill style={{ zIndex: 2, background: 'linear-gradient(180deg, rgba(6,7,5,0.2) 0%, transparent 24%, rgba(6,7,5,0.62) 56%, rgba(6,7,5,0.97) 100%)' }} />
      <div style={{ position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0, padding: `${r(20)}px ${r(20)}px ${r(24)}px` }}>
        <div style={{ fontSize: r(34), fontWeight: 900, lineHeight: 1.18, letterSpacing: r(-0.8), color: '#fff', whiteSpace: 'pre-line' }}>{card.headline}</div>
        <div style={{ marginTop: r(14), fontSize: r(16), fontWeight: 700, lineHeight: 1.5, color: c }}>{card.sub}</div>
        {card.cta && (
          <div style={{ marginTop: r(18), fontSize: r(14), fontWeight: 500, color: 'rgba(255,255,255,0.6)', letterSpacing: r(0.5) }}>{card.cta}</div>
        )}
      </div>
    </AbsoluteFill>
  )
}
