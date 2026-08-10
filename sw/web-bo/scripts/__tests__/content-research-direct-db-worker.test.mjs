import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { Readable } from 'node:stream'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { contentResearchFingerprint } from '../lib/content-research-direct-contract.mjs'
import {
  executeContentResearchCommand,
  parseContentResearchArgs,
  readContentResearchJsonStdin,
  waitForExternalProviderSlot,
} from '../content-research-db-worker.mjs'

const text = { type: 'string', format: 'text' }
const uuid = { type: 'string', format: 'uuid' }
const integer = { type: 'integer', format: 'integer' }
const boolean = { type: 'boolean', format: 'boolean' }
const jsonb = { format: 'jsonb' }
const uuidArray = { type: 'array', format: 'uuid[]' }
const celebId = '11111111-1111-1111-1111-111111111111'
const runId = '22222222-2222-2222-2222-222222222222'
const claimToken = '33333333-3333-3333-3333-333333333333'

function rpcPath(required = [], optional = {}, types = {}) {
  const names = [...required, ...Object.keys(optional)]
  return { post: { parameters: [{
    in: 'body', name: 'args', required: true,
    schema: {
      type: 'object',
      properties: Object.fromEntries(names.map((name) => [name, types[name] ?? optional[name] ?? text])),
      ...(required.length ? { required } : {}),
    },
  }] } }
}

function openApiFixture() {
  const paths = {
    enqueue_celeb_content_research_jobs: rpcPath(['p_celeb_ids'], { p_reason: text }, { p_celeb_ids: uuidArray }),
    claim_next_celeb_content_research: rpcPath(['p_worker'], { p_lease_minutes: integer }, { p_worker: text }),
    renew_celeb_content_research_lease: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token'], { p_lease_minutes: integer },
      { p_celeb_id: uuid, p_worker: text, p_claim_token: uuid },
    ),
    complete_celeb_content_research_direct: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token', 'p_research_fingerprint', 'p_research_payload'], {},
      { p_celeb_id: uuid, p_worker: text, p_claim_token: uuid, p_research_fingerprint: text, p_research_payload: jsonb },
    ),
    fail_celeb_content_research: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token', 'p_error'],
      { p_retry: boolean, p_skip: boolean, p_research_payload: jsonb },
      { p_celeb_id: uuid, p_worker: text, p_claim_token: uuid, p_error: text },
    ),
    requeue_celeb_content_research: rpcPath(
      ['p_celeb_id', 'p_reason'], { p_reset_attempts: boolean }, { p_celeb_id: uuid, p_reason: text },
    ),
    get_celeb_content_research_status: rpcPath(),
    reserve_external_provider_request: rpcPath(
      ['p_provider', 'p_worker', 'p_request_token'], { p_min_interval_ms: integer },
      { p_provider: text, p_worker: text, p_request_token: uuid },
    ),
  }
  return {
    swagger: '2.0',
    paths: Object.fromEntries(Object.entries(paths).map(([name, path]) => [`/rpc/${name}`, path])),
  }
}

function profileSnapshot() {
  return {
    id: celebId,
    slug: 'worker-test',
    nickname: '작업 시험',
    nicknameEn: 'Worker Test',
    profession: 'writer',
    nationality: 'KR',
    birthDate: '1980',
    deathDate: null,
    wikidataQid: null,
    publicationStatus: 'inactive',
    celebTier: 'light',
  }
}

function source(contentType) {
  return {
    url: `https://example.com/${contentType.toLowerCase()}-search`,
    sourceTier: 'primary',
    sourceKind: 'interview',
    accessStatus: 'accessible',
    supportsCandidate: false,
    title: `${contentType} source`,
    notes: 'The source was checked directly and did not name an eligible external work.',
    checkedAt: '2026-08-10T08:00:00+09:00',
  }
}

