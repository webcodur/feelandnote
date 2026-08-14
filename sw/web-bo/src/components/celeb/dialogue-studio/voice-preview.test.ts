import assert from 'node:assert/strict'
import test from 'node:test'

import { celebVoicePreviewUrl, requestCelebVoicePreview } from './voice-preview'

const settings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  speed: 1,
  volumeBoost: 0,
}

test('엔진에 맞는 셀럽 미리듣기 경로를 고른다', () => {
  assert.equal(
    celebVoicePreviewUrl('yi sun/sin', 'elevenlabs'),
    '/api/celebs/yi%20sun%2Fsin/voice/preview',
  )
  assert.equal(
    celebVoicePreviewUrl('yi-sun-sin', 'gemini'),
    '/api/book-recommend/voice/gemini/preview',
  )
})

test('Gemini는 voiceName과 WAV 형식으로 요청한다', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  let requestBody: Record<string, unknown> = {}
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input)
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    return new Response(JSON.stringify({ success: true, base64: 'UklGRg==', bytes: 8 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await requestCelebVoicePreview({
      celebKey: 'yi-sun-sin',
      engine: 'gemini',
      voice: 'Charon',
      text: '나의 죽음을 적에게 알리지 마라.',
      settings,
    })

    assert.equal(requestUrl, '/api/book-recommend/voice/gemini/preview')
    assert.deepEqual(requestBody, { voiceName: 'Charon', text: '나의 죽음을 적에게 알리지 마라.' })
    assert.equal(result.success, true)
    assert.equal(result.contentType, 'audio/wav')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ElevenLabs는 voiceId와 합성 설정을 함께 보낸다', async () => {
  const originalFetch = globalThis.fetch
  let requestBody: Record<string, unknown> = {}
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    return new Response(JSON.stringify({ success: true, base64: 'SUQz', bytes: 3 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await requestCelebVoicePreview({
      celebKey: 'yi-sun-sin',
      engine: 'elevenlabs',
      voice: 'ele-voice-id',
      text: '[solemn] 나의 죽음을 적에게 알리지 마라.',
      settings,
    })

    assert.deepEqual(requestBody, {
      voiceId: 'ele-voice-id',
      text: '[solemn] 나의 죽음을 적에게 알리지 마라.',
      settings,
    })
    assert.equal(result.success, true)
    assert.equal(result.contentType, 'audio/mpeg')
  } finally {
    globalThis.fetch = originalFetch
  }
})
