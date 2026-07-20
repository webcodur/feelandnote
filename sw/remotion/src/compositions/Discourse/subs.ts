/**
 * subs.ts — 가상 담화(Discourse) 별도 자막(.srt) 생성 SSoT
 *
 * 영상(Discourse.tsx)과 **같은 컷 구성(buildCues)·같은 발화 시각(voiceTimings)·같은 발언 내부 시각(utils)** 으로
 * 자막 조각(Sub[])을 만든다. SRT 파일 생성과 Studio 자막 미리보기가 이 함수를 공유해 어긋나지 않게 한다.
 * 산식을 여기서 따로 계산하면 자막이 영상과 조금씩 밀린다(드리프트) — 반드시 공유 함수만 쓴다.
 *
 * 자막에 담는 것:
 *  - 발언: 발언마다 하나. 의미 덩어리별 실제 발화 시각으로 분할(splitSub) — 영상 점등과 같은 단위·시각.
 *  - 화면 텍스트: 시작 화면(영상 명칭·논제·시작문구), 인물 소개(이름·수식어), 장 표지.
 *  - 고지는 화면에 상시 떠 있으므로 자막으로 중복해 넣지 않는다.
 */
import type { DiscourseScript } from './types'
import { buildCues, f } from './timing'
import { vnTurn, vnTimingKey } from './voice-names'
import { turnEnterSec, turnSpeakSec, turnChunks } from './utils'
import { splitSub, type Sub } from '../../lib/voice-timing'

/** 편별 우선 필드 — 편(part) 지정 시 그 편 값, 없으면 공통 값 */
function pick<T>(common: T | undefined, byPart: Record<number, T> | undefined, part?: number): T | undefined {
  return (part != null && byPart?.[part]) || common
}

/**
 * 한 영상(롱폼 lvPart / 쇼츠 part)의 자막.
 * 발화 시각은 script.voiceTimings(로더가 배속까지 반영해 주입)를 음원 stem 으로 조회한다.
 */
export function buildDiscourseSubs(script: DiscourseScript, isShorts: boolean, part?: number, lvPart?: number): Sub[] {
  const cues = buildCues(script, isShorts, part, lvPart)
  const subs: Sub[] = []

  for (const tc of cues) {
    const c = tc.cue
    const cutStart = tc.start
    const cutEnd = tc.start + tc.duration

    // ── 시작 화면 — 영상 명칭 + 논제 + 시작문구 ──
    if (c.kind === 'intro') {
      const title = pick(pick(script.title, script.titleByLvPart, lvPart), script.titleByPart, part) ?? ''
      if (title.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text: title })
      if (script.topic?.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text: script.topic })
      const logline = pick(script.logline, script.loglineByPart, part)
      if (logline?.trim()) subs.push({ start: cutStart + f(1.0), end: cutEnd, speaker: '', text: logline })
      continue
    }

    // ── 마지막 화면 — 영상 명칭 ──
    if (c.kind === 'outro') {
      const title = pick(pick(script.title, script.titleByLvPart, lvPart), script.titleByPart, part) ?? ''
      if (title.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text: title })
      continue
    }

    // ── 장 표지 ──
    if (c.kind === 'era') {
      if (c.label.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text: c.label })
      continue
    }

    // ── 인물 소개 — 이름(+수식어) ──
    if (c.kind === 'cast') {
      const sp = script.cast[c.castIndex]
      if (!sp) continue
      const text = sp.epithet?.trim() ? `${sp.name} — ${sp.epithet}` : sp.name
      if (text.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text })
      continue
    }

    // ── 발언 ── 화면은 덩어리를 한 흐름으로 잇는다. 자막 원고도 공백으로 잇고 분할은 발화 시각에 맡긴다.
    if (c.kind === 'turn') {
      const turn = script.turns[c.turnIndex]
      const speaker = turn ? script.cast[turn.cast] : undefined
      if (!turn || !speaker) continue
      const text = turnChunks(turn).join(' ')
      if (!text.trim()) continue
      const stem = vnTimingKey(vnTurn(c.turnIndex, speaker.slug))
      const timings = script.voiceTimings?.[stem]
      // 영상과 동일 — 컷 앞 여백만큼 늦게 시작해 발화 길이만큼 흐른다.
      const startFrame = cutStart + f(turnEnterSec())
      const endFrame = startFrame + f(turnSpeakSec(turn))
      subs.push(...splitSub(startFrame, endFrame, speaker.name, text, timings))
    }
  }

  return subs
}
