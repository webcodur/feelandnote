import { interpolate, useCurrentFrame } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'

type Props = {
  label: string
  score: number
  reason: string
  startFrame: number
  durationFrames: number
  /** 점수 최대값 (능력/덕목=100, 영향력=10) */
  maxScore?: number
}

/** 항목 하나의 점수 + 이유 텍스트 오버레이 */
export const StatReason: React.FC<Props> = ({
  label,
  score,
  reason,
  startFrame,
  durationFrames,
  maxScore = 100,
}) => {
  const frame = useCurrentFrame()
  const local = frame - startFrame

  const opacity = interpolate(
    local,
    [0, 15, durationFrames - 20, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  if (local < -10 || local > durationFrames + 10) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 160,
      left: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      opacity,
    }}>
      {/* 라벨 + 점수 */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        fontFamily: FONT.sans,
      }}>
        <span style={{ fontSize: 28, color: '#888', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 48, fontWeight: 700, color: '#c8a46e' }}>{score}</span>
        {maxScore <= 10 && (
          <span style={{ fontSize: 24, color: '#666' }}>/ {maxScore}</span>
        )}
      </div>

      {/* 이유 */}
      <div style={{
        fontSize: 26,
        color: '#e8e0d0',
        fontFamily: FONT.serif,
        textAlign: 'center',
        maxWidth: 1200,
        lineHeight: 1.6,
        padding: '0 80px',
      }}>
        {reason}
      </div>
    </div>
  )
}
