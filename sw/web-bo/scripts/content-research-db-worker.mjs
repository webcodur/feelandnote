#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import {
  CONTENT_RESEARCH_RPCS,
  assertLiveContentResearchContract,
  callContentResearchRpc,
  contentResearchFingerprint,
  redactText,
  sanitizeContentResearchOutput,
  validateContentResearchRpcResponse,
} from './lib/content-research-direct-contract.mjs'
import {
  assertContentResearchCommitPayload,
  classifyContentResearchPayload,
} from './lib/content-research-direct-schema.mjs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COMMANDS = new Set(['enqueue', 'claim', 'renew', 'commit', 'fail', 'requeue', 'status', 'provider-slot'])
const VALUE_OPTIONS = new Set([
  'worker', 'lease-minutes', 'celeb-id', 'error', 'reason', 'claim-token',
  'provider', 'min-interval-ms',
])
const BOOLEAN_OPTIONS = new Set(['retry', 'terminal', 'skip', 'reset-attempts', 'help'])
const COMMAND_OPTIONS = Object.freeze({
  enqueue: new Set(['celeb-id', 'reason', 'help']),
  claim: new Set(['worker', 'lease-minutes', 'help']),
  renew: new Set(['worker', 'lease-minutes', 'celeb-id', 'claim-token', 'help']),
  commit: new Set(['worker', 'celeb-id', 'claim-token', 'help']),
  fail: new Set(['worker', 'celeb-id', 'claim-token', 'error', 'retry', 'terminal', 'skip', 'help']),
  requeue: new Set(['celeb-id', 'reason', 'reset-attempts', 'help']),
  status: new Set(['help']),
  'provider-slot': new Set(['provider', 'worker', 'min-interval-ms', 'help']),
})
const MAX_STDIN_BYTES = 4 * 1024 * 1024

function optionKey(raw) {
  return raw.replace(/^--/, '')
}

export function parseContentResearchArgs(argv) {
  const command = argv[0]
  if (!command || command === '--help' || command === '-h') return { help: true, command: null, celebIds: [] }
  if (!COMMANDS.has(command)) throw new Error(`unknown command: ${command}`)
  const options = { command, celebIds: [] }
  const seen = new Set()
  for (let index = 1; index < argv.length; index += 1) {
    const raw = argv[index]
    if (!raw.startsWith('--')) throw new Error(`positional/file arguments are forbidden: ${raw}`)
    const equals = raw.indexOf('=')
    const key = optionKey(equals >= 0 ? raw.slice(0, equals) : raw)
    if (!COMMAND_OPTIONS[command].has(key)) throw new Error(`option --${key} is not valid for ${command}`)
    if (seen.has(key) && !(command === 'enqueue' && key === 'celeb-id')) {
      throw new Error(`option --${key} may be provided only once`)
    }
    seen.add(key)
    if (BOOLEAN_OPTIONS.has(key)) {
      if (equals >= 0) throw new Error(`boolean option --${key} does not accept a value`)
      options[key] = true
      continue
    }
    if (!VALUE_OPTIONS.has(key)) throw new Error(`unknown option: --${key}`)
    const value = equals >= 0 ? raw.slice(equals + 1) : argv[++index]
    if (value == null || value.startsWith('--')) throw new Error(`--${key} requires a value`)
    if (key === 'celeb-id') options.celebIds.push(value)
    else options[key] = value
  }
  if (options['lease-minutes'] != null) {
    const value = Number(options['lease-minutes'])
    if (!Number.isInteger(value) || value < 1 || value > 1_440) {
      throw new Error('--lease-minutes must be an integer from 1 through 1440')
    }
    options.leaseMinutes = value
  }
  if (options['min-interval-ms'] != null) {
    const value = Number(options['min-interval-ms'])
    if (!Number.isInteger(value) || value < 1_100 || value > 60_000) {
      throw new Error('--min-interval-ms must be an integer from 1100 through 60000')
    }
    options.minIntervalMs = value
  }
  const failDispositions = ['retry', 'terminal', 'skip'].filter((key) => options[key])
  if (failDispositions.length > 1) throw new Error('--retry, --terminal and --skip are mutually exclusive')
  return options
}

