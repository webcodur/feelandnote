import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { DialogueLine } from './types'

type Props = {
  line: DialogueLine
  startFrame: number
  durationFrames: number
  speakerName: string
}

export const Subtitle: React.FC<Props> = ({ line, startFrame, durationFrames, speakerName }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - startFrame

  if (localFrame < 0 || localFrame > durationFrames) return null

  const fadeIn = interpolate(localFrame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(localFrame, [durationFrames - 12, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const opacity = Math.min(fadeIn, fadeOut)

  const y = interpolate(localFrame, [0, 15], [20, 0], { extrapolateRight: 'clamp' })

  const nameScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 200 },
  })

  const align = line.speaker === 'left' ? 'flex-start' : 'flex-end'
  const accentColor = line.speaker === 'left' ? '#c8a46e' : '#6ea4c8'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 120,
        left: 120,
        right: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {line.direction && (
        <div
          style={{
            color: '#666',
            fontSize: 16,
            fontFamily: 'system-ui',
            fontStyle: 'italic',
            marginBottom: 8,
          }}
        >
          {line.direction}
        </div>
      )}
      <div
        style={{
          color: accentColor,
          fontSize: 18,
          fontWeight: 600,
          fontFamily: 'system-ui',
          marginBottom: 12,
          transform: `scale(${nameScale})`,
        }}
      >
        {speakerName}
      </div>
      <div
        style={{
          color: '#e8e0d0',
          fontSize: 36,
          fontWeight: 500,
          fontFamily: 'system-ui',
          lineHeight: 1.6,
          maxWidth: 1200,
          textAlign: line.speaker === 'left' ? 'left' : 'right',
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}
      >
        {line.text}
      </div>
    </div>
  )
}
