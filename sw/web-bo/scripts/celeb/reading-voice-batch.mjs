/** One resumable run: synthesize each source once, QC existing audio, then finite retries. */
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { createWriteStream } from 'node:fs'
import { access, mkdir, open, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createInterface } from 'node:readline'
import { nextPacificResetAt, renameCheckpoint } from './reading-voice.mjs'

const BO = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PIPELINE = join(BO, 'scripts/celeb/reading-voice.mjs')
const DEFAULT_RUN = 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908'
const STATUS_DOCUMENT = resolve(BO, '../../docs/continuous/celeb-tts-reading.md')
const exists = (path) => access(path).then(() => true, () => false)
const now = () => new Date().toISOString()
export const QUOTA_WAIT_LIMITS = { total: 24, daily: 14, unknown: 3, noProgress: 3 }

export async function updateContinuousStatus(options, summary, phase, { path = STATUS_DOCUMENT, clock = Date.now() } = {}) {
  if (options.slug || options.limit || options.status || options['dry-run'] || resolve(options.run) !== resolve(DEFAULT_RUN)) return { updated: false }
  try {
    const original = await readFile(path, 'utf8')
    const start = '<!-- reading-voice-status:start -->'
    const end = '<!-- reading-voice-status:end -->'
    if (original.split(start).length !== 2 || original.split(end).length !== 2 || original.indexOf(start) >= original.indexOf(end)) throw new Error('STATUS_MARKERS_INVALID')
    const timestamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(clock)
    const paragraph = `${timestamp} KST 확인: ${phase}. 전체 ${summary.selected ?? '미확인'}개 중 현재 원본 음성 ${summary.generated}개, 정상 등록 ${summary.published}개, 음성이 있는 검수·등록 대기 ${summary.pendingQc}개, 보류 ${summary.held}개, 실패 ${summary.failed}개, 음성 미보유 ${summary.missingAudio}개다.`
    const newline = original.includes('\r\n') ? '\r\n' : '\n'
    const revised = original.slice(0, original.indexOf(start) + start.length) + newline + paragraph + newline + original.slice(original.indexOf(end))
    if (await readFile(path, 'utf8') !== original) throw new Error('STATUS_DOCUMENT_CHANGED')
    await writeFile(path, revised)
    return { updated: true }
  } catch (error) { return { updated: false, error: error.code || (['STATUS_MARKERS_INVALID', 'STATUS_DOCUMENT_CHANGED'].includes(error.message) ? error.message : 'STATUS_WRITE_FAILED') } }
}

export function quotaWaitPlan(quota, previous = {}, generated = 0, clock = Date.now()) {
  if (!['daily', 'minute', 'unknown-429'].includes(quota?.kind)) return null
  const counters = {
    total: (previous.total || 0) + 1,
    daily: (previous.daily || 0) + (quota.kind === 'daily' ? 1 : 0),
    unknown: (previous.unknown || 0) + (quota.kind === 'unknown-429' ? 1 : 0),
    noProgress: previous.lastGenerated != null && generated <= previous.lastGenerated ? (previous.noProgress || 0) + 1 : 0,
    lastGenerated: generated,
  }
  if (Object.keys(QUOTA_WAIT_LIMITS).some((key) => counters[key] > QUOTA_WAIT_LIMITS[key])) return null
  const retryMs = Number.isFinite(quota.retryAfterMs) ? Math.max(0, quota.retryAfterMs) : 0
  const nextAt = quota.kind === 'daily' ? nextPacificResetAt(clock)
    : clock + Math.max(retryMs + 3000, quota.kind === 'minute' ? 65_000 : 15 * 60_000 * 2 ** (counters.unknown - 1))
  return { nextRetryAt: new Date(nextAt).toISOString(), counters }
}

async function waitUntil(nextRetryAt) {
  let remaining
  while ((remaining = Date.parse(nextRetryAt) - Date.now()) > 0) {
    await new Promise((done) => setTimeout(done, Math.min(remaining, 50_000)))
  }
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false
  try { process.kill(pid, 0); return true } catch (error) { if (error.code === 'ESRCH') return false; throw error }
}

async function lockStatus(path) {
  if (!await exists(path)) return { pid: null, alive: false }
  const lock = JSON.parse(await readFile(path, 'utf8'))
  return { pid: lock.pid, alive: pidAlive(lock.pid) }
}

