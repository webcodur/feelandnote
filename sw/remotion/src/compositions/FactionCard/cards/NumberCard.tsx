import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { mix, DEFAULT_COLOR, CardPropsBase } from '../shared'

export const NumberCard: React.FC<CardPropsBase> = ({ card }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const

  const c = card.color ?? DEFAULT_COLOR

  return (
    <AbsoluteFill style={{ ...base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: r(30), background: `radial-gradient(120% 90% at 50% 0, ${mix(c, '#05080a', 0.82)}, #070a08)` }}>
      <div style={{ fontSize: r(96), fontWeight: 900, lineHeight: 0.85, letterSpacing: r(-4), color: c }}>{card.value}</div>
      <div style={{ fontSize: r(15), fontWeight: 700, marginTop: r(8) }}>{card.unit}</div>
      <div style={{ fontSize: r(13), color: '#9fb0a4', marginTop: r(16), lineHeight: 1.55 }}>
        {card.desc.split('\n').map((line: string, i: number) => (
          <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: r(20), fontSize: r(11), letterSpacing: r(1), color: c, opacity: 0.8 }}>{card.tag}</div>
    </AbsoluteFill>
  )
}
