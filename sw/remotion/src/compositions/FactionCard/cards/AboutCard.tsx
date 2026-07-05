import React, { useContext } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { BrandLogo } from '../../BookRecommend/brand'
import { colorOf, GraphicBg, lighten, mix, rgba, FramePadContext, CardPropsBase } from '../shared'

export const AboutCard: React.FC<CardPropsBase> = ({ script, card }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const { top: markPad, bottom: guidePad } = useContext(FramePadContext)

  const g = script.groups[card.groupIndex]
  const c = colorOf(g)
  const site = card.site ?? 'feelandnote.com'
  const youtube = card.youtube ?? 'YouTube · 세력 도감'

  return (
    <AbsoluteFill style={{ ...base, overflow: 'hidden' }}>
      <GraphicBg c={c} r={r} />
      <AbsoluteFill style={{ zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${markPad}px ${r(28)}px ${r(30) + guidePad}px` }}>
        <BrandLogo variant="brand" fontSize={r(30)} style={{ filter: 'brightness(1.14)' }} />
        <div style={{ marginTop: r(20), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: r(13) }}>
          <span style={{
            display: 'flex', alignItems: 'center', height: r(38),
            fontSize: r(14), fontWeight: 900, letterSpacing: r(0.4),
            padding: `0 ${r(26)}px`, borderRadius: r(999),
            background: `linear-gradient(180deg, ${lighten(c, 0.28)} 0%, ${c} 55%, ${mix(c, '#000000', 0.22)} 100%)`,
            color: '#1a1206',
            textShadow: `0 ${r(1)}px 0 rgba(255,255,255,0.35), 0 ${r(-0.5)}px ${r(1)}px rgba(0,0,0,0.45)`,
            boxShadow: `0 ${r(6)}px ${r(20)}px ${rgba(c, 0.35)}, inset 0 ${r(1)}px 0 rgba(255,255,255,0.4)`,
          }}>{site}</span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: r(8), height: r(38), boxSizing: 'border-box',
            fontSize: r(14), fontWeight: 900, letterSpacing: r(0.3),
            padding: `0 ${r(26)}px`, borderRadius: r(999),
            border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(240,238,232,0.07)', color: '#f2efe9',
          }}>
            <span style={{ width: 0, height: 0, borderTop: `${r(4.5)}px solid transparent`, borderBottom: `${r(4.5)}px solid transparent`, borderLeft: `${r(7.5)}px solid #ff4b4b` }} />
            {youtube}
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
