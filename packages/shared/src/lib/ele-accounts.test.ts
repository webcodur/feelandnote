import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getEleAccountConfigIssues,
  getEleAccounts,
  getEleAccountById,
  getEleAccountSetupError,
  eleAccountLabel,
  isElevenLabsSecretKey,
  resolveEleAccountForVoice,
} from './ele-accounts'

function withEleEnv(
  values: Record<string, string | undefined>,
  run: () => void | Promise<void>,
): Promise<void> {
  const names = [...new Set([...Object.keys(process.env), ...Object.keys(values)])]
    .filter(name => /^ELEVENLABS_API_KEY(?:_|$)/.test(name) || name === 'ELEVENLABS_DEFAULT_ACCOUNT')
  const before = Object.fromEntries(names.map(name => [name, process.env[name]]))
  return (async () => {
    try {
      for (const name of names) {
        const value = values[name]
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
      await run()
    } finally {
      for (const name of names) {
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

test('추가 계정을 자동 발견하고 기존 계정 우선·숫자 순서를 유지한다', async () => {
  await withEleEnv({
    ELEVENLABS_API_KEY_10: 'sk_ten',
    ELEVENLABS_API_KEY_NOMAD: ' sk_nomad ',
    ELEVENLABS_API_KEY_FEELANDNOTE: 'sk_feelandnote',
    ELEVENLABS_API_KEY_2: 'sk_two',
    ELEVENLABS_API_KEY: 'sk_base',
    ELEVENLABS_API_KEY_EMPTY: '',
    ELEVENLABS_API_KEY_DEFAULT: 'sk_reserved',
  }, () => {
    assert.deepEqual(getEleAccounts().map(account => account.id), ['webcodur', 'feelandnote', '2', '10', 'nomad'])
    assert.deepEqual(getEleAccountById('nomad'), { id: 'nomad', label: 'n...d', apiKey: 'sk_nomad' })
    assert.equal(getEleAccountById('unknown'), undefined)
  })
})

test('추가 계정의 잘못된 키를 진단하며 오류에 비밀값을 싣지 않는다', async () => {
  await withEleEnv({ ELEVENLABS_API_KEY_NOMAD: 'invalid-private-value' }, () => {
    assert.deepEqual(getEleAccounts(), [])
    assert.deepEqual(getEleAccountConfigIssues(), [{
      id: 'nomad', label: 'nomad', envVar: 'ELEVENLABS_API_KEY_NOMAD', reason: 'invalid-format',
    }])
    assert.ok(!getEleAccountSetupError().includes('invalid-private-value'))
  })
})

test('추가 계정을 명시하면 그 키만 선택하고 미등록 계정으로는 생성하지 않는다', async () => {
  await withEleEnv({ ELEVENLABS_API_KEY: 'sk_base', ELEVENLABS_API_KEY_NOMAD: 'sk_nomad' }, async () => {
    assert.equal((await resolveEleAccountForVoice('voice-id', 'nomad'))?.apiKey, 'sk_nomad')
    assert.equal(await resolveEleAccountForVoice('voice-id', 'unknown'), null)
  })
})

test('기본 계정 설정으로 순서를 바꾸고 미등록·잘못된 키 계정은 거부한다', async () => {
  await withEleEnv({
    ELEVENLABS_API_KEY: 'sk_base', ELEVENLABS_API_KEY_NOMAD: 'sk_nomad', ELEVENLABS_DEFAULT_ACCOUNT: 'nomad',
  }, () => {
    assert.deepEqual(getEleAccounts().map(account => account.id), ['nomad', 'webcodur'])
    process.env.ELEVENLABS_DEFAULT_ACCOUNT = 'unknown'
    assert.throws(getEleAccounts, /ELEVENLABS_DEFAULT_ACCOUNT/)
    process.env.ELEVENLABS_DEFAULT_ACCOUNT = 'nomad'
    process.env.ELEVENLABS_API_KEY_NOMAD = 'invalid-private-value'
    assert.throws(getEleAccounts, /ELEVENLABS_DEFAULT_ACCOUNT/)
  })
})

test('API Key ID를 계정 키로 등록하지 않고 환경변수 이름으로 진단한다', async () => {
  await withEleEnv({
    ELEVENLABS_API_KEY: '0123456789abcdef'.repeat(4),
    ELEVENLABS_API_KEY_FEELANDNOTE: 'sk_valid-secret',
  }, () => {
    assert.deepEqual(getEleAccountConfigIssues(), [{
      id: 'webcodur',
      label: 'webcodur',
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

test('세 계정의 표시명을 축약하고 기존 default 선택도 webcodur로 연결한다', async () => {
  await withEleEnv({
    ELEVENLABS_API_KEY_WEBCODUR: 'sk_webcodur',
    ELEVENLABS_API_KEY_FEELANDNOTE: 'sk_feelandnote',
    ELEVENLABS_API_KEY_TLWNS5598: 'sk_tlwns5598',
    ELEVENLABS_DEFAULT_ACCOUNT: 'default',
  }, async () => {
    assert.deepEqual(getEleAccounts().map(({ id, label }) => ({ id, label })), [
      { id: 'webcodur', label: 'web...dur' },
      { id: 'feelandnote', label: 'fee...ote' },
      { id: 'tlwns5598', label: 'tlw...598' },
    ])
    assert.equal(eleAccountLabel('default'), 'web...dur')
    assert.equal((await resolveEleAccountForVoice('voice-id', 'default'))?.id, 'webcodur')
    assert.equal((await resolveEleAccountForVoice('voice-id', 'tlwns5598'))?.apiKey, 'sk_tlwns5598')
  })
})

test('webcodur 이름의 새 키를 우선하고 잘못된 새 키를 옛 키로 우회하지 않는다', async () => {
  await withEleEnv({ ELEVENLABS_API_KEY: 'sk_old', ELEVENLABS_API_KEY_WEBCODUR: 'sk_new' }, () => {
    assert.deepEqual(getEleAccounts(), [{ id: 'webcodur', label: 'web...dur', apiKey: 'sk_new' }])
    process.env.ELEVENLABS_API_KEY_WEBCODUR = 'invalid-private-value'
    assert.deepEqual(getEleAccounts(), [])
    assert.equal(getEleAccountConfigIssues()[0]?.envVar, 'ELEVENLABS_API_KEY_WEBCODUR')
  })
})
