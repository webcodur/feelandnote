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
import { bookFieldParts, FIELD_PART_GAP_SEC } from './field-parts'

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

// 토막별 voiceTimings/duration 키 — voice-names의 파일명 규칙과 동일해야 한다.
// 토막 0은 기존 키 그대로, 1부터 번호/접미사 부착(기존 음원 전부 호환).
const summaryPartKey = (bk: string, p: number) => p === 0 ? `D${bk}b-summary` : `D${bk}b${p + 1}-summary`
const contextPartKey = (bk: string, p: number) => p === 0 ? `D${bk}c-context` : `D${bk}c${p + 1}-context`
const afterPartKey = (bk: string, pi: number, ap: number) => {
  const base = `D${bk}d${pi * 2 + 2}`
  return ap === 0 ? `${base}-after` : `${base}_${ap + 1}-after`
}

/** 토막 분할 필드의 배속 반영 결과. */
type ScaledField = { total: number | undefined; parts: number[] | undefined }

/** 토막 분할 필드(핵심 요약·감상 배경·후속 맥락)의 배속을 길이에 반영한다.
 *
 *  다토막 + 토막 길이 보유: 각 토막 길이를 자기 토막 키의 배속으로 나누고(배속이 해당
 *  토막에만 적용), 총 길이를 (스케일된 토막 합 + 간격)으로 재합산한다. 간격은 영상
 *  타임라인의 무음 호흡이므로 배속으로 줄이지 않는다(토막 시작 프레임 계산과 정합).
 *
 *  단일 토막·토막 길이 미보유: 총 길이만 토막0 배속으로 스케일해 기존과 동일하게 둔다. */
function scaleFieldParts(
  totalDuration: number | undefined,
  partDurations: number[] | undefined,
  partCount: number,
  rateOf: (key: string) => number,
  partKey: (p: number) => string,
): ScaledField {
  const base = rateOf(partKey(0))
  if (partCount > 1 && partDurations && partDurations.length >= partCount) {
    const partRates = partDurations.slice(0, partCount).map((_, p) => rateOf(partKey(p)))
    // 토막 전부 원속(1) — 배속 미설정 다토막 책은 원본 값을 그대로 통과(회귀 방지).
    if (partRates.every(isUnity)) return { total: totalDuration, parts: partDurations }
    const scaled = partDurations.map((d, p) => (d === undefined || d === null ? d : d / rateOf(partKey(p))))
    const total = scaled
      .slice(0, partCount)
      .reduce((a, d) => a + (typeof d === 'number' ? d : 0), 0) + FIELD_PART_GAP_SEC * (partCount - 1)
    return { total, parts: scaled }
  }
  return { total: scaleDur(totalDuration, base), parts: partDurations?.map(d => (d === undefined || d === null ? d : d / base)) }
}

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
    // 핵심 요약·감상 배경 — 토막별 배속 우선(*PartPlaybackRates?.[p]), 없으면 필드 단위 폴백.
    // 토막 0은 기존 키(D01b-summary), 1부터 번호 부착(D01b2-summary).
    const summaryParts = bookFieldParts(b.summary, b.summaryParts)
    for (let p = 0; p < summaryParts.length; p++) {
      collect(summaryPartKey(bk, p), b.summaryPartPlaybackRates?.[p] ?? b.summaryPlaybackRate)
    }
    const contextParts = bookFieldParts(b.contextMain, b.contextMainParts)
    for (let p = 0; p < contextParts.length; p++) {
      collect(contextPartKey(bk, p), b.contextMainPartPlaybackRates?.[p] ?? b.contextMainPlaybackRate)
    }
    b.quotePairs?.forEach((p, pi) => {
      collect(`D${bk}d${pi * 2 + 1}-quote`, p.quotePlaybackRate)
      // 후속 맥락 — 토막별 배속 우선(afterPartPlaybackRates?.[ap]), 없으면 페어 단위 폴백.
      // 토막 0은 기존 키(D01d2-after), 1부터 `_N` 접미사(D01d2_2-after).
      const afterParts = bookFieldParts(p.after, p.afterParts)
      for (let ap = 0; ap < afterParts.length; ap++) {
        collect(afterPartKey(bk, pi, ap), p.afterPartPlaybackRates?.[ap] ?? p.afterPlaybackRate)
      }
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
    // 핵심 요약·감상 배경 — 토막별 배속을 각 토막 길이에만 반영하고 총 길이 재합산.
    const summaryParts = bookFieldParts(b.summary, b.summaryParts)
    const contextParts = bookFieldParts(b.contextMain, b.contextMainParts)
    const sSum = scaleFieldParts(b.summaryDuration, b.summaryPartDurations, summaryParts.length, rateOf, p => summaryPartKey(bk, p))
    const sCtx = scaleFieldParts(b.contextDuration, b.contextPartDurations, contextParts.length, rateOf, p => contextPartKey(bk, p))
    return {
      ...b,
      titleDuration: (scaleDur(b.titleDuration, rateOf(`D${bk}a-title`)) ?? b.titleDuration),
      summaryDuration: (sSum.total ?? b.summaryDuration),
      summaryPartDurations: sSum.parts,
      contextDuration: (sCtx.total ?? b.contextDuration),
      contextPartDurations: sCtx.parts,
      quotePairs: b.quotePairs?.map((p, pi) => {
        // 후속 맥락 — 토막별 배속을 각 토막 길이에만 반영하고 총 길이 재합산.
        const afterParts = bookFieldParts(p.after, p.afterParts)
        const sAft = scaleFieldParts(p.afterDuration, p.afterPartDurations, afterParts.length, rateOf, ap => afterPartKey(bk, pi, ap))
        return {
          ...p,
          quoteDuration: scaleDur(p.quoteDuration, rateOf(`D${bk}d${pi * 2 + 1}-quote`)),
          afterDuration: sAft.total,
          afterPartDurations: sAft.parts,
        }
      }),
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
