import assert from 'node:assert/strict'
import test from 'node:test'
import { factionVoiceWindows } from '../src/compositions/Faction/voice-windows'
import { NARRATOR_ENTER_SEC, NARRATOR_LOGLINE_DELAY_SEC, f, sceneTimingInputOf, type TimedCue } from '../src/compositions/Faction/timing'
import { factionSceneBeatTimings } from '@feelandnote/shared/lib/faction-scene-timing'
import type { FactionPerson, FactionScript } from '../src/compositions/Faction/types'

/**
 * BGM 더킹 구간 — 인물 대사뿐 아니라 장면 컷의 해설·미할당 화자 음성, 나레이터·시작문구 낭독도 잡아야 한다.
 * 예전엔 인물 대사·챕터 낭독만 잡아 해설이 나올 때 음악이 그대로 컸다.
 */

const scene = {
  isPerson: false,
  name: '장면',
  beats: [
    { text: '동굴에 들어선다.', voiceDuration: 2, voicePlaybackRate: 1 },
    { speaker: '거인의 동료들', text: '아버지에게나 도와달라고 해라.', voiceDuration: 3, voicePlaybackRate: 1.5 },
    { text: '음원 없는 해설.' },
  ],
} as unknown as FactionPerson

const script = {
  groups: [],
  narrator: { intro: { quote: '소개', quoteDuration: 4 }, logline: { quote: '시작문구', quoteDuration: 2.5 } },
  loglineKo: '시작문구',
  logline: '시작문구',
} as unknown as FactionScript

test('장면 컷의 해설·미할당 화자 음성이 본문 시작 시각부터 더킹 구간이 된다', () => {
  const cue: TimedCue = { cue: { kind: 'scene', scene, groupIndex: 0, clusterIndex: 0 }, start: 1000, duration: 900 }
  const timings = factionSceneBeatTimings(sceneTimingInputOf(scene, undefined))
  const windows = factionVoiceWindows(script, [cue], true)

  assert.equal(windows.length, 2)
  assert.deepEqual(windows[0], [1000 + f(timings[0].textStartSec), 1000 + f(timings[0].textStartSec) + f(2)])
  // 배속 1.5 → 실제 재생 2초
  assert.deepEqual(windows[1], [1000 + f(timings[1].textStartSec), 1000 + f(timings[1].textStartSec) + f(2)])
})

test('나레이터 소개 컷은 소개 낭독 구간이 더킹 대상이다', () => {
  const cue: TimedCue = { cue: { kind: 'narrator' }, start: 300, duration: 400 }
  assert.deepEqual(factionVoiceWindows(script, [cue], true), [[300 + f(NARRATOR_ENTER_SEC), 300 + f(NARRATOR_ENTER_SEC) + f(4)]])
})

test('시작 화면의 시작문구 낭독도 잡는다 — 음원이 없으면 구간이 없다', () => {
  const cue: TimedCue = { cue: { kind: 'intro' }, start: 0, duration: 200 }
  const windows = factionVoiceWindows(script, [cue], true)
  assert.equal(windows.length, 1)
  assert.equal(windows[0][0], f(NARRATOR_LOGLINE_DELAY_SEC))
  assert.deepEqual(factionVoiceWindows({ ...script, narrator: undefined } as FactionScript, [cue], true), [])
})
