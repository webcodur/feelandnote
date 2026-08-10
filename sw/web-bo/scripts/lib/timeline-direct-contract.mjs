import { createHash } from 'node:crypto'

export const TIMELINE_TASK_TYPE = 'timeline_backfill_v1'

export const DIRECT_TABLES = Object.freeze({
  celebs: 'celebs',
  events: 'celeb_timeline_events',
  runs: 'celeb_timeline_research_runs',
})

export const DIRECT_QUEUE_TABLE = 'celeb_task_queue'

export const DIRECT_RPCS = Object.freeze({
  enqueue: 'enqueue_missing_celeb_timeline_backfill_jobs',
  claim: 'claim_next_celeb_timeline_backfill',
  renew: 'renew_celeb_timeline_backfill_lease',
  commit: 'complete_celeb_timeline_backfill',
  correct: 'correct_celeb_timeline_backfill',
  fail: 'fail_celeb_timeline_backfill',
  requeue: 'requeue_celeb_timeline_backfill',
  status: 'get_celeb_timeline_backfill_status',
  security: 'get_celeb_timeline_backfill_security_contract',
})

const TABLE_CONTRACTS = Object.freeze({
  [DIRECT_TABLES.celebs]: {
    id: ['string', 'uuid'],
    slug: ['string', 'text'],
    nickname: ['string', 'text'],
    nickname_en: ['string', 'text'],
    title: ['string', 'text'],
    title_en: ['string', 'text'],
    profession: ['string', 'text'],
    nationality: ['string', 'text'],
    gender: ['boolean', 'boolean'],
    birth_date: ['string', 'text'],
    death_date: ['string', 'text'],
    publication_status: ['string', 'text'],
    celeb_tier: ['string', 'text'],
    wikidata_qid: ['string', 'text'],
  },
  [DIRECT_TABLES.events]: {
    id: ['string', 'uuid'],
    celeb_id: ['string', 'uuid'],
    year: ['integer', 'integer'],
    year_end: ['integer', 'integer'],
    month: ['integer', 'smallint'],
    day: ['integer', 'smallint'],
    sequence_label: ['string', 'text'],
    sequence_label_en: ['string', 'text'],
    title: ['string', 'text'],
    title_en: ['string', 'text'],
    description: ['string', 'text'],
    description_en: ['string', 'text'],
    kind: ['string', 'text'],
    place_name: ['string', 'text'],
    place_name_en: ['string', 'text'],
    lat: ['number', 'double precision'],
    lng: ['number', 'double precision'],
    place_qid: ['string', 'text'],
    source: ['string', 'text'],
    source_url: ['string', 'text'],
    sort_order: ['integer', 'integer'],
  },
  // The run is the durable audit/evidence ledger. Its research_payload JSONB contains
  // the full sources/evidenceRefs graph; timeline rows intentionally retain only the
  // first evidence URL for the user-facing source_url column.
  [DIRECT_TABLES.runs]: {
    id: ['string', 'uuid'],
    celeb_id: ['string', 'uuid'],
    pipeline: ['string', 'text'],
    run_origin: ['string', 'text'],
    research_status: ['string', 'text'],
    timeline_mode: ['string', 'text'],
    research_fingerprint: ['string', 'text'],
    source_snapshot_id: ['string', 'text'],
    claim_token: ['string', 'uuid'],
    claimed_by: ['string', 'text'],
    attempt_count: ['integer', 'integer'],
    profile_snapshot: [undefined, 'jsonb'],
    sources: [undefined, 'jsonb'],
    event_evidence: [undefined, 'jsonb'],
    profile_conflicts: [undefined, 'jsonb'],
    blocking_issues: [undefined, 'jsonb'],
    research_payload: [undefined, 'jsonb'],
    timeline_event_ids: ['array', 'uuid[]'],
    event_count: ['integer', 'integer'],
    started_at: ['string', 'timestamp with time zone'],
    completed_at: ['string', 'timestamp with time zone'],
    created_at: ['string', 'timestamp with time zone'],
    supersedes_run_id: ['string', 'uuid'],
    superseded_by_run_id: ['string', 'uuid'],
    superseded_at: ['string', 'timestamp with time zone'],
    supersession_reason: ['string', 'text'],
  },
})

