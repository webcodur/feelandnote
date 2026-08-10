import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DIRECT_RPCS,
  EXPECTED_TIMELINE_SECURITY_CONTRACT,
  buildDirectOpenApiSnapshot,
  callDirectRpc,
  researchFingerprint,
  sanitizeForOutput,
  stableStringify,
  validateDirectOpenApiSnapshot,
  validateDirectRpcResponse,
  validateTimelineSecurityContract,
} from '../lib/timeline-direct-contract.mjs'

const text = { type: 'string', format: 'text' }
const uuid = { type: 'string', format: 'uuid' }
const integer = { type: 'integer', format: 'integer' }
const smallint = { type: 'integer', format: 'smallint' }
const boolean = { type: 'boolean', format: 'boolean' }
const jsonb = { format: 'jsonb' }
const timestamptz = { type: 'string', format: 'timestamp with time zone' }

function table(properties) {
  return { properties }
}

function rpcPath(required = [], optional = {}, types = {}) {
  const names = [...required, ...Object.keys(optional)]
  return {
    post: {
      parameters: [{
        in: 'body',
        name: 'args',
        required: true,
        schema: {
          type: 'object',
          properties: Object.fromEntries(names.map((name) => [name, types[name] ?? optional[name] ?? text])),
          ...(required.length ? { required } : {}),
        },
      }],
    },
  }
}

export function directOpenApiFixture() {
  const celebs = {
    id: uuid, slug: text, nickname: text, nickname_en: text, title: text, title_en: text,
    profession: text, nationality: text, gender: boolean, birth_date: text, death_date: text,
    publication_status: text, celeb_tier: text, wikidata_qid: text,
  }
  const events = {
    id: uuid, celeb_id: uuid, year: integer, year_end: integer, month: smallint, day: smallint,
    sequence_label: text, sequence_label_en: text, title: text, title_en: text,
    description: text, description_en: text, kind: text, place_name: text, place_name_en: text,
    lat: { type: 'number', format: 'double precision' },
    lng: { type: 'number', format: 'double precision' },
    place_qid: text, source: text, source_url: text, sort_order: integer,
  }
  const runs = {
    id: uuid, celeb_id: uuid, pipeline: text, run_origin: text, research_status: text,
    timeline_mode: text, research_fingerprint: text, source_snapshot_id: text,
    claim_token: uuid, claimed_by: text, attempt_count: integer, profile_snapshot: jsonb,
    sources: jsonb, event_evidence: jsonb, profile_conflicts: jsonb, blocking_issues: jsonb,
    research_payload: jsonb, timeline_event_ids: { type: 'array', format: 'uuid[]' },
    event_count: integer, started_at: timestamptz, completed_at: timestamptz, created_at: timestamptz,
    supersedes_run_id: uuid, superseded_by_run_id: uuid, superseded_at: timestamptz,
    supersession_reason: text,
  }
  const signatures = {
    [DIRECT_RPCS.enqueue]: rpcPath(),
    [DIRECT_RPCS.claim]: rpcPath(['p_worker'], { p_lease_minutes: integer }, { p_worker: text }),
    [DIRECT_RPCS.renew]: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token'],
      { p_lease_minutes: integer },
      { p_celeb_id: uuid, p_worker: text, p_claim_token: uuid },
    ),
    [DIRECT_RPCS.commit]: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token', 'p_profile_snapshot', 'p_research_fingerprint', 'p_research_payload'],
      {},
      {
        p_celeb_id: uuid, p_worker: text, p_claim_token: uuid, p_profile_snapshot: jsonb,
        p_research_fingerprint: text, p_research_payload: jsonb,
      },
    ),
    [DIRECT_RPCS.correct]: rpcPath(
      [
        'p_celeb_id', 'p_expected_run_id', 'p_expected_research_fingerprint',
        'p_corrected_profile_snapshot', 'p_corrected_research_fingerprint',
        'p_corrected_research_payload', 'p_reason',
      ],
      {},
      {
        p_celeb_id: uuid, p_expected_run_id: uuid, p_expected_research_fingerprint: text,
        p_corrected_profile_snapshot: jsonb, p_corrected_research_fingerprint: text,
        p_corrected_research_payload: jsonb, p_reason: text,
      },
    ),
    [DIRECT_RPCS.fail]: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token', 'p_error'],
      {
        p_skip: boolean,
        p_profile_snapshot: jsonb,
        p_research_fingerprint: text,
        p_research_payload: jsonb,
      },
      { p_celeb_id: uuid, p_worker: text, p_claim_token: uuid, p_error: text },
    ),
    [DIRECT_RPCS.requeue]: rpcPath(
      ['p_celeb_id'],
      { p_reason: text, p_reset_attempts: boolean },
      { p_celeb_id: uuid },
    ),
    [DIRECT_RPCS.status]: rpcPath(),
    [DIRECT_RPCS.security]: rpcPath(),
  }
  return {
    swagger: '2.0',
    definitions: {
      celebs: table(celebs),
      celeb_timeline_events: table(events),
      celeb_timeline_research_runs: table(runs),
    },
    paths: {
      '/celebs': { get: {} },
      '/celeb_timeline_events': { get: {}, post: {} },
      // PostgREST 13 documents structurally writable verbs after a role has any
      // privilege on the table. These methods do not prove write authorization.
      '/celeb_timeline_research_runs': { get: {}, post: {}, patch: {}, delete: {} },
      ...Object.fromEntries(Object.entries(signatures).map(([name, path]) => [`/rpc/${name}`, path])),
    },
  }
}

