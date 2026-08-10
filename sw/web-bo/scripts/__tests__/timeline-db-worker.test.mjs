import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import {
  EXPECTED_TIMELINE_SECURITY_CONTRACT,
  researchFingerprint,
} from '../lib/timeline-direct-contract.mjs'
import { mapDirectPayloadToTimelineRows } from '../lib/timeline-direct-schema.mjs'
import {
  auditResearchRun,
  comparableTimelineRow,
  executeTimelineCommand,
  parseArgs,
  readJsonStdin,
  verifyCommitReadback,
} from '../timeline-db-worker.mjs'

const text = { type: 'string', format: 'text' }
const uuid = { type: 'string', format: 'uuid' }
const integer = { type: 'integer', format: 'integer' }
const smallint = { type: 'integer', format: 'smallint' }
const boolean = { type: 'boolean', format: 'boolean' }
const jsonb = { format: 'jsonb' }
const timestamptz = { type: 'string', format: 'timestamp with time zone' }

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
  const celebs = {
    id: uuid, slug: text, nickname: text, nickname_en: text, title: text, title_en: text,
    profession: text, nationality: text, gender: boolean, birth_date: text, death_date: text,
    publication_status: text, celeb_tier: text, wikidata_qid: text,
  }
  const events = {
    id: uuid, celeb_id: uuid, year: integer, year_end: integer, month: smallint, day: smallint,
    sequence_label: text, sequence_label_en: text, title: text, title_en: text,
    description: text, description_en: text, kind: text, place_name: text, place_name_en: text,
    lat: { type: 'number', format: 'double precision' }, lng: { type: 'number', format: 'double precision' },
    place_qid: text, source: text, source_url: text, sort_order: integer,
  }
  const runs = {
    id: uuid, celeb_id: uuid, pipeline: text, run_origin: text, research_status: text,
    timeline_mode: text, research_fingerprint: text, source_snapshot_id: text, claim_token: uuid,
    claimed_by: text, attempt_count: integer, profile_snapshot: jsonb, sources: jsonb,
    event_evidence: jsonb, profile_conflicts: jsonb, blocking_issues: jsonb, research_payload: jsonb,
    timeline_event_ids: { type: 'array', format: 'uuid[]' }, event_count: integer,
    started_at: timestamptz, completed_at: timestamptz, created_at: timestamptz,
    supersedes_run_id: uuid, superseded_by_run_id: uuid, superseded_at: timestamptz,
    supersession_reason: text,
  }
  const signatures = {
    enqueue_missing_celeb_timeline_backfill_jobs: rpcPath(),
    claim_next_celeb_timeline_backfill: rpcPath(['p_worker'], { p_lease_minutes: integer }, { p_worker: text }),
    renew_celeb_timeline_backfill_lease: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token'], { p_lease_minutes: integer },
      { p_celeb_id: uuid, p_worker: text, p_claim_token: uuid },
    ),
    complete_celeb_timeline_backfill: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token', 'p_profile_snapshot', 'p_research_fingerprint', 'p_research_payload'], {},
      { p_celeb_id: uuid, p_worker: text, p_claim_token: uuid, p_profile_snapshot: jsonb, p_research_fingerprint: text, p_research_payload: jsonb },
    ),
    correct_celeb_timeline_backfill: rpcPath(
      [
        'p_celeb_id', 'p_expected_run_id', 'p_expected_research_fingerprint',
        'p_corrected_profile_snapshot', 'p_corrected_research_fingerprint',
        'p_corrected_research_payload', 'p_reason',
      ], {}, {
        p_celeb_id: uuid, p_expected_run_id: uuid, p_expected_research_fingerprint: text,
        p_corrected_profile_snapshot: jsonb, p_corrected_research_fingerprint: text,
        p_corrected_research_payload: jsonb, p_reason: text,
      },
    ),
    fail_celeb_timeline_backfill: rpcPath(
      ['p_celeb_id', 'p_worker', 'p_claim_token', 'p_error'],
      { p_skip: boolean, p_profile_snapshot: jsonb, p_research_fingerprint: text, p_research_payload: jsonb },
      { p_celeb_id: uuid, p_worker: text, p_claim_token: uuid, p_error: text },
    ),
    requeue_celeb_timeline_backfill: rpcPath(
      ['p_celeb_id'], { p_reason: text, p_reset_attempts: boolean }, { p_celeb_id: uuid },
    ),
    get_celeb_timeline_backfill_status: rpcPath(),
    get_celeb_timeline_backfill_security_contract: rpcPath(),
  }
  return {
    swagger: '2.0',
    definitions: {
      celebs: { properties: celebs },
      celeb_timeline_events: { properties: events },
      celeb_timeline_research_runs: { properties: runs },
    },
    paths: {
      '/celebs': { get: {} },
      '/celeb_timeline_events': { get: {} },
      '/celeb_timeline_research_runs': { get: {} },
      ...Object.fromEntries(Object.entries(signatures).map(([name, value]) => [`/rpc/${name}`, value])),
    },
  }
}

