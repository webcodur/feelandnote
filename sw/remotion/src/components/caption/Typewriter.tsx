/**
 * Typewriter — 음성 타이밍 기반 글자 점등(하이라이팅) 자막. 시리즈 무관 공통 컴포넌트.
 *
 * voiceTimings(timings)가 있으면 sub 단위로 "지금 읽는 구절"을 색 스윕으로 점등하고,
 * 없으면 원고 문장 단위로 균등 분배해 동작한다(폴백). 색·폰트는 prop으로 주입한다.
 * BookRecommend·Faction 등 모든 시리즈가 공유한다.
 */
import { useMemo } from 'react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { FPS, buildHighlightSegments } from '../../lib/voice-timing'

/** 짧은 어절(2자 이하)이 라인 끝 단독으로 떨어지지 않도록 직전 공백을 단단한 공백(NBSP)으로
 *  변환한다. word-break: keep-all 정책 하에 한국어 자막에서 흔히 발생하는 widow 회피용. */
function bindShortPhrases(text: string): string {
  const parts = text.split(/(\s+)/)
  for (let i = 2; i < parts.length; i += 2) {
    const word = parts[i]
    if (word && word.length <= 2 && parts[i - 1]) {
      parts[i - 1] = parts[i - 1].replace(/[ \t]/g, ' ')
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
  /** 하이라이트를 음성보다 앞당기는 프레임 수 (기본 4) */
  highlightBoost?: number
  /** 점등 페이드인 프레임 수 (기본 12 ≈ 0.2초) */
  fadeInFrames?: number
  /** 점등 크로스페이드아웃 프레임 수 (기본 15 ≈ 0.25초) */
  fadeOutFrames?: number
  /** true면 한 번 점등한 구절은 도로 흐려지지 않고 켜진 채 유지(읽기 전만 어둡게). 기본 false(읽은 뒤 옅어짐) */
  keepLit?: boolean
  /** true면 어절(단어) 단위가 아니라 글자 한 자씩 순차로 점등한다.
   *  timings 길이가 글자 수와 맞으면 그 시각을, 아니면 spreadFrames 균등 분배를 쓴다.
   *  공유 slice(단어 경계 스냅)를 거치지 않으므로 짧은 문구(수식어)에서만 쓴다. */
  charLevel?: boolean
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
  highlightBoost = 4,
  fadeInFrames = 12,
  fadeOutFrames = 15,
  keepLit = false,
  charLevel = false,
}) => {
  const frame = useCurrentFrame()
  const elapsed = frame - startFrame

  // 텍스트·타이밍이 불변이므로 한 번만 계산 — 매 프레임 문자열 분할 방지
  const { texts: sentences, ranges, paraBreakAfter } = useMemo(
    () => {
      // 글자 단위 점등 — 공유 slice(단어 경계 스냅)를 건너뛰고 한 글자를 한 세그먼트로 둔다.
      if (charLevel) {
        const chars = Array.from(text)
        const useT = timings && timings.length === chars.length
          && timings.every(t => t.start != null && t.end != null)
        const per = spreadFrames / Math.max(1, chars.length)
        const ranges = chars.map((_, i) => useT
          ? { start: Math.round(timings![i].start! * FPS), end: Math.round(timings![i].end! * FPS) }
          : { start: Math.round(i * per), end: Math.round((i + 1) * per) })
        return { texts: chars, ranges, paraBreakAfter: new Set<number>() }
      }
      return buildHighlightSegments(text, timings, spreadFrames)
    },
    [text, timings, spreadFrames, charLevel],
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
    // 짧은 어절 widow 회피 — 라인 끝에 짧은 어절(2자 이하)이 단독으로 떨어지지 않게.
    // 글자 단위(charLevel)는 한 글자가 한 세그먼트라 묶음 처리를 건너뛴다.
    const sentence = (charLevel || noShortPhraseBind) ? rawSentence : bindShortPhrases(rawSentence)
    const r = ranges[Math.min(i, ranges.length - 1)]
    const s0 = r.start
    const s2 = Math.max(r.end, s0 + 2)
    const nextR = i + 1 < ranges.length ? ranges[i + 1] : null

    // 다음 단어의 시작 시점을 다음 연결점(n0)으로 설정
    // 간격이 0.5초 이상 벌어지면 기존 문장 끝부분(s2)부터 꺼지도록 하여 계속 불이 켜져있지 않게 보정
    const n0 = nextR
      ? (nextR.start - s2 > FPS * 0.5 ? s2 : nextR.start)
      : s2

    const BOOST = highlightBoost // 하이라이트를 음성보다 살짝 앞당김
    const FADE_IN = fadeInFrames // 부드러운 점등
    const FADE_OUT = fadeOutFrames // 부드러운 크로스페이드
    // 문단 경계·문단 내부 모두 공통 처리: 다음 문장이 존재하면 공백 1칸
    // 문단 경계는 부모 div의 marginBottom으로 시각 여백을 확보하므로 suffix에 개행을 넣지 않는다
    // 글자 단위(charLevel)는 각 글자에 공백이 이미 포함돼 있으므로 자동 공백을 넣지 않는다.
    const suffix = !charLevel && i < sentences.length - 1 && !isLastInBlock ? ' ' : ''

    // ── 상태 판별 ──
    const isFuture = elapsed < s0 - BOOST
    const isPast = elapsed >= n0 + FADE_OUT

    // 읽을 문장 — 매우 어둡게
    if (isFuture) {
      return (
        <span key={i} style={{ opacity: 0.15, color }}>{sentence}{suffix}</span>
      )
    }

    // 읽은 문장 — keepLit이면 켜진 채 유지, 아니면 옅게
    if (isPast) {
      return (
        <span key={i} style={
          keepLit
            ? { opacity: 1, color: highlightColor }
            : { opacity: 0.7, color: `color-mix(in srgb, ${highlightColor} 15%, ${color})` }
        }>{sentence}{suffix}</span>
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
      // keepLit이면 다음 구절로 넘어가도 흐려지지 않고 점등 유지
      wordOpacity = keepLit ? 1 : interpolate(fadeProgress, [0, 1], [1, 0.85], CL)
      wordMix = keepLit ? 1 : interpolate(fadeProgress, [0, 1], [1, 0.25], CL)
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
