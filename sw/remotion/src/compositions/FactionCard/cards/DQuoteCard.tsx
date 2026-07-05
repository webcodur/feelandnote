import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { factionSrc, colorOf, groupPeople, roleOf, rgba, CardPropsBase } from '../shared'

export const DQuoteCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)

  const g = script.groups[card.groupIndex]
  const p = groupPeople(g)[card.personIndex]
  const c = colorOf(g)
  const text = card.text ?? p.quoteCard ?? p.quote ?? ''
  const src = img(p.image)

  return (
    <AbsoluteFill style={{ ...base, overflow: 'hidden' }}>
      <img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(13px) brightness(0.4) saturate(1.1)', transform: 'scale(1.15)' }} />
      <AbsoluteFill style={{ zIndex: 2, background: `radial-gradient(120% 90% at 50% 30%, ${rgba(c, 0.12)}, rgba(8,7,4,0.62))` }} />
      <AbsoluteFill style={{ zIndex: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${r(30)}px ${r(26)}px` }}>
        <div style={{ fontSize: r(56), lineHeight: 0.5, marginBottom: r(14), color: c }}>“</div>
        <div style={{ fontSize: r(19), fontWeight: 800, lineHeight: 1.42, letterSpacing: r(-0.5), color: '#fff', wordBreak: 'break-all', whiteSpace: 'pre-line' }}>{text}</div>
        <div style={{ marginTop: r(22), display: 'flex', alignItems: 'center', gap: r(11) }}>
          <img src={src} style={{ width: r(44), height: r(44), borderRadius: '50%', objectFit: 'cover', border: `${r(2)}px solid rgba(255,255,255,0.5)` }} />
          <div style={{ fontSize: r(14), fontWeight: 800 }}>
            {p.name}
            <small style={{ display: 'block', fontSize: r(10), fontWeight: 600, opacity: 0.7, letterSpacing: r(0.5), marginTop: r(2) }}>
              {[p.nameEn?.toUpperCase(), roleOf(p)].filter(Boolean).join(' · ')}
            </small>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