function emptyPayload() {
  return {
    profileSnapshot: profileSnapshot(),
    nameVariants: ['작업 시험', 'Worker Test'],
    homonymNotes: '공식 프로필과 생년·직군을 대조해 조사 대상을 특정하고 동명이인을 제외했다.',
    summary: '네 유형을 모두 확인했으나 직접 감상 근거를 충족한 외부 작품은 없었다.',
    scopes: ['BOOK', 'VIDEO', 'GAME', 'MUSIC'].map((contentType) => ({
      contentType,
      status: 'completed',
      searchNotes: `${contentType} 범위를 이름 변형과 직접 출처 중심으로 모두 확인했다.`,
      scopeSources: [source(contentType)],
      candidates: [],
    })),
  }
}

function musicPayload() {
  const payload = emptyPayload()
  const musicScope = payload.scopes.find((scope) => scope.contentType === 'MUSIC')
  musicScope.scopeSources[0].supportsCandidate = true
  musicScope.candidates = [{
    candidateKey: 'music-itunes-12345',
    decision: 'eligible',
    title: 'Verified Track',
    creator: 'Verified Artist',
    evidenceSummary: 'The subject directly named this track and described listening to it.',
    rejectionReason: null,
    content: {
      type: 'MUSIC',
      externalSource: 'itunes',
      externalId: 'itunes-12345',
      subtype: 'song',
      releaseDate: '2020-01-01',
      metadata: { previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a' },
      locales: ['ko', 'en'].map((locale) => ({
        locale,
        title: 'Verified Track',
        creator: 'Verified Artist',
        thumbnailUrl: 'https://is1-ssl.mzstatic.com/image/thumb/cover.jpg',
        description: null,
        isbn: null,
        publisher: null,
        verified: true,
        sources: { primary: 'itunes' },
      })),
    },
    sources: [{ ...source('MUSIC'), supportsCandidate: true }],
  }]
  return payload
}

function baseEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
  }
}

test('parser supports memory-only commands and rejects paths, duplicates and ambiguous fail modes', () => {
  const enqueue = parseContentResearchArgs(['enqueue', '--celeb-id', celebId, '--reason=canary'])
  assert.deepEqual(enqueue.celebIds, [celebId])
  assert.equal(parseContentResearchArgs(['claim', '--worker=lane-1', '--lease-minutes=90']).leaseMinutes, 90)
  assert.equal(parseContentResearchArgs(['renew', '--claim-token', claimToken]).command, 'renew')
  assert.equal(parseContentResearchArgs(['commit']).command, 'commit')
  assert.equal(parseContentResearchArgs(['status']).command, 'status')
  assert.equal(parseContentResearchArgs([
    'provider-slot', '--provider', 'openlibrary', '--worker', 'lane-1', '--min-interval-ms', '2000',
  ]).minIntervalMs, 2_000)
  assert.throws(() => parseContentResearchArgs(['commit', 'payload.json']), /positional\/file arguments are forbidden/)
  assert.throws(() => parseContentResearchArgs(['status', '--worker', 'ignored']), /not valid for status/)
  assert.throws(() => parseContentResearchArgs(['claim', '--worker', 'one', '--worker', 'two']), /only once/)
  assert.throws(() => parseContentResearchArgs(['fail', '--retry', '--skip']), /mutually exclusive/)
  assert.throws(
    () => parseContentResearchArgs(['provider-slot', '--min-interval-ms', '1099']),
    /1100 through 60000/,
  )
})

test('stdin reader parses one bounded JSON object and never needs a path', async () => {
  assert.deepEqual(await readContentResearchJsonStdin(Readable.from(['{"ok":', 'true}'])), { ok: true })
  await assert.rejects(() => readContentResearchJsonStdin(Readable.from([])), /requires one JSON object on stdin/)
  await assert.rejects(() => readContentResearchJsonStdin(Readable.from(['[]'])), /root must be an object/)
  await assert.rejects(() => readContentResearchJsonStdin(Readable.from(['not json'])), /not valid JSON/)
})