function securityContractResponse(url) {
  if (!url.includes('/rpc/get_celeb_timeline_backfill_security_contract')) return null
  return new Response(JSON.stringify(EXPECTED_TIMELINE_SECURITY_CONTRACT), { status: 200 })
}

function description(subject) {
  return `${subject}의 첫 번째 사실을 설명합니다. 같은 사건의 두 번째 사실을 근거에 맞게 설명합니다.`
}

function descriptionEn(subject) {
  return `This is the first verified fact about ${subject}. This is the second supported fact about the same event.`
}

function payloadFixture() {
  const profileSnapshot = {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'worker-test',
    nickname: '작업기 시험',
    nicknameEn: 'Worker Test',
    title: null,
    titleEn: null,
    profession: null,
    nationality: null,
    gender: null,
    birthDate: '1980',
    deathDate: '2020',
    celebTier: 'full',
    publicationStatus: 'active',
    wikidataQid: null,
  }
  const event = (year, kind, title) => ({
    eventType: 'life',
    year,
    yearEnd: null,
    month: null,
    day: null,
    title,
    titleEn: title,
    description: description(title),
    descriptionEn: descriptionEn(title),
    kind,
    placeName: null,
    placeNameEn: null,
    placeQuery: null,
    placeCountry: null,
    evidenceRefs: ['S1'],
  })
  return {
    celebId: profileSnapshot.id,
    slug: profileSnapshot.slug,
    nickname: profileSnapshot.nickname,
    nicknameEn: profileSnapshot.nicknameEn,
    timelineMode: 'life',
    profileSnapshot,
    sources: [{
      id: 'S1',
      url: 'https://example.com/evidence',
      title: 'Evidence',
      publisher: 'Example',
      accessedAt: '2026-08-10',
    }],
    researchStatus: 'complete',
    events: [
      event(1980, 'birth', '출생'),
      event(2000, 'work', '활동'),
      event(2020, 'death', '사망'),
    ],
  }
}

function blockedPayloadFixture() {
  const payload = payloadFixture()
  payload.researchStatus = 'blocked'
  payload.events = []
  payload.blockingIssues = [{
    code: 'IDENTITY_NOT_VERIFIED',
    message: description('identity blocking issue'),
    messageEn: descriptionEn('identity blocking issue'),
    evidenceRefs: ['S1'],
    resolution: {
      status: 'resolved',
      action: 'QUARANTINE_PROFILE',
      proposedValue: 'quarantined',
      precision: 'not-applicable',
      rationale: description('quarantine resolution'),
      rationaleEn: descriptionEn('quarantine resolution'),
      evidenceUrls: ['https://example.com/evidence', 'https://independent.example/identity'],
      confidence: 'high',
      resolvedAt: '2026-08-10T03:30:00+09:00',
    },
  }]
  payload.applicationStatus = 'quarantined'
  return payload
}

