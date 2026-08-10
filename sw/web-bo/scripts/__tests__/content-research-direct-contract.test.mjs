import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  CONTENT_RESEARCH_RPCS,
  buildContentResearchOpenApiSnapshot,
  callContentResearchRpc,
  classifyContentResearchRpcError,
  contentResearchFingerprint,
  fetchContentResearchOpenApiSnapshot,
  sanitizeContentResearchOutput,
  stableStringify,
  validateContentResearchOpenApiSnapshot,
  validateContentResearchRpcResponse,
} from '../lib/content-research-direct-contract.mjs'

const text = { type: 'string', format: 'text' }
const uuid = { type: 'string', format: 'uuid' }
const integer = { type: 'integer', format: 'integer' }
const boolean = { type: 'boolean', format: 'boolean' }
const jsonb = { format: 'jsonb' }
const uuidArray = { type: 'array', format: 'uuid[]' }

function rpcPath(required = [], optional = {}, types = {}) {
  const names = [...required, ...Object.keys(optional)]
  return { post: { parameters: [{
    in: 'body',
    name: 'args',
    required: true,
    schema: {
      type: 'object',
      properties: Object.fromEntries(names.map((name) => [name, types[name] ?? optional[name] ?? text])),
      ...(required.length ? { required } : {}),
    },
  }] } }
}

export function contentResearchOpenApiFixture() {
  const signatures = {
    enqueue_celeb_content_research_jobs: rpcPath(
      ['p_celeb_ids'], { p_reason: text }, { p_celeb_ids: uuidArray },
    ),
    claim_next_celeb_content_research: rpcPath(
      ['p_worker'], { p_lease_minutes: integer }, { p_worker: text },
    ),
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
      ['p_celeb_id', 'p_reason'], { p_reset_attempts: boolean },
      { p_celeb_id: uuid, p_reason: text },
    ),
    get_celeb_content_research_status: rpcPath(),
    reserve_external_provider_request: rpcPath(
      ['p_provider', 'p_worker', 'p_request_token'], { p_min_interval_ms: integer },
      { p_provider: text, p_worker: text, p_request_token: uuid },
    ),
  }
  return {
    swagger: '2.0',
    paths: Object.fromEntries(Object.entries(signatures).map(([name, value]) => [`/rpc/${name}`, value])),
  }
}

const celebId = '11111111-1111-1111-1111-111111111111'
const runId = '22222222-2222-2222-2222-222222222222'
const claimToken = '33333333-3333-3333-3333-333333333333'
const fingerprint = 'a'.repeat(64)

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

test('OpenAPI snapshot pins every RPC name, argument and required/default boundary', () => {
  const snapshot = buildContentResearchOpenApiSnapshot(contentResearchOpenApiFixture(), '2026-08-10T00:00:00Z')
  assert.deepEqual(validateContentResearchOpenApiSnapshot(snapshot), [])
  const broken = structuredClone(snapshot)
  delete broken.shape.rpcPaths[CONTENT_RESEARCH_RPCS.commit].arguments.p_research_payload
  assert.ok(validateContentResearchOpenApiSnapshot(broken).some((error) => error.includes('arguments changed')))
})

test('fingerprints are stable across object key order but preserve array semantics', () => {
  const a = { z: 1, a: { y: 2, x: 3 }, rows: [1, 2] }
  const b = { rows: [1, 2], a: { x: 3, y: 2 }, z: 1 }
  assert.equal(stableStringify(a), stableStringify(b))
  assert.equal(contentResearchFingerprint(a), contentResearchFingerprint(b))
  assert.match(contentResearchFingerprint(a), /^[0-9a-f]{64}$/)
  assert.notEqual(contentResearchFingerprint(a), contentResearchFingerprint({ ...b, rows: [2, 1] }))
  assert.throws(() => contentResearchFingerprint({ bad: Number.NaN }), /non-finite/)
  assert.throws(
    () => contentResearchFingerprint({ metadata: { '한글키': true } }),
    /printable ASCII/,
  )
  assert.throws(
    () => contentResearchFingerprint({ ['x'.repeat(129)]: true }),
    /1\.\.128 printable ASCII/,
  )
})

test('fingerprint matches the DB canonical JSON cross-runtime fixture byte for byte', () => {
  const fixture = { z: 1, a: { y: 2, x: 3 }, rows: [1, 2], text: 'ko' }
  assert.equal(
    stableStringify(fixture),
    '{"a":{"x":3,"y":2},"rows":[1,2],"text":"ko","z":1}',
  )
  assert.equal(
    contentResearchFingerprint(fixture),
    '3ca597176c3e261838c842892d31774149dd014708004f41b3f36a2b92bb69e6',
  )
})

