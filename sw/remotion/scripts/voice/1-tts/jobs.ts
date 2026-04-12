/**
 * 1-tts/jobs.ts — TTS Job 빌더
 *
 * 단일 타겟 스코프(--long 또는 --shorts <N>)에 따라 wav 생성 대상 목록을 만든다.
 * 옵션 2: 쇼츠는 외부 파일(shorts/{locale}-{N}.json)에서 로드되어 episode.shorts 배열로 주입된다.
 */

import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookAfter,
  VN_OUTRO, VN_INTERLUDE, VN_RETURN_INTRO, VN_PREV_RECAP,
  vnShort,
} from '../../../src/compositions/BookRecommend/voice-names'
import { SHORTS_INDEX } from './cli.js'
import { VOICE, type Role, type Voice } from './config.js'
import { ep, commonFiles } from './state.js'
import { ttsText, applyReplacements } from './tts.js'

export type Job = {
  file: string
  voice: Voice
  text: string
  role: Role
  isShort?: boolean
  shortSegId?: string
}

export function buildJobs(): Job[] {
  const jobs: Job[] = []
  const episode = ep()
  const COMMON_FILES = commonFiles()

  // 단일 타겟 스코프
  // - --long: 롱폼(공통/도서/아웃트로) job만 생성, 쇼츠 job 0개
  // - --shorts <N>: 해당 쇼츠 1개 job만 생성, 롱폼 job 0개
  const isLongScope = SHORTS_INDEX === null

  if (isLongScope) {
    // 섹션 라벨 — locale 기반, common/ 에 있으면 건너뜀
    const isEn = episode.locale === 'en'
    const labelSummaryText = isEn ? 'Summary' : '핵심 요약'
    const labelContextText = isEn ? 'Context' : '감상 배경'
    if (!COMMON_FILES.has(VN_LABEL_SUMMARY)) {
      jobs.push({ file: VN_LABEL_SUMMARY, voice: VOICE.narrator, text: labelSummaryText, role: 'narrator' })
    }
    if (!COMMON_FILES.has(VN_LABEL_CONTEXT)) {
      jobs.push({ file: VN_LABEL_CONTEXT, voice: VOICE.narrator, text: labelContextText, role: 'narrator' })
    }

    const cont = (episode.series?.part ?? 1) > 1

    if (cont) {
      // continuation: returnIntro + prevRecap
      if (episode.narrator.returnIntro) {
        jobs.push({ file: VN_RETURN_INTRO, voice: VOICE.narrator, text: ttsText('returnIntro'), role: 'narrator' })
      }
      if (episode.narrator.prevRecap) {
        jobs.push({ file: VN_PREV_RECAP, voice: VOICE.narrator, text: ttsText('prevRecap'), role: 'narrator' })
      }
    } else {
      // Part 1: 서비스 인사 — 공용 고정 오디오 (common/ 재사용, --only로 재생성 가능)
      if (!COMMON_FILES.has(VN_SERVICE_GREETING)) {
        jobs.push({ file: VN_SERVICE_GREETING, voice: VOICE.narrator, text: ttsText('serviceGreeting'), role: 'narrator' })
      }
      jobs.push({ file: VN_SERVICE_INTRO, voice: VOICE.narrator, text: ttsText('serviceIntro'), role: 'narrator' })
      // 나레이터 셀럽 소개
      jobs.push({ file: VN_CELEB_INTRO, voice: VOICE.narrator, text: ttsText('celebIntro'), role: 'narrator' })
      // 셀럽 감상철학
      if (episode.host.philosophy) {
        jobs.push({ file: VN_PHILOSOPHY, voice: VOICE.celeb, text: ttsText('philosophy'), role: 'celeb' })
      }
    }
    // 대표 명언 (셀럽 목소리, 공통)
    if (episode.host.featuredQuote) {
      jobs.push({ file: VN_FEATURED_QUOTE, voice: VOICE.celeb, text: episode.host.featuredQuote, role: 'celeb' })
    }

    // 도서별
    for (let i = 0; i < episode.books.length; i++) {
      const b = episode.books[i]
      jobs.push({ file: vnBookTitle(i), voice: VOICE.narrator, text: ttsText('title', i), role: 'narrator' })
      jobs.push({ file: vnBookSummary(i), voice: VOICE.summary, text: ttsText('summary', i), role: 'summary' })
      jobs.push({ file: vnBookContext(i), voice: VOICE.narrator, text: ttsText('contextMain', i), role: 'narrator' })
      for (let pi = 0; pi < (b.quotePairs?.length ?? 0); pi++) {
        const pair = b.quotePairs![pi]
        if (pair.quote) {
          jobs.push({ file: vnBookQuote(i, pi), voice: VOICE.celeb, text: ttsText(`quote:${pi}`, i), role: 'celeb' })
        }
        if (pair.after) {
          jobs.push({ file: vnBookAfter(i, pi), voice: VOICE.narrator, text: ttsText(`after:${pi}`, i), role: 'narrator' })
        }
      }
    }

    // 중간안내 (10개 초과 시)
    if (episode.books.length > 10 && episode.narrator.interlude) {
      jobs.push({ file: VN_INTERLUDE, voice: VOICE.narrator, text: episode.narrator.interlude, role: 'narrator' })
    }

    // 아웃트로
    jobs.push({ file: VN_OUTRO, voice: VOICE.narrator, text: ttsText('outro'), role: 'narrator' })
  } else {
    // 쇼츠 단일 타겟 — SHORTS_INDEX는 1-based, episode.shorts는 0-based
    const shortsArr = Array.isArray((episode as any).shorts) ? (episode as any).shorts : []
    const idx0 = (SHORTS_INDEX as number) - 1
    const shortCfg = shortsArr[idx0]
    if (!shortCfg) {
      console.error(`✗ shorts-${SHORTS_INDEX} 가 episode에 없다 (총 ${shortsArr.length}개)`)
      process.exit(1)
    }
    if (!shortCfg.segments) {
      console.error(`✗ shorts-${SHORTS_INDEX} 에 segments 필드가 없다`)
      process.exit(1)
    }
    let si = 0
    for (const seg of shortCfg.segments) {
      if (seg.id === 'cta') { si++; continue }
      const voice = seg.role === 'celeb' ? VOICE.celeb : seg.role === 'summary' ? VOICE.summary : VOICE.narrator
      const text = applyReplacements(seg.text)
      jobs.push({
        file: vnShort(si, seg.id, SHORTS_INDEX as number),
        voice, text,
        role: seg.role as Role,
        isShort: true,
        shortSegId: seg.id,
      })
      si++
    }
  }

  return jobs.filter(j => j.text.trim().length > 0)
}
