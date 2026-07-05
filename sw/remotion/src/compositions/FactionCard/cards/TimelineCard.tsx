import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { colorOf, GraphicBg, rgba, CardPropsBase } from '../shared'

export const TimelineCard: React.FC<CardPropsBase> = ({ script, card }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const

  const g = script.groups[card.groupIndex]
  const c = colorOf(g)
  const items = card.items

  return (
    <AbsoluteFill style={{ ...base, overflow: 'hidden' }}>
      <GraphicBg c={c} r={r} />
      <AbsoluteFill style={{ zIndex: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${r(28)}px ${r(24)}px` }}>
        {card.title && (
          <>
            <div style={{ fontSize: r(13), fontWeight: 700, letterSpacing: r(2.5), marginBottom: r(8), textTransform: 'uppercase', color: c }}>TIMELINE</div>
            <div style={{ fontSize: r(32), fontWeight: 900, letterSpacing: r(-0.8), marginBottom: r(26), color: '#fff' }}>{card.title}</div>
          </>
        )}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: r(24) }}>
          
          {items.map((it: { year: string; text: string }, i: number) => (
            <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: r(5), paddingLeft: r(26) }}>
              <span style={{ position: 'absolute', left: 0, top: r(4), width: r(12), height: r(12), borderRadius: '50%', background: c, boxShadow: `0 0 0 ${r(4)}px ${rgba(c, 0.18)}` }} />
              <span style={{ fontSize: r(22), fontWeight: 900, letterSpacing: r(-0.5), color: c, lineHeight: 1 }}>{it.year}</span>
              <span style={{ fontSize: r(16.5), fontWeight: 600, lineHeight: 1.5, color: '#ece9e2' }}>{it.text}</span>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