test('claim/commit responses require exact keys and bind all capabilities to the request', () => {
  const claim = [{
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
  }]
  assert.equal(validateContentResearchRpcResponse(CONTENT_RESEARCH_RPCS.claim, claim), claim)
  const bad = structuredClone(claim)
  bad[0].profile_snapshot.nickname = 'Other'
  assert.throws(
    () => validateContentResearchRpcResponse(CONTENT_RESEARCH_RPCS.claim, bad),
    /profile_snapshot.nickname mismatch/,
  )

  const commit = {
    status: 'completed',
    celebId,
    runId,
    actualContentCount: 1,
    finalResearchStatus: 'open',
    contentsCreated: 1,
    linksCreated: 1,
    musicCandidatesUpserted: 0,
    musicFindingsRecorded: 0,
    researchFingerprint: fingerprint,
  }
  assert.equal(validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.commit,
    commit,
    { celebId, researchFingerprint: fingerprint, musicOnly: false, musicEligible: 0 },
  ), commit)
  assert.throws(() => validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.commit,
    { ...commit, status: 'music_deferred' },
    { celebId, researchFingerprint: fingerprint, musicOnly: false, musicEligible: 0 },
  ), /cannot be music_deferred/)
  assert.throws(() => validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.commit,
    { ...commit, musicFindingsRecorded: 1 },
    { celebId, researchFingerprint: fingerprint, musicOnly: false, musicEligible: 0 },
  ), /musicFindingsRecorded does not match/)
})

test('status and fail response shapes are exact rather than permissive', () => {
  const status = {
    taskType: 'content_research_v1',
    queue: {
      total: 14, pending: 10, inProgress: 1, completed: 3,
      failed: 0, skipped: 0, expiredLeases: 0,
    },
    researchRuns: { inProgress: 1, completed: 3, cancelled: 0 },
    integrity: {
      activeQueueWithoutRun: 0,
      activeRunWithoutQueue: 0,
      completedQueueWithoutClosedRun: 0,
      musicDeferredQueueWithoutVerifiedFinding: 0,
      verifiedMusicFindingWithoutCandidate: 0,
      musicDeferredCelebConfirmedEmpty: 0,
    },
  }
  assert.equal(validateContentResearchRpcResponse(CONTENT_RESEARCH_RPCS.status, status), status)
  assert.throws(() => validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.status,
    { ...status, reportPath: 'forbidden.json' },
  ), /keys/)
  assert.throws(() => validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.status,
    { ...status, queue: { ...status.queue, mystery: 1 } },
  ), /keys/)

  const failed = {
    status: 'pending', celebId, runId, claimToken, error: 'temporary',
    retryExhausted: false, retryNotBefore: '2026-08-10T00:00:30Z',
  }
  assert.equal(validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.fail,
    failed,
    { disposition: 'retry', celebId, claimToken, error: 'temporary' },
  ), failed)

  const exhausted = {
    ...failed, status: 'failed', retryExhausted: true, retryNotBefore: null,
  }
  assert.equal(validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.fail,
    exhausted,
    { disposition: 'retry', celebId, claimToken, error: 'temporary' },
  ), exhausted)
})

test('provider reservations bind identity, spacing and replay fields exactly', () => {
  const firstToken = '44444444-4444-4444-4444-444444444444'
  const reservation = {
    provider: 'openlibrary',
    worker: 'lane-1',
    requestToken: firstToken,
    availableAt: '2026-08-10T00:00:00.125Z',
    nextAvailableAt: '2026-08-10T00:00:02.125Z',
    waitMs: 125,
    minIntervalMs: 2_000,
    replayed: false,
  }
  assert.equal(validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.providerSlot,
    reservation,
    { provider: 'openlibrary', worker: 'lane-1', requestToken: firstToken, minIntervalMs: 2_000 },
  ), reservation)
  assert.equal(validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.providerSlot,
    { ...reservation, replayed: true },
    { provider: 'openlibrary', worker: 'lane-1', requestToken: firstToken, minIntervalMs: 2_000 },
  ).replayed, true)
  assert.throws(() => validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.providerSlot,
    { ...reservation, nextAvailableAt: '2026-08-10T00:00:02.124Z' },
    { provider: 'openlibrary', worker: 'lane-1', requestToken: firstToken, minIntervalMs: 2_000 },
  ), /exactly minIntervalMs/)
  assert.throws(() => validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.providerSlot,
    { ...reservation, provider: 'google_books' },
  ), /openlibrary/)
})

