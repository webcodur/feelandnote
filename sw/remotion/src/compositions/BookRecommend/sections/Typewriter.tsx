import { useMemo } from 'react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { FPS } from '../timing'
import { buildHighlightSegments } from '../utils'

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

  // 텍스트·타이밍이 불변이므로 한 번만 계산 — 매 프레임 문자열 분할 방지
  const { texts: sentences, ranges } = useMemo(
    () => buildHighlightSegments(text, timings, spreadFrames),
    [text, timings, spreadFrames],
  )

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
        const nextR = i + 1 < ranges.length ? ranges[i + 1] : null

        // 다음 단어의 시작 시점을 다음 연결점(n0)으로 설정
        // 간격이 0.5초 이상 벌어지면 기존 문장 끝부분(s2)부터 꺼지도록 하여 계속 불이 켜져있지 않게 보정
        const n0 = nextR
          ? (nextR.start - s2 > FPS * 0.5 ? s2 : nextR.start)
          : s2

        const BOOST = 4 // 하이라이트를 음성보다 살짝 앞당김
        const FADE_IN = 12 // 0.2초 — 부드러운 점등
        const FADE_OUT = 15 // 0.25초 — 부드러운 크로스페이드
        const suffix = i < sentences.length - 1 ? ' ' : ''

        // ── 상태 판별 ──
        const isFuture = elapsed < s0 - BOOST
        const isPast = elapsed >= n0 + FADE_OUT

        // 읽을 문장 — 매우 어둡게
        if (isFuture) {
          return (
            <span key={i} style={{ opacity: 0.15, color }}>{sentence}{suffix}</span>
          )
        }

        // 읽은 문장
        if (isPast) {
          return (
            <span key={i} style={{
              opacity: 0.7,
              color: `color-mix(in srgb, ${highlightColor} 15%, ${color})`,
            }}>{sentence}{suffix}</span>
          )
        }

        // ── 읽는 단어 — 빠른 페이드인 & 크로스페이드 아웃 ──
        const t0 = s0 - BOOST
        const sweepProgress = interpolate(elapsed, [t0, t0 + FADE_IN], [0, 1], {
          ...CL,
          easing: Easing.out(Easing.cubic),
        })

        // n0 - BOOST 지점 (즉 다음 단어 켜지는 시점)에 맞춰 꺼주어 부드럽게 크로스 스윕
        const fadeProgress = interpolate(elapsed, [n0 - BOOST, n0 - BOOST + FADE_OUT], [0, 1], CL)

        let wordOpacity: number
        let wordMix: number

        if (elapsed >= n0 - BOOST) {
          wordOpacity = interpolate(fadeProgress, [0, 1], [1, 0.85], CL)
          wordMix = interpolate(fadeProgress, [0, 1], [1, 0.25], CL)
        } else {
          wordOpacity = interpolate(sweepProgress, [0, 1], [0.25, 1], CL)
          wordMix = sweepProgress
        }

        return (
          <span key={i} style={{
            opacity: wordOpacity,
            color: `color-mix(in srgb, ${highlightColor} ${Math.round(wordMix * 100)}%, ${color})`,
          }}>
            {sentence}{suffix}
          </span>
        )
      })}
    </div>
  )
}
