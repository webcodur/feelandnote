/**
 * 가상 담화(Discourse) 에피소드 로더
 *
 * 에피소드 한 편은 **세 파일**로 나뉜다. 로더가 합쳐 한 벌의 스크립트로 만든다.
 *   discourse-data.json  메타·편성 (제목·논제·고지·배경음악·장 표지)
 *   cast.json            인물 실체 (Speaker[])
 *   turns.json           발언      (Turn[])
 *
 * 나눈 이유: 대사(turns)는 가장 자주 고치고 부피도 가장 크다. 음성 길이·영문 대사가 붙으면 더 커진다.
 * 메타 몇 줄을 고치려고 수백 줄짜리 대사 배열을 헤집지 않게 한다. cast 도 음성·이미지 설정이 붙어 따로 둔다.
 *
 * 세 파일 모두 한국어 필드 + 영문 필드(*En)를 병기하고, 로더가 ko/en 두 벌로 펼친다.
 * - episodes:     key → 펼친 스크립트 (en은 key 뒤에 '-en')
 * - episodeNames: key → 폴더명 (이미지 경로 discourses/{폴더명}/ 구성용)
 *
 * 발화 시각(data.timing.*.json)은 파이프라인 산출물이라 또 따로 싣고 주입한다(팩션과 동일 구조).
 */

import type { DiscourseScript, Speaker, Turn } from './types'
import type { VoiceTimings, VoiceTimingSegment } from '../../lib/voice-timing'
import { clampRate, vnTimingKey, vnTurn } from './voice-names'
// 등록 에피소드 화이트리스트 — 폴더에 데이터가 있어도 이 목록에 없으면 컴포지션으로 노출하지 않는다.
import episodeRegistry from '../../../public/discourses/_episodes.json'

const ALLOW = new Set(episodeRegistry as string[])
const ctx = require.context('../../../public/discourses', true, /\/discourse-data\.json$/)
const KEY_RE = /^\.\/(.+)\/discourse-data\.json$/
const castCtx = require.context('../../../public/discourses', true, /\/cast\.json$/)
const turnsCtx = require.context('../../../public/discourses', true, /\/turns\.json$/)

// 발화 시각 맵 — 편별 data.timing.p<N>.<lang>.json + 통합 data.timing.<lang>.json 모두 로드해 병합.
// key: `${name}__${locale}`
const timingCtx = require.context('../../../public/discourses', true, /\/data\.timing(\.p\d+)?\.(ko|en)\.json$/)
const TIMING_RE = /^\.\/(.+)\/data\.timing(?:\.p\d+)?\.(ko|en)\.json$/
const timingMaps: Record<string, VoiceTimings> = {}
for (const k of timingCtx.keys()) {
  const m = k.match(TIMING_RE)
  if (!m) continue
  const key = `${m[1]}__${m[2]}`
  timingMaps[key] = { ...(timingMaps[key] ?? {}), ...(timingCtx(k) as VoiceTimings) }
}

export const episodes: Record<string, DiscourseScript> = {}
export const episodeNames: Record<string, string> = {}

/** 인물 펼치기 — en=true면 영문 필드를 주 필드로 올린다(없으면 한국어 폴백) */
function resolveSpeaker(s: Speaker, en: boolean): Speaker {
  if (!en) return s
  return {
    ...s,
    name: s.nameEn ?? s.name,
    lines: s.linesEn ?? s.lines,
    epithet: s.epithetEn ?? s.epithet,
  }
}

/**
 * 발언 펼치기.
 * 한국어판은 원본 그대로 — origin(실제 발언 원문)은 렌더가 의역 아래 보조로 띄운다.
 * 영문판은 textEn·chunksEn 을 주 필드로 올린다.
 */
function resolveTurn(t: Turn, en: boolean): Turn {
  if (!en) return t
  return {
    ...t,
    text: t.textEn ?? t.text,
    chunks: t.chunksEn ?? t.chunks,
  }
}