test('requeue responses bind explicit attempt reset while allowing DB-forced terminal reset', () => {
  const response = {
    status: 'pending', celebId, generation: 3, attemptCount: 0, reason: 'manual audit',
  }
  assert.equal(validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.requeue,
    response,
    { celebId, reason: 'manual audit', resetAttempts: true },
  ), response)
  assert.throws(() => validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.requeue,
    { ...response, attemptCount: 2 },
    { celebId, reason: 'manual audit', resetAttempts: true },
  ), /attemptCount must be 0/)
  assert.equal(validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.requeue,
    response,
    { celebId, reason: 'manual audit', resetAttempts: false },
  ), response)
  assert.equal(validateContentResearchRpcResponse(
    CONTENT_RESEARCH_RPCS.requeue,
    { ...response, attemptCount: 3 },
    { celebId, reason: 'manual audit', resetAttempts: false },
  ).attemptCount, 3)
})

test('stale lease errors receive a stable error code without exposing arbitrary bodies', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    message: `active content research claim not owned or lease expired: celeb_id=${celebId}`,
    details: 'Bearer should-never-be-used',
  }), { status: 400, headers: { 'content-type': 'application/json' } })
  await assert.rejects(
    () => callContentResearchRpc({
      url: 'https://example.supabase.co',
      serviceKey: 'service-secret',
      rpc: CONTENT_RESEARCH_RPCS.renew,
      args: {},
      fetchImpl,
    }),
    (error) => error.code === 'STALE_CONTENT_RESEARCH_CLAIM'
      && !error.message.includes('should-never-be-used'),
  )
  assert.equal(
    classifyContentResearchRpcError('completed content research payload mismatch'),
    'CONTENT_RESEARCH_PAYLOAD_MISMATCH',
  )
})

test('malformed OpenAPI and successful RPC bodies fail closed with stable error codes', async () => {
  await assert.rejects(
    () => fetchContentResearchOpenApiSnapshot({
      url: 'https://example.supabase.co',
      serviceKey: 'service-secret',
      fetchImpl: async () => new Response('{broken', { status: 200 }),
    }),
    (error) => error.code === 'CONTENT_RESEARCH_OPENAPI_ERROR'
      && /not valid JSON/.test(error.message),
  )
  await assert.rejects(
    () => callContentResearchRpc({
      url: 'https://example.supabase.co',
      serviceKey: 'service-secret',
      rpc: CONTENT_RESEARCH_RPCS.status,
      fetchImpl: async () => new Response('{broken', { status: 200 }),
    }),
    (error) => error.code === 'CONTENT_RESEARCH_RPC_RESPONSE_MISMATCH'
      && /not valid JSON/.test(error.message),
  )
})

test('output sanitizer preserves the short-lived claim capability and redacts durable secrets', () => {
  const safe = sanitizeContentResearchOutput({
    claimToken,
    claim_token: claimToken,
    serviceRoleKey: 'durable-secret',
    metadata: {
      apiKey: 'external-secret',
      clientSecret: 'client-secret',
      refresh_token: 'refresh-secret',
      credentials: 'credential-secret',
      note: 'Bearer bearer-secret',
      raw: 'API_KEY=sk_1234567890abcdefghijklmnop',
      provider: 'sb_secret_1234567890abcdef',
      connection: 'postgresql://worker:durable-password@example.com/db',
    },
    jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
  })
  assert.equal(safe.claimToken, claimToken)
  assert.equal(safe.claim_token, claimToken)
  assert.equal(safe.serviceRoleKey, '[REDACTED]')
  assert.equal(safe.metadata.apiKey, '[REDACTED]')
  assert.equal(safe.metadata.clientSecret, '[REDACTED]')
  assert.equal(safe.metadata.refresh_token, '[REDACTED]')
  assert.equal(safe.metadata.credentials, '[REDACTED]')
  assert.equal(safe.metadata.note, 'Bearer [REDACTED]')
  assert.equal(safe.metadata.raw, '[REDACTED_SECRET]')
  assert.equal(safe.metadata.provider, '[REDACTED_KEY]')
  assert.equal(safe.metadata.connection, '[REDACTED_DATABASE_URL]')
  assert.equal(safe.jwt, '[REDACTED]')
})

test('runtime modules statically forbid filesystem imports and write APIs', async () => {
  const paths = [
    new URL('../content-research-db-worker.mjs', import.meta.url),
    new URL('../lib/content-research-direct-contract.mjs', import.meta.url),
    new URL('../lib/content-research-direct-schema.mjs', import.meta.url),
  ]
  const forbidden = /(?:from\s+['"](?:node:)?fs(?:\/promises)?['"]|\b(?:writeFile|appendFile|createWriteStream|mkdir|rmSync|unlink|rename)\b)/
  for (const path of paths) {
    const source = await readFile(path, 'utf8')
    assert.doesNotMatch(source, forbidden, String(path))
  }
})
