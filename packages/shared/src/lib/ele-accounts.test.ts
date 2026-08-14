import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getEleAccountConfigIssues,
  getEleAccounts,
  isElevenLabsSecretKey,
  resolveEleAccountForVoice,
} from './ele-accounts'

const ENV_NAMES = ['ELEVENLABS_API_KEY', 'ELEVENLABS_API_KEY_FEELANDNOTE'] as const

function withEleEnv(
  values: Partial<Record<(typeof ENV_NAMES)[number], string | undefined>>,
  run: () => void | Promise<void>,
): Promise<void> {
  const before = Object.fromEntries(ENV_NAMES.map(name => [name, process.env[name]]))
  return (async () => {
    try {
      for (const name of ENV_NAMES) {
        const value = values[name]
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
      await run()
    } finally {
      for (const name of ENV_NAMES) {
        const value = before[name]
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
    }
  })()
}

test('ElevenLabs 비밀 키는 sk_ 접두사를 가져야 한다', () => {
  assert.equal(isElevenLabsSecretKey('sk_valid-secret'), true)
  assert.equal(isElevenLabsSecretKey('0123456789abcdef'.repeat(4)), false)
  assert.equal(isElevenLabsSecretKey(''), false)
})

test('API Key ID를 계정 키로 등록하지 않고 환경변수 이름으로 진단한다', async () => {
  await withEleEnv({
    ELEVENLABS_API_KEY: '0123456789abcdef'.repeat(4),
    ELEVENLABS_API_KEY_FEELANDNOTE: 'sk_valid-secret',
  }, () => {
    assert.deepEqual(getEleAccountConfigIssues(), [{
      id: 'default',
      label: '기본',
      envVar: 'ELEVENLABS_API_KEY',
      reason: 'api-key-id',
    }])
    assert.deepEqual(getEleAccounts().map(account => account.id), ['feelandnote'])
  })
})

test('명시한 계정의 키가 잘못됐으면 다른 계정으로 우회하지 않는다', async () => {
  await withEleEnv({
    ELEVENLABS_API_KEY: '0123456789abcdef'.repeat(4),
    ELEVENLABS_API_KEY_FEELANDNOTE: 'sk_valid-secret',
  }, async () => {
    assert.equal(await resolveEleAccountForVoice('voice-id', 'default'), null)
  })
})