const TABLE_REQUIRED_METHODS = Object.freeze({
  [DIRECT_TABLES.celebs]: ['get'],
  [DIRECT_TABLES.events]: ['get'],
  [DIRECT_TABLES.runs]: ['get'],
})

export const DIRECT_RPC_SIGNATURES = Object.freeze({
  [DIRECT_RPCS.enqueue]: { required: [], optional: {} },
  [DIRECT_RPCS.claim]: {
    required: ['p_worker'],
    optional: { p_lease_minutes: ['integer', 'integer'] },
    types: { p_worker: ['string', 'text'] },
  },
  [DIRECT_RPCS.renew]: {
    required: ['p_celeb_id', 'p_worker', 'p_claim_token'],
    optional: { p_lease_minutes: ['integer', 'integer'] },
    types: {
      p_celeb_id: ['string', 'uuid'],
      p_worker: ['string', 'text'],
      p_claim_token: ['string', 'uuid'],
    },
  },
  [DIRECT_RPCS.commit]: {
    required: [
      'p_celeb_id',
      'p_worker',
      'p_claim_token',
      'p_profile_snapshot',
      'p_research_fingerprint',
      'p_research_payload',
    ],
    optional: {},
    types: {
      p_celeb_id: ['string', 'uuid'],
      p_worker: ['string', 'text'],
      p_claim_token: ['string', 'uuid'],
      p_profile_snapshot: [undefined, 'jsonb'],
      p_research_fingerprint: ['string', 'text'],
      p_research_payload: [undefined, 'jsonb'],
    },
  },
  [DIRECT_RPCS.correct]: {
    required: [
      'p_celeb_id',
      'p_expected_run_id',
      'p_expected_research_fingerprint',
      'p_corrected_profile_snapshot',
      'p_corrected_research_fingerprint',
      'p_corrected_research_payload',
      'p_reason',
    ],
    optional: {},
    types: {
      p_celeb_id: ['string', 'uuid'],
      p_expected_run_id: ['string', 'uuid'],
      p_expected_research_fingerprint: ['string', 'text'],
      p_corrected_profile_snapshot: [undefined, 'jsonb'],
      p_corrected_research_fingerprint: ['string', 'text'],
      p_corrected_research_payload: [undefined, 'jsonb'],
      p_reason: ['string', 'text'],
    },
  },
  [DIRECT_RPCS.fail]: {
    required: ['p_celeb_id', 'p_worker', 'p_claim_token', 'p_error'],
    optional: {
      p_skip: ['boolean', 'boolean'],
      p_profile_snapshot: [undefined, 'jsonb'],
      p_research_fingerprint: ['string', 'text'],
      p_research_payload: [undefined, 'jsonb'],
    },
    types: {
      p_celeb_id: ['string', 'uuid'],
      p_worker: ['string', 'text'],
      p_claim_token: ['string', 'uuid'],
      p_error: ['string', 'text'],
    },
  },
  [DIRECT_RPCS.requeue]: {
    required: ['p_celeb_id'],
    optional: {
      p_reason: ['string', 'text'],
      p_reset_attempts: ['boolean', 'boolean'],
    },
    types: { p_celeb_id: ['string', 'uuid'] },
  },
  [DIRECT_RPCS.status]: { required: [], optional: {} },
  [DIRECT_RPCS.security]: { required: [], optional: {} },
})