test('stdin accepts exactly 4 MiB and rejects 4 MiB plus one byte', async () => {
  const maximum = 4 * 1024 * 1024
  const exact = JSON.stringify({ value: 'x'.repeat(maximum - 12) })
  const over = JSON.stringify({ value: 'x'.repeat(maximum - 11) })
  assert.equal(Buffer.byteLength(exact), maximum)
  assert.equal(Buffer.byteLength(over), maximum + 1)
  assert.equal((await readContentResearchJsonStdin(Readable.from([exact]))).value.length, maximum - 12)
  await assert.rejects(
    () => readContentResearchJsonStdin(Readable.from([over])),
    /exceeds 4194304 bytes/,
  )
})

test('--help emits one JSON object on stdout without requiring DB credentials', () => {
  const script = fileURLToPath(new URL('../content-research-db-worker.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8', env: {} })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  const output = JSON.parse(result.stdout)
  assert.equal(output.command, 'help')
  assert.match(output.usage, /Only commit consumes JSON/)
})

test('claim returns the exact DB capability on stdout data and sends no local artifact argument', async () => {
  let claimArgs
  const row = {
    celeb_id: celebId,
    slug: 'worker-test',
    nickname: '작업 시험',
    nickname_en: 'Worker Test',
    profession: 'writer',
    nationality: 'KR',
    birth_date: '1980',
    death_date: null,
    wikidata_qid: null,
    run_id: runId,
    priority: 0,
    attempt_count: 1,
    claim_token: claimToken,
    profile_snapshot: profileSnapshot(),
    claimed_at: '2026-08-10T00:00:00Z',
    lease_expires_at: '2026-08-10T01:00:00Z',
  }
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    if (url.includes('/rpc/claim_next_celeb_content_research')) {
      claimArgs = JSON.parse(init.body)
      return new Response(JSON.stringify([row]), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  const result = await executeContentResearchCommand({
    argv: ['claim', '--worker', 'lane-1', '--lease-minutes', '45'],
    env: baseEnv(),
    fetchImpl,
  })
  assert.deepEqual(claimArgs, { p_worker: 'lane-1', p_lease_minutes: 45 })
  assert.deepEqual(result.result, row)
  assert.equal(result.result.claim_token, claimToken)
})

test('commit validates stdin, computes its stable fingerprint and sends one exact RPC payload', async () => {
  const payload = emptyPayload()
  const fingerprint = contentResearchFingerprint(payload)
  let commitArgs
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    if (url.includes('/rpc/complete_celeb_content_research_direct')) {
      commitArgs = JSON.parse(init.body)
      return new Response(JSON.stringify({
        status: 'completed',
        celebId,
        runId,
        actualContentCount: 0,
        finalResearchStatus: 'confirmed_empty',
        contentsCreated: 0,
        linksCreated: 0,
        musicCandidatesUpserted: 0,
        musicFindingsRecorded: 0,
        researchFingerprint: fingerprint,
      }), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  const result = await executeContentResearchCommand({
    argv: ['commit', '--worker', 'lane-1', '--celeb-id', celebId, '--claim-token', claimToken],
    env: baseEnv(),
    stdinText: JSON.stringify(payload),
    fetchImpl,
  })
  assert.equal(result.classification.confirmedEmptyCandidate, true)
  assert.equal(commitArgs.p_research_fingerprint, fingerprint)
  assert.deepEqual(commitArgs.p_research_payload, payload)
  assert.deepEqual(Object.keys(commitArgs).sort(), [
    'p_celeb_id', 'p_claim_token', 'p_research_fingerprint', 'p_research_payload', 'p_worker',
  ])
})

test('commit fails closed before the RPC when eligible MUSIC would be deferred', async () => {
  let commitCalled = false
  const fetchImpl = async (url) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    if (url.includes('/rpc/complete_celeb_content_research_direct')) commitCalled = true
    throw new Error(`unexpected URL: ${url}`)
  }
  await assert.rejects(
    () => executeContentResearchCommand({
      argv: ['commit', '--worker', 'lane-1', '--celeb-id', celebId, '--claim-token', claimToken],
      env: baseEnv(),
      stdinText: JSON.stringify(musicPayload()),
      fetchImpl,
    }),
    (error) => error?.code === 'MUSIC_IMMEDIATE_FINALIZATION_REQUIRED'
      && /stages pending candidates/.test(error.message),
  )
  assert.equal(commitCalled, false)
})

test('fail explicitly distinguishes retry, terminal failure and skip without stdin files', async () => {
  const received = []
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    if (url.includes('/rpc/fail_celeb_content_research')) {
      const failArgs = JSON.parse(init.body)
      received.push(failArgs)
      const status = failArgs.p_retry ? 'pending' : failArgs.p_skip ? 'skipped' : 'failed'
      return new Response(JSON.stringify({
        status,
        celebId, runId, claimToken, error: failArgs.p_error,
        retryExhausted: false,
        retryNotBefore: status === 'pending' ? '2026-08-10T00:00:30Z' : null,
      }), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  const common = ['fail', '--worker', 'lane-1', '--celeb-id', celebId, '--claim-token', claimToken, '--error', 'permanent']
  for (const disposition of ['retry', 'terminal', 'skip']) {
    const result = await executeContentResearchCommand({
      argv: [...common, `--${disposition}`],
      env: baseEnv(),
      fetchImpl,
    })
    assert.equal(result.disposition, disposition)
  }
  assert.deepEqual(received.map(({ p_retry, p_skip }) => ({ p_retry, p_skip })), [
    { p_retry: true, p_skip: false },
    { p_retry: false, p_skip: false },
    { p_retry: false, p_skip: true },
  ])
  assert.ok(received.every((args) => args.p_research_payload === null))
  await executeContentResearchCommand({
    argv: [
      'fail', '--worker', 'lane-1', '--celeb-id', celebId, '--claim-token', claimToken,
      '--error', 'Bearer durable-token', '--terminal',
    ],
    env: baseEnv(),
    fetchImpl,
  })
  assert.equal(received[3].p_error, 'Bearer [REDACTED]')
  await assert.rejects(() => executeContentResearchCommand({
    argv: common,
    env: baseEnv(),
    fetchImpl,
  }), /requires exactly one/)
})

test('renew, requeue and status send exact RPC args and validate exact responses', async () => {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    const args = JSON.parse(init.body)
    calls.push({ url, args })
    if (url.includes('/rpc/renew_celeb_content_research_lease')) {
      return new Response(JSON.stringify({
        status: 'in_progress', celebId, claimToken, leaseExpiresAt: '2026-08-10T01:00:00Z',
      }), { status: 200 })
    }
    if (url.includes('/rpc/requeue_celeb_content_research')) {
      return new Response(JSON.stringify({
        status: 'pending', celebId, generation: 2, attemptCount: 0, reason: 'manual audit',
      }), { status: 200 })
    }
    if (url.includes('/rpc/get_celeb_content_research_status')) {
      return new Response(JSON.stringify({
        taskType: 'content_research_v1',
        queue: {
          total: 1, pending: 1, inProgress: 0, completed: 0,
          failed: 0, skipped: 0, expiredLeases: 0,
        },
        researchRuns: { inProgress: 0, completed: 0, cancelled: 0 },
        integrity: {
          activeQueueWithoutRun: 0,
          activeRunWithoutQueue: 0,
          completedQueueWithoutClosedRun: 0,
          musicDeferredQueueWithoutVerifiedFinding: 0,
          verifiedMusicFindingWithoutCandidate: 0,
          musicDeferredCelebConfirmedEmpty: 0,
        },
      }), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }

  await executeContentResearchCommand({
    argv: ['renew', '--worker', 'lane-1', '--celeb-id', celebId, '--claim-token', claimToken, '--lease-minutes', '30'],
    env: baseEnv(), fetchImpl,
  })
  await executeContentResearchCommand({
    argv: ['requeue', '--celeb-id', celebId, '--reason', 'manual audit', '--reset-attempts'],
    env: baseEnv(), fetchImpl,
  })
  await executeContentResearchCommand({ argv: ['status'], env: baseEnv(), fetchImpl })

  assert.deepEqual(calls[0].args, {
    p_celeb_id: celebId, p_worker: 'lane-1', p_claim_token: claimToken, p_lease_minutes: 30,
  })
  assert.deepEqual(calls[1].args, {
    p_celeb_id: celebId, p_reason: 'manual audit', p_reset_attempts: true,
  })
  assert.deepEqual(calls[2].args, {})
})

test('enqueue sends a deduplicated UUID array and never accepts a manifest path', async () => {
  let enqueueArgs
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    if (url.includes('/rpc/enqueue_celeb_content_research_jobs')) {
      enqueueArgs = JSON.parse(init.body)
      return new Response(JSON.stringify({
        taskType: 'content_research_v1',
        requested: 1,
        eligible: 1,
        insertedOrRequeued: 1,
        activeLeasePreserved: 0,
        terminalPreserved: 0,
        rejected: 0,
      }), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  await executeContentResearchCommand({
    argv: ['enqueue', '--celeb-id', celebId, '--reason', 'canary'],
    env: baseEnv(),
    fetchImpl,
  })
  assert.deepEqual(enqueueArgs, { p_celeb_ids: [celebId], p_reason: 'canary' })
  assert.throws(
    () => parseContentResearchArgs(['enqueue', '--manifest', 'targets.json']),
    /not valid for enqueue/,
  )
})

test('provider-slot reserves two independent OpenLibrary calls at DB-spaced times and waits in memory', async () => {
  const requestTokens = [
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
  ]
  const availableTimes = [
    '2026-08-10T00:00:00.100Z',
    '2026-08-10T00:00:02.100Z',
  ]
  const received = []
  const waited = []
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    if (url.includes('/rpc/reserve_external_provider_request')) {
      const args = JSON.parse(init.body)
      const index = received.length
      received.push(args)
      const availableAt = availableTimes[index]
      return new Response(JSON.stringify({
        provider: args.p_provider,
        worker: args.p_worker,
        requestToken: args.p_request_token,
        availableAt,
        nextAvailableAt: new Date(Date.parse(availableAt) + args.p_min_interval_ms).toISOString(),
        waitMs: Math.max(0, Date.parse(availableAt) - Date.parse('2026-08-10T00:00:00.000Z')),
        minIntervalMs: args.p_min_interval_ms,
        replayed: false,
      }), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  for (const token of requestTokens) {
    await executeContentResearchCommand({
      argv: ['provider-slot', '--provider', 'openlibrary', '--worker', 'lane-1'],
      env: baseEnv(),
      fetchImpl,
      requestTokenFactory: () => token,
      now: () => Date.parse('2026-08-10T00:00:00.000Z'),
      sleepImpl: async (milliseconds) => { waited.push(milliseconds) },
    })
  }
  assert.deepEqual(received, requestTokens.map((token) => ({
    p_provider: 'openlibrary',
    p_worker: 'lane-1',
    p_request_token: token,
    p_min_interval_ms: 2_000,
  })))
  assert.deepEqual(waited, [100, 2_100])
  assert.equal(Date.parse(availableTimes[1]) - Date.parse(availableTimes[0]), 2_000)
})

test('provider-slot rejects invalid providers and its memory wait is abortable', async () => {
  await assert.rejects(
    () => executeContentResearchCommand({
      argv: ['provider-slot', '--provider', 'google_books', '--worker', 'lane-1'],
      env: {},
    }),
    /--provider must be openlibrary/,
  )
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    () => waitForExternalProviderSlot('2026-08-10T00:00:02.000Z', {
      signal: controller.signal,
      now: () => Date.parse('2026-08-10T00:00:00.000Z'),
    }),
    (error) => error?.name === 'AbortError',
  )
})
