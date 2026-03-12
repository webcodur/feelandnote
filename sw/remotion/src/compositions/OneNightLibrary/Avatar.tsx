import { Img, interpolate, useCurrentFrame } from 'remotion'
import type { CelebData } from './types'

type Props = {
  celeb: CelebData
  side: 'left' | 'right'
  active: boolean
  enterFrame: number
}

export const Avatar: React.FC<Props> = ({ celeb, side, active, enterFrame }) => {
  const frame = useCurrentFrame()

  const slideFrom = side === 'left' ? -80 : 80
  const x = interpolate(frame, [enterFrame, enterFrame + 20], [slideFrom, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const opacity = interpolate(frame, [enterFrame, enterFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const glowOpacity = active
    ? interpolate(Math.sin(frame * 0.1), [-1, 1], [0.3, 0.7])
    : 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${active ? '#c8a46e' : '#333'}`,
          boxShadow: `0 0 ${active ? 40 : 0}px rgba(200, 164, 110, ${glowOpacity})`,
          transition: 'border-color 0.3s',
        }}
      >
        <Img
          src={celeb.avatar_url}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#e8e0d0', fontSize: 22, fontWeight: 700, fontFamily: 'system-ui' }}>
          {celeb.nickname}
        </div>
        <div style={{ color: '#888', fontSize: 14, fontFamily: 'system-ui', marginTop: 4 }}>
          {celeb.nickname_en}
        </div>
      </div>
    </div>
  )
}
