import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { CardImg, factionSrc, colorOf, groupPeople, groupCoverImage, CardPropsBase } from '../shared'

export const StoryCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)

  const g = script.groups[card.groupIndex]
  const p = card.personIndex != null ? groupPeople(g)[card.personIndex] : undefined
  const c = colorOf(g)
  const beats = p ? (p.cardStory ?? []) : (g.cardStory ?? [])
  const beat = {
    ...(beats[card.index] ?? { text: '' }),
    ...(card.text != null ? { text: card.text } : {}),
    ...(card.image ? { image: card.image } : {}),
  }
  const defaultImage = p ? p.image : groupCoverImage(g)

  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#0c0b08', overflow: 'hidden' }}>
      <CardImg src={img(beat?.image ?? defaultImage)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 26%' }} />
      <div style={{
        position: 'absolute', zIndex: 4, left: 0, right: 0, bottom: 0,
        padding: `${r(18)}px ${r(24)}px ${r(22)}px`,
        background: 'rgba(10,12,16,0.46)',
        backdropFilter: 'blur(10px)',
        borderTop: `1px solid rgba(${c}, 0.35)`,
      }}>
        <div style={{ fontSize: r(14), fontWeight: 600, lineHeight: 1.72, letterSpacing: r(-0.2), color: '#f2efe9', whiteSpace: 'pre-line' }}>{beat?.text ?? ''}</div>
      </div>
    </AbsoluteFill>
  )
}