test('validates the exact three-table and nine-RPC service-role OpenAPI contract', () => {
  const snapshot = buildDirectOpenApiSnapshot(directOpenApiFixture(), '2026-08-10T00:00:00.000Z')
  assert.deepEqual(validateDirectOpenApiSnapshot(snapshot), [])
  assert.match(snapshot.fingerprint, /^[0-9a-f]{64}$/)
})

test('detects table and RPC signature drift', () => {
  const fixture = directOpenApiFixture()
  delete fixture.definitions.celeb_timeline_research_runs.properties.research_payload
  fixture.paths[`/rpc/${DIRECT_RPCS.commit}`].post.parameters[0].schema.properties.unexpected = text
  const errors = validateDirectOpenApiSnapshot(buildDirectOpenApiSnapshot(fixture))
  assert.ok(errors.some((error) => error.includes('research_payload is missing')))
  assert.ok(errors.some((error) => error.includes('arguments changed')))
})

test('does not treat PostgREST structural write verbs as table grant evidence', () => {
  const fixture = directOpenApiFixture()
  fixture.paths['/celeb_timeline_research_runs'] = { get: {}, post: {}, patch: {}, delete: {} }
  assert.deepEqual(validateDirectOpenApiSnapshot(buildDirectOpenApiSnapshot(fixture)), [])
})

test('validates the exact catalog-backed security contract and rejects one-bit drift', () => {
  assert.deepEqual(validateTimelineSecurityContract(EXPECTED_TIMELINE_SECURITY_CONTRACT), [])
  const drifted = structuredClone(EXPECTED_TIMELINE_SECURITY_CONTRACT)
  drifted.runs.privileges.service_role.insert = true
  const errors = validateTimelineSecurityContract(drifted)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /security catalog fingerprint changed/)
  assert.throws(
    () => validateDirectRpcResponse(DIRECT_RPCS.security, drifted),
    /response contract mismatch/,
  )
})

test('canonical fingerprints are key-order independent and payload-sensitive', () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), stableStringify({ a: 1, b: 2 }))
  assert.equal(researchFingerprint({ b: 2, a: 1 }), researchFingerprint({ a: 1, b: 2 }))
  assert.notEqual(researchFingerprint({ a: 1 }), researchFingerprint({ a: 2 }))
})

test('RPC helper uses only service headers and rejects unknown RPC names', async () => {
  let request
  const fetchImpl = async (url, init) => {
    request = { url, init }
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  }
  const result = await callDirectRpc({
    url: 'https://example.supabase.co',
    serviceKey: 'service-secret',
    rpc: DIRECT_RPCS.status,
    args: {},
    fetchImpl,
  })
  assert.deepEqual(result, { status: 'ok' })
  assert.equal(request.init.method, 'POST')
  assert.equal(request.init.headers.apikey, 'service-secret')
  await assert.rejects(() => callDirectRpc({
    url: 'https://example.supabase.co', serviceKey: 'x', rpc: 'not_allowed', fetchImpl,
  }), /unknown timeline direct RPC/)
})

