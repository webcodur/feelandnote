import { interpolate, useCurrentFrame } from 'remotion'
import { f, FPS } from './timing'

type Segment = { start: number; end: number }

type Props = {
  text: string
  startFrame: number
  spreadFrames: number
  color: string
  fontSize: number
  style?: React.CSSProperties
  /** 파형 분석 기반 타이밍 (voiceTimings에서 전달) */
  timings?: Segment[]
}

const FADE = f(0.27)
const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

export const KoreanTypewriter: React.FC<Props> = ({
  text,
  startFrame,
  spreadFrames,
  color,
  fontSize,
  style,
  timings,
}) => {
  const frame = useCurrentFrame()
  const elapsed = frame - startFrame

  const sentences = text.split(/(?<=[.?!,])\s+/).filter(Boolean)

  // timings가 있고 문장 수와 일치하면 파형 타이밍 사용
  const hasTimings = timings && timings.length === sentences.length

  const ranges = hasTimings
    ? timings!.map(t => ({
        start: Math.round(t.start * FPS),
        end: Math.round(t.end * FPS),
      }))
    : buildFromChars(sentences, spreadFrames)

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
        const r = ranges[Math.min(i, ranges.length - 1)]
        // 단조 증가 보장: duration 짧을 때 r.end가 r.start+1 이하가 될 수 있음
        const s0 = r.start
        const s1 = s0 + 1
        const s2 = Math.max(r.end, s1 + 1)
        const s3 = s2 + FADE
        const opacity = interpolate(elapsed, [s0, s1, s2, s3], [0.35, 1, 1, 0.55], CL)
        const highlight = interpolate(elapsed, [s0, s1, s2, s3], [0, 1, 1, 0], CL)

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

/** 글자 수 비례 폴백 */
function buildFromChars(sentences: string[], spreadFrames: number): { start: number; end: number }[] {
  const BREATH = f(0.27)
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
  const breathTotal = (sentences.length - 1) * BREATH
  const distributable = Math.max(spreadFrames - breathTotal, spreadFrames * 0.7)

  let cursor = 0
  return sentences.map((s, i) => {
    if (i > 0) cursor += BREATH
    const frames = Math.max(1, Math.round((s.length / totalChars) * distributable))
    const start = cursor
    cursor += frames
    return { start, end: start + frames }
  })
}
