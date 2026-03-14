import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { SceneData } from './types'

/** 한글 세리프 / 영문 클래식 폰트 매핑 */
const FONT_KR = "'MaruBuri', 'Pretendard Variable', serif"
const FONT_EN_CLASSIC = "'Cinzel', 'Cormorant Garamond', serif"
const FONT_EN_BODY = "'Cormorant Garamond', Georgia, serif"

export const SceneText: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const dur = scene.durationFrames

  const isScale = scene.id === 'scale'
  const isCta = scene.id === 'cta'
  const isQuote = scene.id === 'quote'
  const isBridge = scene.id === 'bridge'

  // 전체 페이드아웃
  const globalFadeOut = interpolate(frame, [dur - 20, dur], [1, 0], {
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
        padding: '0 160px',
        gap: isCta ? 20 : 12,
        opacity: globalFadeOut,
      }}
    >
      {/* 메인 텍스트 */}
      {scene.texts.map((text, i) => {
        const delay = i * 20
        const fadeIn = interpolate(frame, [delay, delay + 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        const y = interpolate(frame, [delay, delay + 25], [30, 0], {
          extrapolateRight: 'clamp',
        })
        const s = spring({
          frame: Math.max(0, frame - delay),
          fps,
          config: { damping: 15, stiffness: 140 },
        })

        const isNumber = isScale && i === 1

        return (
          <div
            key={i}
            style={{
              color: isCta
                ? '#c8a46e'
                : isNumber
                  ? '#c8a46e'
                  : isBridge
                    ? '#999'
                    : '#e8e0d0',
              fontSize: isCta ? 72 : isNumber ? 60 : isBridge ? 38 : 44,
              fontWeight: isCta ? 700 : isNumber ? 700 : isBridge ? 400 : 500,
              fontFamily: isCta ? FONT_EN_CLASSIC : FONT_KR,
              textAlign: 'center',
              lineHeight: 1.5,
              letterSpacing: isCta ? 10 : isNumber ? 6 : isBridge ? 2 : 1,
              opacity: fadeIn,
              transform: `translateY(${y}px) scale(${s})`,
              textShadow: isCta
                ? '0 0 80px rgba(200, 164, 110, 0.3), 0 4px 30px rgba(0,0,0,0.9)'
                : '0 4px 30px rgba(0,0,0,0.9)',
            }}
          >
            {text}
          </div>
        )
      })}

      {/* 보조 텍스트 (명언 / CTA 슬로건) */}
      {scene.subText && (
        <div
          style={{
            color: isQuote ? '#c8a46e' : isCta ? '#888' : '#999',
            fontSize: isQuote ? 32 : isCta ? 22 : 24,
            fontWeight: isQuote ? 500 : 400,
            fontFamily: isQuote ? FONT_EN_BODY : isCta ? FONT_KR : FONT_KR,
            fontStyle: isQuote ? 'italic' : 'normal',
            textAlign: 'center',
            letterSpacing: isCta ? 6 : isQuote ? 1 : 2,
            maxWidth: 1100,
            lineHeight: 1.6,
            marginTop: isQuote ? 20 : isCta ? 12 : 8,
            opacity: interpolate(frame, [35, 55], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `translateY(${interpolate(frame, [35, 55], [15, 0], { extrapolateRight: 'clamp' })}px)`,
            textShadow: isQuote
              ? '0 0 40px rgba(200, 164, 110, 0.15), 0 2px 20px rgba(0,0,0,0.8)'
              : '0 2px 20px rgba(0,0,0,0.8)',
          }}
        >
          {scene.subText}
        </div>
      )}

      {/* CTA URL */}
      {isCta && (
        <div
          style={{
            color: '#555',
            fontSize: 18,
            fontFamily: FONT_EN_CLASSIC,
            letterSpacing: 3,
            marginTop: 28,
            opacity: interpolate(frame, [50, 70], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          feelandnote.com
        </div>
      )}
    </div>
  )
}
