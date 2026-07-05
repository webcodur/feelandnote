/**
 * 2-synthesize/jobs.ts — TTS Job 빌더
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
  vnShort, vnTimingKey, COMMON_VOICE_FILES,
} from '../../../src/compositions/BookRecommend/voice-names'
import { bookFieldParts } from '../../../src/compositions/BookRecommend/field-parts'
import { SHORTS_INDEX } from './cli.js'
import { VOICE, type Role, type Voice } from './config.js'
import { ep, commonFiles } from './state.js'
import { ttsText, applyReplacements, type VoiceMeta } from './tts.js'

export type Job = {
  file: string
  voice: Voice
  text: string
  role: Role
  isShort?: boolean
  shortSegId?: string
  voiceMeta?: VoiceMeta
  /** segment.geminiVoice 지정으로 강제 Gemini 합성. ElevenLabs 셀럽 차단을 우회하고, ENGINE=elevenlabs 런에서도 Gemini로 분기한다. */
  forceGemini?: boolean
  /** segment.elevenlabsVoiceId 오버라이드. 지정 시 host.elevenlabsVoiceId 대신 사용. 다중 화자 용도. */
  elevenlabsVoiceId?: string
  /** 롱폼 구간별 발화 스타일 prefix(voiceStyles[구간키]). 지정 시 tts()의 role 기반 폴백을 건너뛴다. '' = 옵트아웃. */
  stylePrefix?: string
  /** 세그먼트에 voiceLock: true가 설정됨. main 파이프라인이 매니페스트 검사 전 단계에서 제외한다. */
  voiceLock?: boolean
}

