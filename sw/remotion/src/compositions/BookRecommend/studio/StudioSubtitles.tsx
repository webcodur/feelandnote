/**
 * StudioSubtitles — 스튜디오 전용 자막 프리뷰
 * BookRecommend의 실제 프레임 위치로 자막 데이터를 생성하여 Subtitles에 전달.
 */
import React from 'react'
import { Subtitles, type Sub } from './Subtitles'
import type { BookRecommendScript, VoiceTimingSegment } from '../types'
import type { Timeline } from '../useTimeline'
import {
  toAudioFrames, CELEB_VISUAL_DELAY,
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, SENTENCE_BREATH, FPS, f,
} from '../timing'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter,
  VN_OUTRO,
  vnTimingKey,
} from '../voice-names'

interface Props {
  script: BookRecommendScript
  tl: Timeline
}

/** 텍스트를 voiceTiming 기반 또는 비율 기반으로 자막 분할 */
function splitSub(start: number, end: number, speaker: string, text: string, timings?: VoiceTimingSegment[]): Sub[] {
  // 타이밍에 text가 포함되어 있으면 직접 사용 (remotion-bo에서 편집한 자막)
  if (timings && timings.length > 0 && timings.every(t => t.text)) {
    return timings.map(t => ({ start: start + Math.round(t.start * FPS), end: start + Math.round(t.end * FPS), speaker, text: t.text! }))
  }
  const sentences = text.split(/(?<=[.?!,。])\s+/).filter(Boolean)
  if (sentences.length <= 1) return [{ start, end, speaker, text }]
  const MIN_F = Math.round(1.5 * FPS), MAX_F = Math.round(8 * FPS)
  let raw: Sub[]
  if (timings && timings.length === sentences.length) {
    raw = timings.map((t, i) => ({ start: start + Math.round(t.start * FPS), end: start + Math.round(t.end * FPS), speaker, text: sentences[i] }))
  } else {
    const total = end - start, breath = (sentences.length - 1) * SENTENCE_BREATH
    const dist = Math.max(total - breath, total * 0.7), chars = sentences.reduce((s, x) => s + x.length, 0)
    raw = []; let c = start
    for (let i = 0; i < sentences.length; i++) {
      if (i > 0) c += SENTENCE_BREATH
      const fr = Math.round((sentences[i].length / chars) * dist)
      raw.push({ start: c, end: c + fr, speaker, text: sentences[i] }); c += fr
    }
  }
  // 병합
  const merged: Sub[] = []
  for (const s of raw) { if (merged.length > 0 && (s.end - s.start) < MIN_F) { merged[merged.length-1].text += ' ' + s.text; merged[merged.length-1].end = s.end } else merged.push({...s}) }
  // 분할
  const result: Sub[] = []
  for (const s of merged) {
    if ((s.end - s.start) <= MAX_F) { result.push(s); continue }
    const mid = Math.floor(s.text.length / 2)
    let sp = -1
    for (let d = 0; d < mid; d++) { if (/[,，、]/.test(s.text[mid+d]||'')) { sp = mid+d+1; break } if (/[,，、]/.test(s.text[mid-d]||'')) { sp = mid-d+1; break } }
    if (sp < 0) for (let d = 0; d < mid; d++) { if (s.text[mid+d]===' ') { sp = mid+d+1; break } if (s.text[mid-d]===' ') { sp = mid-d+1; break } }
    if (sp > 0 && sp < s.text.length) { const r = sp / s.text.length, sf = start + Math.round((s.end-start)*r); result.push({start:s.start,end:sf,speaker,text:s.text.slice(0,sp).trim()}); result.push({start:sf,end:s.end,speaker,text:s.text.slice(sp).trim()}) }
    else result.push(s)
  }
  return result
}

