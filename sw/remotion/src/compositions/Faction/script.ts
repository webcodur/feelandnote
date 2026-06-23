/**
 * 세력도(Faction) 에피소드 로더
 *
 * public/factions/{name}/data.json 한 파일을 스캔한다(한국어 필드 + 영문 필드 *En 병기).
 * 한 파일에서 ko/en 두 벌의 스크립트를 펼친다.
 * - episodes:     key → 펼친 스크립트 (en은 key 뒤에 '-en')
 * - episodeNames: key → 폴더명(이미지 경로 factions/{폴더명}/images/ 구성용)
 *
 * 영문판 치환: name←nameEn, lines←linesEn 등. 영문 값이 없으면 한국어 값으로 폴백한다.
 */

import type { FactionScript, FactionGroup, FactionCluster, FactionPerson } from './types'
import type { VoiceTimings, VoiceTimingSegment } from '../../lib/voice-timing'
import { clampRate, vnTimingKey, vnPersonQuote } from './voice-names'
// 등록 에피소드 화이트리스트 — 폴더에 data.json이 있어도 이 목록에 없으면 컴포지션으로 노출하지 않는다.
import episodeRegistry from '../../../public/factions/_episodes.json'

const ALLOW = new Set(episodeRegistry as string[])
const ctx = require.context('../../../public/factions', true, /\/data\.json$/)
const KEY_RE = /^\.\/(.+)\/data\.json$/

// 발화 시각 맵 — 편별 data.timing.p<N>.<lang>.json + 통합 data.timing.<lang>.json(레거시) 모두 로드해
// 에피소드·언어별로 병합한다(없어도 무방, 폴백). key: `${name}__${locale}`
const timingCtx = require.context('../../../public/factions', true, /\/data\.timing(\.p\d+)?\.(ko|en)\.json$/)
const TIMING_RE = /^\.\/(.+)\/data\.timing(?:\.p\d+)?\.(ko|en)\.json$/
const timingMaps: Record<string, VoiceTimings> = {}
for (const k of timingCtx.keys()) {
  const m = k.match(TIMING_RE)
  if (!m) continue
  const key = `${m[1]}__${m[2]}`
  timingMaps[key] = { ...(timingMaps[key] ?? {}), ...(timingCtx(k) as VoiceTimings) }
}

export const episodes: Record<string, FactionScript> = {}
export const episodeNames: Record<string, string> = {}

/**
 * 인물 펼치기. en=false면 원본 그대로(한국어판 — quoteEn은 렌더러가 보조 표기로 사용).
 * en=true면 영문 필드를 주 필드로 올리고 보조 영문(quoteEn)은 제거한다.
 */
function resolvePerson(p: FactionPerson, en: boolean): FactionPerson {
  if (!en) {
    // 한국어판: 의역(quote) 아래 보조 표기를 가공 영문이 아니라 실제 원문(quoteOrigin)으로
    return { ...p, quoteEn: p.quoteOrigin }
  }
  return {
    ...p,
    name: p.nameEn ?? p.name,
    epithet: p.epithetEn ?? p.epithet,
    lines: p.linesEn ?? p.lines,
    quote: p.quoteEn ?? p.quote,
    quoteChunks: p.quoteEnChunks ?? p.quoteChunks,
    quoteEn: undefined,
  }
}

function resolveCluster(c: FactionCluster, en: boolean): FactionCluster {
  return {
    ...c,
    label: en ? (c.labelEn ?? c.label) : c.label,
    note: en ? (c.noteEn ?? c.note) : c.note,
    people: c.people?.map(p => resolvePerson(p, en)) ?? [],
  }
}

function resolveGroup(g: FactionGroup, en: boolean): FactionGroup {
  return {
    ...g,
    name: en ? (g.nameEn ?? g.name) : g.name,
    tagline: en ? (g.taglineEn ?? g.tagline) : g.tagline,
    clusters: g.clusters?.map(c => resolveCluster(c, en)),
    people: g.people?.map(p => resolvePerson(p, en)) ?? [],
  }
}

/** voiceTimings 한 인물 분량을 배속(rate)만큼 1/rate 스케일 — 음원을 빠르게 돌리면 점등·페이지 시각도 당겨진다. */
const scaleSegs = (segs: VoiceTimingSegment[], rate: number): VoiceTimingSegment[] =>
  segs.map(s => ({
    ...s,
    start: s.start / rate,
    end: s.end / rate,
    subTimings: s.subTimings?.map(t => t / rate),
    words: s.words?.map(w => ({ ...w, start: w.start / rate, end: w.end / rate })),
  }))

/**
 * 인물별 재생 배속(quotePlaybackRate)을 발화 시각 맵에 동적 반영한다(북리커맨드 playback-rate 와 동일 원리).
 * <Audio playbackRate> 가 음원을 빠르게 돌리므로, 점등·페이지 시각도 1/rate 로 당겨 음원과 정합시킨다.
 * 배속 지정 인물이 없으면 입력을 그대로 반환(제로 코스트). 키(stem)는 렌더·산출과 동일한 vnTimingKey 규칙.
 */
function scaleVoiceTimings(data: FactionScript, vt?: VoiceTimings): VoiceTimings | undefined {
  if (!vt) return vt
  let out: VoiceTimings | undefined
  const apply = (p: FactionPerson, stem: string) => {
    const rate = clampRate(p.quotePlaybackRate)
    if (rate === 1 || !vt[stem]) return
    if (!out) out = { ...vt }
    out[stem] = scaleSegs(vt[stem], rate)
  }
  data.groups.forEach((g, gi) => {
    if (g.disabled) return
    if (g.solo) { (g.people ?? []).forEach((p, pi) => apply(p, vnTimingKey(vnPersonQuote(gi, pi)))); return }
    const cl = g.clusters ?? [null]
    cl.forEach((c, ci) => {
      const people = c ? c.people : g.people
      ;(people ?? []).forEach((p, pi) => apply(p, vnTimingKey(vnPersonQuote(gi, pi, ci))))
    })
  })
  return out ?? vt
}

/** data.json → 단일 언어 스크립트. en=false는 원본 그대로 반환한다. */
function resolveScript(data: FactionScript, en: boolean, voiceTimings?: VoiceTimings): FactionScript {
  return {
    ...data,
    title: en ? (data.titleEn ?? data.title) : data.title,
    subtitle: en ? (data.subtitleEn ?? data.subtitle) : data.subtitle,
    // 로그라인은 영문 슬롯이 채워졌을 때만 노출 — 비어 있으면 표시하지 않는다(한글 누출 차단).
    logline: en ? data.loglineEn : data.logline,
    loglineByPart: en ? data.loglineByPartEn : data.loglineByPart,
    groups: data.groups.map(g => resolveGroup(g, en)),
    voiceTimings,
  }
}

for (const ctxKey of ctx.keys()) {
  const m = ctxKey.match(KEY_RE)
  if (!m) continue
  const name = m[1]
  if (!ALLOW.has(name)) continue // 등록 목록(_episodes.json)에 없는 폴더는 건너뛴다
  const data = ctx(ctxKey) as FactionScript
  episodes[name] = resolveScript(data, false, scaleVoiceTimings(data, timingMaps[`${name}__ko`]))
  episodeNames[name] = name
  episodes[`${name}-en`] = resolveScript(data, true, scaleVoiceTimings(data, timingMaps[`${name}__en`]))
  episodeNames[`${name}-en`] = name
}
