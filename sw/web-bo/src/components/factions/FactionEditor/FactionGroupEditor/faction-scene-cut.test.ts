import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionSceneBeat } from '@/lib/faction-types'
import { FACTION_CUT_DEFAULT_SEC, insertFactionCut } from './faction-scene-cut'

const beats: FactionSceneBeat[] = [
  { text: '섬에 도착했다.' },
  { speakerCelebId: 'circe-id', speaker: '키르케', text: '먹고 마셔요.' },
]

test('현재 장면 안의 지정 위치에 말 없는 화면 컷을 넣는다', () => {
  const next = insertFactionCut(beats, 0)

  assert.deepEqual(next[0], {
    text: '',
    minimumSec: FACTION_CUT_DEFAULT_SEC,
  })
  assert.equal(next[1], beats[0])
  assert.equal(next[2], beats[1])
})

test('장면 끝에도 같은 컷 구조를 넣고 범위 밖 위치는 안전하게 보정한다', () => {
  const appended = insertFactionCut(beats, beats.length)
  assert.equal(appended[2]?.minimumSec, FACTION_CUT_DEFAULT_SEC)

  const clamped = insertFactionCut(beats, 99)
  assert.equal(clamped[2]?.minimumSec, FACTION_CUT_DEFAULT_SEC)
})
