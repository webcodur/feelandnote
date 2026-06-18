/**
 * useTimeline — BookRecommend 타임라인 계산 통합 모듈
 * calcTotalFrames + 컴포넌트 내 커서 워킹을 단일 buildTimeline()으로 통합.
 */
import { useMemo } from 'react'
import type { BookRecommendScript, BookEntry } from './types'
import {
  toFrames, toQuoteFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  BOOK_GAP, RECAP_FRAMES, INTERLUDE_FRAMES, LOGO_FRAMES,
  CELEB_INTRO_FALLBACK, BRIDGE_FALLBACK, OUTRO_FALLBACK,
  RETURN_INTRO_FALLBACK, PREV_RECAP_FALLBACK,
  titleSummaryGap, summaryContextGap, labelSummaryFrames, labelContextFrames,
  summaryPhaseEnd, contextPhaseEnd, quotePairsEnd, bookTotalFrames,
  type LabelDurations, f,
} from './timing'
import { isContinuation } from './timing'
import { bookFieldParts, resolvePartDurations, bookPartStarts, FIELD_PART_GAP_SEC } from './field-parts'

// --- TTS 미생성 시 글자 수 기반 duration 추정 (프리뷰 레이아웃용) ---
// 실제 음성 147개 구간 실측 중앙값 ≈ 6.8자/초. 음성 없을 때 영상 길이를 실제에 맞춘다.
export const KO_CPS = 6.8
const est = (text?: string | null) => text ? text.length / KO_CPS : 0

/** voiceTimings 세그먼트 배열에서 실제 오디오 duration(마지막 end) 추출 */
function vtEnd(script: BookRecommendScript, key: string): number | undefined {
  const segs = script.voiceTimings?.[key]
  if (!segs || segs.length === 0) return undefined
  const lastEnd = segs[segs.length - 1].end
  return lastEnd != null && lastEnd > 0 ? lastEnd : undefined
}

/** duration 우선순위: 기존 > voiceTimings 실제 duration > 글자 수 추정 */
const resolve = (sec: number | undefined, vt: number | undefined, text?: string | null) =>
  (sec ?? 0) > 0 ? (sec ?? 0) : (vt ?? est(text))

/** 토막 분할 필드의 voiceTimings 합산 duration — 전 토막 키가 있어야 유효(부분 합은 과소 추정) */
function vtEndSplit(script: BookRecommendScript, keys: string[]): number | undefined {
  if (keys.length === 0) return undefined
  if (keys.length === 1) return vtEnd(script, keys[0])
  let sum = 0
  for (const k of keys) {
    const e = vtEnd(script, k)
    if (e == null) return undefined
    sum += e
  }
  return sum + FIELD_PART_GAP_SEC * (keys.length - 1)
}

/** duration 0인 필드를 voiceTimings 실제값 또는 글자 수 기반으로 채운 script 사본 반환.
 *
 *  voiceTimings의 마지막 end를 실제 오디오 duration으로 우선 사용한다.
 *  ko.json에 titleDuration/summaryDuration/quoteDuration 등이 null이어도,
 *  voiceTimings가 있으면 정확한 duration이 복원된다. 둘 다 없으면 text.length/KO_CPS 폴백.
 *
 *  이 계산이 없으면 quotePairs 추정치가 실제 오디오보다 길어 인용 구간 사이에
 *  10~20초 무음이 쌓인다. (이순신 Book 5 오자병법 케이스) */
