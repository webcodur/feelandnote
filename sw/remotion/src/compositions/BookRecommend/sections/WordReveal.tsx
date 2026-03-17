import { interpolate, useCurrentFrame } from 'remotion'

type Props = {
  text: string
  /** 텍스트 등장 시작 프레임 (부모 기준) */
  startFrame: number
  /** 전체 단어가 다 나올 때까지의 프레임 */
  spreadFrames: number
  color: string
  fontSize: number
  style?: React.CSSProperties
}

/**
 * 단어 단위 페이드인 — 한국어에 자연스러운 텍스트 등장 효과.
 * 각 단어가 순차적으로 opacity 0→1 + 약간의 translateY 로 등장한다.
 */
export const WordReveal: React.FC<Props> = ({
  text,
  startFrame,
  spreadFrames,
  color,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame()
  const words = text.split(' ')
  const delayPerWord = spreadFrames / words.length

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `0 ${fontSize * 0.3}px`,
        lineHeight: 1.7,
        ...style,
      }}
    >
      {words.map((word, i) => {
        const wordStart = startFrame + i * delayPerWord
        const local = frame - wordStart
        const opacity = interpolate(local, [0, 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        const y = interpolate(local, [0, 8], [8, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })

        return (
          <span
            key={i}
            style={{
              color,
              fontSize,
              fontFamily: 'system-ui',
              opacity,
              transform: `translateY(${y}px)`,
              display: 'inline-block',
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}
