import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'

type BarItem = {
  key: string
  label: [string, string]  // [negative, positive]
  score: number            // -50 ~ +50
}

type Props = {
  items: BarItem[]
  startFrame: number
  width?: number
}

/** 양방향 바 차트 — 성향 시각화 */
export const DispositionBars: React.FC<Props> = ({
  items,
  startFrame,
  width = 700,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame

  const BAR_DELAY = 25
  const barHeight = 32
  const gap = 56
  const labelWidth = 60

  const opacity = interpolate(local, [0, 15], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <div style={{ width, opacity }}>
      {items.map((item, i) => {
        const progress = spring({
          frame: Math.max(0, local - i * BAR_DELAY),
          fps,
          config: { damping: 16, stiffness: 80 },
        })

        // score를 0~1 범위로 정규화 (0 = -50, 0.5 = 0, 1 = +50)
        const normalized = ((item.score + 50) / 100) * progress
        const barWidth = width - labelWidth * 2 - 40
        const fillWidth = normalized * barWidth
        const centerX = barWidth / 2

        return (
          <div key={item.key} style={{ marginBottom: gap - barHeight, position: 'relative' }}>
            {/* 라벨 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontFamily: FONT.sans,
              fontSize: 16,
              color: '#888',
            }}>
              <span style={{ width: labelWidth }}>{item.label[0]}</span>
              <span style={{ width: labelWidth, textAlign: 'right' }}>{item.label[1]}</span>
            </div>

            {/* 바 트랙 */}
            <div style={{
              position: 'relative',
              height: barHeight,
              backgroundColor: 'rgba(200, 164, 110, 0.08)',
              borderRadius: 4,
              marginLeft: labelWidth + 20,
              marginRight: labelWidth + 20,
              overflow: 'hidden',
            }}>
              {/* 중앙선 */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: 'rgba(200, 164, 110, 0.3)',
              }} />

              {/* 채움 바 */}
              <div style={{
                position: 'absolute',
                top: 2,
                bottom: 2,
                left: Math.min(centerX, fillWidth),
                width: Math.abs(fillWidth - centerX),
                backgroundColor: '#c8a46e',
                borderRadius: 2,
                opacity: 0.7,
              }} />
            </div>

            {/* 점수 */}
            <div style={{
              position: 'absolute',
              right: 0,
              top: 28,
              width: labelWidth,
              textAlign: 'right',
              fontFamily: FONT.sans,
              fontSize: 20,
              fontWeight: 700,
              color: '#c8a46e',
              opacity: progress,
            }}>
              {item.score > 0 ? '+' : ''}{Math.round(item.score * progress)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
