/**
 * StudioSubtitles — 스튜디오 전용 자막 프리뷰
 * BookRecommend의 실제 프레임 위치로 자막 데이터를 생성하여 Subtitles에 전달.
 */
import React from 'react'
import { Subtitles } from './Subtitles'
import type { BookRecommendScript, VoiceTimingSegment } from '../types'
import type { Timeline } from '../useTimeline'
import {
  toAudioFrames, CELEB_VISUAL_DELAY,
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, f,
} from '../timing'
import { splitSub, type Sub } from '../utils'
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

/** 롱폼 자막 배열 빌드 — 서비스 인사 ~ 아웃트로 전 구간 */
export function buildLongSubs(script: BookRecommendScript, tl: Timeline): Sub[] {
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
      subs.push(...splitSub(c, c + toAudioFrames(b.quoteDuration), host.nickname, `\u201C${b.directQuote}\u201D`, vtk(vnTimingKey(vnBookQuote(i)))))
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

  return subs
}

export const StudioSubtitles: React.FC<Props> = ({ script, tl }) => {
  const subs = buildLongSubs(script, tl)
  return <Subtitles subs={subs} />
}