export function contentResearchUsage() {
  return [
    'usage: node --env-file=.env scripts/content-research-db-worker.mjs <command> [options]',
    '',
    'commands:',
    '  enqueue --celeb-id <uuid> [--celeb-id <uuid> ...] [--reason <text>]',
    '  claim   --worker <id> [--lease-minutes 60]',
    '  renew   --worker <id> --celeb-id <uuid> --claim-token <uuid> [--lease-minutes 60]',
    '  commit  --worker <id> --celeb-id <uuid> --claim-token <uuid>  # exact JSON on stdin',
    '          # eligible MUSIC is unsupported here; use the immediate iTunes registration path',
    '  fail    --worker <id> --celeb-id <uuid> --claim-token <uuid> --error <text> --retry',
    '  fail    --worker <id> --celeb-id <uuid> --claim-token <uuid> --error <text> --terminal',
    '  fail    --worker <id> --celeb-id <uuid> --claim-token <uuid> --error <text> --skip',
    '  requeue --celeb-id <uuid> --reason <text> [--reset-attempts]',
    '  status',
    '  provider-slot --provider openlibrary --worker <id> [--min-interval-ms 2000]',
    '',
    'No command accepts a manifest, payload path, report path, or any other local file.',
    'Only commit consumes JSON, and it consumes that JSON from stdin in memory.',
  ].join('\n')
}

function requireTextOption(options, key, maximum = 2_000) {
  const value = options[key]
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`--${key} is required`)
  if (value.trim().length > maximum) throw new Error(`--${key} must be at most ${maximum} characters`)
  return value.trim()
}

function requireSingleUuid(options, key = 'celeb-id') {
  if (key === 'celeb-id') {
    if (options.celebIds.length !== 1) throw new Error('--celeb-id must be provided exactly once')
    if (!UUID.test(options.celebIds[0])) throw new Error('--celeb-id must be a UUID')
    return options.celebIds[0].toLowerCase()
  }
  const value = requireTextOption(options, key, 64)
  if (!UUID.test(value)) throw new Error(`--${key} must be a UUID`)
  return value.toLowerCase()
}

function enqueueIds(options) {
  if (options.celebIds.length === 0) throw new Error('enqueue requires at least one --celeb-id')
  const normalized = options.celebIds.map((id) => {
    if (!UUID.test(id)) throw new Error(`--celeb-id must be a UUID: ${id}`)
    return id.toLowerCase()
  })
  if (new Set(normalized).size !== normalized.length) throw new Error('enqueue --celeb-id values must be unique')
  return normalized
}

function connectionFromEnv(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return { url, serviceKey }
}

export async function waitForExternalProviderSlot(availableAt, {
  signal,
  now = () => Date.now(),
  sleepImpl = (milliseconds, abortSignal) => sleep(milliseconds, undefined, { signal: abortSignal }),
} = {}) {
  const timestamp = Date.parse(availableAt)
  if (!Number.isFinite(timestamp)) throw new Error('provider slot availableAt must be an ISO timestamp')
  const milliseconds = Math.max(0, timestamp - now())
  if (milliseconds > 0) await sleepImpl(milliseconds, signal)
  return milliseconds
}

export async function readContentResearchJsonStdin(input = process.stdin) {
  const chunks = []
  let size = 0
  for await (const chunk of input) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > MAX_STDIN_BYTES) throw new Error(`commit stdin exceeds ${MAX_STDIN_BYTES} bytes`)
    chunks.push(bytes)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (!text) throw new Error('commit requires one JSON object on stdin; file arguments are forbidden')
  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('root must be an object')
    return value
  } catch (error) {
    throw new Error(`stdin is not valid JSON: ${String(error?.message ?? error)}`)
  }
}

