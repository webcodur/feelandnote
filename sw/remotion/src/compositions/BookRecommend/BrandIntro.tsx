import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from './fonts'
import { BrandLogo } from './utils'

type Props = {
  durationFrames: number
}

/** Section 0: 브랜드 로고 + 차임 SFX */
export const BrandIntro: React.FC<Props> = ({ durationFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 120 } })
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })

  const lineWidth = interpolate(frame, [15, 40], [0, 200], { extrapolateRight: 'clamp' })

  const tagOpacity = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: 'clamp' })
  const tagY = interpolate(frame, [25, 40], [15, 0], { extrapolateRight: 'clamp' })

  const fadeOut = interpolate(frame, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        opacity: fadeOut,
      }}
    >
      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})` }}>
        <BrandLogo variant="brand" />
      </div>
      <div style={{ width: lineWidth, height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
      <div
        style={{
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          color: '#888',
          fontSize: 20,
          fontFamily: FONT.serif,
          letterSpacing: 6,
        }}
      >
        취향이 역사가 되는 곳
      </div>
    </div>
  )
}
