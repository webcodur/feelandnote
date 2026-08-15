import assert from 'node:assert/strict'
import test from 'node:test'
import {
  effectiveElevenLabsVoiceId,
  factionVoiceProvider,
  fixedFactionOpeningVoiceId,
  withFixedFactionOpeningVoice,
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

test('every faction opening uses the fixed professional voice actor', () => {
  assert.equal(fixedFactionOpeningVoiceId('myth-Greek'), 'kqVT88a5QfII1HNAEPTJ')
  assert.deepEqual(
    withFixedFactionOpeningVoice('myth-Greek', {
      quoteElevenlabsVoiceId: 'accidental-other-voice',
      quotePlaybackRate: 0.95,
    }),
    {
      quoteElevenlabsVoiceId: 'kqVT88a5QfII1HNAEPTJ',
      quotePlaybackRate: 0.95,
    },
  )
  assert.deepEqual(
    withFixedFactionOpeningVoice('Homer-Odyssey', {
      quoteElevenlabsVoiceId: 'episode-voice',
    }),
    { quoteElevenlabsVoiceId: 'kqVT88a5QfII1HNAEPTJ' },
  )
  assert.equal(fixedFactionOpeningVoiceId(''), undefined)
})
