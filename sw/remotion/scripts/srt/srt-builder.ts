/**
 * srt-builder.ts — SRT 자막 생성 공유 모듈
 *
 * generate-srt.ts, render-all.ts 양쪽에서 import.
 * buildTimeline() SSoT 사용으로 타이밍 드리프트 방지.
 */
import type { BookRecommendScript, VoiceTimingSegment } from '../../src/compositions/BookRecommend/types'
import { buildTimeline } from '../../src/compositions/BookRecommend/useTimeline'
import {
  FPS, f, toAudioFrames,
  CELEB_VISUAL_DELAY,
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  shortSegLayout,
} from '../../src/compositions/BookRecommend/timing'
import { splitSub, type Sub } from '../../src/compositions/BookRecommend/sentence-split'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  vnBookSummary, vnBookContext, vnBookQuote, vnBookAfter,
  VN_OUTRO,
  vnShort, vnTimingKey,
} from '../../src/compositions/BookRecommend/voice-names'

// ── SRT formatting ──

function framesToTimestamp(frame: number): string {
  const totalMs = Math.round((frame / FPS) * 1000)
  const h = Math.floor(totalMs / 3600000)
  const m = Math.floor((totalMs % 3600000) / 60000)
  const s = Math.floor((totalMs % 60000) / 1000)
  const ms = totalMs % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

export function subsToSrt(subs: Sub[]): string {
  const sorted = [...subs].sort((a, b) => a.start - b.start)
  return sorted.map((s, i) =>
    `${i + 1}\n${framesToTimestamp(s.start)} --> ${framesToTimestamp(s.end)}\n${s.text}\n`
  ).join('\n')
}

// ── longform SRT — buildTimeline() SSoT ──

export function buildLongformSubs(script: BookRecommendScript): Sub[] {
  const { narrator, host, books } = script
  const tl = buildTimeline(script)
  const isEn = script.locale === 'en'
  const narratorLabel = isEn ? 'Narrator' : '나레이터'
  const summaryLabel = isEn ? 'Summary' : '요약'

  const vtk = (key: string): VoiceTimingSegment[] | undefined => script.voiceTimings?.[key]
  const subs: Sub[] = []

  // 서비스 인사
  if (!tl.cont && tl.svcGreetingFrames > 0 && narrator.serviceGreeting)
    subs.push(...splitSub(
      tl.svcGreetingStart,
      tl.svcGreetingStart + toAudioFrames(narrator.serviceGreetingDuration ?? 0),
      narratorLabel, narrator.serviceGreeting,
      vtk(vnTimingKey(VN_SERVICE_GREETING)),
    ))

  // 서비스 인트로
  if (!tl.cont && tl.svcIntroFrames > 0 && narrator.serviceIntro)
    subs.push(...splitSub(
      tl.svcIntroStart,
      tl.svcIntroStart + toAudioFrames(narrator.serviceIntroDuration!),
      narratorLabel, narrator.serviceIntro,
      vtk(vnTimingKey(VN_SERVICE_INTRO)),
    ))

  // 명언
  if (tl.fQuoteFrames > 0 && host.featuredQuote)
    subs.push(...splitSub(
      tl.fQuoteStart + f(1),
      tl.fQuoteStart + f(1) + toAudioFrames(host.featuredQuoteDuration!),
      host.nickname, host.featuredQuote,
    ))

  // 셀럽 소개
  if (!tl.cont && narrator.celebIntro) {
    const cs = tl.hostIntroStart + CELEB_VISUAL_DELAY
    subs.push(...splitSub(
      cs, cs + toAudioFrames(narrator.celebIntroDuration ?? 0),
      narratorLabel, narrator.celebIntro,
      vtk(vnTimingKey(VN_CELEB_INTRO)),
    ))
  }

  // 감상철학
  if (!tl.cont && host.philosophy) {
    const ps = tl.hostIntroStart + tl.celebIntroFrames + f(1)
    subs.push(...splitSub(
      ps, ps + toAudioFrames(host.voiceDuration ?? 0),
      host.nickname, host.philosophy,
      vtk(vnTimingKey(VN_PHILOSOPHY)),
    ))
  }

  // 책
  for (let i = 0; i < books.length; i++) {
    const bs = tl.bookStarts[i], b = books[i], bt = tl.bookTimings[i]
    let c = bs

    const titleText = [b.title, b.creator, b.stats?.publishYear].filter(Boolean).join(', ')
    subs.push({ start: c, end: c + toAudioFrames(b.titleDuration), speaker: narratorLabel, text: titleText })
    c += bt.titleFrames

    c += tl.TITLE_SUMMARY_GAP_F
    c += tl.LABEL_SUMMARY_F

    const smStart = c
    subs.push(...splitSub(
      smStart, smStart + toAudioFrames(b.summaryDuration),
      summaryLabel, b.summary,
      vtk(vnTimingKey(vnBookSummary(i))),
    ))
    c += bt.summaryFrames

    c += tl.SUMMARY_CONTEXT_GAP_F
    c += tl.LABEL_CONTEXT_F

    const ctStart = c
    subs.push(...splitSub(
      ctStart, ctStart + toAudioFrames(b.contextDuration),
      narratorLabel, b.contextMain,
      vtk(vnTimingKey(vnBookContext(i))),
    ))
    c += bt.contextFrames

    for (let pi = 0; pi < (bt.quotePairTimings?.length ?? 0); pi++) {
      const pt = bt.quotePairTimings[pi]
      const pair = b.quotePairs?.[pi]
      if (pt.hasQuote && pair?.quote && pair.quoteDuration) {
        c += CONTEXT_QUOTE_GAP
        subs.push(...splitSub(
          c, c + toAudioFrames(pair.quoteDuration),
          host.nickname, `\u201C${pair.quote}\u201D`,
          vtk(vnTimingKey(vnBookQuote(i, pi))),
        ))
        c += pt.quoteFrames

        if (pt.hasAfter && pair.after && pair.afterDuration) {
          c += QUOTE_CONTEXTAFTER_GAP
          subs.push(...splitSub(
            c, c + toAudioFrames(pair.afterDuration),
            narratorLabel, pair.after,
            vtk(vnTimingKey(vnBookAfter(i, pi))),
          ))
          c += pt.afterFrames
        }
      }
    }
  }

  // 아웃트로
  if (narrator.outroDuration > 0)
    subs.push(...splitSub(
      tl.outroStart, tl.outroStart + toAudioFrames(narrator.outroDuration),
      narratorLabel, narrator.outro,
      vtk(vnTimingKey(VN_OUTRO)),
    ))

  return subs
}

// ── shorts SRT — shortSegLayout() SSoT ──

export function buildShortsSubs(script: BookRecommendScript, shortsIndex: number = 1): Sub[] {
  // 옵션 2: shortsIndex는 1-based. 배열 인덱스는 shortsIndex - 1.
  const shortsArr = Array.isArray(script.shorts) ? script.shorts : undefined
  const target = shortsArr?.[shortsIndex - 1]
  if (!target?.segments) return []
  const segments = target.segments
  const isEn = script.locale === 'en'
  const { host } = script

  const { segTimings, segStarts } = shortSegLayout(segments)

  const vtk = (key: string): VoiceTimingSegment[] | undefined => script.voiceTimings?.[key]
  const subs: Sub[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.visual === 'cta') continue
    const speaker = seg.role === 'celeb' ? host.nickname : (isEn ? 'Narrator' : '나레이터')
    const timingKey = vnTimingKey(vnShort(i, seg.id, shortsIndex))
    const audioFrames = seg.duration ? toAudioFrames(seg.duration) : segTimings[i]

    subs.push(...splitSub(
      segStarts[i],
      segStarts[i] + audioFrames,
      speaker, seg.text,
      vtk(timingKey),
    ))
  }

  return subs
}
