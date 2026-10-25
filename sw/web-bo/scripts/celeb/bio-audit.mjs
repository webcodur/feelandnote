/** AGM → AGY → Gemini audit. Temporary checkpoints contain IDs and pending work, never a DB dump. */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync, openSync, closeSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join, relative, isAbsolute } from 'node:path'
import { parseEnv } from 'node:util'
import { randomUUID } from 'node:crypto'
import { REPO_ROOT } from '../lib/paths.ts'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'
import { BIO_AUDIT, RULEBOOKS, fingerprint, hash, validateResult, parseResult, researchPrompt,
  sampleRecords, windowDigest, validateApproval, parseAccounts, guardedPatch, writeDisposition, recoverResearchWindow, discoveryPrompt } from './bio-audit-contract.mjs'
import { researchEvidence } from './bio-audit-sources.mjs'

const ROOT = REPO_ROOT
const AGM = process.env.AGM_BIN || join(process.env.USERPROFILE || '', 'go/bin/agm.exe')
const LOGS = join(process.env.USERPROFILE || '', '.gemini/antigravity-cli/log')
const sleep = ms => new Promise(done => setTimeout(done, ms))
const alive = pid => { try { process.kill(pid, 0); return true } catch { return false } }
const cli = process.argv.slice(2), command = cli.shift() || 'help'
const option = name => { const at = cli.indexOf(`--${name}`); return at < 0 ? undefined : cli[at + 1] }
const taskRoot = resolve(tmpdir(), 'feelandnote')
const run = resolve(option('run') || join(taskRoot, `bio-audit-${randomUUID()}`))
if (!relative(taskRoot, run) || relative(taskRoot, run).startsWith('..') || isAbsolute(relative(taskRoot, run))) throw new Error('Run directory must be inside OS TEMP/feelandnote')
const statePath = join(run, 'state.json'), lockPath = join(run, 'runner.lock'), reviewPath = join(run, 'supervisor-review.json')
const emit = (event, detail = {}) => console.log(JSON.stringify({ at: new Date().toISOString(), event, ...detail }))
const readState = () => JSON.parse(readFileSync(statePath, 'utf8'))
function save(state) {
  state.updatedAt = new Date().toISOString()
  const next = statePath + '.next'
  writeFileSync(next, JSON.stringify(state), 'utf8')
  renameSync(next, statePath)
}
function summary(state) {
  return { run, stage: state.stage, scope: state.scope, selected: state.ids.length,
    completed: Object.keys(state.done).length, revised: Object.values(state.done).filter(item => item.decision === 'REVISE').length,
    unchanged: Object.values(state.done).filter(item => item.decision === 'KEEP').length,
    held: Object.keys(state.held).length, remaining: state.queue.length, pending: state.pending?.records.length || 0,
    inFlight: state.inFlight?.length || 0, supervisorApprovedSamples: state.supervisorApprovedSamples || 0,
    researchedInWindow: state.inFlightResults?.length || 0,
    reworkedWindows: state.reworkedWindows || 0,
    windowId: state.pending?.id, digest: state.pending?.digest, runnerAlive: state.pid ? alive(state.pid) : false,
    pid: state.pid, stopReason: state.stopReason, updatedAt: state.updatedAt }
}
function database() {
  const env = parseEnv(readFileSync(join(ROOT, 'sw/web/.env'), 'utf8'))
  if (!env.NEXT_PUBLIC_DB_API_URL || !env.DB_SECRET_KEY) throw new Error('Database configuration missing')
  // Keep secrets local to this closure; agy does not inherit values read from .env.
  const base = env.NEXT_PUBLIC_DB_API_URL.replace(/\/$/, '') + '/rest/v1/celebs'
  return async (params, body) => {
    const url = new URL(base)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    const response = await fetch(url, { method: body ? 'PATCH' : 'GET',
      headers: { apikey: env.DB_SECRET_KEY, ...(body && { 'Content-Type': 'application/json', Prefer: 'return=representation' }) },
      ...(body && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`Database ${body ? 'write' : 'read'} HTTP ${response.status}`)
    return response.json()
  }
}
async function listPeople(db, scope) {
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const page = await db({ select: '*', publication_status: 'eq.active', order: 'id', limit: '500', offset: String(offset),
      ...(scope === 'real-light' && { celeb_tier: 'eq.light', celeb_reality: 'eq.REAL' }) })
    rows.push(...page)
    if (page.length < 500) break
  }
  return rows
}
async function getPerson(db, id) {
  const rows = await db({ select: '*', id: `eq.${id}` })
  if (rows.length !== 1) throw new Error('Person no longer exists')
  return rows[0]
}
function mcpPreflight() {
  const config = join(process.env.USERPROFILE || '', '.gemini/config/mcp_config.json')
  if (!existsSync(config)) return
  const value = JSON.parse(readFileSync(config, 'utf8'))
  if (Object.values(value.mcpServers || {}).some(server => !server.disabled)) throw new Error('Active global AGY MCP: use an isolated profile before generation')
}
const agmOutput = () => execFileSync(AGM, ['list'], { encoding: 'utf8', windowsHide: true, timeout: 30_000 })
function ensureAccount(excluded = new Set()) {
  const accounts = parseAccounts(agmOutput())
  const current = accounts.find(account => account.active)
  if (current && !excluded.has(current.account) && current.flash >= BIO_AUDIT.minimumQuota) return
  const next = accounts.filter(account => !excluded.has(account.account) && account.flash >= BIO_AUDIT.minimumQuota)
    .sort((a, b) => b.flash - a.flash)[0]
  if (!next) throw new Error('QUOTA_POOL_EXHAUSTED')
  if (next.expired) execFileSync(AGM, ['validate'], { encoding: 'utf8', windowsHide: true, timeout: 90_000 })
  execFileSync(AGM, ['switch', next.account, '--target', 'agy'], { encoding: 'utf8', windowsHide: true, timeout: 30_000 })
  if (!parseAccounts(agmOutput()).some(account => account.account === next.account && account.active)) throw new Error('AGM switch not confirmed')
  emit('account_switched') // Never print account identifiers or token material.
}
function matchingQuotaLog(startedAt, marker, usedAccount) {
  if (!existsSync(LOGS)) return false
  for (const name of readdirSync(LOGS).filter(name => /^cli-.*\.log$/.test(name)).sort().reverse().slice(0, 24)) {
    // The marker binds the log to this request, rather than another user's concurrent agy session.
    if (statSync(join(LOGS, name)).mtimeMs < startedAt) continue
    const text = readFileSync(join(LOGS, name), 'utf8')
    if ((text.includes(marker) || usedAccount && text.includes(`email=${usedAccount}`)) && /Individual quota reached/i.test(text)) return true
  }
  return false
}
let accountChange = Promise.resolve()
const exhaustedAccounts = new Set()
async function switchQuotaAccount(failedAccount) {
  accountChange = accountChange.then(() => {
    if (failedAccount) exhaustedAccounts.add(failedAccount)
    ensureAccount(exhaustedAccounts)
  }).catch(error => {
    if (/QUOTA_POOL_EXHAUSTED/.test(error.message)) throw error
    throw new Error('ACCOUNT_SWITCH_FAILED: ' + String(error.message).slice(0, 150))
  })
  return accountChange
}
async function generate(person, feedback) {
  await accountChange
  mcpPreflight()
  const usedAccount = parseAccounts(agmOutput()).find(account => account.active)?.account
  const marker = `bio-audit-request-${randomUUID()}`, startedAt = Date.now()
  try {
    return await researchEvidence(person, feedback, {
      discover: async context => parseResult(await agyCall(`${marker}\n${discoveryPrompt(person, context)}`, {
      repoRoot: ROOT, model: BIO_AUDIT.model, timeoutMs: BIO_AUDIT.timeoutMs, disableSlashCommands: true, privateLog: true,
      jsonSchema: { type: 'object', properties: { id: { type: 'string' }, urls: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['id','urls','notes'], additionalProperties: false },
      })),
      onSources: detail => emit('sources_fetched', { slug: person.slug, ...detail }),
      assess: async (materials, context) => parseResult(await agyCall(`${marker}-assessment\n${researchPrompt(person, context, materials)}`, {
      docs: RULEBOOKS, repoRoot: ROOT, model: BIO_AUDIT.model, timeoutMs: BIO_AUDIT.timeoutMs,
      disableSlashCommands: true, privateLog: true,
      })),
    })
  } catch (error) {
    if (error.quotaExhausted || /Individual quota reached/i.test(error.message) || matchingQuotaLog(startedAt, marker, usedAccount)) {
      await switchQuotaAccount(usedAccount)
      throw new Error('RETRY_AFTER_ACCOUNT_SWITCH')
    }
    if (/時間|시간 초과|timeout/i.test(error.message)) {
      try {
        const probeMarker = `bio-audit-probe-${randomUUID()}`
        const probe = await agyCall(`${probeMarker} Reply with exactly: OK. No tools.`,
          { model: BIO_AUDIT.model, timeoutMs: 60_000, disableSlashCommands: true, privateLog: true })
        if (!/\bOK\b/.test(probe)) throw new Error('probe failed')
      } catch (probeError) {
        if (probeError.quotaExhausted || /Individual quota reached/i.test(probeError.message) || matchingQuotaLog(startedAt, marker, usedAccount)) { await switchQuotaAccount(usedAccount); throw new Error('RETRY_AFTER_ACCOUNT_SWITCH') }
        throw new Error('AGY_UNRESPONSIVE')
      }
    }
    throw error
  }
}
function takeLock() {
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
    if (alive(lock.pid)) throw new Error('Another runner is active')
    unlinkSync(lockPath)
  }
  const fd = openSync(lockPath, 'wx')
  writeFileSync(fd, JSON.stringify({ pid: process.pid })); closeSync(fd)
}
async function applyWindow(state, db, review) {
  const window = state.pending
  validateApproval(window, review)
  for (const result of window.records) {
    if (state.done[result.id]?.window === window.id) continue // Resume after a verified write.
    if (result.decision === 'HOLD') {
      state.held[result.id] = result.reason; save(state); continue
    }
    const current = await getPerson(db, result.id)
    // A process interrupted after PATCH but before checkpoint can recognize the exact intended result.
    const disposition = writeDisposition(current, result)
    const alreadyWritten = disposition === 'already-written'
    if (disposition === 'stale') {
      state.queue.push(result.id); emit('concurrent_change_requeued', { slug: result.slug }); continue
    }
    if (!alreadyWritten) validateResult(result, current)
    if (result.decision === 'REVISE' && !alreadyWritten) {
      const patch = guardedPatch(current, result)
      if (!patch) throw new Error('Patch was not authorized for the current biography')
      const written = await db(patch.params, patch.body)
      if (written.length !== 1) { state.queue.push(result.id); emit('cas_conflict', { slug: result.slug }); continue }
      const allowed = new Set(['bio', 'bio_en', 'updated_at'])
      if (hash(Object.fromEntries(Object.entries(current).filter(([key]) => !allowed.has(key))))
        !== hash(Object.fromEntries(Object.entries(written[0]).filter(([key]) => !allowed.has(key))))) throw new Error('Protected profile fields changed')
    }
    const verified = await getPerson(db, result.id)
    if (verified.bio !== result.bio || verified.bio_en !== result.bio_en) throw new Error('Post-write biography mismatch')
    state.done[result.id] = { decision: result.decision, fingerprint: fingerprint(verified), window: window.id,
      issues: result.issues || [] }
    delete state.held[result.id]
    save(state)
    emit('verified', { slug: result.slug, decision: result.decision })
  }
  state.windows++
  state.supervisorApprovedSamples = (state.supervisorApprovedSamples || 0) + window.samples.length
  state.pending = null; state.stage = 'researching'; save(state)
}
async function runner() {
  mcpPreflight(); ensureAccount()
  takeLock()
  const db = database(), state = readState()
  if (!state.pending && existsSync(reviewPath)) unlinkSync(reviewPath)
  state.pid = process.pid; state.stopReason = null; save(state)
  try {
    while (true) {
      if (state.pending) {
        state.stage = 'awaiting-supervisor'; save(state)
        emit('awaiting_supervisor', { windowId: state.pending.id, samples: state.pending.samples.length, digest: state.pending.digest })
        while (!existsSync(reviewPath)) await sleep(10_000)
        const review = JSON.parse(readFileSync(reviewPath, 'utf8'))
        if (review.digest !== state.pending.digest) throw new Error('Stale supervisor response')
        if (review.decision === 'REWORK') {
          if (!review.reason?.trim()) throw new Error('Rework requires concrete feedback')
          const rework = []
          for (const record of state.pending.records) {
            const fetchedUrls = record.sources?.filter(source => source.contentHash && source.fetchedAt).map(source => source.url) || []
            state.feedback[record.id] = [review.reason, fetchedUrls.length
              ? `이 인물에서 실제 수집됐던 URL(주장 지지 여부는 다시 판정): ${JSON.stringify(fetchedUrls)}` : ''].filter(Boolean).join('\n')
            if ((state.attempts[record.id] || 0) >= BIO_AUDIT.maxAttempts) state.held[record.id] = review.reason
            else rework.push(record.id)
          }
          state.queue = [...new Set([...rework, ...state.queue])]
          state.reworkedWindows = (state.reworkedWindows || 0) + 1
          state.pending = null; save(state)
        } else await applyWindow(state, db, review)
        unlinkSync(reviewPath)
      }
      if (!state.queue.length) {
        const fresh = await listPeople(db, state.scope)
        state.ids = fresh.map(person => person.id)
        const activeIds = new Set(state.ids)
        for (const id of Object.keys(state.done)) if (!activeIds.has(id)) delete state.done[id]
        for (const id of Object.keys(state.held)) if (!activeIds.has(id)) delete state.held[id]
        for (const person of fresh) {
          if (!state.held[person.id] && state.done[person.id]?.fingerprint !== fingerprint(person)) state.queue.push(person.id)
        }
        if (!state.queue.length) {
          state.stage = Object.keys(state.held).length ? 'unresolved' : 'complete'
          save(state); emit('finished', summary(state)); return
        }
      }
      state.stage = 'researching'; save(state)
      state.queue = [...new Set(state.queue)]
      const completed = Object.keys(state.done).length
      const selected = state.queue.splice(0, completed < BIO_AUDIT.pilot ? BIO_AUDIT.pilot - completed : BIO_AUDIT.window)
      state.inFlight = selected; state.inFlightResults = []; save(state)
      const records = []; let cursor = 0, fatal = null
      await Promise.all(Array.from({ length: BIO_AUDIT.concurrency }, async () => {
        while (cursor < selected.length && !fatal) {
          const id = selected[cursor++]
          try {
            const person = await getPerson(db, id)
            if (person.publication_status !== 'active') {
              state.ids = state.ids.filter(item => item !== id); state.inFlight = state.inFlight.filter(item => item !== id); save(state); continue
            }
            state.attempts[id] = (state.attempts[id] || 0) + 1
            emit('research_started', { slug: person.slug, attempt: state.attempts[id] })
            const result = await generate(person, state.feedback[id])
            records.push({ ...result, expectedFingerprint: fingerprint(person),
              resultFingerprint: fingerprint({ ...person, bio: result.bio, bio_en: result.bio_en }) })
            state.inFlightResults = records; state.inFlight = state.inFlight.filter(item => item !== id); save(state)
            emit('research_finished', { slug: person.slug, decision: result.decision })
          } catch (error) {
            const reason = String(error.message).slice(0, 500)
            if (/AGY_UNRESPONSIVE|QUOTA_POOL_EXHAUSTED|ACCOUNT_SWITCH_FAILED|Active global AGY/.test(reason)) fatal = reason
            if (reason === 'RETRY_AFTER_ACCOUNT_SWITCH') state.attempts[id]--
            if ((state.attempts[id] || 0) >= BIO_AUDIT.maxAttempts && !fatal) state.held[id] = reason
            else state.queue.push(id)
            state.feedback[id] = `직전 작업 실패를 해결하고 실제 출처로 다시 검수: ${reason}`
            state.inFlight = state.inFlight.filter(item => item !== id); save(state)
            emit('research_failed', { id, reason })
          }
        }
      }))
      for (const id of selected.slice(cursor)) if (!state.queue.includes(id)) state.queue.push(id)
      state.inFlight = []; state.inFlightResults = []
      if (records.length) {
        const window = { id: randomUUID(), records, samples: [] }
        window.samples = sampleRecords(records, window.id, Object.keys(state.done).length < BIO_AUDIT.pilot)
        window.digest = windowDigest(window); state.pending = window
      }
      save(state)
      if (fatal) throw new Error(fatal)
    }
  } catch (error) {
    state.stage = 'stopped'; state.stopReason = String(error.message).slice(0, 500); save(state)
    emit('stopped', summary(state)); process.exitCode = 3
  } finally {
    state.pid = null; save(state); if (existsSync(lockPath)) unlinkSync(lockPath)
  }
}
async function main() {
  if (command === 'help') {
    console.log('bio-audit.mjs init|run|status|sample|review|retry --run <OS-TEMP/feelandnote/task> [--scope all-active|real-light] [--file <supervisor-review.json>]'); return
  }
  if (command === 'init') {
    if (existsSync(statePath)) throw new Error('Run already exists')
    const scope = option('scope') || 'all-active'
    if (!['all-active', 'real-light'].includes(scope)) throw new Error('Unknown scope')
    mcpPreflight(); ensureAccount()
    const people = await listPeople(database(), scope)
    if (!people.length) throw new Error('Empty population')
    people.sort((a, b) => Number(!(a.celeb_tier === 'light' && a.celeb_reality === 'REAL'))
      - Number(!(b.celeb_tier === 'light' && b.celeb_reality === 'REAL')) || hash(a.id).localeCompare(hash(b.id)))
    mkdirSync(run, { recursive: true })
    const state = { version: 1, scope, stage: 'ready', ids: people.map(person => person.id), queue: people.map(person => person.id),
      done: {}, held: {}, attempts: {}, feedback: {}, windows: 0, pending: null, inFlight: [], pid: null }
    save(state); emit('initialized', { ...summary(state), groups: people.reduce((groups, person) => {
      const key = `${person.celeb_tier}/${person.celeb_reality}`; groups[key] = (groups[key] || 0) + 1; return groups
    }, {}) }); return
  }
  if (!existsSync(statePath)) throw new Error('Run does not exist')
  if (command === 'run') {
    const state = readState()
    if ((state.inFlight?.length || state.inFlightResults?.length) && (!state.pid || !alive(state.pid))) {
      recoverResearchWindow(state, randomUUID()); save(state)
    }
    await runner(); return
  }
  const state = readState()
  if (command === 'status') { emit('status', summary(state)); return }
  if (command === 'sample') {
    const samples = []
    if (state.pending) for (const id of state.pending.samples) {
      const record = state.pending.records.find(item => item.id === id)
      const current = await getPerson(database(), id)
      samples.push({ ...record, currentBio: current.bio, currentBioEn: current.bio_en, nickname: current.nickname, birth: current.birth_date })
    }
    console.log(JSON.stringify({ ...summary(state), samples, held: state.held }, null, 2)); return
  }
  if (command === 'review') {
    if (!state.pending || existsSync(reviewPath)) throw new Error('No unreviewed pending window')
    const review = JSON.parse(readFileSync(resolve(option('file')), 'utf8'))
    if (review.decision === 'APPROVE') validateApproval(state.pending, review)
    else if (review.decision !== 'REWORK' || review.digest !== state.pending.digest || !review.reason?.trim()) throw new Error('Invalid rework response')
    writeFileSync(reviewPath, JSON.stringify(review), { flag: 'wx' }); emit('review_received', { decision: review.decision }); return
  }
  if (command === 'retry') {
    if (state.pid && alive(state.pid)) throw new Error('Stop active runner before retrying unresolved people')
    for (const id of Object.keys(state.held)) { state.queue.push(id); state.attempts[id] = 0 }
    state.held = {}; state.stage = 'ready'; save(state); emit('retry_ready', summary(state)); return
  }
  throw new Error('Unknown command')
}
main().catch(error => { console.error(String(error.message)); process.exitCode = 1 })
