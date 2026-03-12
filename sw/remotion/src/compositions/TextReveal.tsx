import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'

type Props = {
  text: string
  color: string
  bgColor: string
}

export const TextReveal: React.FC<Props> = ({ text, color, bgColor }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const words = text.split(' ')

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      {words.map((word, i) => {
        const delay = i * 8
        const scale = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 200 } })
        const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateRight: 'clamp' })

        return (
          <span
            key={i}
            style={{
              color,
              fontSize: 96,
              fontWeight: 700,
              fontFamily: 'system-ui, sans-serif',
              transform: `scale(${scale})`,
              opacity,
              display: 'inline-block',
            }}
          >
            {word}
          </span>
        )
      })}
    </AbsoluteFill>
  )
}
