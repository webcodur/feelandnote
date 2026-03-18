import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'

type Props = {
  label: string
  score: number
  maxScore: number
  startFrame: number
  width?: number
}

/** 게이지 바 — 통시성/종합점수 표시용 */
export const ScoreGauge: React.FC<Props> = ({
  label,
  score,
  maxScore,
  startFrame,
  width = 500,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame

  const progress = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 20, stiffness: 60 },
  })

  const opacity = interpolate(local, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const fillRatio = (score / maxScore) * progress

  return (
    <div style={{ width, opacity }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 10,
        fontFamily: FONT.sans,
      }}>
        <span style={{ fontSize: 20, color: '#e8e0d0' }}>{label}</span>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#c8a46e' }}>
          {Math.round(score * progress)} / {maxScore}
        </span>
      </div>
      <div style={{
        height: 12,
        backgroundColor: 'rgba(200, 164, 110, 0.1)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${fillRatio * 100}%`,
          background: 'linear-gradient(90deg, #c8a46e, #d4a828)',
          borderRadius: 6,
        }} />
      </div>
    </div>
  )
}