function parseStdinText(text) {
  if (Buffer.byteLength(text, 'utf8') > MAX_STDIN_BYTES) throw new Error(`commit stdin exceeds ${MAX_STDIN_BYTES} bytes`)
  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('root must be an object')
    return value
  } catch (error) {
    throw new Error(`stdin is not valid JSON: ${String(error?.message ?? error)}`)
  }
}

async function callValidated(connection, rpc, args, expected = {}) {
  const result = await callContentResearchRpc({ ...connection, rpc, args })
  return validateContentResearchRpcResponse(rpc, result, expected)
}

export async function executeContentResearchCommand({
  argv,
  env = process.env,
  stdinText,
  fetchImpl = fetch,
  signal,
  now,
  sleepImpl,
  requestTokenFactory = randomUUID,
} = {}) {
  const options = parseContentResearchArgs(argv ?? [])
  if (options.help) return { command: 'help', usage: contentResearchUsage() }
  let providerSlotRequest = null
  if (options.command === 'provider-slot') {
    const provider = requireTextOption(options, 'provider', 64)
    if (provider !== 'openlibrary') throw new Error('--provider must be openlibrary')
    const worker = requireTextOption(options, 'worker', 200)
    const requestToken = requestTokenFactory()
    if (!UUID.test(requestToken)) throw new Error('provider slot request token factory must return a UUID')
    providerSlotRequest = {
      provider,
      worker,
      requestToken,
      minIntervalMs: options.minIntervalMs ?? 2_000,
    }
  }
  const connection = { ...connectionFromEnv(env), fetchImpl }
  const contract = await assertLiveContentResearchContract(connection)
  const contractInfo = { fingerprint: contract.fingerprint, checkedAt: contract.checkedAt }

  if (options.command === 'enqueue') {
    return {
      command: 'enqueue',
      contract: contractInfo,
      result: await callValidated(connection, CONTENT_RESEARCH_RPCS.enqueue, {
        p_celeb_ids: enqueueIds(options),
        p_reason: options.reason == null ? 'general' : requireTextOption(options, 'reason'),
      }),
    }
  }

  if (options.command === 'claim') {
    const rows = await callValidated(connection, CONTENT_RESEARCH_RPCS.claim, {
      p_worker: requireTextOption(options, 'worker', 200),
      p_lease_minutes: options.leaseMinutes ?? 60,
    })
    return { command: 'claim', contract: contractInfo, result: rows[0] ?? null }
  }

  if (options.command === 'renew') {
    const celebId = requireSingleUuid(options)
    const claimToken = requireSingleUuid(options, 'claim-token')
    return {
      command: 'renew',
      contract: contractInfo,
      result: await callValidated(connection, CONTENT_RESEARCH_RPCS.renew, {
        p_celeb_id: celebId,
        p_worker: requireTextOption(options, 'worker', 200),
        p_claim_token: claimToken,
        p_lease_minutes: options.leaseMinutes ?? 60,
      }, { celebId, claimToken }),
    }
  }

  if (options.command === 'commit') {
    const celebId = requireSingleUuid(options)
    const payload = stdinText === undefined
      ? await readContentResearchJsonStdin()
      : parseStdinText(stdinText)
    assertContentResearchCommitPayload(payload)
    if (payload.profileSnapshot.id.toLowerCase() !== celebId) {
      throw new Error('--celeb-id does not match stdin profileSnapshot.id')
    }
    const fingerprint = contentResearchFingerprint(payload)
    const classification = classifyContentResearchPayload(payload)
    if (classification.musicEligible > 0) {
      const error = new Error(
        'eligible MUSIC cannot use the legacy direct commit because it stages pending candidates; '
        + 'use celeb-music-collect to finalize the iTunes content, KO/EN locales and celeb_contents instead',
      )
      error.code = 'MUSIC_IMMEDIATE_FINALIZATION_REQUIRED'
      throw error
    }
    const result = await callValidated(connection, CONTENT_RESEARCH_RPCS.commit, {
      p_celeb_id: celebId,
      p_worker: requireTextOption(options, 'worker', 200),
      p_claim_token: requireSingleUuid(options, 'claim-token'),
      p_research_fingerprint: fingerprint,
      p_research_payload: payload,
    }, {
      celebId,
      researchFingerprint: fingerprint,
      musicOnly: classification.musicOnlyDeferred,
      musicEligible: classification.musicEligible,
    })
    return { command: 'commit', contract: contractInfo, classification, result }
  }

  if (options.command === 'fail') {
    const dispositions = ['retry', 'terminal', 'skip'].filter((key) => options[key])
    if (dispositions.length !== 1) throw new Error('fail requires exactly one of --retry, --terminal or --skip')
    if (stdinText !== undefined) throw new Error('fail does not accept stdin; record a concise sanitized --error')
    const disposition = dispositions[0]
    const celebId = requireSingleUuid(options)
    const claimToken = requireSingleUuid(options, 'claim-token')
    const errorText = redactText(requireTextOption(options, 'error'))
    return {
      command: 'fail',
      disposition,
      contract: contractInfo,
      result: await callValidated(connection, CONTENT_RESEARCH_RPCS.fail, {
        p_celeb_id: celebId,
        p_worker: requireTextOption(options, 'worker', 200),
        p_claim_token: claimToken,
        p_error: errorText,
        p_retry: disposition === 'retry',
        p_skip: disposition === 'skip',
        p_research_payload: null,
      }, { celebId, claimToken, error: errorText, disposition }),
    }
  }

  if (options.command === 'requeue') {
    const celebId = requireSingleUuid(options)
    const reason = requireTextOption(options, 'reason')
    const resetAttempts = Boolean(options['reset-attempts'])
    return {
      command: 'requeue',
      contract: contractInfo,
      result: await callValidated(connection, CONTENT_RESEARCH_RPCS.requeue, {
        p_celeb_id: celebId,
        p_reason: reason,
        p_reset_attempts: resetAttempts,
      }, { celebId, reason, resetAttempts }),
    }
  }

  if (options.command === 'status') {
    if (options.celebIds.length > 0) throw new Error('status does not accept --celeb-id')
    return {
      command: 'status',
      contract: contractInfo,
      result: await callValidated(connection, CONTENT_RESEARCH_RPCS.status, {}),
    }
  }

  if (options.command === 'provider-slot') {
    const { provider, worker, requestToken, minIntervalMs } = providerSlotRequest
    const result = await callValidated(connection, CONTENT_RESEARCH_RPCS.providerSlot, {
      p_provider: provider,
      p_worker: worker,
      p_request_token: requestToken,
      p_min_interval_ms: minIntervalMs,
    }, { provider, worker, requestToken, minIntervalMs })
    const waitedMs = await waitForExternalProviderSlot(result.availableAt, {
      signal, now, sleepImpl,
    })
    return { command: 'provider-slot', contract: contractInfo, waitedMs, result }
  }

  throw new Error(`unhandled command: ${options.command}`)
}

async function main() {
  const result = await executeContentResearchCommand({ argv: process.argv.slice(2) })
  // claimToken is intentionally preserved: it is the short-lived capability required
  // for renew/commit/fail. Environment keys and secret-looking nested metadata are redacted.
  console.log(JSON.stringify(sanitizeContentResearchOutput(result), null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(JSON.stringify(sanitizeContentResearchOutput({
      ok: false,
      code: error?.code ?? 'CONTENT_RESEARCH_WORKER_ERROR',
      message: String(error?.message ?? error),
      issues: error?.issues ?? undefined,
      contractErrors: error?.contractErrors ?? undefined,
    }), null, 2))
    process.exitCode = 1
  })
}
