import { interpolate, useCurrentFrame } from 'remotion'

type Props = {
  text: string
  startFrame: number
  spreadFrames: number
  color: string
  fontSize: number
  style?: React.CSSProperties
}

/** 문장 간 호흡 프레임 */
const SENTENCE_BREATH = 8
/** 상태 전환 보간 프레임 */
const FADE = 8

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

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

  const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean)
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
  const breathTotal = (sentences.length - 1) * SENTENCE_BREATH
  const distributableFrames = Math.max(spreadFrames - breathTotal, spreadFrames * 0.7)

  let cursor = 0
  const ranges = sentences.map((s, i) => {
    if (i > 0) cursor += SENTENCE_BREATH
    const frames = Math.max(1, Math.round((s.length / totalChars) * distributableFrames))
    const start = cursor
    cursor += frames
    return { start, end: start + frames }
  })

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
        const r = ranges[i]
        // 단일 연속 커브: 미래(0.2) → 현재(1.0) → 과거(0.55)
        const opacity = interpolate(elapsed,
          [r.start - FADE, r.start, r.end, r.end + FADE],
          [0.2, 1, 1, 0.55], CL)
        // 하이라이트: 현재 구간에서만 1, 나머지 0 — 부드럽게 전환
        const highlight = interpolate(elapsed,
          [r.start - FADE, r.start, r.end, r.end + FADE],
          [0, 1, 1, 0], CL)

        return (
          <span key={i}>
            <span style={{ opacity, color: highlight > 0.5 ? '#fff' : color }}>
              {sentence}
            </span>
            {i < sentences.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </div>
  )
}
