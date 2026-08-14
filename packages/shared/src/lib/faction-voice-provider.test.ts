import assert from 'node:assert/strict'
import test from 'node:test'
import {
  effectiveElevenLabsVoiceId,
  factionVoiceProvider,
} from './faction-voice-provider'

test('ElevenLabs ID alone activates the ElevenLabs provider', () => {
  assert.equal(factionVoiceProvider('fCxG8OHm4STbIsWe4aT9'), 'elevenlabs')
  assert.equal(factionVoiceProvider(''), 'gemini')
  assert.equal(factionVoiceProvider(undefined), 'gemini')
})

test('episode-specific casting wins over the linked celeb profile voice', () => {
  assert.equal(effectiveElevenLabsVoiceId('episode-voice', 'profile-voice'), 'episode-voice')
  assert.equal(effectiveElevenLabsVoiceId(undefined, 'profile-voice'), 'profile-voice')
  assert.equal(effectiveElevenLabsVoiceId('   ', ' profile-voice '), 'profile-voice')
})