test('CLI parser exposes all commands and rejects file/positional payloads', () => {
  assert.equal(parseArgs(['enqueue']).command, 'enqueue')
  assert.equal(parseArgs(['claim', '--worker', 'lane-1', '--lease-minutes=90']).leaseMinutes, 90)
  assert.equal(parseArgs(['renew', '--worker=x']).command, 'renew')
  assert.equal(parseArgs(['commit', '--worker=x']).command, 'commit')
  assert.equal(parseArgs(['correct', '--expected-run-id=22222222-2222-2222-2222-222222222222']).command, 'correct')
  assert.equal(parseArgs(['fail', '--skip']).skip, true)
  assert.equal(parseArgs(['requeue', '--reset-attempts'])['reset-attempts'], true)
  assert.equal(parseArgs(['status']).command, 'status')
  assert.equal(parseArgs(['verify']).command, 'verify')
  assert.throws(() => parseArgs(['commit', 'payload.json']), /positional\/file arguments are forbidden/)
  assert.throws(() => parseArgs(['fail', '--skip', '--retry']), /mutually exclusive/)
})

test('commit JSON reader consumes stdin and does not need a local path', async () => {
  const parsed = await readJsonStdin(Readable.from(['{"ok":', 'true}']))
  assert.deepEqual(parsed, { ok: true })
  await assert.rejects(() => readJsonStdin(Readable.from([])), /requires one JSON object on stdin/)
  await assert.rejects(() => readJsonStdin(Readable.from(['not json'])), /not valid JSON/)
})

test('research-run audit proves payload, evidence graph, event ids and exact DB rows', () => {
  const payload = payloadFixture()
  const expectedRows = mapDirectPayloadToTimelineRows(payload)
  const ids = expectedRows.map((_, index) => `00000000-0000-0000-0000-00000000000${index}`)
  const eventsById = new Map(expectedRows.map((row, index) => [ids[index], { id: ids[index], ...row }]))
  const run = {
    id: '22222222-2222-2222-2222-222222222222',
    celeb_id: payload.celebId,
    pipeline: 'timeline_backfill_v1',
    run_origin: 'direct_pipeline',
    research_status: 'complete',
    timeline_mode: payload.timelineMode,
    research_fingerprint: researchFingerprint(payload),
    profile_snapshot: payload.profileSnapshot,
    sources: payload.sources,
    event_evidence: payload.events.map((event, eventIndex) => ({ eventIndex, evidenceRefs: event.evidenceRefs })),
    profile_conflicts: [],
    blocking_issues: [],
    research_payload: payload,
    timeline_event_ids: ids,
    event_count: ids.length,
  }
  assert.deepEqual(auditResearchRun(run, eventsById), { valid: true, errors: [] })

  eventsById.set(ids[1], { ...eventsById.get(ids[1]), title: 'tampered' })
  const invalid = auditResearchRun(run, eventsById)
  assert.equal(invalid.valid, false)
  assert.ok(invalid.errors.includes('timeline event readback mismatch'))
})

test('comparable timeline rows ignore generated ids/timestamps but retain every content column', () => {
  const comparable = comparableTimelineRow({
    id: 'generated',
    created_at: 'now',
    celeb_id: 'c',
    title: 't',
    title_en: 'te',
    description: 'd',
    description_en: 'de',
    kind: 'work',
    source: 'research',
    source_url: 'https://example.com',
    sort_order: 0,
  })
  assert.equal(comparable.id, undefined)
  assert.equal(comparable.created_at, undefined)
  assert.equal(comparable.source_url, 'https://example.com')
  assert.equal(comparable.year, null)
})