test('validates every RPC response shape and rejects silent response drift', () => {
  const celebId = '11111111-1111-1111-1111-111111111111'
  const claimToken = '22222222-2222-2222-2222-222222222222'
  const runId = '33333333-3333-3333-3333-333333333333'
  const fingerprint = 'a'.repeat(64)
  assert.deepEqual(validateDirectRpcResponse(DIRECT_RPCS.enqueue, {
    taskType: 'timeline_backfill_v1', eligible: 10, insertedOrRequeued: 8,
    activeLeasePreserved: 1, terminalPreserved: 1,
  }), {
    taskType: 'timeline_backfill_v1', eligible: 10, insertedOrRequeued: 8,
    activeLeasePreserved: 1, terminalPreserved: 1,
  })
  assert.deepEqual(validateDirectRpcResponse(DIRECT_RPCS.claim, []), [])
  assert.deepEqual(validateDirectRpcResponse(DIRECT_RPCS.renew, {
    status: 'in_progress', celebId, claimToken, leaseExpiresAt: '2026-08-10T01:00:00Z',
  }, { celebId, claimToken }).status, 'in_progress')
  assert.equal(validateDirectRpcResponse(DIRECT_RPCS.commit, {
    status: 'completed', celebId, runId, eventCount: 3, researchFingerprint: fingerprint,
  }, { celebId, eventCount: 3, researchFingerprint: fingerprint }).status, 'completed')
  assert.equal(validateDirectRpcResponse(DIRECT_RPCS.correct, {
    status: 'corrected', celebId, runId, supersedesRunId: claimToken,
    eventCount: 3, researchFingerprint: fingerprint,
  }, {
    celebId, supersedesRunId: claimToken, eventCount: 3, researchFingerprint: fingerprint,
  }).status, 'corrected')
  assert.equal(validateDirectRpcResponse(DIRECT_RPCS.fail, {
    status: 'pending', celebId, claimToken, error: 'retry me',
  }, { celebId, claimToken, error: 'retry me', skip: false }).status, 'pending')
  assert.equal(validateDirectRpcResponse(DIRECT_RPCS.fail, {
    status: 'already_skipped', celebId, runId, eventCount: 0, researchFingerprint: fingerprint,
  }, { celebId, researchFingerprint: fingerprint, skip: true }).status, 'already_skipped')
  assert.equal(validateDirectRpcResponse(DIRECT_RPCS.requeue, {
    status: 'pending', celebId, attemptCount: 2, reason: null,
  }, { celebId }).status, 'pending')
  assert.equal(validateDirectRpcResponse(DIRECT_RPCS.status, {
    taskType: 'timeline_backfill_v1',
    celebs: { total: 10, withTimeline: 4, missingTimeline: 6 },
    queue: { pending: 5, skipped: 1 },
    researchRuns: { total: 5, celebs: 5, recordedEvents: 12 },
  }).taskType, 'timeline_backfill_v1')

  assert.throws(() => validateDirectRpcResponse(DIRECT_RPCS.claim, [{}, {}]), /zero or one/)
  assert.throws(() => validateDirectRpcResponse(DIRECT_RPCS.claim, [{}]), /keys/)
  assert.throws(() => validateDirectRpcResponse(DIRECT_RPCS.commit, {
    status: 'pending', celebId, runId, eventCount: 3, researchFingerprint: fingerprint,
  }, { celebId, eventCount: 3, researchFingerprint: fingerprint }), /status/)
  assert.throws(() => validateDirectRpcResponse(DIRECT_RPCS.commit, {
    status: 'completed', celebId: claimToken, runId, eventCount: 3, researchFingerprint: fingerprint,
  }, { celebId, eventCount: 3, researchFingerprint: fingerprint }), /celebId/)
  assert.throws(() => validateDirectRpcResponse(DIRECT_RPCS.commit, {
    status: 'completed', celebId, runId, eventCount: 3, researchFingerprint: 'b'.repeat(64),
  }, { celebId, eventCount: 3, researchFingerprint: fingerprint }), /researchFingerprint/)
  assert.throws(() => validateDirectRpcResponse(DIRECT_RPCS.commit, {
    status: 'completed', celebId, runId, eventCount: 99, researchFingerprint: fingerprint,
  }, { celebId, eventCount: 3, researchFingerprint: fingerprint }), /eventCount/)
  assert.throws(() => validateDirectRpcResponse(DIRECT_RPCS.fail, {
    status: 'skipped', celebId, runId, eventCount: 0, researchFingerprint: fingerprint, unexpected: true,
  }, { celebId, researchFingerprint: fingerprint, skip: true }), /keys/)
})

test('output sanitizer redacts environment/API secrets but keeps the lease claim token usable', () => {
  assert.deepEqual(sanitizeForOutput({
    serviceRoleKey: 'secret',
    authorization: 'bearer',
    result: { claim_token: 'short-lived-worker-capability' },
  }), {
    serviceRoleKey: '[REDACTED]',
    authorization: '[REDACTED]',
    result: { claim_token: 'short-lived-worker-capability' },
  })
})