const SECURITY_RPC_SQL_SIGNATURES = Object.freeze({
  [DIRECT_RPCS.enqueue]: 'public.enqueue_missing_celeb_timeline_backfill_jobs()',
  [DIRECT_RPCS.claim]: 'public.claim_next_celeb_timeline_backfill(text,integer)',
  [DIRECT_RPCS.renew]: 'public.renew_celeb_timeline_backfill_lease(uuid,text,uuid,integer)',
  [DIRECT_RPCS.commit]: 'public.complete_celeb_timeline_backfill(uuid,text,uuid,jsonb,text,jsonb)',
  [DIRECT_RPCS.correct]: 'public.correct_celeb_timeline_backfill(uuid,uuid,text,jsonb,text,jsonb,text)',
  [DIRECT_RPCS.fail]: 'public.fail_celeb_timeline_backfill(uuid,text,uuid,text,boolean,jsonb,text,jsonb)',
  [DIRECT_RPCS.requeue]: 'public.requeue_celeb_timeline_backfill(uuid,text,boolean)',
  [DIRECT_RPCS.status]: 'public.get_celeb_timeline_backfill_status()',
  [DIRECT_RPCS.security]: 'public.get_celeb_timeline_backfill_security_contract()',
})

const READ_ONLY = Object.freeze({ select: true, insert: false, update: false, delete: false })
const NO_CRUD = Object.freeze({ select: false, insert: false, update: false, delete: false })
const FULL_CRUD = Object.freeze({ select: true, insert: true, update: true, delete: true })
const RPC_EXECUTE = Object.freeze({
  postgres: true,
  service_role: true,
  anon: false,
  authenticated: false,
  public: false,
})

const expectedRpcSecurity = (signature) => ({
  signature,
  owner: 'postgres',
  securityDefiner: true,
  searchPath: ['search_path=pg_catalog'],
  execute: RPC_EXECUTE,
  executeGrantees: ['postgres', 'service_role'],
  executeAcl: [
    { grantee: 'postgres', grantor: 'postgres', grantable: false },
    { grantee: 'service_role', grantor: 'postgres', grantable: false },
  ],
})

const postgresGrant = (privilege) => ({ privilege, grantor: 'postgres', grantable: false })

export const EXPECTED_TIMELINE_SECURITY_CONTRACT = Object.freeze({
  schemaVersion: 2,
  serviceRoleAccess: {
    roleMatrix: [
      { name: 'anon', canLogin: false, superuser: false, inherit: true, createRole: false, createDb: false, replication: false, bypassRls: false, member: false, usage: false, set: false },
      { name: 'authenticated', canLogin: false, superuser: false, inherit: true, createRole: false, createDb: false, replication: false, bypassRls: false, member: false, usage: false, set: false },
      { name: 'authenticator', canLogin: true, superuser: false, inherit: false, createRole: false, createDb: false, replication: false, bypassRls: false, member: true, usage: false, set: true },
      { name: 'cli_login_postgres', canLogin: true, superuser: false, inherit: false, createRole: false, createDb: false, replication: false, bypassRls: false, member: true, usage: false, set: true },
      { name: 'postgres', canLogin: true, superuser: false, inherit: true, createRole: true, createDb: true, replication: true, bypassRls: true, member: true, usage: true, set: true },
      { name: 'service_role', canLogin: false, superuser: false, inherit: true, createRole: false, createDb: false, replication: false, bypassRls: true, member: true, usage: true, set: true },
      { name: 'supabase_storage_admin', canLogin: true, superuser: false, inherit: false, createRole: true, createDb: false, replication: false, bypassRls: false, member: true, usage: false, set: true },
    ],
    membershipEdges: [
      { member: 'authenticator', grantedRole: 'service_role', grantor: 'supabase_admin', adminOption: false, inheritOption: false, setOption: true },
      { member: 'cli_login_postgres', grantedRole: 'postgres', grantor: 'supabase_admin', adminOption: false, inheritOption: false, setOption: true },
      { member: 'postgres', grantedRole: 'authenticator', grantor: 'supabase_admin', adminOption: true, inheritOption: true, setOption: true },
      { member: 'postgres', grantedRole: 'service_role', grantor: 'supabase_admin', adminOption: true, inheritOption: true, setOption: true },
      { member: 'supabase_storage_admin', grantedRole: 'authenticator', grantor: 'supabase_admin', adminOption: false, inheritOption: false, setOption: true },
    ],
  },
  runs: {
    owner: 'postgres',
    rowLevelSecurity: true,
    forceRowLevelSecurity: true,
    serviceRole: { bypassRls: true, superuser: false, inherit: true },
    policyCount: 0,
    privileges: {
      service_role: READ_ONLY,
      anon: NO_CRUD,
      authenticated: NO_CRUD,
      public: NO_CRUD,
    },
    acl: {
      table: {
        postgres: [
          'DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES',
          'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE',
        ].map(postgresGrant),
        service_role: [postgresGrant('SELECT')],
      },
      columns: [],
    },
    aclFingerprint: '8bb0deffc486351368b9ae3d9fb840d2',
  },
  dependencies: {
    [DIRECT_QUEUE_TABLE]: { service_role: FULL_CRUD },
    [DIRECT_TABLES.events]: { service_role: FULL_CRUD },
  },
  rpcs: Object.fromEntries(Object.entries(SECURITY_RPC_SQL_SIGNATURES).map(([rpc, signature]) => [
    rpc,
    expectedRpcSecurity(signature),
  ])),
})

