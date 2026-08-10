#!/usr/bin/env node

import process from 'node:process'
import { pathToFileURL } from 'node:url'
import {
  DIRECT_RPCS,
  DIRECT_TABLES,
  TIMELINE_TASK_TYPE,
  assertLiveDirectContract,
  callDirectRpc,
  researchFingerprint,
  sanitizeForOutput,
  stableStringify,
  validateDirectRpcResponse,
} from './lib/timeline-direct-contract.mjs'
import {
  assertDirectBlockedPayload,
  assertDirectCommitPayload,
  mapDirectPayloadToTimelineRows,
  validateTimelinePayload,
} from './lib/timeline-direct-schema.mjs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COMMANDS = new Set(['enqueue', 'claim', 'renew', 'commit', 'correct', 'fail', 'requeue', 'status', 'verify'])
const VALUE_OPTIONS = new Set([
  'worker', 'lease-minutes', 'celeb-id', 'claim-token', 'error', 'reason',
  'expected-run-id', 'expected-fingerprint',
])
const BOOLEAN_OPTIONS = new Set(['skip', 'retry', 'reset-attempts', 'help'])

function optionKey(raw) {
  return raw.replace(/^--/, '')
}

export function parseArgs(argv) {
  const command = argv[0]
  if (!command || command === '--help' || command === '-h') return { help: true, command: null }
  if (!COMMANDS.has(command)) throw new Error(`unknown command: ${command}`)
  const options = { command }
  for (let index = 1; index < argv.length; index += 1) {
    const raw = argv[index]
    if (!raw.startsWith('--')) throw new Error(`positional/file arguments are forbidden: ${raw}`)
    const equals = raw.indexOf('=')
    const key = optionKey(equals >= 0 ? raw.slice(0, equals) : raw)
    if (BOOLEAN_OPTIONS.has(key)) {
      if (equals >= 0) throw new Error(`boolean option --${key} does not accept a value`)
      options[key] = true
      continue
    }
    if (!VALUE_OPTIONS.has(key)) throw new Error(`unknown option: --${key}`)
    const value = equals >= 0 ? raw.slice(equals + 1) : argv[++index]
    if (value == null || value.startsWith('--')) throw new Error(`--${key} requires a value`)
    options[key] = value
  }
  if (options['lease-minutes'] != null) {
    const value = Number(options['lease-minutes'])
    if (!Number.isInteger(value) || value < 1 || value > 1_440) {
      throw new Error('--lease-minutes must be an integer from 1 through 1440')
    }
    options.leaseMinutes = value
  }
  if (options.skip && options.retry) throw new Error('--skip and --retry are mutually exclusive')
  return options
}

export function usage() {
  return [
    'usage: node --env-file=.env scripts/timeline-db-worker.mjs <command> [options]',
    '',
    'commands:',
    '  enqueue',
    '  claim   --worker <id> [--lease-minutes 60]',
    '  renew   --worker <id> --celeb-id <uuid> --claim-token <uuid> [--lease-minutes 60]',
    '  commit  --worker <id> --celeb-id <uuid> --claim-token <uuid>  # full JSON only on stdin',
    '  correct --celeb-id <uuid> --expected-run-id <uuid> --expected-fingerprint <sha256> --reason <text>  # corrected full JSON only on stdin',
    '  fail    --worker <id> --celeb-id <uuid> --claim-token <uuid> --error <text> --retry',
    '  fail    --worker <id> --celeb-id <uuid> --claim-token <uuid> --error <text> --skip  # blocked JSON on stdin',
    '  requeue --celeb-id <uuid> [--reason <text>] [--reset-attempts]',
    '  status',
    '  verify  [--celeb-id <uuid>]',
    '',
    'No command accepts a manifest, payload path, report path, or any other local file.',
  ].join('\n')
}

function requireTextOption(options, key) {
  const value = options[key]
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`--${key} is required`)
  return value.trim()
}

