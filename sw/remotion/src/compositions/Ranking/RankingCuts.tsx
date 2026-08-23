import React, { useState } from 'react'
import { AbsoluteFill, Img, staticFile } from 'remotion'
import type { RankingEntry } from './types'

const ACCENT = '#d4a828'
const FONT_SERIF = 'MaruBuri, "Noto Serif KR", serif'

export const rankingImgSrc = (episodeName: string, image: string) =>
  /^https?:\/\//.test(image)
    ? image
    : image.includes('/')
      ? staticFile(`rankings/${episodeName}/${image}`)
      : staticFile(`rankings/${episodeName}/images/${image}`)

export const CueCaption: React.FC<{ text: string }> = ({ text }) => (
  <p
    style={{
      position: 'absolute',
      left: 56,
      right: 56,
      bottom: 88,
      margin: 0,
      fontFamily: FONT_SERIF,
      fontSize: 30,
      lineHeight: 1.45,
      textAlign: 'center',
      textShadow: '0 2px 16px rgba(0,0,0,0.85)',
    }}
  >
    {text}
  </p>
)

export const PersonStill: React.FC<{ episodeName: string; src?: string }> = ({ episodeName, src }) => {
  const [failed, setFailed] = useState(false)
  const href = src && !failed ? rankingImgSrc(episodeName, src) : null
  if (!href) return null
  return (
    <Img
      src={href}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

/** 화보를 깔고 그 위에 순위·이름·설명을 얹는다 */
export const PersonShot: React.FC<{
  episodeName: string
  entry: RankingEntry
  category?: string
}> = ({ episodeName, entry, category }) => {
  const src = entry.image || entry.avatar
  return (
    <AbsoluteFill style={{ background: '#14141c' }}>
      {src ? <PersonStill episodeName={episodeName} src={src} /> : null}
      <AbsoluteFill
        style={{
          background: src
            ? 'linear-gradient(180deg, rgba(10,10,15,0.25) 0%, rgba(10,10,15,0.08) 38%, rgba(10,10,15,0.82) 100%)'
            : undefined,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 280,
        }}
      >
        {category ? (
          <p style={{ fontSize: 22, letterSpacing: 6, color: ACCENT, margin: 0 }}>{category}</p>
        ) : null}
        <p style={{ fontSize: 140, fontWeight: 800, lineHeight: 1, margin: '16px 0 0', color: ACCENT }}>
          {entry.rank}
        </p>
        <h2 style={{ fontSize: 68, fontWeight: 800, margin: '8px 0 0' }}>{entry.name}</h2>
        {entry.line ? (
          <p style={{ fontSize: 30, lineHeight: 1.45, margin: '20px 0 0', opacity: 0.92 }}>{entry.line}</p>
        ) : null}
        {entry.note ? (
          <p style={{ fontSize: 24, margin: '12px 0 0', color: ACCENT }}>{entry.note}</p>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}
