import assert from 'node:assert/strict'
import test from 'node:test'
import { elevenlabsSpeechBody, fetchElevenlabsSpeech } from './elevenlabs-tts'

test('default v3 preserves style and nests speed inside voice_settings', () => {
  const body = elevenlabsSpeechBody('Hello', { speed: 0.9, stability: 0 })
  assert.equal(body.model_id, 'eleven_v3')
  assert.deepEqual(body.voice_settings, { stability: 0, similarity_boost: 0.75, speed: 0.9, style: 0.3 })
  assert.equal('speed' in body, false)
  assert.equal(elevenlabsSpeechBody('Hello', { speed: undefined }).voice_settings.speed, 1)
})

test('explicit v3 preserves style overrides while v4 omits unsupported style', () => {
  assert.equal(elevenlabsSpeechBody('Hello', { style: 0.7 }, 'eleven_v3').voice_settings.style, 0.7)
  assert.equal('style' in elevenlabsSpeechBody('Hello', {}, 'eleven_v4_turbo').voice_settings, false)
})

test('shared transport preserves provider errors for callers and encodes voice IDs', async () => {
  const original = globalThis.fetch
  const expected = new Response('quota exceeded', { status: 429 })
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.elevenlabs.io/v1/text-to-speech/voice%2Fid?output_format=mp3_44100_128')
    assert.equal(init?.method, 'POST')
    assert.equal(init?.cache, 'no-store')
    assert.equal((init?.headers as Record<string, string>)['xi-api-key'], 'test-key')
    assert.equal(JSON.parse(String(init?.body)).model_id, 'eleven_v3')
    return expected
  }
  try {
    assert.equal(await fetchElevenlabsSpeech('test-key', 'voice/id', 'Hello'), expected)
  } finally {
    globalThis.fetch = original
  }
})
