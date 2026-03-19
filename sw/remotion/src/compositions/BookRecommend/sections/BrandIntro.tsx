import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../fonts'
import { BrandLogo } from '../utils'
import { f } from '../timing'

type Props = {
  durationFrames: number
  locale?: 'ko' | 'en'
}

/** Section 0: 브랜드 로고 + 차임 SFX */
export const BrandIntro: React.FC<Props> = ({ durationFrames, locale }) => {
  const taglineText = locale === 'en' ? 'A Single Line Recorded, A Thousand Years of Echoes' : '한 줄의 기록, 천 년의 울림'
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame: Math.max(0, frame - f(0.17)), fps, config: { damping: 14, stiffness: 120 } })
  const logoOpacity = interpolate(frame, [0, f(0.67)], [0, 1], { extrapolateRight: 'clamp' })

  const lineWidth = interpolate(frame, [f(0.5), f(1.33)], [0, 200], { extrapolateRight: 'clamp' })

  const tagOpacity = interpolate(frame, [f(0.83), f(1.33)], [0, 1], { extrapolateRight: 'clamp' })
  const tagY = interpolate(frame, [f(0.83), f(1.33)], [15, 0], { extrapolateRight: 'clamp' })

  const fadeOut = interpolate(frame, [durationFrames - f(0.5), durationFrames], [1, 0], {
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
        gap: 20,
        opacity: fadeOut,
      }}
    >
      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})` }}>
        <BrandLogo variant="full" />
      </div>
      <div style={{ width: lineWidth, height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
      <div
        style={{
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          color: '#888',
          fontSize: 20,
          fontFamily: FONT.serif,
          letterSpacing: 6,
        }}
      >
        {taglineText}
      </div>
    </div>
  )
}
