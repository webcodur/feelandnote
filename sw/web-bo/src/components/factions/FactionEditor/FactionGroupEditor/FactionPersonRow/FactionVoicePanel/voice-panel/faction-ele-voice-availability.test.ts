import assert from 'node:assert/strict'
import test from 'node:test'

import { factionEleVoiceAvailability } from './faction-ele-voice-availability'

test('보이스 목록을 읽는 동안에는 오래된 ID라고 단정하지 않는다', () => {
  assert.equal(factionEleVoiceAvailability('voice-a', false, []), 'loading')
})

test('현재 ElevenLabs 계정 목록에 있는 보이스는 생성 가능하다', () => {
  assert.equal(factionEleVoiceAvailability('voice-a', true, ['voice-a', 'voice-b']), 'available')
})

test('현재 ElevenLabs 계정 목록에 없는 보이스는 경고 대상으로 판별한다', () => {
  assert.equal(factionEleVoiceAvailability('retired-voice', true, ['voice-a', 'voice-b']), 'unavailable')
})

test('보이스 ID가 비어 있으면 별도의 미선택 상태다', () => {
  assert.equal(factionEleVoiceAvailability('', true, ['voice-a']), 'missing')
})
