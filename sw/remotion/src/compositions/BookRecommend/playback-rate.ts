/**
 * playback-rate — 음원별 재생 배속 통합 모듈 (롱폼·쇼츠 공용)
 *
 * 데이터 규약: gainDb와 동일하게 본문 필드의 형제 자리에 `*PlaybackRate` 한 자리.
 *   예) seg.playbackRate, narrator.celebIntroPlaybackRate, book.summaryPlaybackRate,
 *       host.philosophyPlaybackRate, pair.quotePlaybackRate
 *   1(또는 빈 값)이 원본 속도. 데이터 파일(wav·voiceTimings)은 절대 건드리지 않는다.
 *
 * 동작: 영상은 모든 시간 계산(구간 길이·자막 단어 타이밍·이미지 전환 시점)을
 * 음성 시간 기준으로 한다. 배속 r을 걸면 실제 재생 시간이 1/r로 줄어들므로,
 * script 적재 시점에 duration·voiceTimings·imageChangeAt.t를 일괄 1/r 스케일하고
 * <Audio playbackRate={r}>로 음원만 빠르게 돌린다. 하위 소비자(자막·앵커·SRT·
 * 데브 오버레이)는 스케일된 값을 그대로 쓰므로 추가 분기가 없다.
 *
 * 적용 지점: script.ts 에피소드 등록(롱폼·쇼츠), generate-srt. 솔로(SOLO)는
 * 별도 음원·별도 조립이므로 미적용(원본 속도 고정).
 */
import type {
  BookRecommendScript, ShortSegment, ShortsConfig,
  VoiceTimings, VoiceTimingSegment,
} from './types'
import { vnTimingKey, vnShort } from './voice-names'

export const PLAYBACK_RATE_MIN = 0.5
export const PLAYBACK_RATE_MAX = 2

/** 유효 배속으로 정규화 — 비어 있거나 비정상이면 1(원본). */
export function clampRate(r: number | undefined | null): number {
  if (r === undefined || r === null || !Number.isFinite(r) || r <= 0) return 1
  return Math.min(PLAYBACK_RATE_MAX, Math.max(PLAYBACK_RATE_MIN, r))
}

const isUnity = (r: number) => Math.abs(r - 1) < 1e-6

/** voiceTimings 한 키 분량을 1/rate로 스케일 */
function scaleTimingSegments(segs: VoiceTimingSegment[], rate: number): VoiceTimingSegment[] {
  return segs.map(s => ({
    ...s,
    start: s.start / rate,
    end: s.end / rate,
    subTimings: s.subTimings?.map(t => t / rate),
    words: s.words?.map(w => ({ ...w, start: w.start / rate, end: w.end / rate })),
  }))
}

const scaleDur = (d: number | undefined, rate: number): number | undefined =>
  d === undefined || d === null ? d : d / rate

/** 키 → 배속 수집 + duration 스케일을 한 번에 수행하고, voiceTimings도 키별로 스케일한 사본을 반환.
 *  배속 지정이 하나도 없으면 입력 객체를 그대로 반환한다(제로 코스트). */
