import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

type Props = {
  nickname: string
  bookCount: number
  startFrame: number
  durationFrames: number
}

/** 2단계: "OOO가 추천하는 5권의 책" 타이틀 카드 */
export const TitleCard: React.FC<Props> = ({ nickname, bookCount, startFrame, durationFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame

  if (local < 0 || local >= durationFrames) return null

  const scale = spring({ frame: Math.max(0, local), fps, config: { damping: 14, stiffness: 180 } })
  const opacity = interpolate(local, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(local, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: opacity * fadeOut,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          color: '#c8a46e',
          fontSize: 28,
          fontFamily: 'system-ui',
          letterSpacing: 6,
          marginBottom: 20,
        }}
      >
        BOOK RECOMMEND
      </div>
      <div
        style={{
          color: '#e8e0d0',
          fontSize: 64,
          fontWeight: 700,
          fontFamily: 'system-ui',
          textAlign: 'center',
        }}
      >
        {nickname}가 추천하는
      </div>
      <div
        style={{
          color: '#c8a46e',
          fontSize: 72,
          fontWeight: 800,
          fontFamily: 'system-ui',
          marginTop: 8,
        }}
      >
        {bookCount}권의 책
      </div>
    </div>
  )
}