export function buildJobs(): Job[] {
  const jobs: Job[] = []
  const episode = ep()
  const COMMON_FILES = commonFiles()

  // 통합 화자 풀 — episode.speakers가 SSoT. 옛 shorts[i].speakers 데이터는 쇼츠 스코프에서만 폴백.
  // 화자 스키마: { id, engine: 'gemini'|'elevenlabs', voiceId } 또는 옛 { id, elevenlabsVoiceId }.
  type SpeakerLite = { id: string; engine?: 'gemini' | 'elevenlabs'; voiceId?: string; elevenlabsVoiceId?: string }
  const longSpeakers = Array.isArray((episode as { speakers?: SpeakerLite[] }).speakers)
    ? (episode as { speakers: SpeakerLite[] }).speakers
    : []
  /** 화자의 활성 보이스 해소. 신규 engine+voiceId 우선, 옛 elevenlabsVoiceId 단독 폴백. */
  const speakerVoice = (sp?: SpeakerLite): { engine: 'gemini' | 'elevenlabs'; voiceId: string } | null => {
    if (!sp) return null
    if (sp.engine && sp.voiceId) return { engine: sp.engine, voiceId: sp.voiceId }
    if (sp.elevenlabsVoiceId) return { engine: 'elevenlabs', voiceId: sp.elevenlabsVoiceId }
    return null
  }
  /** 화자 id → Job에 적용할 voice/elevenlabsVoiceId/forceGemini 필드. 풀에 없으면 빈 객체. */
  const speakerFields = (speakerId?: string, pool: SpeakerLite[] = longSpeakers): { voice?: Voice; elevenlabsVoiceId?: string; forceGemini?: boolean } => {
    if (!speakerId) return {}
    const v = speakerVoice(pool.find(s => s.id === speakerId))
    if (!v) return {}
    if (v.engine === 'gemini') return { voice: v.voiceId as Voice, forceGemini: true }
    return { elevenlabsVoiceId: v.voiceId }
  }
  const N = episode.narrator as Record<string, unknown>
  const H = episode.host as Record<string, unknown>

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
        jobs.push({
          file: VN_RETURN_INTRO, voice: VOICE.narrator, text: ttsText('returnIntro'), role: 'narrator',
          ...speakerFields(N.returnIntroSpeaker as string | undefined),
        })
      }
      if (episode.narrator.prevRecap) {
        jobs.push({
          file: VN_PREV_RECAP, voice: VOICE.narrator, text: ttsText('prevRecap'), role: 'narrator',
          ...speakerFields(N.prevRecapSpeaker as string | undefined),
        })
      }
    } else {
      // Part 1: 서비스 인사 — 공용 고정 오디오 (common/ 재사용, --only로 재생성 가능)
      if (!COMMON_FILES.has(VN_SERVICE_GREETING)) {
        jobs.push({
          file: VN_SERVICE_GREETING, voice: VOICE.narrator, text: ttsText('serviceGreeting'), role: 'narrator',
          ...speakerFields(N.serviceGreetingSpeaker as string | undefined),
        })
      }
      jobs.push({
        file: VN_SERVICE_INTRO, voice: VOICE.narrator, text: ttsText('serviceIntro'), role: 'narrator',
        ...speakerFields(N.serviceIntroSpeaker as string | undefined),
      })
      // 나레이터 셀럽 소개
      jobs.push({
        file: VN_CELEB_INTRO, voice: VOICE.narrator, text: ttsText('celebIntro'), role: 'narrator',
        ...speakerFields(N.celebIntroSpeaker as string | undefined),
      })
      // 셀럽 감상철학
      if (episode.host.philosophy) {
        jobs.push({
          file: VN_PHILOSOPHY, voice: VOICE.celeb, text: ttsText('philosophy'), role: 'celeb',
          voiceMeta: (episode.host as any).philosophyVoice as VoiceMeta | undefined,
          ...speakerFields(H.philosophySpeaker as string | undefined),
        })
      }
    }
    // 대표 명언 (셀럽 목소리, 공통)
    if (episode.host.featuredQuote) {
      jobs.push({
        file: VN_FEATURED_QUOTE, voice: VOICE.celeb, text: episode.host.featuredQuote, role: 'celeb',
        voiceMeta: (episode.host as any).featuredQuoteVoice as VoiceMeta | undefined,
        ...speakerFields(H.featuredQuoteSpeaker as string | undefined),
      })
    }

    // 도서별
    for (let i = 0; i < episode.books.length; i++) {
      const b = episode.books[i]
      const bX = b as Record<string, unknown>
      jobs.push({
        file: vnBookTitle(i), voice: VOICE.narrator, text: ttsText('title', i), role: 'narrator',
        ...speakerFields(bX.titleSpeaker as string | undefined),
      })
      // 핵심 요약·감상 배경 — 토막 분할 시 토막마다 별도 wav.
      // 화자는 토막별 우선(summaryPartSpeakers?.[p]), 없으면 필드 단위(summarySpeaker) 폴백.
      const summaryParts = bookFieldParts(b.summary, b.summaryParts)
      for (let p = 0; p < summaryParts.length; p++) {
        jobs.push({
          file: vnBookSummary(i, p), voice: VOICE.summary, text: ttsText(`summary:${p}`, i), role: 'summary',
          ...speakerFields(b.summaryPartSpeakers?.[p] ?? bX.summarySpeaker as string | undefined),
        })
      }
      const contextParts = bookFieldParts(b.contextMain, b.contextMainParts)
      for (let p = 0; p < contextParts.length; p++) {
        jobs.push({
          file: vnBookContext(i, p), voice: VOICE.narrator, text: ttsText(`contextMain:${p}`, i), role: 'narrator',
          ...speakerFields(b.contextMainPartSpeakers?.[p] ?? bX.contextMainSpeaker as string | undefined),
        })
      }
      for (let pi = 0; pi < (b.quotePairs?.length ?? 0); pi++) {
        const pair = b.quotePairs![pi]
        const pairX = pair as Record<string, unknown>
        if (pair.quote) {
          jobs.push({
            file: vnBookQuote(i, pi), voice: VOICE.celeb, text: ttsText(`quote:${pi}`, i), role: 'celeb',
            voiceMeta: (pair as any).voice as VoiceMeta | undefined,
            ...speakerFields(pairX.quoteSpeaker as string | undefined),
          })
        }
        // 후속 맥락 — 토막 분할 시 토막마다 별도 wav.
        // 화자는 토막별 우선(afterPartSpeakers?.[ap]), 없으면 페어 단위(afterSpeaker) 폴백.
        const afterParts = bookFieldParts(pair.after, pair.afterParts)
        for (let ap = 0; ap < afterParts.length; ap++) {
          jobs.push({
            file: vnBookAfter(i, pi, ap), voice: VOICE.narrator, text: ttsText(`after:${pi}:${ap}`, i), role: 'narrator',
            ...speakerFields(pair.afterPartSpeakers?.[ap] ?? pairX.afterSpeaker as string | undefined),
          })
        }
      }
    }

    // 중간안내 (10개 초과 시)
    if (episode.books.length > 10 && episode.narrator.interlude) {
      jobs.push({
        file: VN_INTERLUDE, voice: VOICE.narrator, text: episode.narrator.interlude, role: 'narrator',
        ...speakerFields(N.interludeSpeaker as string | undefined),
      })
    }

    // 아웃트로
    jobs.push({
      file: VN_OUTRO, voice: VOICE.narrator, text: ttsText('outro'), role: 'narrator',
      ...speakerFields(N.outroSpeaker as string | undefined),
    })
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
    const shortReplace = shortCfg.tts?.replace as Record<string, string> | undefined
    // 쇼츠 화자 폴백 풀 — episode.speakers에 없으면 옛 shorts[i].speakers를 참조.
    const legacyShortSpeakers: SpeakerLite[] = Array.isArray((shortCfg as { speakers?: SpeakerLite[] }).speakers)
      ? (shortCfg as { speakers: SpeakerLite[] }).speakers
      : []
    const mergedPool: SpeakerLite[] = [
      ...longSpeakers,
      ...legacyShortSpeakers.filter(s => !longSpeakers.some(ep => ep.id === s.id)),
    ]
    for (const seg of shortCfg.segments) {
      const segGemVoice = (seg as { geminiVoice?: string }).geminiVoice
      const segSpeakerId = (seg as { speaker?: string }).speaker
      const speakerFs = speakerFields(segSpeakerId, mergedPool)
      // 우선순위: segment.geminiVoice 오버라이드 > 화자 engine+voiceId > segment.elevenlabsVoiceId 옛 호환
      const segEleVoiceId = (seg as { elevenlabsVoiceId?: string }).elevenlabsVoiceId
      const baseVoice: Voice = seg.role === 'celeb' ? VOICE.celeb
        : seg.role === 'summary' ? VOICE.summary
        : seg.id === 'hook' ? VOICE.shortsHook
        : VOICE.shortsNarrator
      const voice: Voice = segGemVoice ? (segGemVoice as Voice)
        : speakerFs.voice ?? baseVoice
      const forceGemini = !!segGemVoice || !!speakerFs.forceGemini
      const elevenlabsVoiceId = forceGemini ? undefined : (speakerFs.elevenlabsVoiceId ?? segEleVoiceId)
      const text = applyReplacements(seg.text, shortReplace)
      jobs.push({
        file: vnShort(si, seg.id, SHORTS_INDEX as number),
        voice, text,
        role: seg.role as Role,
        isShort: true,
        shortSegId: seg.id,
        voiceMeta: seg.role === 'celeb' && !forceGemini ? ((seg as any).voice as VoiceMeta | undefined) : undefined,
        forceGemini,
        elevenlabsVoiceId,
        voiceLock: !!(seg as { voiceLock?: boolean }).voiceLock,
      })
      si++
    }
  }

  // 롱폼 구간별 스타일 주입 — voiceStyles[vnTimingKey(file)]. 에피소드 공유 common 파일은 제외.
  // 쇼츠(else 분기)는 segment.style 경로를 그대로 쓰므로 주입하지 않는다.
  if (isLongScope) {
    const VS = episode.voiceStyles ?? {}
    for (const j of jobs) {
      if (COMMON_VOICE_FILES.has(j.file)) continue
      const s = VS[vnTimingKey(j.file)]
      if (s !== undefined) j.stylePrefix = s
    }
  }

  return jobs.filter(j => j.text.trim().length > 0)
}