export function withEstimatedDurations(script: BookRecommendScript): BookRecommendScript {
  const { narrator: n, host: h, books } = script
  const anyBookMissing = books.some(b =>
    b.titleDuration === 0 || b.summaryDuration === 0
    || b.quotePairs?.some(p =>
      (p.quote && (p.quoteDuration ?? 0) === 0)
      || (p.after && (p.afterDuration ?? 0) === 0)
    )
  )
  const anyNarratorMissing = (n.celebIntroDuration ?? 0) === 0 || n.outroDuration === 0
  const anyHostMissing = (h.voiceDuration ?? 0) === 0 || (h.featuredQuoteDuration ?? 0) === 0
  if (!anyBookMissing && !anyNarratorMissing && !anyHostMissing) return script // 이미 TTS 완료
  return {
    ...script,
    narrator: {
      ...n,
      serviceGreetingDuration: resolve(n.serviceGreetingDuration, vtEnd(script, 'A1-service-greeting'), n.serviceGreeting),
      serviceIntroDuration: resolve(n.serviceIntroDuration, vtEnd(script, 'A2-service-intro'), n.serviceIntro),
      celebIntroDuration: resolve(n.celebIntroDuration, vtEnd(script, 'B1-celeb-intro'), n.celebIntro),
      bridgeDuration: resolve(n.bridgeDuration, vtEnd(script, 'B3-bridge'), n.bridge) || n.bridgeDuration,
      outroDuration: resolve(n.outroDuration, vtEnd(script, 'E1-outro'), n.outro) || n.outroDuration,
      labelSummaryDuration: (n.labelSummaryDuration ?? 0) > 0 ? n.labelSummaryDuration : 1.0,
      labelContextDuration: (n.labelContextDuration ?? 0) > 0 ? n.labelContextDuration : 1.5,
    },
    host: {
      ...h,
      voiceDuration: resolve(h.voiceDuration, vtEnd(script, 'B2-philosophy'), h.philosophy),
      featuredQuoteDuration: resolve(h.featuredQuoteDuration, vtEnd(script, 'A3-featured-quote'), h.featuredQuote),
    },
    books: books.map((b, i) => {
      const bk = String(i + 1).padStart(2, '0')
      const summaryKeys = bookFieldParts(b.summary, b.summaryParts)
        .map((_, p) => p === 0 ? `D${bk}b-summary` : `D${bk}b${p + 1}-summary`)
      const contextKeys = bookFieldParts(b.contextMain, b.contextMainParts)
        .map((_, p) => p === 0 ? `D${bk}c-context` : `D${bk}c${p + 1}-context`)
      return {
        ...b,
        titleDuration: resolve(b.titleDuration, vtEnd(script, `D${bk}a-title`), `${b.title}, ${b.creator}`),
        summaryDuration: resolve(b.summaryDuration, vtEndSplit(script, summaryKeys), b.summary),
        contextDuration: resolve(b.contextDuration, vtEndSplit(script, contextKeys), b.contextMain),
        quotePairs: b.quotePairs?.map((p, pi) => {
          const qKey = `D${bk}d${pi * 2 + 1}-quote`
          const aBase = `D${bk}d${pi * 2 + 2}`
          // 후속 맥락 토막별 키 — 0은 기존 이름(D{NN}d{N}-after), 1부터 `_N`(D{NN}d{N}_2-after)
          const afterKeys = bookFieldParts(p.after, p.afterParts)
            .map((_, ap) => ap === 0 ? `${aBase}-after` : `${aBase}_${ap + 1}-after`)
          return {
            ...p,
            quoteDuration: p.quote ? resolve(p.quoteDuration, vtEnd(script, qKey), p.quote) : p.quoteDuration,
            afterDuration: p.after ? resolve(p.afterDuration, vtEndSplit(script, afterKeys), p.after) : p.afterDuration,
          }
        }),
      }
    }),
  }
}

export interface QuotePairTiming {
  hasQuote: boolean
  quoteFrames: number
  hasAfter: boolean
  afterFrames: number
  /** 후속 맥락 토막별 시작 프레임 (after 구간 시작 기준). 분할 없으면 [0] */
  afterPartStartsF: number[]
}

export interface BookTiming {
  titleFrames: number
  summaryFrames: number
  contextFrames: number
  summaryEnd: number
  contextEnd: number
  quotePairsEnd: number
  total: number
  quotePairTimings: QuotePairTiming[]
  /** 핵심 요약 토막별 시작 프레임 (요약 구간 시작 기준). 분할 없으면 [0] */
  summaryPartStartsF: number[]
  /** 감상 배경 토막별 시작 프레임 (배경 구간 시작 기준). 분할 없으면 [0] */
  contextPartStartsF: number[]
}