test('commit readback rejects an unreferenced extra live row for the same celeb', async () => {
  const payload = payloadFixture()
  const fingerprint = researchFingerprint(payload)
  const runId = '33333333-3333-3333-3333-333333333333'
  const eventIds = payload.events.map((_, index) => `00000000-0000-0000-0000-00000000000${index}`)
  const rows = mapDirectPayloadToTimelineRows(payload).map((row, index) => ({ id: eventIds[index], ...row }))
  rows.push({ ...rows[0], id: '99999999-9999-9999-9999-999999999999', sort_order: 99 })
  const fetchImpl = async (url) => {
    if (url.includes('/celeb_timeline_research_runs?')) {
      return new Response(JSON.stringify([{
        id: runId, celeb_id: payload.celebId, pipeline: 'timeline_backfill_v1',
        run_origin: 'direct_pipeline', research_status: 'complete', timeline_mode: payload.timelineMode,
        research_fingerprint: fingerprint, profile_snapshot: payload.profileSnapshot,
        sources: payload.sources, event_evidence: payload.events.map((event, eventIndex) => ({ eventIndex, evidenceRefs: event.evidenceRefs })),
        profile_conflicts: [], blocking_issues: [], research_payload: payload,
        timeline_event_ids: eventIds, event_count: eventIds.length,
        supersedes_run_id: null, superseded_by_run_id: null, superseded_at: null,
        supersession_reason: null,
      }]), { status: 200 })
    }
    if (url.includes('/celeb_timeline_events?')) return new Response(JSON.stringify(rows), { status: 200 })
    throw new Error(`unexpected URL: ${url}`)
  }
  await assert.rejects(() => verifyCommitReadback({
    url: 'https://example.supabase.co', serviceKey: 'service-secret', fetchImpl,
  }, {
    runId, eventCount: eventIds.length, researchFingerprint: fingerprint,
  }, payload), /active live timeline id set mismatch/)
})

