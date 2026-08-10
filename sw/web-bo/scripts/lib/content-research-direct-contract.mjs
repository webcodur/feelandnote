import { createHash } from 'node:crypto'

export const CONTENT_RESEARCH_TASK_TYPE = 'content_research_v1'

export const CONTENT_RESEARCH_RPCS = Object.freeze({
  enqueue: 'enqueue_celeb_content_research_jobs',
  claim: 'claim_next_celeb_content_research',
  renew: 'renew_celeb_content_research_lease',
  commit: 'complete_celeb_content_research_direct',
  fail: 'fail_celeb_content_research',
  requeue: 'requeue_celeb_content_research',
  status: 'get_celeb_content_research_status',
  providerSlot: 'reserve_external_provider_request',
})

const TEXT = ['string', 'text']
const UUID_TYPE = ['string', 'uuid']
const INTEGER = ['integer', 'integer']
const BOOLEAN = ['boolean', 'boolean']
const JSONB = [undefined, 'jsonb']
const UUID_ARRAY = ['array', 'uuid[]']

export const CONTENT_RESEARCH_RPC_SIGNATURES = Object.freeze({
  [CONTENT_RESEARCH_RPCS.enqueue]: {
    required: ['p_celeb_ids'],
    optional: { p_reason: TEXT },
    types: { p_celeb_ids: UUID_ARRAY },
  },
  [CONTENT_RESEARCH_RPCS.claim]: {
    required: ['p_worker'],
    optional: { p_lease_minutes: INTEGER },
    types: { p_worker: TEXT },
  },
  [CONTENT_RESEARCH_RPCS.renew]: {
    required: ['p_celeb_id', 'p_worker', 'p_claim_token'],
    optional: { p_lease_minutes: INTEGER },
    types: { p_celeb_id: UUID_TYPE, p_worker: TEXT, p_claim_token: UUID_TYPE },
  },
  [CONTENT_RESEARCH_RPCS.commit]: {
    required: [
      'p_celeb_id',
      'p_worker',
      'p_claim_token',
      'p_research_fingerprint',
      'p_research_payload',
    ],
    optional: {},
    types: {
      p_celeb_id: UUID_TYPE,
      p_worker: TEXT,
      p_claim_token: UUID_TYPE,
      p_research_fingerprint: TEXT,
      p_research_payload: JSONB,
    },
  },
  [CONTENT_RESEARCH_RPCS.fail]: {
    required: ['p_celeb_id', 'p_worker', 'p_claim_token', 'p_error'],
    optional: { p_retry: BOOLEAN, p_skip: BOOLEAN, p_research_payload: JSONB },
    types: { p_celeb_id: UUID_TYPE, p_worker: TEXT, p_claim_token: UUID_TYPE, p_error: TEXT },
  },
  [CONTENT_RESEARCH_RPCS.requeue]: {
    required: ['p_celeb_id', 'p_reason'],
    optional: { p_reset_attempts: BOOLEAN },
    types: { p_celeb_id: UUID_TYPE, p_reason: TEXT },
  },
  [CONTENT_RESEARCH_RPCS.status]: { required: [], optional: {} },
  [CONTENT_RESEARCH_RPCS.providerSlot]: {
    required: ['p_provider', 'p_worker', 'p_request_token'],
    optional: { p_min_interval_ms: INTEGER },
    types: { p_provider: TEXT, p_worker: TEXT, p_request_token: UUID_TYPE },
  },
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FINGERPRINT = /^[0-9a-f]{64}$/
const ASCII_OBJECT_KEY = /^[\x20-\x7E]{1,128}$/
const CLAIM_KEYS = [
  'celeb_id', 'slug', 'nickname', 'nickname_en', 'profession', 'nationality',
  'birth_date', 'death_date', 'wikidata_qid', 'run_id', 'priority', 'attempt_count',
  'claim_token', 'profile_snapshot', 'claimed_at', 'lease_expires_at',
]
const PROFILE_SNAPSHOT_KEYS = [
  'id', 'slug', 'nickname', 'nicknameEn', 'profession', 'nationality', 'birthDate',
  'deathDate', 'wikidataQid', 'publicationStatus', 'celebTier',
]
const STATUS_QUEUE_KEYS = [
  'total', 'pending', 'inProgress', 'completed', 'failed', 'skipped', 'expiredLeases',
]
const STATUS_RUN_KEYS = ['inProgress', 'completed', 'cancelled']
const STATUS_INTEGRITY_KEYS = [
  'activeQueueWithoutRun', 'activeRunWithoutQueue', 'completedQueueWithoutClosedRun',
  'musicDeferredQueueWithoutVerifiedFinding', 'verifiedMusicFindingWithoutCandidate',
  'musicDeferredCelebConfirmedEmpty',
]

function assertJsonValue(value, seen = new Set()) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('stable JSON cannot contain non-finite numbers')
    return
  }
  if (typeof value !== 'object') throw new TypeError(`stable JSON cannot contain ${typeof value}`)
  if (seen.has(value)) throw new TypeError('stable JSON cannot contain cycles')
  seen.add(value)
  if (Array.isArray(value)) {
    for (const child of value) assertJsonValue(child, seen)
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (!ASCII_OBJECT_KEY.test(key)) {
        throw new TypeError('stable JSON object keys must be 1..128 printable ASCII characters')
      }
      assertJsonValue(child, seen)
    }
  }
  seen.delete(value)
}

