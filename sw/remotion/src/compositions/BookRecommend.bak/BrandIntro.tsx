import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

type Props = {
  durationFrames: number
}

/** 브랜드 인트로: FEEL AND NOTE 로고 + 태그라인 */
export const BrandIntro: React.FC<Props> = ({ durationFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (frame >= durationFrames) return null

  const logoScale = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 120 } })
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })

  const tagOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' })
  const tagY = interpolate(frame, [30, 50], [15, 0], { extrapolateRight: 'clamp' })

  const lineWidth = interpolate(frame, [15, 45], [0, 200], { extrapolateRight: 'clamp' })

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
        gap: 24,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          color: '#c8a46e',
          fontSize: 52,
          fontWeight: 700,
          fontFamily: 'system-ui',
          letterSpacing: 8,
        }}
      >
        FEEL AND NOTE
      </div>
      {/* 장식 라인 */}
      <div
        style={{
          width: lineWidth,
          height: 1,
          backgroundColor: '#c8a46e',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          color: '#888',
          fontSize: 20,
          fontFamily: 'system-ui',
          letterSpacing: 6,
        }}
      >
        기록은 감각이 된다
      </div>
    </div>
  )
}
