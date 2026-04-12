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

// --- TTS 미생성 시 글자 수 기반 duration 추정 (프리뷰 레이아웃용) ---
const KO_CPS = 4.5 // 한국어 TTS 속도 ~4.5자/초
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

/** duration 0인 필드를 voiceTimings 실제값 또는 글자 수 기반으로 채운 script 사본 반환.
 *
 *  voiceTimings의 마지막 end를 실제 오디오 duration으로 우선 사용한다.
 *  ko.json에 titleDuration/summaryDuration/quoteDuration 등이 null이어도,
 *  voiceTimings가 있으면 정확한 duration이 복원된다. 둘 다 없으면 text.length/KO_CPS 폴백.
 *
 *  이 계산이 없으면 quotePairs 추정치가 실제 오디오보다 길어 인용 구간 사이에
 *  10~20초 무음이 쌓인다. (이순신 Book 5 오자병법 케이스) */
function withEstimatedDurations(script: BookRecommendScript): BookRecommendScript {
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
      return {
        ...b,
        titleDuration: resolve(b.titleDuration, vtEnd(script, `D${bk}a-title`), `${b.title}, ${b.creator}`),
        summaryDuration: resolve(b.summaryDuration, vtEnd(script, `D${bk}b-summary`), b.summary),
        contextDuration: resolve(b.contextDuration, vtEnd(script, `D${bk}c-context`), b.contextMain),
        quotePairs: b.quotePairs?.map((p, pi) => {
          const qKey = `D${bk}d${pi * 2 + 1}-quote`
          const aKey = `D${bk}d${pi * 2 + 2}-after`
          return {
            ...p,
            quoteDuration: p.quote ? resolve(p.quoteDuration, vtEnd(script, qKey), p.quote) : p.quoteDuration,
            afterDuration: p.after ? resolve(p.afterDuration, vtEnd(script, aKey), p.after) : p.afterDuration,
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
    summaryEnd: summaryPhaseEnd(b, ld),
    contextEnd: contextPhaseEnd(b, ld),
    quotePairsEnd: quotePairsEnd(b, ld),
    total: bookTotalFrames(b, ld) + LABEL_SUMMARY_F + LABEL_CONTEXT_F,
    quotePairTimings: (b.quotePairs ?? []).map(p => ({
      hasQuote: !!p.quoteDuration,
      quoteFrames: p.quoteDuration ? toQuoteFrames(p.quoteDuration) : 0,
      hasAfter: !!p.afterDuration,
      afterFrames: p.afterDuration ? toQuoteFrames(p.afterDuration) : 0,
    })),
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
