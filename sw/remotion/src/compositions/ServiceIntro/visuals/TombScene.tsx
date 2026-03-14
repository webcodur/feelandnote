import { Img, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { alexander } from '../data'

/** QUOTE 장면: 알렉산더 아바타 + 트로이 배경 요소 */
export const TombScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 아바타 (좌측)
  const avatarOpacity = interpolate(frame, [5, 25, 135, 155], [0, 0.9, 0.9, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const avatarX = interpolate(frame, [5, 30], [-30, 0], { extrapolateRight: 'clamp' })

  // 기둥 (우측 배경)
  const pillarOpacity = interpolate(frame, [0, 30, 140, 160], [0, 0.3, 0.3, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // 무덤 돌
  const tombScale = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 14, stiffness: 80 } })

  // 바람 선
  const windOffset = (frame * 1.5) % 500

  return (
    <>
      {/* 알렉산더 아바타 (좌측 상단) */}
      <div
        style={{
          position: 'absolute',
          top: '12%',
          left: '10%',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          opacity: avatarOpacity,
          transform: `translateX(${avatarX}px)`,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid rgba(200, 164, 110, 0.3)',
            boxShadow: '0 0 30px rgba(200, 164, 110, 0.2)',
          }}
        >
          <Img src={alexander.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <div style={{ color: '#c8a46e', fontSize: 16, fontWeight: 600, fontFamily: "'MaruBuri', serif", letterSpacing: 2 }}>
            {alexander.nickname}
          </div>
          <div style={{ color: '#555', fontSize: 11, fontFamily: "'Cormorant Garamond', serif", marginTop: 3 }}>
            356 – 323 BC
          </div>
        </div>
      </div>

      {/* 우측: 트로이 기둥 실루엣 */}
      <div style={{ position: 'absolute', right: '8%', bottom: '15%', opacity: pillarOpacity }}>
        {/* 기둥 3개 */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              right: i * 50,
              width: 14,
              height: 120 - i * 15,
              background: `linear-gradient(180deg, rgba(200,164,110,${0.08 + i * 0.03}), rgba(200,164,110,0.15))`,
              borderRadius: '3px 3px 0 0',
            }}
          />
        ))}
        {/* 기둥 상단 연결 */}
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            right: 0,
            width: 114,
            height: 6,
            background: 'rgba(200,164,110,0.08)',
            borderRadius: 2,
          }}
        />
      </div>

      {/* 무덤 돌 (중앙 하단) */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '50%',
          transform: `translateX(-50%) scale(${tombScale})`,
          opacity: pillarOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            width: 70,
            height: 45,
            background: 'linear-gradient(180deg, rgba(200,164,110,0.06), rgba(200,164,110,0.12))',
            border: '1px solid rgba(200,164,110,0.08)',
            borderRadius: '4px 4px 0 0',
          }}
        />
        <div style={{ color: '#444', fontSize: 9, fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
          ACHILLES
        </div>
      </div>

      {/* 바람 선 */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${25 + i * 8}%`,
            left: `${((windOffset + i * 120) % 120) - 10}%`,
            width: 80 + i * 15,
            height: 0.5,
            background: `linear-gradient(90deg, transparent, rgba(200,164,110,${0.04 + i * 0.01}), transparent)`,
          }}
        />
      ))}
    </>
  )
}
