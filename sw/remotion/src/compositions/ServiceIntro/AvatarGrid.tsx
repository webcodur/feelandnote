import { Img, interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion'
import { celebAvatars } from './data'

export const AvatarGrid: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const cols = 8
  const rows = 2
  const size = 80
  const gap = 16

  // 첫 번째 줄: 실제 아바타, 두 번째 줄: 나머지
  const allAvatars = celebAvatars

  // 줌아웃
  const scale = interpolate(frame, [0, durationFrames * 0.5], [1.5, 1], {
    extrapolateRight: 'clamp',
  })

  // 페이드아웃
  const fadeOut = interpolate(frame, [durationFrames - 25, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: '18%',
        left: '50%',
        transform: `translateX(-50%) scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        gap: gap + 8,
        opacity: fadeOut,
      }}
    >
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} style={{ display: 'flex', gap, justifyContent: 'center' }}>
          {Array.from({ length: cols }).map((_, col) => {
            const i = row * cols + col
            const avatar = allAvatars[i % allAvatars.length]

            // 물결 딜레이
            const delay = (Math.abs(col - cols / 2) + row * 2) * 5
            const appear = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: { damping: 15, stiffness: 90 },
            })

            // 글로우 펄스
            const pulse = Math.sin((frame + i * 13) * 0.04) * 0.3 + 0.7

            // 이름 표시 (등장 후 잠깐)
            const nameOpacity = interpolate(frame, [delay + 20, delay + 35], [0, 0.8], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })

            return (
              <div
                key={col}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  opacity: appear,
                  transform: `scale(${appear})`,
                }}
              >
                {/* 아바타 */}
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `1.5px solid rgba(200, 164, 110, ${appear * 0.3})`,
                    boxShadow: `0 0 ${14 * appear * pulse}px rgba(200, 164, 110, ${appear * pulse * 0.2})`,
                  }}
                >
                  <Img
                    src={avatar.url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* 이름 */}
                <div
                  style={{
                    color: '#999',
                    fontSize: 10,
                    fontFamily: 'system-ui',
                    textAlign: 'center',
                    opacity: nameOpacity,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {avatar.name}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