export interface Timeline {
  cont: boolean
  // Starts
  brandStart: number
  returnIntroStart: number
  svcGreetingStart: number
  svcIntroStart: number
  fQuoteStart: number
  prevRecapStart: number
  hostIntroStart: number
  bridgeStart: number
  bookStarts: number[]
  midRecapStart: number
  interludeStart: number
  recapStart: number
  outroStart: number
  // Durations
  celebIntroFrames: number
  philosophyFrames: number
  hostIntroFrames: number
  svcGreetingFrames: number
  svcIntroFrames: number
  returnIntroFrames: number
  prevRecapFrames: number
  bridgeFrames: number
  fQuoteFrames: number
  outroFrames: number
  interludeFrames: number
  // Book
  bookTimings: BookTiming[]
  hasInterlude: boolean
  interludeIndex: number
  firstHalfBooks: BookEntry[]
  secondHalfBooks: BookEntry[]
  // Label gaps
  LABEL_SUMMARY_F: number
  LABEL_CONTEXT_F: number
  TITLE_SUMMARY_GAP_F: number
  SUMMARY_CONTEXT_GAP_F: number
  // Total
  totalFrames: number
}

export function buildTimeline(rawScript: BookRecommendScript): Timeline {
  const script = withEstimatedDurations(rawScript)
  const { narrator, host } = script
  // 텍스트가 비어 있는 quotePairs는 duration을 강제 0으로 만든다.
  // 시나리오 에디터에서 텍스트만 잘랐을 때 옛 wav/timing이 잔존해
  // 의도치 않은 음성·페이지가 재생되는 문제를 차단한다.
  const books = script.books.map(b => ({
    ...b,
    quotePairs: b.quotePairs?.map(p => ({
      ...p,
      quoteDuration: p.quote ? p.quoteDuration : 0,
      afterDuration: p.after ? p.afterDuration : 0,
    })),
  }))
  const cont = isContinuation(script)
  const ld: LabelDurations = { labelSummaryDuration: narrator.labelSummaryDuration, labelContextDuration: narrator.labelContextDuration }

  // --- Durations ---
  const sgdR = narrator.serviceGreetingDuration ?? 0
  const svcGreetingFrames = cont ? 0 : (sgdR > 0 ? toFrames(sgdR) : 0)
  const svcIntroFrames = cont ? 0 : ((narrator.serviceIntroDuration ?? 0) > 0 ? toFrames(narrator.serviceIntroDuration!) : 0)
  const celebIntroFrames = cont ? 0 : (CELEB_VISUAL_DELAY + ((narrator.celebIntroDuration ?? 0) > 0 ? toFrames(narrator.celebIntroDuration!) : CELEB_INTRO_FALLBACK))
  // B2-philosophy.wav가 없으면(=voiceTimings 키 부재) 시각도 0프레임으로 스킵.
  // 글자수 추정으로 무음 80초가 흐르는 사고 방지.
  const hasPhilosophyVoice = !!script.voiceTimings?.['B2-philosophy']
  const philosophyFrames = (cont || !hasPhilosophyVoice) ? 0 : toFrames(host.voiceDuration ?? 0)
  const hostIntroFrames = cont ? 0 : (celebIntroFrames + (philosophyFrames > 0 ? f(1) + philosophyFrames : 0))
  const returnIntroFrames = cont ? ((narrator.returnIntroDuration ?? 0) > 0 ? toFrames(narrator.returnIntroDuration!) : RETURN_INTRO_FALLBACK) : 0
  const prevRecapFrames = cont ? ((narrator.prevRecapDuration ?? 0) > 0 ? toFrames(narrator.prevRecapDuration!) : PREV_RECAP_FALLBACK) : 0
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK
  const fQuoteFramesRaw = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0
  const fQuoteFrames = fQuoteFramesRaw > 0 ? fQuoteFramesRaw + f(1.5) : 0
  const outroFrames = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : OUTRO_FALLBACK

  // --- Label gaps ---
  const TITLE_SUMMARY_GAP_F = titleSummaryGap(ld.labelSummaryDuration)
  const SUMMARY_CONTEXT_GAP_F = summaryContextGap(ld.labelContextDuration)
  const LABEL_SUMMARY_F = labelSummaryFrames(ld.labelSummaryDuration)
  const LABEL_CONTEXT_F = labelContextFrames(ld.labelContextDuration)

  // --- Cursor walking ---
  let cursor = 0
  const brandStart = cursor
  cursor += BRAND_FRAMES
  const returnIntroStart = cursor
  cursor += returnIntroFrames
  const svcGreetingStart = cursor
  cursor += svcGreetingFrames
  const svcIntroStart = cursor
  cursor += svcIntroFrames
  const fQuoteStart = cursor
  cursor += fQuoteFrames
  const prevRecapStart = cursor
  cursor += prevRecapFrames
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  const bridgeStart = cursor
  cursor += bridgeFrames

  // --- Book timings ---
  const bookTimings: BookTiming[] = books.map((b) => {
    // 토막별 시작 프레임 — 오디오 배치·이미지 앵커·자막의 단일 기준
    const summaryParts = bookFieldParts(b.summary, b.summaryParts)
    const contextParts = bookFieldParts(b.contextMain, b.contextMainParts)
    return {
      titleFrames: toFrames(b.titleDuration),
      summaryFrames: toFrames(b.summaryDuration),
      contextFrames: toFrames(b.contextDuration),
      summaryEnd: summaryPhaseEnd(b, ld),
      contextEnd: contextPhaseEnd(b, ld),
      quotePairsEnd: quotePairsEnd(b, ld),
      total: bookTotalFrames(b, ld) + LABEL_SUMMARY_F + LABEL_CONTEXT_F + f(1),
      quotePairTimings: (b.quotePairs ?? []).map(p => {
        // 후속 맥락 토막별 시작 프레임 — after 구간 내부 배치(분할 없으면 [0]). summaryPartStartsF와 동일 패턴
        const afterParts = bookFieldParts(p.after, p.afterParts)
        return {
          hasQuote: !!p.quoteDuration,
          quoteFrames: p.quoteDuration ? toQuoteFrames(p.quoteDuration) : 0,
          hasAfter: !!p.afterDuration,
          afterFrames: p.afterDuration ? toQuoteFrames(p.afterDuration) : 0,
          afterPartStartsF: bookPartStarts(resolvePartDurations(afterParts, p.afterPartDurations, p.afterDuration ?? 0)).map(f),
        }
      }),
      summaryPartStartsF: bookPartStarts(resolvePartDurations(summaryParts, b.summaryPartDurations, b.summaryDuration)).map(f),
      contextPartStartsF: bookPartStarts(resolvePartDurations(contextParts, b.contextPartDurations, b.contextDuration)).map(f),
    }
  })

  const hasInterlude = books.length > 10
  const interludeIndex = hasInterlude ? Math.ceil(books.length / 2) : -1
  const interludeFrames = hasInterlude
    ? (narrator.interludeDuration && narrator.interludeDuration > 0 ? toFrames(narrator.interludeDuration) : INTERLUDE_FRAMES)
    : 0

  const bookStarts: number[] = []
  let interludeStart = 0
  let midRecapStart = 0
  for (let bi = 0; bi < bookTimings.length; bi++) {
    if (bi > 0) cursor += BOOK_GAP
    if (bi === interludeIndex) {
      midRecapStart = cursor
      cursor += RECAP_FRAMES
      interludeStart = cursor
      cursor += interludeFrames
    }
    bookStarts.push(cursor)
    cursor += bookTimings[bi].total
  }

  const firstHalfBooks = hasInterlude ? books.slice(0, interludeIndex) : []
  const secondHalfBooks = hasInterlude ? books.slice(interludeIndex) : books

  const recapStart = cursor
  cursor += RECAP_FRAMES
  const outroStart = cursor
  const totalFrames = outroStart + outroFrames + LOGO_FRAMES

  return {
    cont,
    brandStart, returnIntroStart, svcGreetingStart, svcIntroStart,
    fQuoteStart, prevRecapStart, hostIntroStart, bridgeStart,
    bookStarts, midRecapStart, interludeStart, recapStart, outroStart,
    celebIntroFrames, philosophyFrames, hostIntroFrames,
    svcGreetingFrames, svcIntroFrames,
    returnIntroFrames, prevRecapFrames,
    bridgeFrames, fQuoteFrames, outroFrames, interludeFrames,
    bookTimings, hasInterlude, interludeIndex,
    firstHalfBooks, secondHalfBooks,
    LABEL_SUMMARY_F, LABEL_CONTEXT_F,
    TITLE_SUMMARY_GAP_F, SUMMARY_CONTEXT_GAP_F,
    totalFrames,
  }
}

export const calcTotalFrames = (script: BookRecommendScript) => buildTimeline(script).totalFrames

export function useTimeline(script: BookRecommendScript): Timeline {
  return useMemo(() => buildTimeline(script), [script])
}
