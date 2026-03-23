/** 문장 분할 유틸리티 — 단일원천(SSoT). 컴포넌트·스크립트 모두 이 모듈에서 import한다. */
import type { VoiceTimingSegment } from './types'

export const SENTENCE_SPLIT = /(?<=[.?!,。][''"」』]?)\s+/

/** 문장 분할 — voiceTimings가 있으면 그 text 사용, 없으면 SENTENCE_SPLIT 폴백 */
export function splitSentences(text: string, timings?: VoiceTimingSegment[]): string[] {
  if (timings && timings.length > 1 && timings.some(t => t.text)) return timings.map(t => t.text ?? '')
  return text.split(SENTENCE_SPLIT).filter(Boolean)
}

/** 멀티페이지 분할 — 문장 단위로 페이지 배분, 문장 인덱스 범위도 반환 */
export function paginateSentences(
  text: string, maxChars: number, timings?: VoiceTimingSegment[],
): { pages: string[]; ranges: { startIdx: number; endIdx: number }[] } {
  const sentences = splitSentences(text, timings)
  if (sentences.length <= 1) return { pages: [text], ranges: [{ startIdx: 0, endIdx: sentences.length }] }
  const pages: string[] = []
  const ranges: { startIdx: number; endIdx: number }[] = []
  let page = ''
  let pageStart = 0
  for (let i = 0; i < sentences.length; i++) {
    const candidate = page ? `${page} ${sentences[i]}` : sentences[i]
    if (candidate.length > maxChars && page) {
      pages.push(page)
      ranges.push({ startIdx: pageStart, endIdx: i })
      page = sentences[i]
      pageStart = i
    } else {
      page = candidate
    }
  }
  if (page) {
    pages.push(page)
    ranges.push({ startIdx: pageStart, endIdx: sentences.length })
  }
  return { pages, ranges }
}

/** 페이지별 voiceTimings 슬라이스 — paginateSentences의 ranges 사용 */
export function slicePageTimings(
  ranges: { startIdx: number; endIdx: number }[],
  allTimings: VoiceTimingSegment[] | undefined,
) {
  if (ranges.length <= 1 || !allTimings) return undefined
  const total = ranges[ranges.length - 1].endIdx
  if (total !== allTimings.length) return undefined
  if (allTimings.some(t => t.start == null || t.end == null)) return undefined
  return ranges.map(r => ({
    range: r,
    timings: allTimings.slice(r.startIdx, r.endIdx).map(t => ({
      ...t,
      start: t.start - allTimings[r.startIdx].start,
      end: t.end - allTimings[r.startIdx].start,
    })),
    absStart: allTimings[r.startIdx].start,
    absEnd: allTimings[r.endIdx - 1].end,
  }))
}