test('commit readback follows terminal replacement lineage and rejects a broken reciprocal pointer', async () => {
  const payload = payloadFixture()
  const predecessorPayload = blockedPayloadFixture()
  const fingerprint = researchFingerprint(payload)
  const predecessorFingerprint = researchFingerprint(predecessorPayload)
  const runId = '33333333-3333-3333-3333-333333333333'
  const predecessorId = '22222222-2222-2222-2222-222222222222'
  const eventIds = payload.events.map((_, index) => `00000000-0000-0000-0000-00000000000${index}`)
  const rows = mapDirectPayloadToTimelineRows(payload).map((row, index) => ({ id: eventIds[index], ...row }))
  const current = {
    id: runId, celeb_id: payload.celebId, pipeline: 'timeline_backfill_v1',
    run_origin: 'direct_pipeline', research_status: 'complete', timeline_mode: payload.timelineMode,
    research_fingerprint: fingerprint, profile_snapshot: payload.profileSnapshot,
    sources: payload.sources, event_evidence: payload.events.map((event, eventIndex) => ({ eventIndex, evidenceRefs: event.evidenceRefs })),
    profile_conflicts: [], blocking_issues: [], research_payload: payload,
    timeline_event_ids: eventIds, event_count: eventIds.length,
    supersedes_run_id: predecessorId, superseded_by_run_id: null, superseded_at: null,
    supersession_reason: null,
  }
  const predecessor = {
    id: predecessorId, celeb_id: payload.celebId, pipeline: 'timeline_backfill_v1',
    run_origin: 'direct_pipeline', research_status: 'blocked', timeline_mode: predecessorPayload.timelineMode,
    research_fingerprint: predecessorFingerprint, profile_snapshot: predecessorPayload.profileSnapshot,
    sources: predecessorPayload.sources, event_evidence: [], profile_conflicts: [],
    blocking_issues: predecessorPayload.blockingIssues, research_payload: predecessorPayload,
    timeline_event_ids: [], event_count: 0,
    supersedes_run_id: null, superseded_by_run_id: runId,
    superseded_at: '2026-08-10T02:30:00.000Z',
    supersession_reason: 'Explicit requeue replaced the terminal blocked timeline research run.',
  }
  let reciprocalBroken = false
  const fetchImpl = async (url) => {
    if (url.includes('/celeb_timeline_research_runs?')) {
      if (url.includes(`id=eq.${predecessorId}`)) {
        return new Response(JSON.stringify([{
          ...predecessor,
          superseded_by_run_id: reciprocalBroken ? null : runId,
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([current]), { status: 200 })
    }
    if (url.includes('/celeb_timeline_events?')) return new Response(JSON.stringify(rows), { status: 200 })
    throw new Error(`unexpected URL: ${url}`)
  }
  const connection = {
    url: 'https://example.supabase.co', serviceKey: 'service-secret', fetchImpl,
  }
  const rpcResult = { runId, eventCount: eventIds.length, researchFingerprint: fingerprint }
  const verified = await verifyCommitReadback(connection, rpcResult, payload)
  assert.equal(verified.supersedesRunId, predecessorId)
  assert.equal(verified.verified, true)

  reciprocalBroken = true
  await assert.rejects(
    () => verifyCommitReadback(connection, rpcResult, payload),
    /predecessor:superseded_by_run_id missing|reciprocal lineage mismatch/,
  )
})

test('executeTimelineCommand sends blocked stdin losslessly on skip and verifies its run ledger', async () => {
  const payload = blockedPayloadFixture()
  const fingerprint = researchFingerprint(payload)
  const runId = '33333333-3333-3333-3333-333333333333'
  let failArgs
  let includeBlockedExtra = false
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    const security = securityContractResponse(url)
    if (security) return security
    if (url.includes('/rpc/fail_celeb_timeline_backfill')) {
      failArgs = JSON.parse(init.body)
      return new Response(JSON.stringify({
        status: 'skipped', celebId: payload.celebId, runId, eventCount: 0, researchFingerprint: fingerprint,
      }), { status: 200 })
    }
    if (url.includes('/celeb_timeline_research_runs?')) {
      return new Response(JSON.stringify([{
        id: runId,
        celeb_id: payload.celebId,
        pipeline: 'timeline_backfill_v1',
        run_origin: 'direct_pipeline',
        research_status: 'blocked',
        timeline_mode: payload.timelineMode,
        research_fingerprint: fingerprint,
        profile_snapshot: payload.profileSnapshot,
        sources: payload.sources,
        event_evidence: [],
        profile_conflicts: [],
        blocking_issues: payload.blockingIssues,
        research_payload: payload,
        timeline_event_ids: [],
        event_count: 0,
      }]), { status: 200 })
    }
    if (url.includes('/celeb_timeline_events?')) {
      return new Response(JSON.stringify(includeBlockedExtra ? [{
        id: '99999999-9999-9999-9999-999999999999', celeb_id: payload.celebId,
      }] : []), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  const claimToken = '22222222-2222-2222-2222-222222222222'
  const result = await executeTimelineCommand({
    argv: ['fail', '--worker', 'lane-1', '--celeb-id', payload.celebId, '--claim-token', claimToken, '--error', 'identity blocked', '--skip'],
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' },
    stdinText: JSON.stringify(payload),
    fetchImpl,
  })
  assert.equal(result.result.status, 'skipped')
  assert.equal(result.readback.verified, true)
  assert.equal(failArgs.p_skip, true)
  assert.deepEqual(failArgs.p_profile_snapshot, payload.profileSnapshot)
  assert.equal(failArgs.p_research_fingerprint, fingerprint)
  assert.deepEqual(failArgs.p_research_payload, payload)
  includeBlockedExtra = true
  await assert.rejects(() => executeTimelineCommand({
    argv: ['fail', '--worker', 'lane-1', '--celeb-id', payload.celebId, '--claim-token', claimToken, '--error', 'identity blocked', '--skip'],
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' },
    stdinText: JSON.stringify(payload),
    fetchImpl,
  }), /blocked readback live timeline mismatch/)
})

test('executeTimelineCommand retry forbids research stdin and sends all ledger arguments as null', async () => {
  const celebId = '11111111-1111-1111-1111-111111111111'
  const claimToken = '22222222-2222-2222-2222-222222222222'
  let failArgs
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    const security = securityContractResponse(url)
    if (security) return security
    if (url.includes('/rpc/fail_celeb_timeline_backfill')) {
      failArgs = JSON.parse(init.body)
      return new Response(JSON.stringify({ status: 'pending', celebId, claimToken, error: 'temporary' }), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  const common = {
    argv: ['fail', '--worker', 'lane-1', '--celeb-id', celebId, '--claim-token', claimToken, '--error', 'temporary', '--retry'],
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' },
    fetchImpl,
  }
  const result = await executeTimelineCommand(common)
  assert.equal(result.result.status, 'pending')
  assert.equal(failArgs.p_skip, false)
  assert.equal(failArgs.p_profile_snapshot, null)
  assert.equal(failArgs.p_research_fingerprint, null)
  assert.equal(failArgs.p_research_payload, null)
  await assert.rejects(() => executeTimelineCommand({ ...common, stdinText: '{}' }), /does not accept stdin/)
})

test('every command fails closed before its operation when the security catalog drifts', async () => {
  const drifted = structuredClone(EXPECTED_TIMELINE_SECURITY_CONTRACT)
  drifted.runs.privileges.service_role.insert = true
  let statusCalled = false
  const fetchImpl = async (url) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    if (url.includes('/rpc/get_celeb_timeline_backfill_security_contract')) {
      return new Response(JSON.stringify(drifted), { status: 200 })
    }
    if (url.includes('/rpc/get_celeb_timeline_backfill_status')) {
      statusCalled = true
      return new Response('{}', { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  await assert.rejects(() => executeTimelineCommand({
    argv: ['status'],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
    },
    fetchImpl,
  }), (error) => {
    assert.equal(error.code, 'TIMELINE_DB_CONTRACT_MISMATCH')
    assert.match(error.message, /security catalog fingerprint changed/)
    return true
  })
  assert.equal(statusCalled, false)
})

test('correct sends a full stdin payload and verifies immutable predecessor lineage', async () => {
  const payload = payloadFixture()
  payload.sources[0].url = 'https://example.com/corrected-evidence'
  const correctedFingerprint = researchFingerprint(payload)
  const originalPayload = { original: true }
  const expectedFingerprint = researchFingerprint(originalPayload)
  const oldRunId = '22222222-2222-2222-2222-222222222222'
  const newRunId = '33333333-3333-3333-3333-333333333333'
  const eventIds = payload.events.map((_, index) => `00000000-0000-0000-0000-00000000000${index}`)
  const expectedRows = mapDirectPayloadToTimelineRows(payload)
  let correctionArgs
  let includeExtraEvent = false
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    const security = securityContractResponse(url)
    if (security) return security
    if (url.includes('/rpc/correct_celeb_timeline_backfill')) {
      correctionArgs = JSON.parse(init.body)
      return new Response(JSON.stringify({
        status: 'corrected', celebId: payload.celebId, runId: newRunId,
        supersedesRunId: oldRunId, eventCount: payload.events.length,
        researchFingerprint: correctedFingerprint,
      }), { status: 200 })
    }
    if (url.includes('/celeb_timeline_research_runs?')) {
      return new Response(JSON.stringify([
        {
          id: oldRunId, celeb_id: payload.celebId, research_fingerprint: expectedFingerprint,
          research_payload: originalPayload, superseded_by_run_id: newRunId,
          superseded_at: '2026-08-10T00:00:00Z', supersession_reason: 'correct malformed source URLs',
          supersedes_run_id: null,
        },
        {
          id: newRunId, celeb_id: payload.celebId, pipeline: 'timeline_backfill_v1',
          run_origin: 'direct_pipeline', research_status: 'complete', timeline_mode: payload.timelineMode,
          research_fingerprint: correctedFingerprint, profile_snapshot: payload.profileSnapshot,
          sources: payload.sources, event_evidence: payload.events.map((event, eventIndex) => ({ eventIndex, evidenceRefs: event.evidenceRefs })),
          profile_conflicts: [], blocking_issues: [], research_payload: payload,
          timeline_event_ids: eventIds, event_count: eventIds.length, supersedes_run_id: oldRunId,
          superseded_by_run_id: null, superseded_at: null, supersession_reason: null,
        },
      ]), { status: 200 })
    }
    if (url.includes('/celeb_timeline_events?')) {
      const rows = expectedRows.map((row, index) => ({ id: eventIds[index], ...row }))
      if (includeExtraEvent) rows.push({
        ...rows[0], id: '99999999-9999-9999-9999-999999999999', sort_order: 99,
      })
      return new Response(JSON.stringify(rows), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  const reason = 'correct malformed encoded source URLs'
  const result = await executeTimelineCommand({
    argv: [
      'correct', '--celeb-id', payload.celebId, '--expected-run-id', oldRunId,
      '--expected-fingerprint', expectedFingerprint, '--reason', reason,
    ],
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' },
    stdinText: JSON.stringify(payload),
    fetchImpl,
  })
  assert.equal(result.readback.verified, true)
  assert.equal(correctionArgs.p_expected_run_id, oldRunId)
  assert.equal(correctionArgs.p_expected_research_fingerprint, expectedFingerprint)
  assert.equal(correctionArgs.p_corrected_research_fingerprint, correctedFingerprint)
  assert.deepEqual(correctionArgs.p_corrected_research_payload, payload)
  assert.equal(correctionArgs.p_reason, reason)

  includeExtraEvent = true
  await assert.rejects(() => executeTimelineCommand({
    argv: [
      'correct', '--celeb-id', payload.celebId, '--expected-run-id', oldRunId,
      '--expected-fingerprint', expectedFingerprint, '--reason', reason,
    ],
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' },
    stdinText: JSON.stringify(payload),
    fetchImpl,
  }), /active live timeline id set mismatch/)
})

test('global verify rejects an unreferenced extra row owned by an active direct run celeb', async () => {
  const payload = payloadFixture()
  const fingerprint = researchFingerprint(payload)
  const runId = '33333333-3333-3333-3333-333333333333'
  const eventIds = payload.events.map((_, index) => `00000000-0000-0000-0000-00000000000${index}`)
  const rows = mapDirectPayloadToTimelineRows(payload).map((row, index) => ({ id: eventIds[index], ...row }))
  rows.push({ ...rows[0], id: '99999999-9999-9999-9999-999999999999', sort_order: 99 })
  const run = {
    id: runId, celeb_id: payload.celebId, pipeline: 'timeline_backfill_v1',
    run_origin: 'direct_pipeline', research_status: 'complete', timeline_mode: payload.timelineMode,
    research_fingerprint: fingerprint, profile_snapshot: payload.profileSnapshot,
    sources: payload.sources, event_evidence: payload.events.map((event, eventIndex) => ({ eventIndex, evidenceRefs: event.evidenceRefs })),
    profile_conflicts: [], blocking_issues: [], research_payload: payload,
    timeline_event_ids: eventIds, event_count: eventIds.length,
    supersedes_run_id: null, superseded_by_run_id: null, superseded_at: null,
    supersession_reason: null,
  }
  const fetchImpl = async (url) => {
    if (url.endsWith('/rest/v1/')) return new Response(JSON.stringify(openApiFixture()), { status: 200 })
    const security = securityContractResponse(url)
    if (security) return security
    if (url.includes('/celeb_timeline_research_runs?')) return new Response(JSON.stringify([run]), { status: 200 })
    if (url.includes('/celeb_timeline_events?')) return new Response(JSON.stringify(rows), { status: 200 })
    if (url.includes('/rpc/get_celeb_timeline_backfill_status')) {
      return new Response(JSON.stringify({
        taskType: 'timeline_backfill_v1',
        celebs: { total: 1, withTimeline: 1, missingTimeline: 0 },
        queue: { completed: 1 },
        researchRuns: { total: 1, celebs: 1, recordedEvents: 3 },
      }), { status: 200 })
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  const result = await executeTimelineCommand({
    argv: ['verify'],
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' },
    fetchImpl,
  })
  assert.equal(result.valid, false)
  assert.ok(result.invalidRuns.some((invalid) => invalid.errors.includes('active live timeline id set mismatch')))
})
