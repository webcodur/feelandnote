import type { FactionScript } from './types'
import {
  CHAPTER_VOICE_DELAY_SEC,
  NARRATOR_ENTER_SEC,
  NARRATOR_LOGLINE_DELAY_SEC,
  chapterNarrationVoice,
  epithetIsNarrated,
  f,
  narratorOpeningVoice,
  narratorVoicePlaySec,
  personLeadTiming,
  personOfCue,
  personQuoteEnterSec,
  sceneBeatAudioPlaySec,
  sceneBeatsOf,
  sceneTimingInputOf,
  type TimedCue,
} from './timing'
import { clampRate } from './voice-names'
import { factionSceneBeatTimings } from '@feelandnote/shared/lib/faction-scene-timing'

/** 사람 목소리가 나는 구간 — 전역 프레임 [시작, 끝) */
export type VoiceWindow = [start: number, end: number]

/**
 * 영상 안에서 사람 목소리가 나는 모든 구간. BGM 더킹이 이걸 기준으로 음악을 낮춘다.
 * 인물 대사만이 아니라 시작문구·나레이터 소개·챕터 제목 낭독·수식어 낭독, 그리고 장면 컷의 해설·미할당 화자 음성까지 전부다.
 * 각 카드가 음원을 재생하는 시각과 같은 산식이어야 한다 — 카드 쪽 시작 시각을 바꾸면 여기도 같이 바꾼다.
 *   intro     IntroCard      NARRATOR_LOGLINE_DELAY_SEC 뒤 시작문구 낭독
 *   narrator  NarratorCard   NARRATOR_ENTER_SEC 뒤 소개 낭독
 *   chapter   ChapterCard    CHAPTER_VOICE_DELAY_SEC 뒤 제목 낭독
 *   person    PersonCard     수식어 낭독(epithetStartSec) · 대사(quoteEnterSec)
 *   scene     NarrativeEntryCard  덩어리마다 본문 시작(textStartSec)에 음원
 */
export function factionVoiceWindows(script: FactionScript, cues: ReadonlyArray<TimedCue>, portrait: boolean): VoiceWindow[] {
  const windows: VoiceWindow[] = []
  const push = (startF: number, playSec: number) => {
    if (playSec > 0) windows.push([startF, startF + f(playSec)])
  }
  for (const tc of cues) {
    const c = tc.cue
    switch (c.kind) {
      case 'intro':
        push(tc.start + f(NARRATOR_LOGLINE_DELAY_SEC), narratorVoicePlaySec(narratorOpeningVoice(script)))
        break
      case 'narrator':
        push(tc.start + f(NARRATOR_ENTER_SEC), narratorVoicePlaySec(script.narrator?.intro))
        break
      case 'chapter':
        push(tc.start + f(CHAPTER_VOICE_DELAY_SEC), narratorVoicePlaySec(chapterNarrationVoice(script, c.chapter)))
        break
      case 'person': {
        const p = personOfCue(script, c)
        if (!p) break
        const lead = personLeadTiming(p, c.steps, portrait, { script })
        if (lead.epiOn && epithetIsNarrated(p, portrait) && p.epithetDuration && p.epithetDuration > 0) {
          push(tc.start + f(lead.epithetStartSec), p.epithetDuration / clampRate(p.epithetPlaybackRate))
        }
        // 음성 스텝이 켜진 컷만 대사 음원을 튼다.
        if (c.steps.voice && p.quoteDuration && p.quoteDuration > 0) {
          push(tc.start + f(personQuoteEnterSec(p, c.steps, portrait, { script })), p.quoteDuration / clampRate(p.quotePlaybackRate))
        }
        break
      }
      case 'scene': {
        const beats = sceneBeatsOf(c.scene)
        const timings = factionSceneBeatTimings(sceneTimingInputOf(c.scene, script.captionIdHoldSec))
        timings.forEach((timing, index) => {
          const beat = beats[index]
          if (!beat?.text?.trim()) return
          push(tc.start + f(timing.textStartSec), sceneBeatAudioPlaySec(beat))
        })
        break
      }
      default:
        break
    }
  }
  return windows.sort((a, b) => a[0] - b[0])
}
