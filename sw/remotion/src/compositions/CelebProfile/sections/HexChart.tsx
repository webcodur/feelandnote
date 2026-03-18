import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'

type Axis = { key: string; label: string; score: number }

type Props = {
  axes: Axis[]
  startFrame: number
  maxScore?: number
  size?: number
}

/** 6축 헥사곤 차트 — 영향력 시각화 */
export const HexChart: React.FC<Props> = ({
  axes,
  startFrame,
  maxScore = 10,
  size = 380,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38

  const n = axes.length
  const angleStep = (Math.PI * 2) / n
  const startAngle = -Math.PI / 2

  const getPoint = (i: number, value: number) => {
    const angle = startAngle + i * angleStep
    const dist = (value / maxScore) * r
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist }
  }

  const gridLevels = [2, 4, 6, 8, 10]
  const AXIS_DELAY = 18

  const points = axes.map((axis, i) => {
    const progress = spring({
      frame: Math.max(0, local - i * AXIS_DELAY),
      fps,
      config: { damping: 18, stiffness: 80 },
    })
    return getPoint(i, axis.score * progress)
  })

  const polygon = points.map(p => `${p.x},${p.y}`).join(' ')
  const opacity = interpolate(local, [0, 15], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <svg width={size} height={size} style={{ opacity }}>
      {/* 그리드 */}
      {gridLevels.map(level => {
        const gridPoints = Array.from({ length: n }, (_, i) => {
          const p = getPoint(i, level)
          return `${p.x},${p.y}`
        }).join(' ')
        return (
          <polygon
            key={level}
            points={gridPoints}
            fill="none"
            stroke="rgba(200, 164, 110, 0.1)"
            strokeWidth={1}
          />
        )
      })}

      {/* 축 라인 */}
      {axes.map((_, i) => {
        const p = getPoint(i, maxScore)
        return (
          <line
            key={i}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="rgba(200, 164, 110, 0.12)"
            strokeWidth={1}
          />
        )
      })}

      {/* 데이터 폴리곤 */}
      <polygon
        points={polygon}
        fill="rgba(200, 164, 110, 0.25)"
        stroke="#c8a46e"
        strokeWidth={2}
      />

      {/* 포인트 */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#c8a46e" />
      ))}

      {/* 라벨 + 점수 */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, maxScore + 2.5)
        const labelOpacity = interpolate(
          local,
          [i * AXIS_DELAY, i * AXIS_DELAY + 15],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
        return (
          <text
            key={i}
            x={labelP.x}
            y={labelP.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e8e0d0"
            fontSize={18}
            fontFamily={FONT.sans}
            opacity={labelOpacity}
          >
            {axis.label} {axis.score}
          </text>
        )
      })}
    </svg>
  )
}
