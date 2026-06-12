/**
 * StudioSubtitles — 스튜디오 전용 자막 프리뷰
 * BookRecommend의 실제 프레임 위치로 자막 데이터를 생성하여 Subtitles에 전달.
 */
import React from 'react'
import { Subtitles } from './Subtitles'
import type { BookRecommendScript, VoiceTimingSegment } from '../types'
import type { Timeline } from '../useTimeline'
import { withEstimatedDurations } from '../useTimeline'
import {
  toAudioFrames, CELEB_VISUAL_DELAY,
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, f,
} from '../timing'
import { splitSub, type Sub } from '../utils'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookAfter,
  VN_OUTRO,
  vnTimingKey,
} from '../voice-names'

/** duration 필드가 비어도 voiceTimings 마지막 end 로 폴백 */
function resolveDur(sec: number | undefined, segs: VoiceTimingSegment[] | undefined): number {
  if ((sec ?? 0) > 0) return sec as number
  const last = segs?.[segs.length - 1]?.end
  return last != null && last > 0 ? last : 0
}

interface Props {
  script: BookRecommendScript
  tl: Timeline
}

/** 롱폼 자막 배열 빌드 — 서비스 인사 ~ 아웃트로 전 구간 */
export function buildLongSubs(rawScript: BookRecommendScript, tl: Timeline): Sub[] {
  // 음성(TTS) 미생성 시 duration이 0이면 자막 구간 길이가 0이 되어 모든 자막이
  // 한 프레임에 겹친다. useTimeline과 동일하게 글자수 기반 추정 duration으로 보정한다.
  const script = withEstimatedDurations(rawScript)
  const { narrator, host, books } = script
  const vtk = (key: string): VoiceTimingSegment[] | undefined => script.voiceTimings?.[key]
  // 해당 구간 음성(voiceTimings)이 없으면 미생성 — 가이드 음성 대상으로 표시
  const synth = (key: string): boolean => !vtk(key)
  const mark = (arr: Sub[], isSynth: boolean): Sub[] => isSynth ? arr.map(s => ({ ...s, synthetic: true })) : arr

  const subs: Sub[] = []

  // 서비스 인사
  if (!tl.cont && tl.svcGreetingFrames > 0 && narrator.serviceGreeting)
    subs.push(...mark(splitSub(tl.svcGreetingStart, tl.svcGreetingStart + toAudioFrames(resolveDur(narrator.serviceGreetingDuration, vtk(vnTimingKey(VN_SERVICE_GREETING)))), '나레이터', narrator.serviceGreeting, vtk(vnTimingKey(VN_SERVICE_GREETING))), synth(vnTimingKey(VN_SERVICE_GREETING))))
  // 서비스 인트로
  if (!tl.cont && tl.svcIntroFrames > 0 && narrator.serviceIntro)
    subs.push(...mark(splitSub(tl.svcIntroStart, tl.svcIntroStart + toAudioFrames(resolveDur(narrator.serviceIntroDuration, vtk(vnTimingKey(VN_SERVICE_INTRO)))), '나레이터', narrator.serviceIntro, vtk(vnTimingKey(VN_SERVICE_INTRO))), synth(vnTimingKey(VN_SERVICE_INTRO))))
  // 명언
  if (tl.fQuoteFrames > 0 && host.featuredQuote)
    subs.push(...mark(splitSub(tl.fQuoteStart + f(1), tl.fQuoteStart + f(1) + toAudioFrames(resolveDur(host.featuredQuoteDuration, vtk(vnTimingKey(VN_FEATURED_QUOTE)))), host.nickname, host.featuredQuote), synth(vnTimingKey(VN_FEATURED_QUOTE))))
  // 셀럽 소개
  if (!tl.cont && narrator.celebIntro) {
    const cs = tl.hostIntroStart + CELEB_VISUAL_DELAY
    subs.push(...mark(splitSub(cs, cs + toAudioFrames(narrator.celebIntroDuration ?? 0), '나레이터', narrator.celebIntro, vtk(vnTimingKey(VN_CELEB_INTRO))), synth(vnTimingKey(VN_CELEB_INTRO))))
  }
  // 감상철학
  if (!tl.cont && host.philosophy) {
    const ps = tl.hostIntroStart + tl.celebIntroFrames + f(1)
    subs.push(...mark(splitSub(ps, ps + toAudioFrames(host.voiceDuration ?? 0), host.nickname, host.philosophy, vtk(vnTimingKey(VN_PHILOSOPHY))), synth(vnTimingKey(VN_PHILOSOPHY))))
  }
  // 책
  for (let i = 0; i < books.length; i++) {
    const bs = tl.bookStarts[i], b = books[i], bt = tl.bookTimings[i]
    let c = bs

    const titleText = [b.title, b.creator, b.stats?.publishYear].filter(Boolean).join(', ')
    subs.push({ start: c, end: c + toAudioFrames(b.titleDuration), speaker: '나레이터', text: titleText, synthetic: synth(vnTimingKey(vnBookTitle(i))) })
    c += bt.titleFrames

    c += tl.TITLE_SUMMARY_GAP_F
    c += tl.LABEL_SUMMARY_F

    const smStart = c
    subs.push(...mark(splitSub(smStart, smStart + toAudioFrames(b.summaryDuration), '요약', b.summary, vtk(vnTimingKey(vnBookSummary(i)))), synth(vnTimingKey(vnBookSummary(i)))))
    c += bt.summaryFrames

    c += tl.SUMMARY_CONTEXT_GAP_F
    c += tl.LABEL_CONTEXT_F

    const ctStart = c
    subs.push(...mark(splitSub(ctStart, ctStart + toAudioFrames(b.contextDuration), '나레이터', b.contextMain, vtk(vnTimingKey(vnBookContext(i)))), synth(vnTimingKey(vnBookContext(i)))))
    c += bt.contextFrames

    for (let pi = 0; pi < bt.quotePairTimings.length; pi++) {
      const pt = bt.quotePairTimings[pi]
      const pair = b.quotePairs?.[pi]
      if (pt.hasQuote && pair?.quote && pair.quoteDuration) {
        c += CONTEXT_QUOTE_GAP
        subs.push(...mark(splitSub(c, c + toAudioFrames(pair.quoteDuration), host.nickname, `\u201C${pair.quote}\u201D`, vtk(vnTimingKey(vnBookQuote(i, pi)))), synth(vnTimingKey(vnBookQuote(i, pi)))))
        c += pt.quoteFrames
      }
      if (pt.hasAfter && pair?.after && pair.afterDuration) {
        c += QUOTE_CONTEXTAFTER_GAP
        subs.push(...mark(splitSub(c, c + toAudioFrames(pair.afterDuration), '나레이터', pair.after, vtk(vnTimingKey(vnBookAfter(i, pi)))), synth(vnTimingKey(vnBookAfter(i, pi)))))
        c += pt.afterFrames
      }
    }
  }
  // 아웃트로
  if (narrator.outroDuration > 0)
    subs.push(...mark(splitSub(tl.outroStart, tl.outroStart + toAudioFrames(narrator.outroDuration), '나레이터', narrator.outro, vtk(vnTimingKey(VN_OUTRO))), synth(vnTimingKey(VN_OUTRO))))

  return subs
}

export const StudioSubtitles: React.FC<Props> = ({ script, tl }) => {
  const subs = buildLongSubs(script, tl)
  return <Subtitles subs={subs} />
}