export function applyPlaybackRates(script: BookRecommendScript): BookRecommendScript {
  const rates: Record<string, number> = {}
  const collect = (key: string, raw: number | undefined) => {
    const r = clampRate(raw)
    if (!isUnity(r)) rates[key] = r
  }

  const n = script.narrator
  const h = script.host
  collect('A1-service-greeting', n?.serviceGreetingPlaybackRate)
  collect('A2-service-intro', n?.serviceIntroPlaybackRate)
  collect('A3-featured-quote', h?.featuredQuotePlaybackRate)
  collect('B1-celeb-intro', n?.celebIntroPlaybackRate)
  collect('B2-philosophy', h?.philosophyPlaybackRate)
  collect('B3-bridge', n?.bridgePlaybackRate)
  collect('E1-outro', n?.outroPlaybackRate)
  collect('E2-interlude', n?.interludePlaybackRate)
  collect('E3-return-intro', n?.returnIntroPlaybackRate)
  collect('E4-prev-recap', n?.prevRecapPlaybackRate)
  script.books?.forEach((b, i) => {
    const bk = String(i + 1).padStart(2, '0')
    collect(`D${bk}a-title`, b.titlePlaybackRate)
    collect(`D${bk}b-summary`, b.summaryPlaybackRate)
    collect(`D${bk}c-context`, b.contextMainPlaybackRate)
    b.quotePairs?.forEach((p, pi) => {
      collect(`D${bk}d${pi * 2 + 1}-quote`, p.quotePlaybackRate)
      collect(`D${bk}d${pi * 2 + 2}-after`, p.afterPlaybackRate)
    })
  })
  script.shorts?.forEach((sc, si) => {
    const slot = sc.slot ?? si + 1
    sc.segments?.forEach((seg, i) => {
      collect(vnTimingKey(vnShort(i, seg.id, slot)), seg.playbackRate)
    })
  })

  if (Object.keys(rates).length === 0) return script

  // Studio 진단용 — 어떤 구간에 배속이 적용됐는지 브라우저 콘솔에서 즉시 확인.
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log(`[playback-rate] 배속 적용 ${Object.keys(rates).length}건`, rates)
  }

  // --- voiceTimings 스케일 ---
  let voiceTimings: VoiceTimings | undefined = script.voiceTimings
  if (voiceTimings) {
    voiceTimings = { ...voiceTimings }
    for (const [key, rate] of Object.entries(rates)) {
      if (voiceTimings[key]) voiceTimings[key] = scaleTimingSegments(voiceTimings[key], rate)
    }
  }

  // --- duration 스케일 ---
  const rateOf = (key: string) => rates[key] ?? 1
  const narrator = n ? {
    ...n,
    serviceGreetingDuration: scaleDur(n.serviceGreetingDuration, rateOf('A1-service-greeting')),
    serviceIntroDuration: scaleDur(n.serviceIntroDuration, rateOf('A2-service-intro')),
    celebIntroDuration: scaleDur(n.celebIntroDuration, rateOf('B1-celeb-intro')),
    bridgeDuration: (scaleDur(n.bridgeDuration, rateOf('B3-bridge')) ?? n.bridgeDuration),
    outroDuration: (scaleDur(n.outroDuration, rateOf('E1-outro')) ?? n.outroDuration),
    interludeDuration: scaleDur(n.interludeDuration, rateOf('E2-interlude')),
    returnIntroDuration: scaleDur(n.returnIntroDuration, rateOf('E3-return-intro')),
    prevRecapDuration: scaleDur(n.prevRecapDuration, rateOf('E4-prev-recap')),
  } : n
  const host = h ? {
    ...h,
    featuredQuoteDuration: scaleDur(h.featuredQuoteDuration, rateOf('A3-featured-quote')),
    voiceDuration: scaleDur(h.voiceDuration, rateOf('B2-philosophy')),
  } : h
  const books = script.books?.map((b, i) => {
    const bk = String(i + 1).padStart(2, '0')
    return {
      ...b,
      titleDuration: (scaleDur(b.titleDuration, rateOf(`D${bk}a-title`)) ?? b.titleDuration),
      summaryDuration: (scaleDur(b.summaryDuration, rateOf(`D${bk}b-summary`)) ?? b.summaryDuration),
      contextDuration: (scaleDur(b.contextDuration, rateOf(`D${bk}c-context`)) ?? b.contextDuration),
      quotePairs: b.quotePairs?.map((p, pi) => ({
        ...p,
        quoteDuration: scaleDur(p.quoteDuration, rateOf(`D${bk}d${pi * 2 + 1}-quote`)),
        afterDuration: scaleDur(p.afterDuration, rateOf(`D${bk}d${pi * 2 + 2}-after`)),
      })),
    }
  })
  const shorts = script.shorts?.map((sc, si): ShortsConfig => {
    const slot = sc.slot ?? si + 1
    return {
      ...sc,
      segments: sc.segments?.map((seg, i): ShortSegment => {
        const rate = rateOf(vnTimingKey(vnShort(i, seg.id, slot)))
        if (isUnity(rate)) return seg
        const changes = seg.imageChangeAt
          ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt])
              .map(c => ({ ...c, t: typeof c.t === 'number' ? c.t / rate : c.t }))
          : undefined
        return {
          ...seg,
          duration: scaleDur(seg.duration, rate),
          ...(changes ? { imageChangeAt: changes } : {}),
        }
      }),
    }
  })

  return { ...script, narrator: narrator!, host: host!, books: books!, shorts, voiceTimings }
}
