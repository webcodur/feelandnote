import { interpolate, useCurrentFrame } from 'remotion'
import { FPS } from '../timing'
import { splitSentences } from '../utils'

type Segment = { start: number; end: number; text?: string }

type Props = {
  text: string
  startFrame: number
  spreadFrames: number
  color: string
  fontSize: number
  style?: React.CSSProperties
  highlightColor?: string
  timings?: Segment[]
}

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

export const Typewriter: React.FC<Props> = ({
  text,
  startFrame,
  spreadFrames,
  color,
  fontSize,
  style,
  highlightColor = '#fff',
  timings,
}) => {
  const frame = useCurrentFrame()
  const elapsed = frame - startFrame

  const sentences = splitSentences(text, timings)

  const hasTimings = timings && timings.length === sentences.length
    && timings.every(t => t.start != null && t.end != null)

  if (!hasTimings) {
    console.warn(`[Typewriter] timings 불일치: sentences=${sentences.length}, timings=${timings?.length ?? 0}, text="${text.slice(0, 40)}..."`)
  }

  const ranges = hasTimings
    ? timings.map(t => ({
        start: Math.round(t.start * FPS),
        end: Math.round(t.end * FPS),
      }))
    : sentences.map((_, i) => {
        const dur = spreadFrames / sentences.length
        return { start: Math.round(i * dur), end: Math.round((i + 1) * dur) }
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
        const r = ranges[Math.min(i, ranges.length - 1)]
        const s0 = r.start
        const s2 = Math.max(r.end, s0 + 2)
        const chars = sentence.split('')
        const sweepDur = (s2 - s0) * 0.6

        const FADE_OUT = Math.round(FPS * 0.3) // 읽는→읽은 페이드아웃 (0.3초)

        return (
          <span key={i}>
            {chars.map((char, ci) => {
              const delay = chars.length > 1
                ? (ci / (chars.length - 1)) * sweepDur
                : 0
              const riseStart = s0 + delay

              // 글자별 스윕 진행도 (0→1)
              const t0 = riseStart
              const t1 = Math.max(t0 + 2, t0 + 0.01)
              const sweepProgress = interpolate(elapsed, [t0, t1], [0, 1], CL)

              // 읽는→읽은 페이드아웃 진행도 (0→1)
              const fadeProgress = interpolate(elapsed, [s2, s2 + FADE_OUT], [0, 1], CL)

              let charOpacity: number
              let colorMix: number // 0 = 기본색, 1 = 하이라이트색

              if (elapsed < s0) {
                // 읽을 단어
                charOpacity = 0.25
                colorMix = 0
              } else if (elapsed >= s2 + FADE_OUT) {
                // 읽은 단어 (페이드아웃 완료)
                charOpacity = 0.9
                colorMix = 0.3
              } else if (elapsed >= s2) {
                // 페이드아웃 중 (읽는→읽은)
                charOpacity = interpolate(fadeProgress, [0, 1], [1, 0.9], CL)
                colorMix = 1 - fadeProgress
              } else {
                // 읽는 단어 — 부드러운 색 전환
                charOpacity = interpolate(sweepProgress, [0, 1], [0.25, 1], CL)
                colorMix = sweepProgress
              }

              return (
                <span
                  key={ci}
                  style={{
                    opacity: charOpacity,
                    color: `color-mix(in srgb, ${highlightColor} ${Math.round(colorMix * 100)}%, ${color})`,
                    transition: 'none',
                  }}
                >
                  {char}
                </span>
              )
            })}
            {i < sentences.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </div>
  )
}
