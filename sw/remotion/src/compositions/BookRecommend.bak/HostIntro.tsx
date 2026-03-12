import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { CelebHost } from './types'
import { KoreanTypewriter } from './KoreanTypewriter'

type Props = {
  host: CelebHost
  durationFrames: number
}

export const HostIntro: React.FC<Props> = ({ host, durationFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (frame >= durationFrames) return null

  // --- 아바타 등장 ---
  const avatarScale = spring({ frame, fps, config: { damping: 12, stiffness: 150 } })
  const avatarOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })

  // --- 이름 + 직함 ---
  const nameOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' })
  const nameY = interpolate(frame, [10, 25], [30, 0], { extrapolateRight: 'clamp' })

  // --- BIO 텍스트 ---
  const bioOpacity = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: 'clamp' })

  // --- 구분선 ---
  const lineWidth = interpolate(frame, [35, 55], [0, 600], { extrapolateRight: 'clamp' })

  // --- 감상철학 라벨 ---
  const philoLabelOpacity = interpolate(frame, [50, 60], [0, 1], { extrapolateRight: 'clamp' })

  // --- 페이드아웃 ---
  const fadeOut = interpolate(frame, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut,
      }}
    >
      {/* 좌측: 아바타 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginRight: 80,
          opacity: avatarOpacity,
          transform: `scale(${avatarScale})`,
        }}
      >
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #c8a46e',
            boxShadow: '0 0 60px rgba(200,164,110,0.25)',
          }}
        >
          <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      {/* 우측: 텍스트 영역 */}
      <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* 이름 + 직함 */}
        <div
          style={{
            opacity: nameOpacity,
            transform: `translateY(${nameY}px)`,
          }}
        >
          <div
            style={{
              color: '#c8a46e',
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'system-ui',
              letterSpacing: 4,
              marginBottom: 8,
            }}
          >
            {host.title}
          </div>
          <div style={{ color: '#e8e0d0', fontSize: 56, fontWeight: 700, fontFamily: 'system-ui' }}>
            {host.nickname}
          </div>
          <div style={{ color: '#777', fontSize: 20, fontFamily: 'system-ui', marginTop: 4 }}>
            {host.nickname_en}
          </div>
        </div>

        {/* BIO */}
        <div
          style={{
            opacity: bioOpacity,
            marginTop: 20,
            color: '#aaa',
            fontSize: 24,
            fontFamily: 'system-ui',
            lineHeight: 1.6,
          }}
        >
          {host.bio}
        </div>

        {/* 구분선 */}
        <div
          style={{
            width: lineWidth,
            height: 1,
            backgroundColor: '#c8a46e',
            opacity: 0.4,
            marginTop: 28,
            marginBottom: 28,
          }}
        />

        {/* 감상철학 라벨 */}
        <div
          style={{
            opacity: philoLabelOpacity,
            color: '#c8a46e',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'system-ui',
            letterSpacing: 4,
            marginBottom: 12,
          }}
        >
          VIEWING PHILOSOPHY
        </div>

        {/* 감상철학 타이핑 */}
        <div style={{ borderLeft: '3px solid rgba(200,164,110,0.4)', paddingLeft: 24 }}>
          <KoreanTypewriter
            text={host.philosophy}
            startFrame={55}
            spreadFrames={durationFrames - 90}
            color="#e8e0d0"
            fontSize={26}
            style={{ fontStyle: 'italic', lineHeight: 1.8 }}
          />
        </div>
      </div>
    </div>
  )
}
