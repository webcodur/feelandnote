import { Img, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { alexander } from '../data'

/** HOOK 장면: 알렉산더 아바타 + 단검·두루마리 아이콘 */
export const SwordAndScroll: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 아바타 등장
  const avatarScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } })
  const avatarOpacity = interpolate(frame, [0, 25, 150, 175], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // 글로우 호흡
  const glowPulse = Math.sin(frame * 0.04) * 0.15 + 0.35

  // 이름 표시
  const nameOpacity = interpolate(frame, [30, 45, 150, 175], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // 좌우 장식 아이콘
  const iconLeftX = interpolate(frame, [15, 50], [-40, 0], { extrapolateRight: 'clamp' })
  const iconRightX = interpolate(frame, [20, 55], [40, 0], { extrapolateRight: 'clamp' })
  const iconOpacity = interpolate(frame, [15, 45, 150, 175], [0, 0.5, 0.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* 아바타 프레임 */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2.5px solid rgba(200, 164, 110, 0.4)',
          boxShadow: `0 0 50px rgba(200, 164, 110, ${glowPulse}), 0 0 100px rgba(200, 164, 110, ${glowPulse * 0.3})`,
          opacity: avatarOpacity,
          transform: `scale(${avatarScale})`,
        }}
      >
        <Img
          src={alexander.avatar}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* 이름 */}
      <div style={{ textAlign: 'center', opacity: nameOpacity }}>
        <div style={{ color: '#c8a46e', fontSize: 20, fontWeight: 600, fontFamily: 'system-ui', letterSpacing: 3 }}>
          {alexander.nickname}
        </div>
        <div style={{ color: '#666', fontSize: 13, fontFamily: 'system-ui', marginTop: 4, letterSpacing: 1 }}>
          {alexander.nickname_en}
        </div>
      </div>

      {/* 좌우 장식 — 단검 / 두루마리 아이콘 */}
      <div style={{ position: 'absolute', top: 80, left: -120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: iconOpacity, transform: `translateX(${iconLeftX}px)` }}>
        <svg width="60" height="14" viewBox="0 0 60 14">
          <polygon points="0,7 48,2 48,12" fill="rgba(200,180,140,0.3)" />
          <rect x="48" y="1" width="3" height="12" rx="0.5" fill="rgba(200,164,110,0.4)" />
          <rect x="52" y="3" width="8" height="8" rx="1" fill="rgba(140,120,90,0.3)" />
        </svg>
        <div style={{ color: '#555', fontSize: 9, fontFamily: 'system-ui', letterSpacing: 2 }}>DAGGER</div>
      </div>

      <div style={{ position: 'absolute', top: 80, right: -120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: iconOpacity, transform: `translateX(${iconRightX}px)` }}>
        <svg width="60" height="24" viewBox="0 0 60 24">
          <rect x="10" y="3" width="40" height="18" rx="1" fill="rgba(42,36,24,0.6)" stroke="rgba(200,164,110,0.2)" strokeWidth="0.5" />
          <ellipse cx="10" cy="12" rx="5" ry="10" fill="rgba(30,26,18,0.7)" stroke="rgba(200,164,110,0.15)" strokeWidth="0.5" />
          <ellipse cx="50" cy="12" rx="5" ry="10" fill="rgba(30,26,18,0.7)" stroke="rgba(200,164,110,0.15)" strokeWidth="0.5" />
          <line x1="18" y1="9" x2="42" y2="9" stroke="rgba(200,164,110,0.15)" strokeWidth="0.5" />
          <line x1="18" y1="12" x2="40" y2="12" stroke="rgba(200,164,110,0.15)" strokeWidth="0.5" />
          <line x1="18" y1="15" x2="38" y2="15" stroke="rgba(200,164,110,0.15)" strokeWidth="0.5" />
        </svg>
        <div style={{ color: '#555', fontSize: 9, fontFamily: 'system-ui', letterSpacing: 2 }}>ILIAD</div>
      </div>
    </div>
  )
}
