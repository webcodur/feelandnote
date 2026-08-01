/**
 * subs.ts — 세력도감(Faction) 별도 자막(.srt) 생성 SSoT
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
import { buildCues, f, personQuoteEnterSec, personQuoteEndSec, narratorOutroVoice, narratorVoiceText, narratorSpeakSec, NARRATOR_ENTER_SEC } from './timing'
import { vnPersonQuote, vnTimingKey } from './voice-names'
import { clustersOf } from './utils'
import { splitSub, type Sub } from '../../lib/voice-timing'

/** part 우선 필드 — 쇼츠 편(part) 지정 시 그 편 값, 없으면 공통 값. */
function pick<T>(common: T | undefined, byPart: Record<number, T> | undefined, part?: number): T | undefined {
  return (part != null && byPart?.[part]) || common
}

/**
 * 한 영상(롱폼 lvPart/쇼츠 part)의 자막. 영상과 동일하게 isShorts·part·lvPart 로 컷을 구성한다.
 * 발화 시각은 script.voiceTimings(로더가 배속까지 반영해 주입) 를 stem 으로 조회한다.
 */
export function buildFactionSubs(script: FactionScript, isShorts: boolean, part?: number, lvPart?: number): Sub[] {
  const cues = buildCues(script, isShorts, part, lvPart)
  const subs: Sub[] = []

  for (const tc of cues) {
    const c = tc.cue
    const cutStart = tc.start
    const cutEnd = tc.start + tc.duration

    // ── 시작/끝 영상 명칭 화면 — 영상 명칭 앞부분(+뒷부분), 시작 화면엔 시작문구도 ──
    if (c.kind === 'intro' || c.kind === 'outro') {
      const titleText = pick(pick(script.title, script.titleByLvPart, lvPart), script.titleByPart, part) ?? ''
      if (titleText.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text: titleText })
      // 시작문구는 시작 화면에만(영상 IntroCard 도 아웃트로에는 띄우지 않음). 영상 명칭 앞부분보다 살짝 늦게 떠오른다.
      if (c.kind === 'intro') {
        const logline = pick(pick(script.logline, script.loglineByLvPart, lvPart), script.loglineByPart, part)
        if (logline?.trim()) subs.push({ start: cutStart + f(1.0), end: cutEnd, speaker: '', text: logline })
      }
      // 마무리 화면 — 나레이터 닫는 한마디(화면 문구와 동일)
      if (c.kind === 'outro') {
        const outroText = narratorVoiceText(narratorOutroVoice(script))
        if (outroText.trim()) subs.push({ start: cutStart + f(0.3), end: cutEnd, speaker: '', text: outroText.replace(/\n/g, ' ') })
      }
      continue
    }

    // ── 나레이터 소개 컷 — 소개 대사(덩어리는 한 흐름으로 잇는다) ──
    if (c.kind === 'narrator') {
      const n = script.narrator
      const text = narratorVoiceText(n?.intro).replace(/\n/g, ' ')
      if (n && text.trim()) {
        const startFrame = cutStart + f(NARRATOR_ENTER_SEC)
        const endFrame = Math.min(cutEnd, startFrame + f(narratorSpeakSec(n.intro)))
        subs.push({ start: startFrame, end: endFrame, speaker: n.name ?? '', text })
      }
      continue
    }

    // ── 챕터 표지 — 화면 제목과 공용 낭독문이 같은 텍스트다 ──
    if (c.kind === 'chapter') {
      const text = c.chapter.title.replace(/\n/g, ' ').trim()
      if (text) subs.push({ start: cutStart, end: cutEnd, speaker: '', text })
      continue
    }

    // ── 세력 타이틀(로고) 카드 — 세력 명칭(앞부분\n뒷부분) ──
    if (c.kind === 'group') {
      const g = script.groups[c.groupIndex]
      const text = g.name
      if (text.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text })
      continue
    }

    // ── 그룹 화보 카드 — 그룹 명칭(앞부분\n뒷부분). 단일 그룹 무명 폴백은 clustersOf 가 처리(영상과 동일) ──
    if (c.kind === 'cluster') {
      const g = script.groups[c.groupIndex]
      const text = clustersOf(g)[c.clusterIndex]?.label ?? ''
      if (text.trim()) subs.push({ start: cutStart, end: cutEnd, speaker: '', text })
      continue
    }

    // ── 인물 대사 ──
    if (c.kind === 'person') {
      if (!c.steps.voice) continue // 음성 스텝 꺼짐 — 대사 없음(자막 없음)
      const g = script.groups[c.groupIndex]
      const person = g.clusters?.[c.clusterIndex]?.people[c.personIndex]
      if (!person) continue
      // 화면은 덩어리를 한 흐름으로 이어 표시 — 자막 원고도 공백으로 잇는다(분할은 발화 시각이 담당).
      const text = person.quoteChunks?.length ? person.quoteChunks.join(' ') : (person.quote ?? '')
      if (!text.trim()) continue
      const stem = vnTimingKey(vnPersonQuote(c.groupIndex, c.personIndex, c.clusterIndex))
      const timings = script.voiceTimings?.[stem]
      // 영상과 동일 — 대사 등장 시점부터. 켜진 리드 스텝(직함·수식어)을 다 보여준 뒤라 그만큼 늦게 시작.
      const startFrame = cutStart + f(personQuoteEnterSec(person, c.steps, isShorts, { script }))
      const endFrame = cutStart + f(personQuoteEndSec(person, c.steps, isShorts, { script }))
      subs.push(...splitSub(startFrame, endFrame, person.name, text, timings))
    }
  }

  return subs
}
