import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'

/** CULTURAL JOURNEY 장면: 편지지가 펼쳐지며 글줄이 나타남 */
export const LetterScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 편지지 등장
  const paperScale = spring({ frame, fps, config: { damping: 14, stiffness: 100 } })
  const paperOpacity = interpolate(frame, [0, 20, 120, 140], [0, 0.8, 0.8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // 텍스트 라인 순차 등장
  const lines = [
    { width: 180, delay: 15 },
    { width: 220, delay: 25 },
    { width: 160, delay: 35 },
    { width: 200, delay: 45 },
    { width: 140, delay: 55 },
    { width: 190, delay: 65 },
  ]

  // 밀랍 인장
  const sealOpacity = interpolate(frame, [70, 85], [0, 0.6], { extrapolateRight: 'clamp' })
  const sealScale = spring({ frame: Math.max(0, frame - 70), fps, config: { damping: 10, stiffness: 150 } })

  return (
    <div
      style={{
        position: 'absolute',
        top: '15%',
        right: '8%',
        transform: `scale(${paperScale}) rotate(-3deg)`,
        opacity: paperOpacity,
      }}
    >
      {/* 편지지 */}
      <div
        style={{
          width: 280,
          height: 340,
          background: 'linear-gradient(135deg, rgba(35,30,22,0.9), rgba(25,22,18,0.95))',
          border: '1px solid rgba(200,164,110,0.15)',
          borderRadius: 4,
          padding: '30px 25px',
          position: 'relative',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* 글줄 */}
        {lines.map((line, i) => {
          const lineOpacity = interpolate(frame, [line.delay, line.delay + 12], [0, 0.35], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const lineWidth = interpolate(frame, [line.delay, line.delay + 15], [0, line.width], {
            extrapolateRight: 'clamp',
          })

          return (
            <div
              key={i}
              style={{
                width: lineWidth,
                height: 2,
                background: 'rgba(200,164,110,0.25)',
                marginBottom: 16,
                borderRadius: 1,
                opacity: lineOpacity,
              }}
            />
          )
        })}

        {/* 밀랍 인장 */}
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,80,60,0.7), rgba(120,40,30,0.5))',
            border: '1px solid rgba(200,100,70,0.3)',
            opacity: sealOpacity,
            transform: `scale(${sealScale})`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </div>
  )
}
