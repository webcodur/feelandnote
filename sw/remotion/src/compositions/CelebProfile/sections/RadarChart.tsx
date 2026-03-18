import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'

type Axis = { key: string; label: string; score: number }

type Props = {
  axes: Axis[]
  startFrame: number
  maxScore?: number
  size?: number
  fillColor?: string
  /** 현재 활성 항목 인덱스 (-1이면 전체 표시) */
  activeIndex?: number
  /** 제목 (차트 상단) */
  title?: string
}

/** N축 레이더 차트 — 순차 애니메이션 + 하이라이트/딤 */
export const RadarChart: React.FC<Props> = ({
  axes,
  startFrame,
  maxScore = 100,
  size = 400,
  fillColor = 'rgba(200, 164, 110, 0.3)',
  activeIndex = -1,
  title,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36

  const n = axes.length
  const angleStep = (Math.PI * 2) / n
  const startAngle = -Math.PI / 2

  const getPoint = (i: number, value: number) => {
    const angle = startAngle + i * angleStep
    const dist = (value / maxScore) * r
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist }
  }

  const gridLevels = maxScore <= 10 ? [2, 4, 6, 8, 10] : [20, 40, 60, 80, 100]
  const AXIS_DELAY = 15

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
    <div style={{ position: 'relative', width: size, height: size + (title ? 36 : 0), opacity }}>
      {/* 제목 */}
      {title && (
        <div style={{
          textAlign: 'center', marginBottom: 8,
          fontSize: 16, color: '#888', fontFamily: FONT.sans,
          letterSpacing: 3,
        }}>
          {title}
        </div>
      )}

      <svg width={size} height={size}>
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
          fill={fillColor}
          stroke="#c8a46e"
          strokeWidth={2}
        />

        {/* 데이터 포인트 */}
        {points.map((p, i) => {
          const isActive = activeIndex === -1 || activeIndex === i
          const isPast = activeIndex > i
          return (
            <circle
              key={i}
              cx={p.x} cy={p.y}
              r={isActive ? 5 : 3}
              fill={isActive ? '#c8a46e' : isPast ? '#665a3e' : '#c8a46e'}
              opacity={isActive ? 1 : isPast ? 0.4 : 0.6}
            />
          )
        })}

        {/* 라벨 + 점수 */}
        {axes.map((axis, i) => {
          const labelP = getPoint(i, maxScore + 16)
          const isActive = activeIndex === -1 || activeIndex === i
          const isPast = activeIndex > i
          const labelOpacity = interpolate(
            local,
            [i * AXIS_DELAY, i * AXIS_DELAY + 15],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
          const color = isActive ? '#e8e0d0' : isPast ? '#555' : '#888'
          const scoreColor = isActive ? '#c8a46e' : isPast ? '#554a30' : '#c8a46e'
          return (
            <g key={i} opacity={labelOpacity}>
              <text
                x={labelP.x}
                y={labelP.y - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={14}
                fontFamily={FONT.sans}
              >
                {axis.label}
              </text>
              <text
                x={labelP.x}
                y={labelP.y + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={scoreColor}
                fontSize={18}
                fontWeight={700}
                fontFamily={FONT.sans}
              >
                {axis.score}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