async function pipelinePhase(pid) {
  if (process.platform !== 'win32') return 'standalone-pipeline'
  try {
    const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine`], { windowsHide: true, timeout: 5000 })
    if (!stdout.includes('reading-voice.mjs')) return 'standalone-pipeline'
    if (stdout.includes('--synthesize-only')) return 'synthesize'
    if (stdout.includes('--existing-only') && stdout.includes('--publish')) return 'qc-publish-existing'
    if (stdout.includes('--generate') && stdout.includes('--publish')) return 'retry'
  } catch { /* PID liveness remains available if command-line inspection fails. */ }
  return 'standalone-pipeline'
}

export function batchArgs(argv = process.argv.slice(2)) {
  const options = { run: DEFAULT_RUN, device: 'cuda' }
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index]
    if (['--help', '--status', '--dry-run', '--wait-for-quota'].includes(key)) options[key.slice(2)] = true
    else if (['--run', '--slug', '--limit', '--device'].includes(key) && argv[index + 1] && !argv[index + 1].startsWith('--')) options[key.slice(2)] = argv[++index]
    else throw new Error(`Unknown or incomplete argument: ${key}`)
  }
  options.run = resolve(options.run)
  return options
}

export function batchStages(options) {
  const scope = options.slug ? ['--slug', options.slug] : ['--all-active']
  if (options.limit) scope.push('--limit', String(options.limit))
  const common = [...scope, '--locales', 'ko,en', '--run', options.run, '--requests-per-second', '1']
  const queue = options.slug || options.limit ? [] : ['--queue-file', join(options.run, 'reading-voice-synthesis-queue.json')]
  return [
    { id: 'synthesize', args: [...common, '--synthesize-only', '--single-pass', '--concurrency', '8', ...queue] },
    { id: 'qc-publish', args: [...common, '--publish', '--existing-only', '--concurrency', '3', '--device', options.device] },
    { id: 'retry', args: [...common, '--generate', '--publish', '--concurrency', '3', '--device', options.device] },
  ]
}

export function completedScan(exitCode, finishedEvent) {
  return (exitCode === 0 || exitCode === 1) && finishedEvent?.event === 'finished'
    && Number.isInteger(finishedEvent.selected) && finishedEvent.selected > 0
}

export async function batchStatus(run, readPhase = pipelinePhase) {
  const manifest = await exists(join(run, 'manifest.json')) ? JSON.parse(await readFile(join(run, 'manifest.json'), 'utf8')) : null
  const batch = await exists(join(run, 'reading-voice-batch.json')) ? JSON.parse(await readFile(join(run, 'reading-voice-batch.json'), 'utf8')) : null
  const entries = Object.values(manifest?.entries || {})
  const audio = await Promise.all(entries.map(async (entry) => {
    const attempts = entry.attempts || []
    const wav = (await Promise.all(attempts.map((attempt) => attempt.wav ? exists(attempt.wav) : false))).some(Boolean)
    const mp3 = !wav && (await Promise.all([entry.mp3, ...attempts.map((attempt) => attempt.synthesisMp3)].filter(Boolean).map(exists))).some(Boolean)
    return { wav, present: wav || mp3 }
  }))
  const batchProcess = await lockStatus(join(run, 'reading-voice-batch.lock'))
  const pipelineProcess = await lockStatus(join(run, 'reading-voice.lock'))
  const standalone = pipelineProcess.alive && !batchProcess.alive
  const activeStage = standalone ? await readPhase(pipelineProcess.pid) : batch?.currentStage || null
  let selected = batch?.lastScan?.selected || null
  const logPath = join(run, 'reading-voice-batch.log')
  if (!selected && await exists(logPath)) {
    const file = await open(logPath, 'r')
    try {
      const bytes = Buffer.alloc(65536)
      const { bytesRead } = await file.read(bytes, 0, bytes.length, 0)
      for (const line of bytes.toString('utf8', 0, bytesRead).split('\n')) {
        try { const event = JSON.parse(line); if (event.event === 'preflight') selected = event.files } catch { /* Logs also contain progress text. */ }
      }
    } finally { await file.close() }
  }
  return {
    run, stage: activeStage, batchStatus: standalone ? 'standalone-running' : ['running', 'waiting-quota'].includes(batch?.status) && !batchProcess.alive ? 'interrupted' : batch?.status || 'not-started', updatedAt: manifest?.updatedAt || null,
    running: batchProcess.alive || pipelineProcess.alive, batchPid: batchProcess.pid, pipelinePid: pipelineProcess.pid, selected,
    generated: audio.filter((item) => item.wav).length,
    published: entries.filter((entry) => entry.status === 'published').length,
    held: entries.filter((entry) => entry.status === 'held').length,
    failed: entries.filter((entry) => entry.status === 'failed').length,
    pendingQc: entries.filter((entry, index) => audio[index].present && ['generated', 'pending', 'ready', 'uploaded', 'failed'].includes(entry.status)).length,
    missingAudio: (selected || entries.length) - audio.filter((item) => item.present).length,
    completedStages: batch?.completedStages || [], stopReason: standalone ? null : batch?.stopReason || null,
    savedBatchStatus: batch?.status || null, savedStopReason: batch?.stopReason || null,
    nextRetryAt: standalone ? null : batch?.nextRetryAt || null, quota: batch?.quota || null, quotaResumes: batch?.quotaWaits?.total || 0,
    partialQc: batch?.partialQc || null,
  }
}

async function releaseDeadLock(path) {
  if (!await exists(path)) return
  const lock = JSON.parse(await readFile(path, 'utf8'))
  if (!Number.isInteger(lock.pid) || lock.pid < 1) throw new Error(`Invalid lock needs diagnosis: ${path}`)
  if (pidAlive(lock.pid)) throw new Error(`Already running PID ${lock.pid}: ${path}`)
  await unlink(path)
}

function executeStage(stage, logStream) {
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', PIPELINE, ...stage.args], { cwd: BO, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let finished = null
    let lastError = ''
    let quota = null
    createInterface({ input: child.stdout }).on('line', (line) => {
      process.stdout.write(line + '\n'); logStream.write(line + '\n')
      try { const event = JSON.parse(line); if (event.event === 'finished') finished = event; if (event.event === 'quota-exhausted') quota = event.quota; if (event.error) lastError = event.error } catch { /* Non-JSON progress is still logged. */ }
    })
    createInterface({ input: child.stderr }).on('line', (line) => {
      process.stderr.write(line + '\n'); logStream.write(line + '\n')
      if (line.trim()) lastError = line.trim()
    })
    child.on('error', reject)
    child.on('close', (code, signal) => done({ exitCode: code, signal, finished, lastError, quota }))
  })
}

export async function runBatch(options, execute = executeStage, wait = waitUntil, updateStatus = updateContinuousStatus) {
  await mkdir(options.run, { recursive: true })
  const lockPath = join(options.run, 'reading-voice-batch.lock')
  await releaseDeadLock(lockPath)
  await releaseDeadLock(join(options.run, 'reading-voice.lock'))
  const lock = await open(lockPath, 'wx')
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: now() }))
  const path = join(options.run, 'reading-voice-batch.json')
  const logStream = createWriteStream(join(options.run, 'reading-voice-batch.log'), { flags: 'a', encoding: 'utf8' })
  const save = async (batch) => { await writeFile(path + '.tmp', JSON.stringify(batch, null, 2) + '\n'); await renameCheckpoint(path + '.tmp', path) }
  let started = false
  const report = async (phase) => {
    try {
      const result = await updateStatus(options, await batchStatus(options.run), phase)
      if (result.updated || result.error) {
        const event = JSON.stringify({ at: now(), event: result.error ? 'status-document-error' : 'status-document-updated', phase, ...result })
        console.log(event); logStream.write(event + '\n')
      }
    } catch { logStream.write(JSON.stringify({ at: now(), event: 'status-document-error', error: 'STATUS_UPDATE_FAILED' }) + '\n') }
  }
  try {
  const scope = { slug: options.slug || null, limit: options.limit ? String(options.limit) : null }
    const batch = await exists(path) ? JSON.parse(await readFile(path, 'utf8')) : { schemaVersion: 1, scope, completedStages: [], startedAt: now() }
    if (JSON.stringify(batch.scope) !== JSON.stringify(scope)) throw new Error('Batch scope differs from this run; keep the original --slug/--limit')
    for (const stage of batchStages(options)) {
      if (batch.completedStages.includes(stage.id)) continue
      while (true) {
        if (options['wait-for-quota'] && batch.status === 'waiting-quota' && batch.currentStage === stage.id && batch.nextRetryAt) await wait(batch.nextRetryAt)
        batch.status = 'running'; batch.currentStage = stage.id; delete batch.stopReason; delete batch.nextRetryAt; await save(batch)
        const event = JSON.stringify({ at: now(), event: 'batch-stage-start', stage: stage.id })
        console.log(event); logStream.write(event + '\n')
        started = true
        const result = await execute(stage, logStream)
        if (stage.id === 'synthesize') await report(completedScan(result.exitCode, result.finished) ? '생성 단계 완료, 검수·등록 단계로 진행' : result.lastError?.includes('FREE_KEYS_EXHAUSTED') ? '생성 한도에 도달해 생성 단계 종료' : '오류로 생성 단계 중단')
        if (!completedScan(result.exitCode, result.finished)) {
          batch.stopReason = result.lastError || `Process exited ${result.exitCode}, signal ${result.signal || 'none'}, without a completed scan`
          batch.quota = result.quota || null
          const summary = await batchStatus(options.run)
          const plan = options['wait-for-quota'] && result.lastError?.includes('FREE_KEYS_EXHAUSTED')
            ? quotaWaitPlan(result.quota, batch.quotaWaits, summary.generated) : null
          if (plan) {
            batch.status = 'waiting-quota'; batch.nextRetryAt = plan.nextRetryAt; batch.quotaWaits = plan.counters
            await save(batch)
            const waiting = JSON.stringify({ at: now(), event: 'batch-waiting-quota', stage: stage.id, quota: batch.quota, nextRetryAt: plan.nextRetryAt, generated: summary.generated, resumes: plan.counters.total })
            console.log(waiting); logStream.write(waiting + '\n')
            continue
          }
          if (!options['wait-for-quota'] && stage.id === 'synthesize' && summary.generated > 0
            && result.lastError?.includes('FREE_KEYS_EXHAUSTED') && ['daily', 'minute', 'unknown-429'].includes(result.quota?.kind)) {
            const partialStage = { ...batchStages(options)[1], id: 'qc-publish-partial' }
            batch.currentStage = partialStage.id
            batch.partialQc = { startedAt: now(), completed: false }
            await save(batch)
            const starting = JSON.stringify({ at: now(), event: 'batch-stage-start', stage: partialStage.id, generated: summary.generated })
            console.log(starting); logStream.write(starting + '\n')
            let partial
            try { partial = await execute(partialStage, logStream) }
            catch (error) { partial = { exitCode: 2, lastError: error.message, finished: null } }
            batch.partialQc = { ...batch.partialQc, endedAt: now(), completed: completedScan(partial.exitCode, partial.finished), ...partial }
            // Only the available WAVs were scanned. The unfinished synthesis and full QC stages stay resumable.
            batch.currentStage = stage.id
            if (!batch.partialQc.completed) batch.stopReason += `; existing-audio QC stopped: ${partial.lastError || 'scan incomplete'}`
            const finished = JSON.stringify({ at: now(), event: 'batch-partial-qc-finished', ...batch.partialQc })
            console.log(finished); logStream.write(finished + '\n')
          }
          batch.status = 'stopped'
          if (options['wait-for-quota'] && result.quota) batch.stopReason += '; no safe quota wait remains (non-retryable quota or finite wait limit reached)'
          await save(batch)
          return { ...await batchStatus(options.run), exitCode: 2 }
        }
        batch.completedStages.push(stage.id)
        batch.lastScan = result.finished
        delete batch.quota; delete batch.nextRetryAt
        await save(batch)
        break
      }
    }
    const summary = await batchStatus(options.run)
    const unresolved = summary.held + summary.failed + summary.pendingQc + summary.missingAudio
    batch.status = unresolved ? 'finished-with-unresolved' : 'finished'; batch.currentStage = null; batch.finishedAt = now()
    await save(batch)
    return { ...await batchStatus(options.run), exitCode: unresolved ? 1 : 0 }
  } finally {
    if (started) {
      const status = await batchStatus(options.run).catch(() => null)
      await report(status?.batchStatus === 'finished' ? '이번 배치 완료' : status?.batchStatus === 'finished-with-unresolved' ? '이번 배치 종료, 남은 항목은 다음 지시 때 처리' : '이번 배치 중단, 남은 항목은 다음 지시 때 재개')
    }
    await new Promise((done) => logStream.end(done))
    await lock.close(); await unlink(lockPath)
  }
}

async function main() {
  const options = batchArgs()
  if (options.help) { console.log('node --import tsx scripts/celeb/reading-voice-batch.mjs [--run DIR] [--wait-for-quota] [--status | --dry-run] [--slug SLUG] [--limit PEOPLE] [--device cuda|cpu|auto]\nRuns synthesize-only (8 workers,1 request/sec), existing WAV QC/publish (3), then finite retries. By default, synthesis quota exhaustion runs QC/publish once for available WAVs and exits; the next manual run resumes unfinished synthesis. --wait-for-quota instead resumes after known quota resets with finite wait limits. Other fatal errors stop.'); return }
  if (options.status) { console.log(JSON.stringify(await batchStatus(options.run), null, 2)); return }
  if (options['dry-run']) { console.log(JSON.stringify(batchStages(options), null, 2)); return }
  const result = await runBatch(options)
  console.log(JSON.stringify({ at: now(), event: result.exitCode === 2 ? 'batch-stopped' : 'batch-finished', ...result, ...await batchStatus(options.run) }))
  process.exitCode = result.exitCode
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(error.message); process.exitCode = 2 })
}