export function stableValue(value) {
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

export function researchFingerprint(payload) {
  return sha256(stableStringify(payload))
}

function pathDefinition(openApi, path) {
  return openApi?.paths?.[path] ?? openApi?.paths?.[path.replace(/^\//, '')] ?? null
}

function rpcBodySchema(path) {
  return path?.post?.parameters?.find((parameter) => parameter?.in === 'body')?.schema ?? null
}

export function buildDirectOpenApiSnapshot(openApi, checkedAt = new Date().toISOString()) {
  const definitions = Object.fromEntries(Object.values(DIRECT_TABLES).map((table) => [
    table,
    openApi?.definitions?.[table] ?? null,
  ]))
  const tablePaths = Object.fromEntries(Object.values(DIRECT_TABLES).map((table) => [
    table,
    Object.keys(pathDefinition(openApi, `/${table}`) ?? {}).sort(),
  ]))
  const rpcPaths = Object.fromEntries(Object.values(DIRECT_RPCS).map((rpc) => {
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
    definitions,
    tablePaths,
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

function validateProperty(errors, tableOrRpc, name, property, expected) {
  if (!property) {
    errors.push(`${tableOrRpc}.${name} is missing`)
    return
  }
  const [type, format] = expected
  if (type !== undefined && property.type !== type) {
    errors.push(`${tableOrRpc}.${name} type changed: ${property.type ?? 'null'} != ${type}`)
  }
  if (format !== undefined && property.format !== format) {
    errors.push(`${tableOrRpc}.${name} format changed: ${property.format ?? 'null'} != ${format}`)
  }
}

export function validateDirectOpenApiSnapshot(snapshot) {
  const errors = []
  for (const [table, columns] of Object.entries(TABLE_CONTRACTS)) {
    const definition = snapshot?.shape?.definitions?.[table]
    if (!definition) {
      errors.push(`OpenAPI definition missing: ${table}`)
      continue
    }
    for (const [column, expected] of Object.entries(columns)) {
      validateProperty(errors, table, column, definition?.properties?.[column], expected)
    }
    for (const method of TABLE_REQUIRED_METHODS[table] ?? []) {
      if (!snapshot?.shape?.tablePaths?.[table]?.includes(method)) {
        errors.push(`${table} ${method.toUpperCase()} is not exposed to service_role`)
      }
    }
    for (const requiredColumn of definition.required ?? []) {
      if (columns[requiredColumn]) continue
      const property = definition.properties?.[requiredColumn]
      if (!Object.prototype.hasOwnProperty.call(property ?? {}, 'default')) {
        errors.push(`new required column without default: ${table}.${requiredColumn}`)
      }
    }
  }

  for (const [rpc, signature] of Object.entries(DIRECT_RPC_SIGNATURES)) {
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
    const liveRequired = [...(live.required ?? [])].sort()
    if (stableStringify(liveRequired) !== stableStringify([...signature.required].sort())) {
      errors.push(`${rpc} required arguments changed: ${liveRequired.join(',') || '(none)'}`)
    }
    for (const [name, expected] of Object.entries({ ...(signature.types ?? {}), ...(signature.optional ?? {}) })) {
      validateProperty(errors, rpc, name, live.arguments?.[name], expected)
    }
  }
  return errors
}

export function validateTimelineSecurityContract(result) {
  const actual = stableStringify(result)
  const expected = stableStringify(EXPECTED_TIMELINE_SECURITY_CONTRACT)
  if (actual === expected) return []
  return [
    `timeline security catalog fingerprint changed: ${sha256(actual)} != ${sha256(expected)}`,
  ]
}

export async function fetchDirectOpenApiSnapshot({ url, serviceKey, fetchImpl = fetch }) {
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      accept: 'application/openapi+json',
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`PostgREST OpenAPI read failed: HTTP ${response.status}`)
  return buildDirectOpenApiSnapshot(await response.json())
}

export async function assertLiveDirectContract(options) {
  const snapshot = await fetchDirectOpenApiSnapshot(options)
  const errors = validateDirectOpenApiSnapshot(snapshot)
  let securityContract = null
  if (errors.length === 0) {
    securityContract = await callDirectRpc({
      ...options,
      rpc: DIRECT_RPCS.security,
      args: {},
    })
    errors.push(...validateTimelineSecurityContract(securityContract))
  }
  if (errors.length > 0) {
    const error = new Error(`timeline direct DB contract mismatch (${errors.length}): ${errors.join(' | ')}`)
    error.code = 'TIMELINE_DB_CONTRACT_MISMATCH'
    error.contractErrors = errors
    throw error
  }
  return {
    ...snapshot,
    securityFingerprint: sha256(stableStringify(securityContract)),
  }
}

export async function callDirectRpc({ url, serviceKey, rpc, args = {}, fetchImpl = fetch }) {
  if (!Object.values(DIRECT_RPCS).includes(rpc)) throw new Error(`unknown timeline direct RPC: ${rpc}`)
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
      detail = body?.message || body?.details || body?.hint || ''
    } catch {
      // Do not echo an arbitrary HTML/text body: gateways may include request headers.
    }
    throw new Error(`timeline RPC ${rpc} failed: HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLAIM_KEYS = [
  'celeb_id', 'slug', 'nickname', 'nickname_en', 'title', 'title_en', 'profession',
  'nationality', 'gender', 'birth_date', 'death_date', 'celeb_tier', 'wikidata_qid',
  'timeline_mode', 'priority', 'attempt_count', 'claim_token', 'profile_snapshot',
  'claimed_at', 'lease_expires_at',
]

function responseError(rpc, message) {
  const error = new Error(`timeline RPC ${rpc} response contract mismatch: ${message}`)
  error.code = 'TIMELINE_RPC_RESPONSE_MISMATCH'
  return error
}

function assertObject(rpc, value, path = '$') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw responseError(rpc, `${path} must be an object`)
  }
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
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw responseError(rpc, `${path} must be an ISO timestamp`)
  }
}

function assertExpected(rpc, actual, expected, path) {
  if (expected != null && actual !== expected) throw responseError(rpc, `${path} does not match the request`)
}

export function validateDirectRpcResponse(rpc, result, expected = {}) {
  if (!Object.values(DIRECT_RPCS).includes(rpc)) throw responseError(rpc, 'unknown RPC')

  if (rpc === DIRECT_RPCS.security) {
    const errors = validateTimelineSecurityContract(result)
    if (errors.length > 0) throw responseError(rpc, errors.join(' | '))
    return result
  }

  if (rpc === DIRECT_RPCS.claim) {
    if (!Array.isArray(result) || result.length > 1) throw responseError(rpc, '$ must contain zero or one claim row')
    if (result.length === 0) return result
    const row = result[0]
    assertExactKeys(rpc, row, CLAIM_KEYS, '$[0]')
    assertUuid(rpc, row.celeb_id, '$[0].celeb_id')
    assertUuid(rpc, row.claim_token, '$[0].claim_token')
    if (!['life', 'fiction'].includes(row.timeline_mode)) throw responseError(rpc, '$[0].timeline_mode is invalid')
    assertInteger(rpc, row.priority, '$[0].priority', Number.MIN_SAFE_INTEGER)
    assertInteger(rpc, row.attempt_count, '$[0].attempt_count', 1)
    assertObject(rpc, row.profile_snapshot, '$[0].profile_snapshot')
    if (row.profile_snapshot.id !== row.celeb_id) throw responseError(rpc, '$[0].profile_snapshot.id mismatch')
    assertTimestamp(rpc, row.claimed_at, '$[0].claimed_at')
    assertTimestamp(rpc, row.lease_expires_at, '$[0].lease_expires_at')
    return result
  }

  if (rpc === DIRECT_RPCS.enqueue) {
    assertExactKeys(rpc, result, ['taskType', 'eligible', 'insertedOrRequeued', 'activeLeasePreserved', 'terminalPreserved'])
    if (result.taskType !== TIMELINE_TASK_TYPE) throw responseError(rpc, '$.taskType is invalid')
    for (const key of ['eligible', 'insertedOrRequeued', 'activeLeasePreserved', 'terminalPreserved']) {
      assertInteger(rpc, result[key], `$.${key}`)
    }
    return result
  }

  if (rpc === DIRECT_RPCS.renew) {
    assertExactKeys(rpc, result, ['status', 'celebId', 'claimToken', 'leaseExpiresAt'])
    if (result.status !== 'in_progress') throw responseError(rpc, '$.status must be in_progress')
    assertUuid(rpc, result.celebId, '$.celebId')
    assertUuid(rpc, result.claimToken, '$.claimToken')
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    assertExpected(rpc, result.claimToken, expected.claimToken, '$.claimToken')
    assertTimestamp(rpc, result.leaseExpiresAt, '$.leaseExpiresAt')
    return result
  }

  if (rpc === DIRECT_RPCS.commit) {
    assertExactKeys(rpc, result, ['status', 'celebId', 'runId', 'eventCount', 'researchFingerprint'])
    if (!['completed', 'already_completed'].includes(result.status)) throw responseError(rpc, '$.status is invalid')
    assertUuid(rpc, result.celebId, '$.celebId')
    assertUuid(rpc, result.runId, '$.runId')
    assertInteger(rpc, result.eventCount, '$.eventCount')
    if (!/^[0-9a-f]{64}$/.test(result.researchFingerprint)) throw responseError(rpc, '$.researchFingerprint is invalid')
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    assertExpected(rpc, result.researchFingerprint, expected.researchFingerprint, '$.researchFingerprint')
    if (expected.eventCount != null && result.eventCount !== expected.eventCount) {
      throw responseError(rpc, '$.eventCount does not match the submitted events')
    }
    return result
  }

  if (rpc === DIRECT_RPCS.correct) {
    assertExactKeys(rpc, result, [
      'status', 'celebId', 'runId', 'supersedesRunId', 'eventCount', 'researchFingerprint',
    ])
    if (!['corrected', 'already_corrected'].includes(result.status)) throw responseError(rpc, '$.status is invalid')
    assertUuid(rpc, result.celebId, '$.celebId')
    assertUuid(rpc, result.runId, '$.runId')
    assertUuid(rpc, result.supersedesRunId, '$.supersedesRunId')
    assertInteger(rpc, result.eventCount, '$.eventCount')
    if (!/^[0-9a-f]{64}$/.test(result.researchFingerprint)) throw responseError(rpc, '$.researchFingerprint is invalid')
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    assertExpected(rpc, result.supersedesRunId, expected.supersedesRunId, '$.supersedesRunId')
    assertExpected(rpc, result.researchFingerprint, expected.researchFingerprint, '$.researchFingerprint')
    if (expected.eventCount != null && result.eventCount !== expected.eventCount) {
      throw responseError(rpc, '$.eventCount does not match the submitted events')
    }
    return result
  }

  if (rpc === DIRECT_RPCS.fail) {
    assertObject(rpc, result)
    if (expected.skip) {
      assertExactKeys(rpc, result, ['status', 'celebId', 'runId', 'eventCount', 'researchFingerprint'])
      if (!['skipped', 'already_skipped'].includes(result.status)) throw responseError(rpc, '$.status is invalid for skip')
      assertUuid(rpc, result.runId, '$.runId')
      assertInteger(rpc, result.eventCount, '$.eventCount')
      if (result.eventCount !== 0) throw responseError(rpc, '$.eventCount must be zero for blocked research')
      if (!/^[0-9a-f]{64}$/.test(result.researchFingerprint)) throw responseError(rpc, '$.researchFingerprint is invalid')
      assertExpected(rpc, result.researchFingerprint, expected.researchFingerprint, '$.researchFingerprint')
    } else {
      assertExactKeys(rpc, result, ['status', 'celebId', 'claimToken', 'error'])
      if (result.status !== 'pending') throw responseError(rpc, '$.status must be pending for retry')
      assertUuid(rpc, result.claimToken, '$.claimToken')
      assertExpected(rpc, result.claimToken, expected.claimToken, '$.claimToken')
      assertExpected(rpc, result.error, expected.error, '$.error')
    }
    assertUuid(rpc, result.celebId, '$.celebId')
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    return result
  }

  if (rpc === DIRECT_RPCS.requeue) {
    assertExactKeys(rpc, result, ['status', 'celebId', 'attemptCount', 'reason'])
    if (result.status !== 'pending') throw responseError(rpc, '$.status must be pending')
    assertUuid(rpc, result.celebId, '$.celebId')
    assertExpected(rpc, result.celebId, expected.celebId, '$.celebId')
    assertInteger(rpc, result.attemptCount, '$.attemptCount')
    if (result.reason != null && typeof result.reason !== 'string') throw responseError(rpc, '$.reason must be text or null')
    return result
  }

  if (rpc === DIRECT_RPCS.status) {
    assertExactKeys(rpc, result, ['taskType', 'celebs', 'queue', 'researchRuns'])
    if (result.taskType !== TIMELINE_TASK_TYPE) throw responseError(rpc, '$.taskType is invalid')
    assertExactKeys(rpc, result.celebs, ['total', 'withTimeline', 'missingTimeline'], '$.celebs')
    assertExactKeys(rpc, result.researchRuns, ['total', 'celebs', 'recordedEvents'], '$.researchRuns')
    assertObject(rpc, result.queue, '$.queue')
    for (const [key, value] of Object.entries(result.queue)) assertInteger(rpc, value, `$.queue.${key}`)
    for (const key of ['total', 'withTimeline', 'missingTimeline']) assertInteger(rpc, result.celebs[key], `$.celebs.${key}`)
    for (const key of ['total', 'celebs', 'recordedEvents']) assertInteger(rpc, result.researchRuns[key], `$.researchRuns.${key}`)
    if (result.celebs.withTimeline + result.celebs.missingTimeline !== result.celebs.total) {
      throw responseError(rpc, '$.celebs counts do not add up')
    }
    return result
  }

  throw responseError(rpc, 'response validator is missing')
}

const SECRET_KEY_PATTERN = /(?:secret|service.?role|api.?key|authorization)/i

export function sanitizeForOutput(value) {
  if (Array.isArray(value)) return value.map(sanitizeForOutput)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
    key,
    SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeForOutput(nested),
  ]))
}
