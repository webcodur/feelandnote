import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { colorOf, groupPeople, GraphicBg, CardPropsBase } from '../shared'

export const ContextCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const

  const g = script.groups[card.groupIndex]
  const p = card.personIndex != null ? groupPeople(g)[card.personIndex] : undefined
  const c = colorOf(g)
  const body = card.body ?? (p ? (p.cardBody ?? p.epithet ?? '') : (g.cardBody ?? ''))
  const titleText = p ? '그는 누구인가' : (g.cardHeadline ?? '세력 강령')

  return (
    <AbsoluteFill style={{ ...base, overflow: 'hidden' }}>
      <GraphicBg c={c} r={r} />
      <AbsoluteFill style={{ zIndex: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${r(24)}px` }}>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: r(20),
          padding: `${r(24)}px ${r(22)}px`,
          background: 'rgba(12, 14, 18, 0.65)',
          backdropFilter: 'blur(16px)',
          borderRadius: r(12),
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: r(12) }}>
            <div style={{ fontSize: r(22), fontWeight: 900, letterSpacing: r(0.5), color: '#fff', wordBreak: 'break-all', lineHeight: 1.35 }}>
              <span style={{ color: c }}>{titleText}</span>
            </div>
            <div style={{ width: r(30), height: r(2), background: `linear-gradient(90deg, ${c}, transparent)` }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: r(14) }}>
            {body.split('\n').filter((p: string) => p.trim()).map((p: string, i: number) => (
              <div key={i} style={{ 
                fontSize: r(16.5), 
                fontWeight: 400, 
                lineHeight: 1.65, 
                letterSpacing: r(-0.2), 
                color: 'rgba(255,255,255,0.75)', 
                wordBreak: 'break-all' 
              }}>
                {p.trim()}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