function requireUuidOption(options, key) {
  const value = requireTextOption(options, key)
  if (!UUID.test(value)) throw new Error(`--${key} must be a UUID`)
  return value
}

function requireFingerprintOption(options, key) {
  const value = requireTextOption(options, key)
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`--${key} must be lowercase SHA-256 hex`)
  return value
}

function connectionFromEnv(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  return { url, serviceKey }
}

export async function readJsonStdin(input = process.stdin, command = 'commit') {
  const chunks = []
  for await (const chunk of input) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (!text) throw new Error(`${command} requires one JSON object on stdin; file arguments are forbidden`)
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`stdin is not valid JSON: ${String(error?.message ?? error)}`)
  }
}

function rpcOptions(connection, fetchImpl, rpc, args) {
  return { ...connection, fetchImpl, rpc, args }
}

async function callValidatedRpc(connection, fetchImpl, rpc, args, expected = {}) {
  const result = await callDirectRpc(rpcOptions(connection, fetchImpl, rpc, args))
  return validateDirectRpcResponse(rpc, result, expected)
}

async function restGet({ url, serviceKey, fetchImpl }, table, parameters = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(parameters)) {
    if (value != null) search.set(key, String(value))
  }
  const response = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/${table}?${search}`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new Error(`readback ${table} failed: HTTP ${response.status}`)
  return response.json()
}

async function fetchAllRest(connection, table, parameters = {}) {
  const rows = []
  for (let offset = 0; ; offset += 1_000) {
    const page = await restGet(connection, table, { ...parameters, limit: 1_000, offset })
    rows.push(...page)
    if (page.length < 1_000) return rows
  }
}

export function comparableTimelineRow(row) {
  return {
    celeb_id: row.celeb_id,
    year: row.year ?? null,
    year_end: row.year_end ?? null,
    month: row.month ?? null,
    day: row.day ?? null,
    sequence_label: row.sequence_label ?? null,
    sequence_label_en: row.sequence_label_en ?? null,
    title: row.title,
    title_en: row.title_en ?? null,
    description: row.description ?? null,
    description_en: row.description_en ?? null,
    kind: row.kind,
    place_name: row.place_name ?? null,
    place_name_en: row.place_name_en ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    place_qid: row.place_qid ?? null,
    source: row.source,
    source_url: row.source_url ?? null,
    sort_order: row.sort_order,
  }
}

function valueFrom(result, camel, snake) {
  return result?.[camel] ?? result?.[snake] ?? null
}

function expectedEventEvidence(payload) {
  return payload.events.map((event, eventIndex) => ({ eventIndex, evidenceRefs: event.evidenceRefs }))
}

export function auditResearchRun(run, eventsById) {
  const errors = []
  const payload = run?.research_payload
  const superseded = run?.superseded_by_run_id != null || run?.superseded_at != null
    || run?.supersession_reason != null
  if (superseded) {
    if (!payload || run.research_fingerprint !== researchFingerprint(payload)) errors.push('research_fingerprint mismatch')
    if (!UUID.test(run?.superseded_by_run_id ?? '')) errors.push('superseded_by_run_id missing')
    if (typeof run?.superseded_at !== 'string' || !Number.isFinite(Date.parse(run.superseded_at))) {
      errors.push('superseded_at missing')
    }
    if (typeof run?.supersession_reason !== 'string' || run.supersession_reason.trim().length < 20) {
      errors.push('supersession_reason missing')
    }
    return { valid: errors.length === 0, errors }
  }
  if (run?.superseded_by_run_id != null || run?.superseded_at != null || run?.supersession_reason != null) {
    errors.push('active run has partial supersession metadata')
  }
  const validation = validateTimelinePayload(payload, null, run?.research_status)
  if (!validation.valid) errors.push(...validation.issues.map((issue) => `payload:${issue.path}:${issue.code}`))
  if (!payload || run.research_fingerprint !== researchFingerprint(payload)) errors.push('research_fingerprint mismatch')
  if (stableStringify(run.profile_snapshot) !== stableStringify(payload?.profileSnapshot)) errors.push('profile_snapshot mismatch')
  if (stableStringify(run.sources) !== stableStringify(payload?.sources ?? [])) errors.push('sources mismatch')
  if (stableStringify(run.event_evidence) !== stableStringify(payload ? expectedEventEvidence(payload) : [])) errors.push('event_evidence mismatch')
  if (stableStringify(run.profile_conflicts) !== stableStringify(payload?.profileConflicts ?? [])) errors.push('profile_conflicts mismatch')
  if (stableStringify(run.blocking_issues) !== stableStringify(payload?.blockingIssues ?? [])) errors.push('blocking_issues mismatch')
  const ids = Array.isArray(run.timeline_event_ids) ? run.timeline_event_ids : []
  if (run.event_count !== ids.length || run.event_count !== (payload?.events?.length ?? -1)) errors.push('event_count mismatch')
  if (payload?.celebId !== run.celeb_id) errors.push('celeb_id mismatch')
  if (payload?.timelineMode !== run.timeline_mode) errors.push('timeline_mode mismatch')
  if (!['complete', 'blocked'].includes(run.research_status) || run.research_status !== payload?.researchStatus) {
    errors.push('research_status mismatch')
  }
  if (eventsById) {
    const actual = ids.map((id) => eventsById.get(id) ?? null)
    if (actual.some((row) => row == null)) errors.push('timeline_event_ids contains missing rows')
    if (run.research_status === 'complete' && validation.valid && actual.every(Boolean)) {
      const expectedRows = mapDirectPayloadToTimelineRows(payload).map(comparableTimelineRow)
      const actualRows = actual.map(comparableTimelineRow)
      if (stableStringify(actualRows) !== stableStringify(expectedRows)) errors.push('timeline event readback mismatch')
    }
  }
  return { valid: errors.length === 0, errors }
}

async function fetchEventsByCelebIds(connection, celebIds) {
  const rows = []
  const unique = [...new Set(celebIds)]
  for (let start = 0; start < unique.length; start += 100) {
    const chunk = unique.slice(start, start + 100)
    if (chunk.length === 0) continue
    rows.push(...await restGet(connection, DIRECT_TABLES.events, {
      select: '*',
      celeb_id: `in.(${chunk.join(',')})`,
      order: 'celeb_id.asc,sort_order.asc',
    }))
  }
  return rows
}

function activeEventSetErrors(run, liveEvents) {
  const expectedIds = Array.isArray(run.timeline_event_ids) ? run.timeline_event_ids : []
  const actualIds = liveEvents
    .filter((event) => event.celeb_id === run.celeb_id)
    .map((event) => event.id)
  const expectedSet = [...new Set(expectedIds)].sort()
  const actualSet = [...new Set(actualIds)].sort()
  const errors = []
  if (expectedSet.length !== expectedIds.length) errors.push('active timeline_event_ids contains duplicates')
  if (actualSet.length !== actualIds.length) errors.push('active live timeline contains duplicate ids')
  if (stableStringify(actualSet) !== stableStringify(expectedSet)) {
    errors.push('active live timeline id set mismatch')
  }
  if (actualIds.length !== run.event_count) errors.push('active live timeline row count mismatch')
  return errors
}

export async function verifyCommitReadback(connection, result, payload) {
  const runId = valueFrom(result, 'runId', 'run_id')
  const expectedFingerprint = researchFingerprint(payload)
  const runQuery = runId
    ? { select: '*', id: `eq.${runId}`, limit: 2 }
    : { select: '*', celeb_id: `eq.${payload.celebId}`, research_fingerprint: `eq.${expectedFingerprint}`, limit: 2 }
  const runs = await restGet(connection, DIRECT_TABLES.runs, runQuery)
  if (runs.length !== 1) throw new Error(`commit readback expected one research run, found ${runs.length}`)
  const ids = Array.isArray(runs[0].timeline_event_ids) ? runs[0].timeline_event_ids : []
  const events = await fetchEventsByCelebIds(connection, [runs[0].celeb_id])
  const audit = auditResearchRun(runs[0], new Map(events.map((row) => [row.id, row])))
  const eventSetErrors = activeEventSetErrors(runs[0], events)
  const lineageErrors = []
  let predecessor = null
  if (runs[0].supersedes_run_id != null) {
    const predecessors = await restGet(connection, DIRECT_TABLES.runs, {
      select: '*',
      id: `eq.${runs[0].supersedes_run_id}`,
      limit: 2,
    })
    if (predecessors.length !== 1) {
      lineageErrors.push(`commit predecessor readback expected one run, found ${predecessors.length}`)
    } else {
      predecessor = predecessors[0]
      const predecessorAudit = auditResearchRun(predecessor, null)
      lineageErrors.push(...predecessorAudit.errors.map((error) => `predecessor:${error}`))
      if (predecessor.celeb_id !== runs[0].celeb_id
        || predecessor.superseded_by_run_id !== runs[0].id) {
        lineageErrors.push('commit predecessor reciprocal lineage mismatch')
      }
      const predecessorIds = Array.isArray(predecessor.timeline_event_ids)
        ? predecessor.timeline_event_ids
        : []
      if (!['blocked', 'skipped'].includes(predecessor.research_status)
        || predecessor.event_count !== 0
        || predecessorIds.length !== 0) {
        lineageErrors.push('commit predecessor must be a zero-event terminal run')
      }
    }
  }
  if (!audit.valid || eventSetErrors.length > 0 || lineageErrors.length > 0) {
    throw new Error(`commit readback mismatch: ${[
      ...audit.errors, ...eventSetErrors, ...lineageErrors,
    ].join(' | ')}`)
  }
  const rpcCount = valueFrom(result, 'eventCount', 'event_count')
  if (rpcCount != null && rpcCount !== ids.length) throw new Error(`commit RPC/readback count mismatch: ${rpcCount}/${ids.length}`)
  return {
    runId: runs[0].id,
    celebId: runs[0].celeb_id,
    eventCount: ids.length,
    researchFingerprint: expectedFingerprint,
    supersedesRunId: predecessor?.id ?? null,
    verified: true,
  }
}

export async function verifyCorrectionReadback(connection, result, payload, expectedRunId) {
  const runId = valueFrom(result, 'runId', 'run_id')
  const expectedFingerprint = researchFingerprint(payload)
  const runs = await restGet(connection, DIRECT_TABLES.runs, {
    select: '*',
    id: `in.(${expectedRunId},${runId})`,
    limit: 3,
  })
  if (runs.length !== 2) throw new Error(`correction readback expected two lineage runs, found ${runs.length}`)
  const current = runs.find((run) => run.id === runId)
  const superseded = runs.find((run) => run.id === expectedRunId)
  if (!current || !superseded) throw new Error('correction readback lineage ids are missing')
  if (current.supersedes_run_id !== superseded.id
    || superseded.superseded_by_run_id !== current.id
    || current.celeb_id !== superseded.celeb_id) {
    throw new Error('correction readback lineage mismatch')
  }
  const ids = Array.isArray(current.timeline_event_ids) ? current.timeline_event_ids : []
  const events = await fetchEventsByCelebIds(connection, [current.celeb_id])
  const currentAudit = auditResearchRun(current, new Map(events.map((row) => [row.id, row])))
  const oldAudit = auditResearchRun(superseded, null)
  const eventSetErrors = activeEventSetErrors(current, events)
  if (!currentAudit.valid || !oldAudit.valid || eventSetErrors.length > 0) {
    throw new Error(`correction readback mismatch: ${[
      ...currentAudit.errors, ...oldAudit.errors, ...eventSetErrors,
    ].join(' | ')}`)
  }
  if (current.research_fingerprint !== expectedFingerprint || current.research_payload == null) {
    throw new Error('correction readback payload fingerprint mismatch')
  }
  return {
    runId: current.id,
    supersedesRunId: superseded.id,
    celebId: current.celeb_id,
    eventCount: ids.length,
    researchFingerprint: expectedFingerprint,
    verified: true,
  }
}

export async function verifyBlockedReadback(connection, result, payload) {
  const runId = valueFrom(result, 'runId', 'run_id')
  const expectedFingerprint = researchFingerprint(payload)
  const runs = await restGet(connection, DIRECT_TABLES.runs, runId
    ? { select: '*', id: `eq.${runId}`, limit: 2 }
    : { select: '*', celeb_id: `eq.${payload.celebId}`, research_fingerprint: `eq.${expectedFingerprint}`, limit: 2 })
  if (runs.length !== 1) throw new Error(`blocked readback expected one research run, found ${runs.length}`)
  const audit = auditResearchRun(runs[0], new Map())
  if (!audit.valid) throw new Error(`blocked readback mismatch: ${audit.errors.join(' | ')}`)
  if (runs[0].research_status !== 'blocked' || runs[0].event_count !== 0) {
    throw new Error('blocked readback must retain a zero-event blocked research run')
  }
  const events = await fetchEventsByCelebIds(connection, [runs[0].celeb_id])
  const eventSetErrors = activeEventSetErrors(runs[0], events)
  if (eventSetErrors.length > 0) {
    throw new Error(`blocked readback live timeline mismatch: ${eventSetErrors.join(' | ')}`)
  }
  return {
    runId: runs[0].id,
    celebId: runs[0].celeb_id,
    eventCount: 0,
    researchFingerprint: expectedFingerprint,
    verified: true,
  }
}

async function verifyDatabase(connection, options) {
  const filter = options['celeb-id'] ? { celeb_id: `eq.${requireUuidOption(options, 'celeb-id')}` } : {}
  const runs = await fetchAllRest(connection, DIRECT_TABLES.runs, {
    select: '*',
    pipeline: `eq.${TIMELINE_TASK_TYPE}`,
    run_origin: 'eq.direct_pipeline',
    ...filter,
    order: 'created_at.asc',
  })
  const runById = new Map(runs.map((run) => [run.id, run]))
  const activeRuns = runs.filter((run) => run.superseded_by_run_id == null
    && run.superseded_at == null && run.supersession_reason == null)
  const ids = activeRuns.flatMap((run) => Array.isArray(run.timeline_event_ids) ? run.timeline_event_ids : [])
  const events = await fetchEventsByCelebIds(connection, activeRuns.map((run) => run.celeb_id))
  const eventById = new Map(events.map((event) => [event.id, event]))
  const audits = runs.map((run) => {
    const isActive = run.superseded_by_run_id == null
      && run.superseded_at == null && run.supersession_reason == null
    const audit = auditResearchRun(run, isActive ? eventById : null)
    const errors = [...audit.errors]
    if (isActive) errors.push(...activeEventSetErrors(run, events))
    if (run.superseded_by_run_id != null) {
      const successor = runById.get(run.superseded_by_run_id)
      if (!successor || successor.supersedes_run_id !== run.id || successor.celeb_id !== run.celeb_id) {
        errors.push('supersession successor lineage mismatch')
      }
    }
    if (run.supersedes_run_id != null) {
      const predecessor = runById.get(run.supersedes_run_id)
      if (!predecessor || predecessor.superseded_by_run_id !== run.id || predecessor.celeb_id !== run.celeb_id) {
        errors.push('supersession predecessor lineage mismatch')
      }
    }
    return { runId: run.id, celebId: run.celeb_id, valid: errors.length === 0, errors }
  })
  const activeCompleteCelebs = activeRuns
    .filter((run) => run.research_status === 'complete')
    .map((run) => run.celeb_id)
  const duplicateActiveCelebs = activeCompleteCelebs.filter((id, index) => activeCompleteCelebs.indexOf(id) !== index)
  if (duplicateActiveCelebs.length > 0) {
    audits.push({ runId: null, celebId: duplicateActiveCelebs[0], valid: false, errors: ['multiple active complete runs'] })
  }
  const invalid = audits.filter((audit) => !audit.valid)
  const uniqueIds = new Set(ids)
  const status = await callValidatedRpc(connection, connection.fetchImpl, DIRECT_RPCS.status, {})
  return {
    valid: invalid.length === 0 && uniqueIds.size === ids.length && events.length === uniqueIds.size,
    status,
    counts: {
      directRuns: runs.length,
      referencedEventIds: ids.length,
      uniqueReferencedEventIds: uniqueIds.size,
      fetchedEvents: events.length,
      invalidRuns: invalid.length,
    },
    invalidRuns: invalid.slice(0, 50),
  }
}

export async function executeTimelineCommand({
  argv,
  env = process.env,
  stdinText,
  fetchImpl = fetch,
} = {}) {
  const options = parseArgs(argv ?? [])
  if (options.help) return { help: usage() }
  const connection = { ...connectionFromEnv(env), fetchImpl }
  const contract = await assertLiveDirectContract(connection)
  const contractInfo = {
    fingerprint: contract.fingerprint,
    securityFingerprint: contract.securityFingerprint,
    checkedAt: contract.checkedAt,
  }

  if (options.command === 'enqueue') {
    return {
      command: 'enqueue',
      contract: contractInfo,
      result: await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.enqueue, {}),
    }
  }
  if (options.command === 'claim') {
    const worker = requireTextOption(options, 'worker')
    const result = await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.claim, {
      p_worker: worker,
      p_lease_minutes: options.leaseMinutes ?? 60,
    })
    return { command: 'claim', contract: contractInfo, result }
  }
  if (options.command === 'renew') {
    const celebId = requireUuidOption(options, 'celeb-id')
    const claimToken = requireUuidOption(options, 'claim-token')
    return {
      command: 'renew',
      contract: contractInfo,
      result: await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.renew, {
        p_celeb_id: celebId,
        p_worker: requireTextOption(options, 'worker'),
        p_claim_token: claimToken,
        p_lease_minutes: options.leaseMinutes ?? 60,
      }, { celebId, claimToken }),
    }
  }
  if (options.command === 'commit') {
    const celebId = requireUuidOption(options, 'celeb-id')
    const payload = stdinText === undefined ? await readJsonStdin() : JSON.parse(stdinText)
    assertDirectCommitPayload(payload)
    if (payload.celebId !== celebId) throw new Error('--celeb-id does not match stdin payload.celebId')
    const fingerprint = researchFingerprint(payload)
    const result = await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.commit, {
      p_celeb_id: celebId,
      p_worker: requireTextOption(options, 'worker'),
      p_claim_token: requireUuidOption(options, 'claim-token'),
      p_profile_snapshot: payload.profileSnapshot,
      p_research_fingerprint: fingerprint,
      p_research_payload: payload,
    }, { celebId, researchFingerprint: fingerprint, eventCount: payload.events.length })
    const readback = await verifyCommitReadback(connection, result, payload)
    return { command: 'commit', contract: contractInfo, result, readback }
  }
  if (options.command === 'correct') {
    const celebId = requireUuidOption(options, 'celeb-id')
    const expectedRunId = requireUuidOption(options, 'expected-run-id')
    const expectedFingerprint = requireFingerprintOption(options, 'expected-fingerprint')
    const reason = requireTextOption(options, 'reason')
    if (reason.length < 20) throw new Error('--reason must contain at least 20 characters')
    const payload = stdinText === undefined
      ? await readJsonStdin(process.stdin, 'correct')
      : JSON.parse(stdinText)
    assertDirectCommitPayload(payload)
    if (payload.celebId !== celebId) throw new Error('--celeb-id does not match stdin payload.celebId')
    const fingerprint = researchFingerprint(payload)
    const result = await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.correct, {
      p_celeb_id: celebId,
      p_expected_run_id: expectedRunId,
      p_expected_research_fingerprint: expectedFingerprint,
      p_corrected_profile_snapshot: payload.profileSnapshot,
      p_corrected_research_fingerprint: fingerprint,
      p_corrected_research_payload: payload,
      p_reason: reason,
    }, {
      celebId,
      supersedesRunId: expectedRunId,
      researchFingerprint: fingerprint,
      eventCount: payload.events.length,
    })
    const readback = await verifyCorrectionReadback(connection, result, payload, expectedRunId)
    return { command: 'correct', contract: contractInfo, result, readback }
  }
  if (options.command === 'fail') {
    if (!options.skip && !options.retry) throw new Error('fail requires exactly one of --retry or --skip')
    const celebId = requireUuidOption(options, 'celeb-id')
    const claimToken = requireUuidOption(options, 'claim-token')
    const worker = requireTextOption(options, 'worker')
    const errorText = requireTextOption(options, 'error')
    if (options.retry) {
      if (stdinText !== undefined) throw new Error('fail --retry does not accept stdin research payload')
      return {
        command: 'fail',
        disposition: 'retry',
        contract: contractInfo,
        result: await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.fail, {
          p_celeb_id: celebId,
          p_worker: worker,
          p_claim_token: claimToken,
          p_error: errorText,
          p_skip: false,
          p_profile_snapshot: null,
          p_research_fingerprint: null,
          p_research_payload: null,
        }, { celebId, claimToken, error: errorText, skip: false }),
      }
    }
    const payload = stdinText === undefined
      ? await readJsonStdin(process.stdin, 'fail --skip')
      : JSON.parse(stdinText)
    assertDirectBlockedPayload(payload)
    if (payload.celebId !== celebId) throw new Error('--celeb-id does not match stdin payload.celebId')
    const fingerprint = researchFingerprint(payload)
    const result = await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.fail, {
      p_celeb_id: celebId,
      p_worker: worker,
      p_claim_token: claimToken,
      p_error: errorText,
      p_skip: true,
      p_profile_snapshot: payload.profileSnapshot,
      p_research_fingerprint: fingerprint,
      p_research_payload: payload,
    }, { celebId, researchFingerprint: fingerprint, skip: true })
    const readback = await verifyBlockedReadback(connection, result, payload)
    return {
      command: 'fail',
      disposition: 'skip',
      contract: contractInfo,
      result,
      readback,
    }
  }
  if (options.command === 'requeue') {
    const celebId = requireUuidOption(options, 'celeb-id')
    return {
      command: 'requeue',
      contract: contractInfo,
      result: await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.requeue, {
        p_celeb_id: celebId,
        p_reason: options.reason?.trim() || null,
        p_reset_attempts: Boolean(options['reset-attempts']),
      }, { celebId }),
    }
  }
  if (options.command === 'status') {
    return {
      command: 'status',
      contract: contractInfo,
      result: await callValidatedRpc(connection, fetchImpl, DIRECT_RPCS.status, {}),
    }
  }
  if (options.command === 'verify') {
    return { command: 'verify', contract: contractInfo, ...(await verifyDatabase(connection, options)) }
  }
  throw new Error(`unhandled command: ${options.command}`)
}

async function main() {
  const result = await executeTimelineCommand({ argv: process.argv.slice(2) })
  if (result.help) console.log(result.help)
  else {
    const safe = sanitizeForOutput(result)
    // Lease claim tokens are intentionally returned by the claim RPC: they are short-lived
    // capabilities needed by a worker. Environment/service keys are never part of result.
    console.log(JSON.stringify(safe, null, 2))
    if (result.command === 'verify' && !result.valid) process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      code: error?.code ?? 'TIMELINE_WORKER_ERROR',
      message: String(error?.message ?? error),
      issues: error?.issues ?? undefined,
      contractErrors: error?.contractErrors ?? undefined,
    }, null, 2))
    process.exitCode = 1
  })
}
