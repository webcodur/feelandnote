import { useMemo } from 'react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { FPS } from '../timing'
import { buildHighlightSegments } from '../utils'

/** 짧은 어절(2자 이하)이 라인 끝 단독으로 떨어지지 않도록 직전 공백을 단단한 공백(NBSP)으로
 *  변환한다. word-break: keep-all 정책 하에 한국어 자막에서 흔히 발생하는 widow 회피용. */
function bindShortPhrases(text: string): string {
  const parts = text.split(/(\s+)/)
  for (let i = 2; i < parts.length; i += 2) {
    const word = parts[i]
    if (word && word.length <= 2 && parts[i - 1]) {
      parts[i - 1] = parts[i - 1].replace(/[ \t]/g, ' ')
    }
  }
  return parts.join('')
}

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
  /** 짧은 어절(2자 이하) widow 회피용 NBSP 묶음을 끈다.
   *  대표 명언처럼 한 덩어리 짧은 텍스트에서는 NBSP가 오히려 줄바꿈 위치를
   *  의미와 어긋난 자리로 밀어내므로, 자연스러운 줄바꿈이 필요할 때 사용. */
  noShortPhraseBind?: boolean
}

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

/** 문단 간 여백 — 줄 간격(lineHeight)과 별개로 문단 경계만 살짝 띄운다 */
const PARA_MARGIN = '0.55em'

export const Typewriter: React.FC<Props> = ({
  text,
  startFrame,
  spreadFrames,
  color,
  fontSize,
  style,
  highlightColor = '#fff',
  timings,
  noShortPhraseBind = false,
}) => {
  const frame = useCurrentFrame()
  const elapsed = frame - startFrame

  // 텍스트·타이밍이 불변이므로 한 번만 계산 — 매 프레임 문자열 분할 방지
  const { texts: sentences, ranges, paraBreakAfter } = useMemo(
    () => buildHighlightSegments(text, timings, spreadFrames),
    [text, timings, spreadFrames],
  )

  // paraBreakAfter를 이용해 문단 블록(startIdx, endIdx) 리스트로 변환
  const paragraphs = useMemo(() => {
    const result: { startIdx: number; endIdx: number }[] = []
    let start = 0
    for (let i = 0; i < sentences.length; i++) {
      if (paraBreakAfter.has(i)) {
        result.push({ startIdx: start, endIdx: i + 1 })
        start = i + 1
      }
    }
    if (start < sentences.length) {
      result.push({ startIdx: start, endIdx: sentences.length })
    }
    return result.length > 0 ? result : [{ startIdx: 0, endIdx: sentences.length }]
  }, [sentences, paraBreakAfter])

  const renderSentence = (i: number, isLastInBlock: boolean) => {
    const rawSentence = sentences[i]
    if (!rawSentence) return null // whisper "..." 아티팩트 등 빈 슬라이스 스킵
    // 짧은 어절 widow 회피 — 라인 끝에 짧은 어절(2자 이하)이 단독으로 떨어지지 않게
    const sentence = noShortPhraseBind ? rawSentence : bindShortPhrases(rawSentence)
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
    // 문단 경계·문단 내부 모두 공통 처리: 다음 문장이 존재하면 공백 1칸
    // 문단 경계는 부모 div의 marginBottom으로 시각 여백을 확보하므로 suffix에 개행을 넣지 않는다
    const suffix = i < sentences.length - 1 && !isLastInBlock ? ' ' : ''

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
  }

  // 문단이 둘 이상인 경우에만 좌측 정렬 강제 — 단일 문단 텍스트는 호출자 레이아웃(center 등) 유지
  const multiPara = paragraphs.length > 1

  return (
    <div
      style={{
        fontSize,
        fontFamily: 'inherit',
        lineHeight: multiPara ? 1.65 : 1.7,
        ...(multiPara ? { textAlign: 'left' as const } : {}),
        whiteSpace: 'pre-wrap',
        ...style,
      }}
    >
      {paragraphs.map((para, pIdx) => {
        const isLastPara = pIdx === paragraphs.length - 1
        const sentenceElements: React.ReactNode[] = []
        for (let i = para.startIdx; i < para.endIdx; i++) {
          const isLastInBlock = i === para.endIdx - 1
          sentenceElements.push(renderSentence(i, isLastInBlock))
        }
        return (
          <div
            key={pIdx}
            style={{ marginBottom: isLastPara ? 0 : PARA_MARGIN }}
          >
            {sentenceElements}
          </div>
        )
      })}
    </div>
  )
}
