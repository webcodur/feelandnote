import { interpolate, useCurrentFrame } from 'remotion'
import { f, FPS } from '../timing'

type Segment = { start: number; end: number; text?: string }

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

  // timings에 text가 있으면 그걸 사용, 없으면 문장 분할
  const hasTextInTimings = timings && timings.length > 0 && timings.every(t => t.text)
  const sentences = hasTextInTimings
    ? timings!.map(t => t.text!)
    : text.split(/(?<=[.?!,。])\s+/).filter(Boolean)

  // timings가 있고 문장 수와 일치하면 하이라이트 활성화
  const hasTimings = timings && (hasTextInTimings || timings.length === sentences.length)

  // timings 없으면 빨간색으로 경고 표시 — /voice-sync 필요
  if (!hasTimings) {
    return (
      <div style={{ fontSize, fontFamily: 'inherit', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#ff3333', ...style }}>
        {text}
      </div>
    )
  }

  const ranges = timings!.map(t => ({
    start: Math.round(t.start * FPS),
    end: Math.round(t.end * FPS),
  }))

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
