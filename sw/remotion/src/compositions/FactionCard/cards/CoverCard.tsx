import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { nameHead, nameTail } from '../../Faction/utils'
import { CardImg, factionSrc, colorOf, groupCoverImage, MissingLogoBg, CardPropsBase } from '../shared'

export const CoverCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)

  const g = script.groups[card.groupIndex]
  const c = colorOf(g)
  const cover = groupCoverImage(g)

  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#0c0b08' }}>
      {cover
        ? <CardImg src={img(cover)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        : <MissingLogoBg c={c} r={r} />}
      <AbsoluteFill style={{
        zIndex: 3, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: `${r(30)}px ${r(24)}px`,
        background: 'linear-gradient(180deg, transparent 16%, rgba(6,7,5,0.5) 52%, rgba(6,7,5,0.95) 100%)',
      }}>
        <div style={{ 
          fontSize: r(44), 
          fontWeight: 900, 
          lineHeight: 1.1, 
          letterSpacing: r(-1.2), 
          color: '#fff',
          textShadow: '0 0 20px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.05), 0 2px 12px rgba(0,0,0,0.9)'
        }}>
          {script.title}
        </div>
        <div style={{ width: r(60), height: r(2), margin: `${r(20)}px 0 ${r(18)}px`, background: `linear-gradient(90deg, ${c}, transparent)` }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: r(10) }}>
          <span style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: r(18), 
            fontWeight: 800, 
            color: '#fff', 
            letterSpacing: r(-0.2),
            padding: `${r(6)}px ${r(12)}px`,
            borderRadius: r(4),
            background: `linear-gradient(90deg, rgba(255,255,255,0.1), transparent)`,
            borderLeft: `${r(3)}px solid ${c}`,
            backdropFilter: 'blur(10px)'
          }}>
            {nameHead(g.name)}
          </span>
          {nameTail(g.name) && (
            <span style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: r(14), 
              fontWeight: 600,
              letterSpacing: r(1.5),
              paddingLeft: r(4)
            }}>
              {nameTail(g.name).toUpperCase()}
            </span>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