export function stableValue(value) {
  assertJsonValue(value)
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
  }
  return value
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value))
}

export function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex')
}

export function contentResearchFingerprint(payload) {
  return sha256(stableStringify(payload))
}

function pathDefinition(openApi, path) {
  return openApi?.paths?.[path] ?? openApi?.paths?.[path.replace(/^\//, '')] ?? null
}

function rpcBodySchema(path) {
  return path?.post?.parameters?.find((parameter) => parameter?.in === 'body')?.schema ?? null
}

export function buildContentResearchOpenApiSnapshot(openApi, checkedAt = new Date().toISOString()) {
  const rpcPaths = Object.fromEntries(Object.values(CONTENT_RESEARCH_RPCS).map((rpc) => {
    const definition = pathDefinition(openApi, `/rpc/${rpc}`)
    const body = rpcBodySchema(definition)
    return [rpc, {
      methods: Object.keys(definition ?? {}).sort(),
      arguments: body?.properties ?? {},
      required: [...(body?.required ?? [])].sort(),
    }]
  }))
  const shape = {
    openapi: openApi?.openapi ?? openApi?.swagger ?? null,
    rpcPaths,
  }
  return {
    checkedAt,
    source: 'PostgREST service-role OpenAPI',
    fingerprintAlgorithm: 'sha256(stable JSON)',
    fingerprint: sha256(stableStringify(shape)),
    shape,
  }
}

function validateProperty(errors, rpc, name, property, expected) {
  if (!property) {
    errors.push(`${rpc}.${name} is missing`)
    return
  }
  const [type, format] = expected
  if (type !== undefined && property.type !== type) {
    errors.push(`${rpc}.${name} type changed: ${property.type ?? 'null'} != ${type}`)
  }
  if (format !== undefined && property.format !== format) {
    errors.push(`${rpc}.${name} format changed: ${property.format ?? 'null'} != ${format}`)
  }
}

export function validateContentResearchOpenApiSnapshot(snapshot) {
  const errors = []
  for (const [rpc, signature] of Object.entries(CONTENT_RESEARCH_RPC_SIGNATURES)) {
    const live = snapshot?.shape?.rpcPaths?.[rpc]
    if (!live?.methods?.includes('post')) {
      errors.push(`RPC POST missing: ${rpc}`)
      continue
    }
    const expectedNames = [...signature.required, ...Object.keys(signature.optional ?? {})].sort()
    const liveNames = Object.keys(live.arguments ?? {}).sort()
    if (stableStringify(liveNames) !== stableStringify(expectedNames)) {
      errors.push(`${rpc} arguments changed: ${liveNames.join(',') || '(none)'} != ${expectedNames.join(',') || '(none)'}`)
    }
    if (stableStringify(live.required ?? []) !== stableStringify([...signature.required].sort())) {
      errors.push(`${rpc} required arguments changed: ${(live.required ?? []).join(',') || '(none)'}`)
    }
    for (const [name, expected] of Object.entries({ ...(signature.types ?? {}), ...(signature.optional ?? {}) })) {
      validateProperty(errors, rpc, name, live.arguments?.[name], expected)
    }
  }
  return errors
}

export async function fetchContentResearchOpenApiSnapshot({ url, serviceKey, fetchImpl = fetch }) {
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      accept: 'application/openapi+json',
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw codedError('CONTENT_RESEARCH_OPENAPI_ERROR', `PostgREST OpenAPI read failed: HTTP ${response.status}`)
  let openApi
  try {
    openApi = await response.json()
  } catch {
    throw codedError('CONTENT_RESEARCH_OPENAPI_ERROR', 'PostgREST OpenAPI response is not valid JSON')
  }
  if (!openApi || typeof openApi !== 'object' || Array.isArray(openApi)) {
    throw codedError('CONTENT_RESEARCH_OPENAPI_ERROR', 'PostgREST OpenAPI response must be a JSON object')
  }
  return buildContentResearchOpenApiSnapshot(openApi)
}

export async function assertLiveContentResearchContract(options) {
  const snapshot = await fetchContentResearchOpenApiSnapshot(options)
  const errors = validateContentResearchOpenApiSnapshot(snapshot)
  if (errors.length > 0) {
    const error = codedError(
      'CONTENT_RESEARCH_DB_CONTRACT_MISMATCH',
      `content research direct DB contract mismatch (${errors.length}): ${errors.join(' | ')}`,
    )
    error.contractErrors = errors
    throw error
  }
  return snapshot
}

function codedError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export function classifyContentResearchRpcError(message) {
  const text = String(message ?? '')
  if (text.startsWith('active content research claim not owned or lease expired:')) {
    return 'STALE_CONTENT_RESEARCH_CLAIM'
  }
  if (text.startsWith('invalid content research fingerprint')) return 'INVALID_CONTENT_RESEARCH_FINGERPRINT'
  if (text.startsWith('completed content research fingerprint mismatch')) return 'CONTENT_RESEARCH_FINGERPRINT_MISMATCH'
  if (text.startsWith('completed content research payload mismatch')) return 'CONTENT_RESEARCH_PAYLOAD_MISMATCH'
  if (text.startsWith('invalid content research payload:')) return 'INVALID_CONTENT_RESEARCH_PAYLOAD'
  if (text.startsWith('content research claim ')) return 'CONTENT_RESEARCH_CLAIM_ERROR'
  return 'CONTENT_RESEARCH_RPC_ERROR'
}

export async function callContentResearchRpc({ url, serviceKey, rpc, args = {}, fetchImpl = fetch }) {
  if (!Object.values(CONTENT_RESEARCH_RPCS).includes(rpc)) {
    throw codedError('CONTENT_RESEARCH_RPC_UNKNOWN', `unknown content research RPC: ${rpc}`)
  }
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = typeof body?.message === 'string' ? body.message : ''
    } catch {
      // Arbitrary gateway bodies are not echoed because they may contain request headers.
    }
    const code = classifyContentResearchRpcError(detail)
    throw codedError(code, `content research RPC ${rpc} failed: HTTP ${response.status}${detail ? `: ${redactText(detail)}` : ''}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw responseError(rpc, 'response is not valid JSON')
  }
}

function responseError(rpc, message) {
  return codedError('CONTENT_RESEARCH_RPC_RESPONSE_MISMATCH', `content research RPC ${rpc} response contract mismatch: ${message}`)
}

function assertObject(rpc, value, path = '$') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw responseError(rpc, `${path} must be an object`)
}

function assertExactKeys(rpc, value, expected, path = '$') {
  assertObject(rpc, value, path)
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (stableStringify(actual) !== stableStringify(wanted)) {
    throw responseError(rpc, `${path} keys ${actual.join(',') || '(none)'} != ${wanted.join(',') || '(none)'}`)
  }
}

function assertUuid(rpc, value, path) {
  if (typeof value !== 'string' || !UUID.test(value)) throw responseError(rpc, `${path} must be a UUID`)
}

function assertInteger(rpc, value, path, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw responseError(rpc, `${path} must be an integer >= ${min}`)
}

function assertTimestamp(rpc, value, path) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw responseError(rpc, `${path} must be an ISO timestamp`)
}

function assertExpected(rpc, actual, expected, path) {
  if (expected != null && actual !== expected) throw responseError(rpc, `${path} does not match the request`)
}

function assertNullableText(rpc, value, path, required = false) {
  if (value == null && !required) return
  if (typeof value !== 'string' || (required && value.trim().length === 0)) {
    throw responseError(rpc, `${path} must be ${required ? 'nonblank text' : 'text or null'}`)
  }
}

function assertProfileSnapshot(rpc, snapshot, row) {
  assertExactKeys(rpc, snapshot, PROFILE_SNAPSHOT_KEYS, '$[0].profile_snapshot')
  assertUuid(rpc, snapshot.id, '$[0].profile_snapshot.id')
  assertNullableText(rpc, snapshot.nickname, '$[0].profile_snapshot.nickname', true)
  for (const key of PROFILE_SNAPSHOT_KEYS.filter((key) => !['id', 'nickname'].includes(key))) {
    assertNullableText(rpc, snapshot[key], `$[0].profile_snapshot.${key}`, ['publicationStatus', 'celebTier'].includes(key))
  }
  const pairs = [
    ['id', 'celeb_id'], ['slug', 'slug'], ['nickname', 'nickname'], ['nicknameEn', 'nickname_en'],
    ['profession', 'profession'], ['nationality', 'nationality'], ['birthDate', 'birth_date'],
    ['deathDate', 'death_date'], ['wikidataQid', 'wikidata_qid'],
  ]
  for (const [camel, snake] of pairs) {
    if (snapshot[camel] !== row[snake]) throw responseError(rpc, `$[0].profile_snapshot.${camel} mismatch`)
  }
}

function assertCountObject(rpc, value, expectedKeys, path) {
  assertExactKeys(rpc, value, expectedKeys, path)
  for (const [key, count] of Object.entries(value)) assertInteger(rpc, count, `${path}.${key}`)
}

export function validateContentResearchRpcResponse(rpc, result, expected = {}) {
  if (!Object.values(CONTENT_RESEARCH_RPCS).includes(rpc)) throw responseError(rpc, 'unknown RPC')

  if (rpc === CONTENT_RESEARCH_RPCS.claim) {
    if (!Array.isArray(result) || result.length > 1) throw responseError(rpc, '$ must contain zero or one claim row')
    if (result.length === 0) return result
    const row = result[0]
    assertExactKeys(rpc, row, CLAIM_KEYS, '$[0]')
    assertUuid(rpc, row.celeb_id, '$[0].celeb_id')
    assertUuid(rpc, row.run_id, '$[0].run_id')
    assertUuid(rpc, row.claim_token, '$[0].claim_token')
    assertNullableText(rpc, row.nickname, '$[0].nickname', true)
    for (const key of ['slug', 'nickname_en', 'profession', 'nationality', 'birth_date', 'death_date', 'wikidata_qid']) {
      assertNullableText(rpc, row[key], `$[0].${key}`)
    }
    assertInteger(rpc, row.priority, '$[0].priority', Number.MIN_SAFE_INTEGER)
    assertInteger(rpc, row.attempt_count, '$[0].attempt_count', 1)
    assertTimestamp(rpc, row.claimed_at, '$[0].claimed_at')
    assertTimestamp(rpc, row.lease_expires_at, '$[0].lease_expires_at')
    assertProfileSnapshot(rpc, row.profile_snapshot, row)
    return result
  }

  if (rpc === CONTENT_RESEARCH_RPCS.enqueue) {
    assertExactKeys(rpc, result, [
      'taskType', 'requested', 'eligible', 'insertedOrRequeued', 'activeLeasePreserved',
      'terminalPreserved', 'rejected',
    ])
    if (result.taskType !== CONTENT_RESEARCH_TASK_TYPE) throw responseError(rpc, '$.taskType is invalid')
    for (const key of ['requested', 'eligible', 'insertedOrRequeued', 'activeLeasePreserved', 'terminalPreserved', 'rejected']) {
      assertInteger(rpc, result[key], `$.${key}`)
    }
    if (result.eligible + result.rejected !== result.requested) throw responseError(rpc, '$ counts do not add up')
    return result
  }

  if (rpc === CONTENT_RESEARCH_RPCS.renew) {
    assertExactKeys(rpc, result, ['status', 'celebId', 'claimToken', 'leaseExpiresAt'])
    if (result.status !== 'in_progress') throw responseError(rpc, '$.status must be in_progress')
    assertUuid(rpc, result.celebId, '$.celebId')
    assertUuid(rpc, result.claimToken, '$.claimToken')
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    assertExpected(rpc, result.claimToken, expected.claimToken, '$.claimToken')
    assertTimestamp(rpc, result.leaseExpiresAt, '$.leaseExpiresAt')
    return result
  }

  if (rpc === CONTENT_RESEARCH_RPCS.commit) {
    assertExactKeys(rpc, result, [
      'status', 'celebId', 'runId', 'actualContentCount', 'finalResearchStatus',
      'contentsCreated', 'linksCreated', 'musicCandidatesUpserted', 'musicFindingsRecorded',
      'researchFingerprint',
    ])
    if (!['completed', 'already_completed', 'music_deferred'].includes(result.status)) {
      throw responseError(rpc, '$.status is invalid')
    }
    assertUuid(rpc, result.celebId, '$.celebId')
    assertUuid(rpc, result.runId, '$.runId')
    for (const key of [
      'actualContentCount', 'contentsCreated', 'linksCreated', 'musicCandidatesUpserted',
      'musicFindingsRecorded',
    ]) {
      assertInteger(rpc, result[key], `$.${key}`)
    }
    if (!['open', 'confirmed_empty'].includes(result.finalResearchStatus)) {
      throw responseError(rpc, '$.finalResearchStatus is invalid')
    }
    if (typeof result.researchFingerprint !== 'string' || !FINGERPRINT.test(result.researchFingerprint)) {
      throw responseError(rpc, '$.researchFingerprint is invalid')
    }
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    assertExpected(rpc, result.researchFingerprint, expected.researchFingerprint, '$.researchFingerprint')
    if (expected.musicEligible != null) {
      assertExpected(rpc, result.musicCandidatesUpserted, expected.musicEligible, '$.musicCandidatesUpserted')
      assertExpected(rpc, result.musicFindingsRecorded, expected.musicEligible, '$.musicFindingsRecorded')
    }
    if (expected.musicOnly === true && !['music_deferred', 'already_completed'].includes(result.status)) {
      throw responseError(rpc, '$.status must be music_deferred for a MUSIC-only payload')
    }
    if (expected.musicOnly === false && result.status === 'music_deferred') {
      throw responseError(rpc, '$.status cannot be music_deferred for this payload')
    }
    return result
  }

  if (rpc === CONTENT_RESEARCH_RPCS.fail) {
    assertExactKeys(rpc, result, [
      'status', 'celebId', 'runId', 'claimToken', 'error', 'retryExhausted',
      'retryNotBefore',
    ])
    const allowed = expected.disposition === 'retry'
      ? ['pending', 'failed']
      : expected.disposition === 'skip' ? ['skipped'] : ['failed']
    if (!allowed.includes(result.status)) throw responseError(rpc, `$.status is invalid for ${expected.disposition}`)
    assertUuid(rpc, result.celebId, '$.celebId')
    assertUuid(rpc, result.runId, '$.runId')
    assertUuid(rpc, result.claimToken, '$.claimToken')
    assertNullableText(rpc, result.error, '$.error', true)
    if (typeof result.retryExhausted !== 'boolean') throw responseError(rpc, '$.retryExhausted must be boolean')
    if (result.status === 'pending') {
      if (result.retryExhausted !== false) throw responseError(rpc, '$.retryExhausted must be false for pending retry')
      assertTimestamp(rpc, result.retryNotBefore, '$.retryNotBefore')
    } else {
      if (result.retryNotBefore !== null) throw responseError(rpc, '$.retryNotBefore must be null for a terminal result')
      const expectedExhausted = expected.disposition === 'retry'
      if (result.retryExhausted !== expectedExhausted) {
        throw responseError(rpc, `$.retryExhausted must be ${expectedExhausted}`)
      }
    }
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    assertExpected(rpc, result.claimToken, expected.claimToken, '$.claimToken')
    assertExpected(rpc, result.error, expected.error, '$.error')
    return result
  }

  if (rpc === CONTENT_RESEARCH_RPCS.requeue) {
    assertExactKeys(rpc, result, ['status', 'celebId', 'generation', 'attemptCount', 'reason'])
    if (result.status !== 'pending') throw responseError(rpc, '$.status must be pending')
    assertUuid(rpc, result.celebId, '$.celebId')
    assertInteger(rpc, result.generation, '$.generation', 1)
    assertInteger(rpc, result.attemptCount, '$.attemptCount')
    assertNullableText(rpc, result.reason, '$.reason', true)
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    assertExpected(rpc, result.reason, expected.reason, '$.reason')
    if (expected.resetAttempts === true && result.attemptCount !== 0) {
      throw responseError(rpc, '$.attemptCount must be 0 when reset attempts was requested')
    }
    return result
  }

  if (rpc === CONTENT_RESEARCH_RPCS.status) {
    assertExactKeys(rpc, result, ['taskType', 'queue', 'researchRuns', 'integrity'])
    if (result.taskType !== CONTENT_RESEARCH_TASK_TYPE) throw responseError(rpc, '$.taskType is invalid')
    assertCountObject(rpc, result.queue, STATUS_QUEUE_KEYS, '$.queue')
    assertCountObject(rpc, result.researchRuns, STATUS_RUN_KEYS, '$.researchRuns')
    assertCountObject(rpc, result.integrity, STATUS_INTEGRITY_KEYS, '$.integrity')
    return result
  }

  if (rpc === CONTENT_RESEARCH_RPCS.providerSlot) {
    assertExactKeys(rpc, result, [
      'provider', 'worker', 'requestToken', 'availableAt', 'nextAvailableAt',
      'waitMs', 'minIntervalMs', 'replayed',
    ])
    if (result.provider !== 'openlibrary') throw responseError(rpc, '$.provider must be openlibrary')
    assertNullableText(rpc, result.worker, '$.worker', true)
    if (result.worker.length > 200) throw responseError(rpc, '$.worker must be at most 200 characters')
    assertUuid(rpc, result.requestToken, '$.requestToken')
    assertTimestamp(rpc, result.availableAt, '$.availableAt')
    assertTimestamp(rpc, result.nextAvailableAt, '$.nextAvailableAt')
    assertInteger(rpc, result.waitMs, '$.waitMs')
    assertInteger(rpc, result.minIntervalMs, '$.minIntervalMs', 1_100)
    if (result.minIntervalMs > 60_000) throw responseError(rpc, '$.minIntervalMs must be <= 60000')
    if (typeof result.replayed !== 'boolean') throw responseError(rpc, '$.replayed must be boolean')
    assertExpected(rpc, result.provider, expected.provider, '$.provider')
    assertExpected(rpc, result.worker, expected.worker, '$.worker')
    assertExpected(rpc, result.requestToken, expected.requestToken, '$.requestToken')
    assertExpected(rpc, result.minIntervalMs, expected.minIntervalMs, '$.minIntervalMs')
    if (Date.parse(result.nextAvailableAt) - Date.parse(result.availableAt) !== result.minIntervalMs) {
      throw responseError(rpc, '$.nextAvailableAt must be exactly minIntervalMs after $.availableAt')
    }
    return result
  }

  throw responseError(rpc, 'response validator is missing')
}

const CAPABILITY_KEYS = new Set(['claimToken', 'claim_token'])

function secretOutputKey(value) {
  const normalized = String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
  return /(?:secret|accesstoken|refreshtoken|idtoken|apitoken|authtoken|bearer|credential|servicerole|privatekey|password|cookie|authorization|jwt|apikey)/.test(normalized)
}

export function redactText(value) {
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/\b(?:sk_|sb_secret_)[A-Za-z0-9_-]{8,}\b/gi, '[REDACTED_KEY]')
    .replace(/\bpostgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@[^\s,;]+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/\b(?:client[_-]?secret|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?token|auth[_-]?token|bearer|credentials?|service[_-]?role(?:[_-]?key)?|private[_-]?key|password|cookie|authorization|jwt|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi, '[REDACTED_SECRET]')
}

export function sanitizeContentResearchOutput(value) {
  if (typeof value === 'string') return redactText(value)
  if (Array.isArray(value)) return value.map(sanitizeContentResearchOutput)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
    key,
    secretOutputKey(key) && !CAPABILITY_KEYS.has(key)
      ? '[REDACTED]'
      : sanitizeContentResearchOutput(nested),
  ]))
}
