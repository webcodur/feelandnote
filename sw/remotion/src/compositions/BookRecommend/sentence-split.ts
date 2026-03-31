/** 문장 분할 유틸리티 — 단일원천(SSoT). 컴포넌트·스크립트 모두 이 모듈에서 import한다. */
import type { VoiceTimingSegment } from './types'
import { FPS, SENTENCE_BREATH } from './timing'

export const SENTENCE_SPLIT = /(?<=[.?!,。][''"」』]?)\s+/

/**
 * sub 필드가 있는 타이밍을 펼쳐서 세분화된 타이밍 배열로 변환.
 * sub 없는 세그먼트는 그대로 통과. sub가 있으면 글자수 비례 타이밍 분배.
 */
export function expandSubTimings(timings: VoiceTimingSegment[]): VoiceTimingSegment[] {
  const result: VoiceTimingSegment[] = []
  for (const t of timings) {
    if (!t.sub || t.sub.length <= 1) {
      result.push(t)
      continue
    }
    // subTimings가 있으면 실제 단어 경계 사용
    if (t.subTimings && t.subTimings.length === t.sub.length - 1) {
      let cursor = t.start ?? 0
      for (let i = 0; i < t.sub.length; i++) {
        const end = i < t.subTimings.length ? t.subTimings[i] : (t.end ?? 0)
        result.push({ start: cursor, end, text: t.sub[i] })
        cursor = end
      }
      continue
    }
    // 폴백: 글자수 비례 분배
    const totalChars = t.sub.reduce((s, c) => s + c.length, 0)
    const duration = (t.end ?? 0) - (t.start ?? 0)
    let cursor = t.start ?? 0
    for (const subText of t.sub) {
      const ratio = subText.length / totalChars
      const subDur = duration * ratio
      result.push({ start: cursor, end: cursor + subDur, text: subText })
      cursor += subDur
    }
  }
  return result
}

export type Sub = { start: number; end: number; speaker: string; text: string }

/** voiceTimings의 텍스트가 실제 텍스트와 일치하는지 확인. 불일치 시 타이밍을 무시해야 한다. */
export function isTimingsStale(text: string, timings?: VoiceTimingSegment[]): boolean {
  if (!timings || timings.length === 0) return false
  const joined = timings.map(t => t.text ?? '').join('')
  const norm = (s: string) => s.replace(/\s+/g, '')
  return norm(joined) !== norm(text)
}

/** 문장 분할 — voiceTimings가 있으면 그 text 사용, 없으면 SENTENCE_SPLIT 폴백 */
export function splitSentences(text: string, timings?: VoiceTimingSegment[]): string[] {
  if (timings && timings.length >= 1 && timings.some(t => t.text)) return timings.map(t => t.text ?? '')
  return text.split(SENTENCE_SPLIT).filter(Boolean)
}


/**
 * 하이라이트용 세그먼트 빌드 — splitSentences → 프레임 ranges 변환.
 * Typewriter, ShortCaption(PageHighlight) 공통 진입점.
 *
 * voiceTimings의 text/start/end를 그대로 사용. timings 없으면 비율 분배.
 */
export function buildHighlightSegments(
  text: string,
  timings: VoiceTimingSegment[] | undefined,
  spreadFrames: number,
): { texts: string[]; ranges: { start: number; end: number }[] } {
  const fresh = !isTimingsStale(text, timings) ? timings : undefined
  const expanded = fresh ? expandSubTimings(fresh) : undefined
  const texts = splitSentences(text, expanded)
  const hasTimings = expanded && expanded.length === texts.length
    && expanded.every(t => t.start != null && t.end != null)

  const ranges = hasTimings
    ? expanded.map(t => ({
        start: Math.round(t.start * FPS),
        end: Math.round(t.end * FPS),
      }))
    : texts.map((_, i) => {
        const dur = spreadFrames / texts.length
        return { start: Math.round(i * dur), end: Math.round((i + 1) * dur) }
      })

  return { texts, ranges }
}

/**
 * 멀티페이지 분할 — 문장 단위로 페이지 배분, 문장 인덱스 범위도 반환.
 *
 * @param eagerFlush true면 문장 종결(.!?) 뒤마다 즉시 페이지 분리 (쇼츠용).
 *                   false(기본)면 maxChars 초과 시에만 분리 (롱폼용).
 */
export function paginateSentences(
  text: string, maxChars: number, timings?: VoiceTimingSegment[],
  eagerFlush = false,
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
    // eagerFlush: 문장 종결(.!?) 또는 쉼표(,) 뒤에서 즉시 flush (쇼츠 자막용)
    if (eagerFlush && page && /[.!?。,]$/.test(page.trim()) && i < sentences.length - 1) {
      pages.push(page)
      ranges.push({ startIdx: pageStart, endIdx: i + 1 })
      page = ''
      pageStart = i + 1
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

/** voiceTimings → 자막 세그먼트 변환. voiceTimings가 없으면 비율 분배 폴백.
 *  Typewriter(하이라이팅), StudioSubtitles, generate-srt 모두 이 함수를 사용한다. */
export function splitSub(
  start: number, end: number, speaker: string, text: string,
  timings?: VoiceTimingSegment[],
): Sub[] {
  // voiceTimings가 있으면 sub 펼친 뒤 사용 (하이라이팅과 동일 단위)
  const expanded = timings ? expandSubTimings(timings) : undefined
  if (expanded && expanded.length > 1 && expanded.every(t => t.text && t.start != null && t.end != null)) {
    return expanded.map(t => ({
      start: start + Math.round(t.start * FPS),
      end: start + Math.round(t.end * FPS),
      speaker,
      text: t.text!,
    }))
  }

  // 폴백: SENTENCE_SPLIT으로 분할 후 비율 분배
  const sentences = text.split(SENTENCE_SPLIT).filter(Boolean)
  if (sentences.length <= 1) return [{ start, end, speaker, text }]

  const MIN_F = Math.round(1.5 * FPS), MAX_F = Math.round(8 * FPS)
  const total = end - start, breath = (sentences.length - 1) * SENTENCE_BREATH
  const dist = Math.max(total - breath, total * 0.7)
  const chars = sentences.reduce((s, x) => s + x.length, 0)
  const raw: Sub[] = []
  let c = start
  for (let i = 0; i < sentences.length; i++) {
    if (i > 0) c += SENTENCE_BREATH
    const fr = Math.round((sentences[i].length / chars) * dist)
    raw.push({ start: c, end: c + fr, speaker, text: sentences[i] })
    c += fr
  }

  // 병합 (짧은 항목)
  const merged: Sub[] = []
  for (const s of raw) {
    if (merged.length > 0 && (s.end - s.start) < MIN_F) {
      merged[merged.length - 1].text += ' ' + s.text
      merged[merged.length - 1].end = s.end
    } else {
      merged.push({ ...s })
    }
  }

  // 분할 (긴 항목)
  const result: Sub[] = []
  for (const s of merged) {
    if ((s.end - s.start) <= MAX_F) { result.push(s); continue }
    const mid = Math.floor(s.text.length / 2)
    let sp = -1
    for (let d = 0; d < mid; d++) {
      if (/[,，、]/.test(s.text[mid + d] || '')) { sp = mid + d + 1; break }
      if (/[,，、]/.test(s.text[mid - d] || '')) { sp = mid - d + 1; break }
    }
    if (sp < 0) {
      for (let d = 0; d < mid; d++) {
        if (s.text[mid + d] === ' ') { sp = mid + d + 1; break }
        if (s.text[mid - d] === ' ') { sp = mid - d + 1; break }
      }
    }
    if (sp > 0 && sp < s.text.length) {
      const r = sp / s.text.length
      const sf = start + Math.round((s.end - start) * r)
      result.push({ start: s.start, end: sf, speaker, text: s.text.slice(0, sp).trim() })
      result.push({ start: sf, end: s.end, speaker, text: s.text.slice(sp).trim() })
    } else {
      result.push(s)
    }
  }
  return result
}
