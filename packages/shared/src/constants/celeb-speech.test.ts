import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CELEB_DIALOGUE_SITUATIONS,
  CELEB_DIALOGUE_VARIANTS,
  CELEB_SPEECH_TONES,
  isCelebSpeechTone,
} from './celeb-speech'

test('celeb speech values have one complete shared definition', () => {
  assert.deepEqual(CELEB_SPEECH_TONES, [
    'loyal', 'composed', 'bold', 'humble', 'gentle', 'free',
  ])
  assert.deepEqual(CELEB_DIALOGUE_SITUATIONS, [
    'greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack',
  ])
  assert.deepEqual(CELEB_DIALOGUE_VARIANTS, [1, 2, 3])
  assert.equal(isCelebSpeechTone('free'), true)
  assert.equal(isCelebSpeechTone('other'), false)
})
