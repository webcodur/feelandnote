import { interpolate, useCurrentFrame } from 'remotion'

type Props = {
  text: string
  startFrame: number
  spreadFrames: number
  color: string
  fontSize: number
  style?: React.CSSProperties
}

/** 문장 간 호흡 프레임 — TTS가 문장 사이에 쉬는 시간 보정 (Subtitles.tsx와 동일) */
const SENTENCE_BREATH = 8

export const KoreanTypewriter: React.FC<Props> = ({
  text,
  startFrame,
  spreadFrames,
  color,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame()
  const elapsed = frame - startFrame

  // 문장 분할 + 호흡 간격 포함 프레임 배분
  const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean)
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
  const breathTotal = (sentences.length - 1) * SENTENCE_BREATH
  const distributableFrames = Math.max(spreadFrames - breathTotal, spreadFrames * 0.7)

  let cursor = 0
  const ranges = sentences.map((s, i) => {
    if (i > 0) cursor += SENTENCE_BREATH
    const frames = Math.round((s.length / totalChars) * distributableFrames)
    const start = cursor
    cursor += frames
    return { start, end: start + frames }
  })

  const currentIndex = ranges.findIndex((r) => elapsed >= r.start && elapsed < r.end)
  const activeIndex = currentIndex >= 0 ? currentIndex : elapsed >= spreadFrames ? sentences.length : -1

  return (
    <div
      style={{
        fontSize,
        fontFamily: 'inherit',
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        ...style,
      }}
    >
      {sentences.map((sentence, i) => {
        const isPast = i < activeIndex
        const isCurrent = i === activeIndex

        return (
          <span key={i}>
            <span
              style={{
                color: isCurrent ? '#fff' : color,
                opacity: isCurrent ? 1 : isPast ? 0.6 : 0.25,
              }}
            >
              {sentence}
            </span>
            {i < sentences.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </div>
  )
}
