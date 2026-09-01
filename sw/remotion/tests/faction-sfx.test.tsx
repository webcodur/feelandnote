import assert from 'node:assert/strict'
import test from 'node:test'
import { sceneSfxVolume } from '../src/compositions/Faction/FactionSfx'
import { beatSfxsOf } from '../src/compositions/Faction/timing'

test('한 장면 컷의 여러 SFX를 같은 컷 안에서 각각 재생한다', () => {
  assert.deepEqual(
    beatSfxsOf({
      text: '활시위를 놓는다.',
      sfxs: [
        { file: 'bow-string.mp3', startPercent: 20 },
        { file: 'bow-arrow-body.mp3', startPercent: 70 },
      ],
    }),
    [
      { file: 'bow-string.mp3', startPercent: 20 },
      { file: 'bow-arrow-body.mp3', startPercent: 70 },
    ],
  )
})

test('기존 단일 sfx 필드도 계속 재생한다', () => {
  assert.deepEqual(
    beatSfxsOf({ text: '폭풍이 몰아친다.', sfx: 'storm.wav', sfxStartPercent: 45 }),
    [{ file: 'storm.wav', startPercent: 45 }],
  )
})

test('효과음 음량은 게인이 없으면 기본값 그대로다', () => {
  const base = sceneSfxVolume()
  assert.equal(base, 0.5)
  assert.equal(sceneSfxVolume(0), base)
})

test('효과음 게인은 줄이는 쪽도 키우는 쪽도 반영한다', () => {
  const base = sceneSfxVolume()
  // +6dB는 약 2배, -6dB는 약 0.5배 — 음성 게인과 같은 dB 규약이다.
  assert.ok(Math.abs(sceneSfxVolume(6) / base - 2) < 0.01)
  assert.ok(Math.abs(sceneSfxVolume(-6) / base - 0.5) < 0.01)
  // 기본 음량이 0.5라 +6dB는 1을 넘는다 — Remotion Audio는 이 증량을 그대로 받는다.
  assert.ok(sceneSfxVolume(12) > 1)
})
