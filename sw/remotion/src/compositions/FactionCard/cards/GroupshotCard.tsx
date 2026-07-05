import React, { useContext } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { nameHead, nameTail, clustersOf } from '../../Faction/utils'
import { CardImg, factionSrc, colorOf, rgba, lighten, FramePadContext, CardPropsBase } from '../shared'

export const GroupshotCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)
  const { top: markPad, bottom: guidePad } = useContext(FramePadContext)

  const g = script.groups[card.groupIndex]
  const c = colorOf(g)
  const cluster = clustersOf(g)[card.clusterIndex]
  const people = (cluster?.people ?? []).filter(p => !p.disabled)
  const label = cluster?.label
  const body = nameTail(label) || nameTail(g.name)
  const rep = people.find(p => p.quoteCard || p.quote) || people[0]
  const quote = rep?.quoteCard ?? rep?.quote ?? ''

  let namesText = ''
  if (quote) {
    const otherNames = people.filter(p => p !== rep).map(p => p.name).filter(Boolean).join(' · ')
    if (otherNames) namesText = `(+) ${otherNames}`
  } else {
    namesText = people.map(p => p.name).filter(Boolean).join(' · ')
  }

  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#0c0b08', overflow: 'hidden' }}>
      <CardImg src={img(cluster?.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(36px) brightness(0.5)', transform: 'scale(1.18)' }} />
      <CardImg src={img(cluster?.image)} style={{ position: 'absolute', top: '50%', left: 0, width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', transform: 'translateY(-50%)' }} />
      
      <AbsoluteFill style={{
        zIndex: 3,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%, transparent 50%, rgba(0,0,0,0.9) 100%)'
      }} />
      
      {!card.withFaction && (
        <>
          <div style={{ position: 'absolute', zIndex: 4, top: r(20), left: r(20), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: r(300) }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: `${r(6)}px ${r(12)}px`,
              borderRadius: r(999),
              background: 'rgba(10, 12, 16, 0.65)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              gap: r(8)
            }}>
              <div style={{ fontSize: r(13.5), fontWeight: 900, letterSpacing: r(0.5), color: '#fff', flexShrink: 0 }}>
                {nameHead(label) || nameHead(g.name)}
              </div>
              {body && (
                <>
                  <span style={{ width: 1, height: r(12), background: 'rgba(255,255,255,0.3)' }} />
                  <div style={{ 
                    fontSize: r(12.5), 
                    fontWeight: 500, 
                    color: 'rgba(255,255,255,0.75)',
                    letterSpacing: r(0),
                    wordBreak: 'keep-all',
                  }}>
                    {body}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0, padding: `${r(16)}px ${r(20)}px ${r(16) + guidePad}px`, display: 'flex', flexDirection: 'column' }}>
            {quote && (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: r(6) }}>
                <div style={{ fontSize: r(16.5), fontWeight: 700, lineHeight: 1.55, letterSpacing: r(-0.3), color: '#fff', wordBreak: 'break-all', textShadow: '0 3px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)' }}>
                  <span style={{ color: c, fontWeight: 900, marginRight: r(6) }}>“</span>
                  {quote}
                  <span style={{ color: c, fontWeight: 900, marginLeft: r(4) }}>”</span>
                </div>
                <div style={{ fontSize: r(14.5), fontWeight: 800, color: lighten(c, 0.2), textShadow: '0 2px 6px rgba(0,0,0,0.9)', paddingLeft: r(2) }}>
                  — {rep.name}
                </div>
              </div>
            )}
            
            {namesText && (
              <div style={{ 
                marginTop: quote ? r(6) : 0,
                fontSize: r(12.5), 
                fontWeight: 500, 
                color: 'rgba(255,255,255,0.5)', 
                textAlign: 'left', 
                letterSpacing: r(1.5),
                lineHeight: 1.45,
                textShadow: `0 2px 6px rgba(0,0,0,0.9)`
              }}>
                {namesText}
              </div>
            )}
          </div>
        </>
      )}
    </AbsoluteFill>
  )
}
