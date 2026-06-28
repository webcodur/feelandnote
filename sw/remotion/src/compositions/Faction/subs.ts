/**
 * subs.ts — 세력도(Faction) 별도 자막(.srt) 생성 SSoT
 *
 * 영상(Faction.tsx)과 동일한 컷 구성(buildCues)·동일한 발화 시각(voiceTimings)으로
 * 자막 조각(Sub[])을 만든다. SRT 파일 생성(scripts/srt/faction-srt.ts)과
 * Studio 자막 미리보기(Faction.tsx)가 이 함수를 공유해 어긋나지 않게 한다.
 *
 * 자막에 담는 것:
 *  - 인물 대사: 의미 덩어리별 실제 발화 시각으로 분할(splitSub) — 영상 점등과 같은 단위·시각.
 *  - 화면 텍스트: 시작/끝 영상 명칭 앞부분(+영상 명칭 뒷부분·시작문구), 세력 명칭 앞부분(+세력 명칭 뒷부분), 단체 명칭 앞부분(+뒷부분).
 *  - credit(직함만) 컷은 대사가 없어 자막을 만들지 않는다.
 */
import type { FactionScript } from './types'
import { buildCues, f, personQuoteEnterSec, personQuoteEndSec } from './timing'
import { vnPersonQuote, vnTimingKey } from './voice-names'
import { nameTail } from './utils'
import { splitSub, type Sub } from '../../lib/voice-timing'

/** part 우선 필드 — 쇼츠 편(part) 지정 시 그 편 값, 없으면 공통 값. */
function pick<T>(common: T | undefined, byPart: Record<number, T> | undefined, part?: number): T | undefined {
  return (part != null && byPart?.[part]) || common
}

/**
 * 한 영상(롱폼/쇼츠 part)의 자막. 영상과 동일하게 isShorts·part 로 컷을 구성한다.
 * 발화 시각은 script.voiceTimings(로더가 배속까지 반영해 주입) 를 stem 으로 조회한다.
 */
export function buildFactionSubs(script: FactionScript, isShorts: boolean, part?: number): Sub[] {
  const cues = buildCues(script, isShorts, part)
  const subs: Sub[] = []

  for (const tc of cues) {
    const c = tc.cue
    const cutStart = tc.start
    const cutEnd = tc.start + tc.duration

    // ── 시작/끝 영상 명칭 화면 — 영상 명칭 앞부분(+뒷부분), 시작 화면엔 시작문구도 ──
    if (c.kind === 'intro' || c.kind === 'outro') {
      const titleText = pick(script.title, script.titleByPart, part) ?? ''
      if (titleText.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text: titleText })
      // 시작문구는 시작 화면에만(영상 IntroCard 도 아웃트로에는 띄우지 않음). 영상 명칭 앞부분보다 살짝 늦게 떠오른다.
      if (c.kind === 'intro') {
        const logline = pick(script.logline, script.loglineByPart, part)
        if (logline?.trim()) subs.push({ start: cutStart + f(1.0), end: cutEnd, speaker: '', text: logline })
      }
      continue
    }

    // ── 세력 타이틀(로고) 카드 — 세력 명칭(앞부분\n뒷부분) ──
    if (c.kind === 'group') {
      const g = script.groups[c.groupIndex]
      const text = g.name
      if (text.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text })
      continue
    }

    // ── 화보 묶음 카드 — 단체 명칭(앞부분\n뒷부분). 묶음이 없는 세력은 세력 명칭 뒷부분을 쓴다(영상 clustersOf 와 동일) ──
    if (c.kind === 'cluster') {
      const g = script.groups[c.groupIndex]
      const cluster = g.clusters?.length ? g.clusters[c.clusterIndex] : undefined
      const text = cluster ? (cluster.label ?? '') : nameTail(g.name)
      if (text.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text })
      continue
    }

    // ── 인물 대사 ──
    if (c.kind === 'person') {
      if (!c.steps.voice) continue // 음성 스텝 꺼짐 — 대사 없음(자막 없음)
      const g = script.groups[c.groupIndex]
      const person = c.clusterIndex != null
        ? (g.clusters?.[c.clusterIndex]?.people[c.personIndex] ?? g.people[c.personIndex])
        : g.people[c.personIndex]
      if (!person) continue
      // 화면은 덩어리를 한 흐름으로 이어 표시 — 자막 원고도 공백으로 잇는다(분할은 발화 시각이 담당).
      const text = person.quoteChunks?.length ? person.quoteChunks.join(' ') : (person.quote ?? '')
      if (!text.trim()) continue
      const stem = vnTimingKey(vnPersonQuote(c.groupIndex, c.personIndex, c.clusterIndex))
      const timings = script.voiceTimings?.[stem]
      // 영상과 동일 — 대사 등장 시점부터. 켜진 리드 스텝(직함·수식어)을 다 보여준 뒤라 그만큼 늦게 시작.
      const startFrame = cutStart + f(personQuoteEnterSec(person, c.steps, isShorts))
      const endFrame = cutStart + f(personQuoteEndSec(person, c.steps, isShorts))
      subs.push(...splitSub(startFrame, endFrame, person.name, text, timings))
    }
  }

  return subs
}
