import React, { useContext } from 'react'
import { AbsoluteFill, useVideoConfig, Img } from 'remotion'
import { FONT } from '../../Faction/constants'
import { nameHead, nameTail } from '../../Faction/utils'
import { factionSrc, colorOf, GraphicBg, rgba, FramePadContext, CardPropsBase } from '../shared'

export const LogoCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const img = (image?: string): string => factionSrc(episodeName, image ?? '', assetBase)
  const { bottom: guidePad } = useContext(FramePadContext)

  const g = script.groups[card.groupIndex]
  const c = colorOf(g)

  return (
    <AbsoluteFill style={{ ...base, overflow: 'hidden' }}>
      <GraphicBg c={c} r={r} />
      <AbsoluteFill style={{ zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${r(30)}px ${r(26)}px ${r(30) + guidePad}px`, textAlign: 'center' }}>
        {g.logoImg ? (
          <Img src={img(g.logoImg)} style={{ width: r(150), height: r(150), objectFit: 'contain' }} />
        ) : (
          <div style={{
            padding: `${r(16)}px ${r(22)}px`, border: `${r(2)}px dashed ${rgba(c, 0.55)}`, borderRadius: r(10),
            fontSize: r(13), fontWeight: 700, color: rgba(c, 0.8),
          }}>
            로고 이미지 없음
          </div>
        )}
        <div style={{ marginTop: r(26), fontSize: r(26), fontWeight: 900, letterSpacing: r(-0.8), color: '#fff' }}>{nameHead(g.name)}</div>
        {nameTail(g.name) && (
          <div style={{ marginTop: r(8), fontSize: r(13.5), lineHeight: 1.55, color: '#cdc6b8' }}>{nameTail(g.name)}</div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
