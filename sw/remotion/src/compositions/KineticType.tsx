import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'

type Props = {
  lines: string[]
  color: string
  bgColor: string
}

export const KineticType: React.FC<Props> = ({ lines, color, bgColor }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const framesPerLine = Math.floor(durationInFrames / lines.length)

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {lines.map((line, i) => {
        const start = i * framesPerLine
        const localFrame = frame - start

        const y = interpolate(localFrame, [0, 20], [60, 0], { extrapolateRight: 'clamp' })
        const opacity = interpolate(localFrame, [0, 15, framesPerLine - 15, framesPerLine], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        const scale = spring({ frame: Math.max(0, localFrame), fps, config: { damping: 15, stiffness: 150 } })

        return (
          <AbsoluteFill
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity,
              transform: `translateY(${y}px) scale(${scale})`,
            }}
          >
            <span
              style={{
                color,
                fontSize: 120,
                fontWeight: 800,
                fontFamily: 'system-ui, sans-serif',
                textAlign: 'center',
                padding: '0 80px',
                lineHeight: 1.2,
              }}
            >
              {line}
            </span>
          </AbsoluteFill>
        )
      })}
    </AbsoluteFill>
  )
}
