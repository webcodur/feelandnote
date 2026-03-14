import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'

/** CULTURAL JOURNEY 장면: 편지지가 펼쳐지며 실제 텍스트가 나타남 */
export const LetterScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 편지지 등장
  const paperScale = spring({ frame, fps, config: { damping: 14, stiffness: 100 } })
  const paperOpacity = interpolate(frame, [0, 20, 120, 140], [0, 0.8, 0.8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // 텍스트 라인 순차 등장 (실제 편지 내용)
  const lines = [
    { text: 'Ἁρπάλῳ', delay: 15 },
    { text: '', delay: 22 },
    { text: '그대에게 부탁이 있소.', delay: 28 },
    { text: '에우리피데스와 소포클레스의', delay: 38 },
    { text: '비극 전집을 보내주시오.', delay: 48 },
    { text: '전장에서도 읽을 것이 필요하오.', delay: 58 },
  ]

  // 밀랍 인장
  const sealOpacity = interpolate(frame, [70, 85], [0, 0.6], { extrapolateRight: 'clamp' })
  const sealScale = spring({ frame: Math.max(0, frame - 70), fps, config: { damping: 10, stiffness: 150 } })

  return (
    <div
      style={{
        position: 'absolute',
        top: '12%',
        right: '8%',
        transform: `scale(${paperScale}) rotate(-2deg)`,
        opacity: paperOpacity,
      }}
    >
      {/* 편지지 */}
      <div
        style={{
          width: 320,
          height: 380,
          background: 'linear-gradient(135deg, rgba(35,30,22,0.9), rgba(25,22,18,0.95))',
          border: '1px solid rgba(200,164,110,0.15)',
          borderRadius: 4,
          padding: '32px 28px',
          position: 'relative',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,164,110,0.05)',
        }}
      >
        {/* 편지지 상단 장식선 */}
        <div
          style={{
            width: '60%',
            height: 1,
            background: 'linear-gradient(90deg, rgba(200,164,110,0.2), transparent)',
            marginBottom: 24,
          }}
        />

        {/* 글줄 */}
        {lines.map((line, i) => {
          const lineOpacity = interpolate(frame, [line.delay, line.delay + 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const lineX = interpolate(frame, [line.delay, line.delay + 14], [8, 0], {
            extrapolateRight: 'clamp',
          })

          if (!line.text) {
            return <div key={i} style={{ height: 12 }} />
          }

          return (
            <div
              key={i}
              style={{
                color: i === 0 ? 'rgba(200,164,110,0.5)' : 'rgba(200,180,150,0.45)',
                fontSize: i === 0 ? 14 : 15,
                fontFamily: i === 0 ? "'Cormorant Garamond', serif" : "'MaruBuri', serif",
                fontStyle: i === 0 ? 'italic' : 'normal',
                lineHeight: 1.8,
                letterSpacing: i === 0 ? 2 : 0.5,
                marginBottom: 4,
                opacity: lineOpacity,
                transform: `translateX(${lineX}px)`,
              }}
            >
              {line.text}
            </div>
          )
        })}

        {/* 밀랍 인장 */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            right: 28,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,80,60,0.7), rgba(120,40,30,0.5))',
            border: '1px solid rgba(200,100,70,0.3)',
            opacity: sealOpacity,
            transform: `scale(${sealScale})`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 인장 문양 */}
          <div
            style={{
              color: 'rgba(255,220,180,0.3)',
              fontSize: 14,
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
            }}
          >
            A
          </div>
        </div>
      </div>
    </div>
  )
}
