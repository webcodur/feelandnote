import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { CelebData } from './types'

type Props = {
  celeb: CelebData
  side: 'left' | 'right'
  startFrame: number
}

export const QuoteCard: React.FC<Props> = ({ celeb, side, startFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - startFrame

  if (localFrame < 0) return null

  const opacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const scale = spring({ frame: localFrame, fps, config: { damping: 12, stiffness: 120 } })
  const accentColor = side === 'left' ? '#c8a46e' : '#6ea4c8'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          color: accentColor,
          fontSize: 48,
          fontFamily: 'Georgia, serif',
          lineHeight: 1,
        }}
      >
        "
      </div>
      <div
        style={{
          color: '#e8e0d0',
          fontSize: 40,
          fontWeight: 600,
          fontFamily: 'system-ui',
          textAlign: 'center',
          maxWidth: 900,
          lineHeight: 1.5,
        }}
      >
        {celeb.quote}
      </div>
      <div style={{ color: '#888', fontSize: 20, fontFamily: 'system-ui', marginTop: 8 }}>
        — {celeb.nickname}
      </div>
    </div>
  )
}
