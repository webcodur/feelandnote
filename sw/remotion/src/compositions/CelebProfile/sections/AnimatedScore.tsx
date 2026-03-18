/**
 * 점수 카운터 애니메이션 — 0에서 목표까지 롤업
 */
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'

type Props = {
  label: string
  score: number
  maxScore?: number
  startFrame: number
  fontSize?: number
}

export const AnimatedScore: React.FC<Props> = ({
  label, score, startFrame, maxScore = 100, fontSize = 52,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame

  const progress = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 20, stiffness: 60 },
  })

  const displayScore = Math.round(score * progress)
  const opacity = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const labelY = interpolate(local, [0, 15], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{ opacity, display: 'flex', alignItems: 'baseline', gap: 16 }}>
      <span style={{
        fontSize: 20, color: '#888', fontFamily: FONT.sans, fontWeight: 500,
        letterSpacing: 2, transform: `translateY(${labelY}px)`,
      }}>
        {label}
      </span>
      <span style={{
        fontSize, fontWeight: 700, color: '#c8a46e', fontFamily: FONT.sans,
      }}>
        {score >= 0 && maxScore <= 50 ? (displayScore > 0 ? '+' : '') : ''}{displayScore}
      </span>
      {maxScore <= 10 && (
        <span style={{ fontSize: 20, color: '#555', fontFamily: FONT.sans }}>/ {maxScore}</span>
      )}
    </div>
  )
}