export const StudioSubtitles: React.FC<Props> = ({ script, tl }) => {
  const { narrator, host, books } = script
  const vtk = (key: string): VoiceTimingSegment[] | undefined => script.voiceTimings?.[key]

  const subs: Sub[] = []

  // 서비스 인사
  if (!tl.cont && tl.svcGreetingFrames > 0 && narrator.serviceGreeting)
    subs.push(...splitSub(tl.svcGreetingStart, tl.svcGreetingStart + toAudioFrames(narrator.serviceGreetingDuration ?? 0), '나레이터', narrator.serviceGreeting, vtk(vnTimingKey(VN_SERVICE_GREETING))))
  // 서비스 인트로
  if (!tl.cont && tl.svcIntroFrames > 0 && narrator.serviceIntro)
    subs.push(...splitSub(tl.svcIntroStart, tl.svcIntroStart + toAudioFrames(narrator.serviceIntroDuration!), '나레이터', narrator.serviceIntro, vtk(vnTimingKey(VN_SERVICE_INTRO))))
  // 명언
  if (tl.fQuoteFrames > 0 && host.featuredQuote)
    subs.push(...splitSub(tl.fQuoteStart + f(1), tl.fQuoteStart + f(1) + toAudioFrames(host.featuredQuoteDuration!), host.nickname, host.featuredQuote))
  // 셀럽 소개
  if (!tl.cont && narrator.celebIntro) {
    const cs = tl.hostIntroStart + CELEB_VISUAL_DELAY
    subs.push(...splitSub(cs, cs + toAudioFrames(narrator.celebIntroDuration ?? 0), '나레이터', narrator.celebIntro, vtk(vnTimingKey(VN_CELEB_INTRO))))
  }
  // 감상철학
  if (!tl.cont && host.philosophy) {
    const ps = tl.hostIntroStart + tl.celebIntroFrames + f(1)
    subs.push(...splitSub(ps, ps + toAudioFrames(host.voiceDuration ?? 0), host.nickname, host.philosophy, vtk(vnTimingKey(VN_PHILOSOPHY))))
  }
  // 책
  for (let i = 0; i < books.length; i++) {
    const bs = tl.bookStarts[i], b = books[i], bt = tl.bookTimings[i]
    let c = bs

    const titleText = [b.title, b.creator, b.stats?.publishYear].filter(Boolean).join(', ')
    subs.push({ start: c, end: c + toAudioFrames(b.titleDuration), speaker: '나레이터', text: titleText })
    c += bt.titleFrames

    c += tl.TITLE_SUMMARY_GAP_F
    c += tl.LABEL_SUMMARY_F

    const smStart = c
    subs.push(...splitSub(smStart, smStart + toAudioFrames(b.summaryDuration), '요약', b.summary, vtk(vnTimingKey(vnBookSummary(i)))))
    c += bt.summaryFrames

    c += tl.SUMMARY_CONTEXT_GAP_F
    c += tl.LABEL_CONTEXT_F

    const ctStart = c
    subs.push(...splitSub(ctStart, ctStart + toAudioFrames(b.contextDuration), '나레이터', b.context, vtk(vnTimingKey(vnBookContext(i)))))
    c += bt.contextFrames

    if (bt.hasQuote && b.directQuote && b.quoteDuration) {
      c += CONTEXT_QUOTE_GAP
      subs.push(...splitSub(c, c + toAudioFrames(b.quoteDuration), host.nickname, `"${b.directQuote}"`, vtk(vnTimingKey(vnBookQuote(i)))))
      c += bt.quoteFrames

      if (bt.hasContextAfter && b.contextAfter && b.contextAfterDuration) {
        c += QUOTE_CONTEXTAFTER_GAP
        subs.push(...splitSub(c, c + toAudioFrames(b.contextAfterDuration), '나레이터', b.contextAfter, vtk(vnTimingKey(vnBookContextAfter(i)))))
      }
    }
  }
  // 아웃트로
  if (narrator.outroDuration > 0)
    subs.push(...splitSub(tl.outroStart, tl.outroStart + toAudioFrames(narrator.outroDuration), '나레이터', narrator.outro, vtk(vnTimingKey(VN_OUTRO))))

  return <Subtitles subs={subs} />
}
