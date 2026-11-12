import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareAudioForSave, prepareAudioPreview } from './audio'

test('음성 디코딩은 성공·실패 모두 오디오 장치를 해제한다', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  try {
    for (const task of ['preview', 'save']) {
    for (const fail of [false, true]) {
      let active = 0
      const samples = new Float32Array([0.1, -0.1, 0.2])
      const decoded = {
        duration: samples.length / 48000, sampleRate: 48000,
        length: samples.length, numberOfChannels: 1, getChannelData: () => samples,
      } as unknown as AudioBuffer
      const failure = new Error('잘못된 음원')
      class Decoder {
        constructor() { active++ }
        async decodeAudioData() {
          if (fail) throw failure
          return decoded
        }
        async close() { active-- }
      }
      Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Decoder })
      const run = async () => {
        if (task === 'save') return prepareAudioForSave('AA==', 'mp3', 0)
        const preview = await prepareAudioPreview('AA==', 'wav', 0)
        URL.revokeObjectURL(preview.blobUrl)
        return preview.base64
      }
      if (fail) await assert.rejects(run(), failure)
      else assert.ok(await run())
      assert.equal(active, 0, '닫히지 않은 AudioContext가 남으면 안 된다')
    }
    }
  } finally {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  }
})