/** voiceTimings 한 발언 분량을 배속만큼 1/rate 스케일 — 음원을 빠르게 돌리면 점등 시각도 당겨진다 */
const scaleSegs = (segs: VoiceTimingSegment[], rate: number): VoiceTimingSegment[] =>
  segs.map(s => ({
    ...s,
    start: s.start / rate,
    end: s.end / rate,
    subTimings: s.subTimings?.map(t => t / rate),
    words: s.words?.map(w => ({ ...w, start: w.start / rate, end: w.end / rate })),
  }))

/** 발언별 재생 배속(playbackRate)을 발화 시각 맵에 반영한다. 배속 지정 발언이 없으면 입력 그대로 */
function scaleVoiceTimings(data: DiscourseScript, vt?: VoiceTimings): VoiceTimings | undefined {
  if (!vt) return vt
  let out: VoiceTimings | undefined
  data.turns.forEach((t, i) => {
    const rate = clampRate(t.playbackRate)
    const stem = vnTimingKey(vnTurn(i, data.cast[t.cast]?.slug))
    if (rate === 1 || !vt[stem]) return
    if (!out) out = { ...vt }
    out[stem] = scaleSegs(vt[stem], rate)
  })
  return out ?? vt
}

/** discourse-data.json → 단일 언어 스크립트 */
function resolveScript(data: DiscourseScript, en: boolean, voiceTimings?: VoiceTimings): DiscourseScript {
  return {
    ...data,
    title: en ? (data.titleEn ?? data.title) : data.title,
    titleByPart: data.titleByPart,
    topic: en ? (data.topicEn ?? data.topic) : data.topic,
    // 시작문구는 영문 슬롯이 채워졌을 때만 노출 — 비어 있으면 표시하지 않는다(한글 누출 차단)
    logline: en ? data.loglineEn : data.logline,
    loglineByPart: en ? data.loglineByPartEn : data.loglineByPart,
    // 고지는 영문 슬롯이 없으면 렌더가 기본 영문 문구로 폴백한다(고지 누락 금지 — constants DEFAULT_NOTICE_EN)
    notice: en ? data.noticeEn : data.notice,
    longformLayout: data.longformLayout?.map(it =>
      'era' in it ? { era: { ...it.era, label: en ? (it.era.labelEn ?? it.era.label) : it.era.label } } : it,
    ),
    cast: data.cast.map(s => resolveSpeaker(s, en)),
    turns: data.turns.map(t => resolveTurn(t, en)),
    voiceTimings,
  }
}

/**
 * 세 파일을 한 벌로 합친다.
 * cast·turns 가 없으면 **에러를 던진다.** 빈 배열로 폴백하면 인물도 대사도 없는 영상이 조용히 나가 버린다.
 */
function loadEpisode(ctxKey: string, name: string): DiscourseScript {
  const meta = ctx(ctxKey) as Omit<DiscourseScript, 'cast' | 'turns'>
  const castKey = `./${name}/cast.json`
  const turnsKey = `./${name}/turns.json`
  if (!castCtx.keys().includes(castKey)) throw new Error(`[Discourse] ${name}: cast.json 없음`)
  if (!turnsCtx.keys().includes(turnsKey)) throw new Error(`[Discourse] ${name}: turns.json 없음`)
  return { ...meta, cast: castCtx(castKey) as Speaker[], turns: turnsCtx(turnsKey) as Turn[] }
}

for (const ctxKey of ctx.keys()) {
  const m = ctxKey.match(KEY_RE)
  if (!m) continue
  const name = m[1]
  if (!ALLOW.has(name)) continue // 등록 목록(_episodes.json)에 없는 폴더는 건너뛴다
  const data = loadEpisode(ctxKey, name)
  episodes[name] = resolveScript(data, false, scaleVoiceTimings(data, timingMaps[`${name}__ko`]))
  episodeNames[name] = name
  episodes[`${name}-en`] = resolveScript(data, true, scaleVoiceTimings(data, timingMaps[`${name}__en`]))
  episodeNames[`${name}-en`] = name
}
