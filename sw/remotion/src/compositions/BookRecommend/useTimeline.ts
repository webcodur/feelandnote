/**
 * useTimeline — BookRecommend 타임라인 계산 통합 모듈
 * calcTotalFrames + 컴포넌트 내 커서 워킹을 단일 buildTimeline()으로 통합.
 */
import { useMemo } from 'react'
import type { BookRecommendScript, BookEntry } from './types'
import {
  toFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  BOOK_GAP, RECAP_FRAMES, INTERLUDE_FRAMES, LOGO_FRAMES,
  CELEB_INTRO_FALLBACK, BRIDGE_FALLBACK, OUTRO_FALLBACK,
  RETURN_INTRO_FALLBACK, PREV_RECAP_FALLBACK,
  titleSummaryGap, summaryContextGap, labelSummaryFrames, labelContextFrames,
  summaryPhaseEnd, contextPhaseEnd, quotePhaseEnd, bookTotalFrames,
  type LabelDurations, f,
} from './timing'
import { isContinuation } from './script'

// --- TTS 미생성 시 글자 수 기반 duration 추정 (프리뷰 레이아웃용) ---
const KO_CPS = 4.5 // 한국어 TTS 속도 ~4.5자/초
const est = (text?: string | null) => text ? text.length / KO_CPS : 0
const d = (sec: number | undefined, text?: string | null) => (sec ?? 0) > 0 ? (sec ?? 0) : est(text)

/** duration 0인 필드를 글자 수 기반으로 추정하여 채운 script 사본 반환 */
function withEstimatedDurations(script: BookRecommendScript): BookRecommendScript {
  const { narrator: n, host: h, books } = script
  const anyBookMissing = books.some(b =>
    b.titleDuration === 0 || b.summaryDuration === 0
    || (b.directQuote && (b.quoteDuration ?? 0) === 0)
    || (b.contextAfter && (b.contextAfterDuration ?? 0) === 0)
  )
  const anyNarratorMissing = (n.celebIntroDuration ?? 0) === 0 || n.outroDuration === 0
  const anyHostMissing = (h.voiceDuration ?? 0) === 0 || (h.featuredQuoteDuration ?? 0) === 0
  if (!anyBookMissing && !anyNarratorMissing && !anyHostMissing) return script // 이미 TTS 완료
  return {
    ...script,
    narrator: {
      ...n,
      serviceGreetingDuration: d(n.serviceGreetingDuration, n.serviceGreeting),
      serviceIntroDuration: d(n.serviceIntroDuration, n.serviceIntro),
      celebIntroDuration: d(n.celebIntroDuration, n.celebIntro),
      bridgeDuration: d(n.bridgeDuration, n.bridge) || n.bridgeDuration,
      outroDuration: d(n.outroDuration, n.outro) || n.outroDuration,
      labelSummaryDuration: (n.labelSummaryDuration ?? 0) > 0 ? n.labelSummaryDuration : 1.0,
      labelContextDuration: (n.labelContextDuration ?? 0) > 0 ? n.labelContextDuration : 1.5,
    },
    host: {
      ...h,
      voiceDuration: d(h.voiceDuration, h.philosophy),
      featuredQuoteDuration: d(h.featuredQuoteDuration, h.featuredQuote),
    },
    books: books.map(b => ({
      ...b,
      titleDuration: d(b.titleDuration, `${b.title}, ${b.creator}`),
      summaryDuration: d(b.summaryDuration, b.summary),
      contextDuration: d(b.contextDuration, b.context),
      quoteDuration: b.directQuote ? d(b.quoteDuration, b.directQuote) : b.quoteDuration,
      contextAfterDuration: b.contextAfter ? d(b.contextAfterDuration, b.contextAfter) : b.contextAfterDuration,
    })),
  }
}

export interface BookTiming {
  titleFrames: number
  summaryFrames: number
  contextFrames: number
  quoteFrames: number
  contextAfterFrames: number
  summaryEnd: number
  contextEnd: number
  quoteEnd: number
  total: number
  hasQuote: boolean
  hasContextAfter: boolean
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
  const { narrator, host, books } = script
  const cont = isContinuation(script)
  const ld: LabelDurations = { labelSummaryDuration: narrator.labelSummaryDuration, labelContextDuration: narrator.labelContextDuration }

  // --- Durations ---
  const sgdR = narrator.serviceGreetingDuration ?? 0
  const svcGreetingFrames = cont ? 0 : (sgdR > 0 ? toFrames(sgdR) : 0)
  const svcIntroFrames = cont ? 0 : ((narrator.serviceIntroDuration ?? 0) > 0 ? toFrames(narrator.serviceIntroDuration!) : 0)
  const celebIntroFrames = cont ? 0 : (CELEB_VISUAL_DELAY + ((narrator.celebIntroDuration ?? 0) > 0 ? toFrames(narrator.celebIntroDuration!) : CELEB_INTRO_FALLBACK))
  const philosophyFrames = cont ? 0 : toFrames(host.voiceDuration ?? 0)
  const hostIntroFrames = cont ? 0 : (celebIntroFrames + f(1) + philosophyFrames)
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
  const bookTimings: BookTiming[] = books.map((b) => ({
    titleFrames: toFrames(b.titleDuration),
    summaryFrames: toFrames(b.summaryDuration),
    contextFrames: toFrames(b.contextDuration),
    quoteFrames: b.quoteDuration ? toFrames(b.quoteDuration) : 0,
    contextAfterFrames: b.contextAfterDuration ? toFrames(b.contextAfterDuration) : 0,
    summaryEnd: summaryPhaseEnd(b, ld),
    contextEnd: contextPhaseEnd(b, ld),
    quoteEnd: quotePhaseEnd(b, ld),
    total: bookTotalFrames(b, ld) + LABEL_SUMMARY_F + LABEL_CONTEXT_F,
    hasQuote: !!b.quoteDuration,
    hasContextAfter: !!b.contextAfterDuration,
  }))

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
