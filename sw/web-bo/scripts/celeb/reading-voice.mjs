/**
 * Resumable KO/EN reading narration. Run from sw/web-bo with node --import tsx.
 * --slug takeda-shingen --locales ko,en --dry-run
 * --slug takeda-shingen --locales ko,en --generate [--publish]
 * --all-active --locales ko,en --generate --publish
 * --run selects the persistent local checkpoint directory. No writes in --dry-run.
 */
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir, rename, open, unlink, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
import { createInterface } from 'node:readline'
import { createClient } from '@supabase/supabase-js'
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { cleanVoiceFile } from '@feelandnote/shared/bo/voice-cleanup'
import { publishReadingTiming } from './reading-voice-timing.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const QC_SCRIPT = join(ROOT, 'sw/audio-bo/scripts/celeb-reading-voice-qc.py')
const MODEL = 'gemini-2.5-flash-preview-tts'
const VOICE = 'Charon'
const PROMPTS = {
  ko: '편안하고 자연스럽게 읽어 주세요. 아래 본문만 읽어 주세요:\n\n',
  en: 'Read comfortably and naturally. Read only the following text:\n\n',
}
const MAX_ATTEMPTS = 3
const MAX_CONSECUTIVE_FAILURES = 5
const KEY_COOLDOWN_MS = 65_000
const REQUEST_TIMEOUT_MS = 180_000
const QC_TIMEOUT_MS = 600_000
const TRANSIENT_HTTP_STATUSES = new Set([500, 502, 503, 504])
const MAX_TRANSIENT_RETRIES = 2
const TRANSIENT_BACKOFF_MS = 500
export const SPEED_POLICY = { ko: { target: 6, margin: 6.01, unit: 'cps' }, en: { target: 156, margin: 156.1, unit: 'wpm' }, maxTempo: 1.25, encoderPaddingSeconds: 0.096 }
const MP3_SETTINGS = { codec: 'libmp3lame', bitrate: '128k', sampleRate: 24000, channels: 1 }
const sha = (value) => createHash('sha256').update(value).digest('hex')
const now = () => new Date().toISOString()
const delay = (ms) => new Promise((done) => setTimeout(done, ms))
const exists = async (path) => access(path).then(() => true, () => false)
const log = (event, values = {}) => console.log(JSON.stringify({ at: now(), event, ...values }))
const required = (name) => { if (!process.env[name]) throw new Error(`Missing ${name}`); return process.env[name] }

export function args(argv = process.argv.slice(2)) {
  const flags = new Set(['--all-active', '--generate', '--publish', '--dry-run', '--help', '--single-pass', '--synthesize-only', '--existing-only', '--include-inactive'])
  const values = new Set(['--slug', '--locale', '--locales', '--run', '--python', '--device', '--limit', '--concurrency', '--requests-per-second', '--queue-file'])
  const result = {}
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (flags.has(key)) result[key.slice(2)] = true
    else if (values.has(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) result[key.slice(2)] = argv[++i]
    else throw new Error(`Unknown or incomplete argument: ${key}`)
  }
  if (result.help) return result
  if (result['synthesize-only']) {
    if (result.publish) throw new Error('--synthesize-only cannot publish unverified audio')
    if (!result['dry-run']) result.generate = true
  }
  if (result['existing-only'] && (!result.publish || result.generate || result['synthesize-only'])) throw new Error('--existing-only requires --publish without generation')
  if (Boolean(result.slug) === Boolean(result['all-active'])) throw new Error('Specify exactly one of --slug <slug> or --all-active')
  if (result.locale && result.locales) throw new Error('Use --locale or --locales, not both')
  result.locales = [...new Set((result.locales || result.locale || 'ko,en').split(','))]
  if (result.locales.some((locale) => !['ko', 'en'].includes(locale))) throw new Error('Locales must be ko and/or en')
  if (result['dry-run'] && (result.generate || result.publish)) throw new Error('--dry-run cannot be combined with --generate or --publish')
  result['dry-run'] ||= !result.generate && !result.publish
  result.run = resolve(result.run || 'D:/audios/interview-cleaner/celeb-reading-voices')
  // 파서가 '--queue-file'을 result['queue-file']에 넣으므로 카멜케이스로 옮겨 둔다 — 이 줄이 없으면 큐가 조용히 무시된다
  if (result['queue-file']) result.queueFile = resolve(result['queue-file'])
  result.limit = result.limit ? Number(result.limit) : Infinity
  if (!(result.limit > 0) || (result.limit !== Infinity && !Number.isInteger(result.limit))) throw new Error('--limit must be a positive integer (number of people)')
  result.concurrency = Number(result.concurrency || 1)
  const maxConcurrency = result['synthesize-only'] ? 16 : 3
  if (!Number.isInteger(result.concurrency) || result.concurrency < 1 || result.concurrency > maxConcurrency) throw new Error(`--concurrency must be between 1 and ${maxConcurrency}`)
  result.requestsPerSecond = Number(result['requests-per-second'] || 1)
  if (!Number.isFinite(result.requestsPerSecond) || result.requestsPerSecond < 0.25 || result.requestsPerSecond > 20) throw new Error('--requests-per-second must be between 0.25 and 20')
  return result
}

export function speedPlan(text, locale, duration) {
  if (!(duration > 0) || !Number.isFinite(duration)) throw new Error('Invalid measured audio duration')
  const count = locale === 'ko' ? [...text.replace(/\s/gu, '')].length : (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length
  const policy = SPEED_POLICY[locale]
  const rate = count / duration * (locale === 'en' ? 60 : 1)
  if (!count || !policy) throw new Error('Unable to measure narration speed')
  const requiredTempo = policy.target / rate
  const targetDuration = count / policy.target * (locale === 'en' ? 60 : 1)
  const tempoWithPadding = duration / Math.max(0.01, targetDuration - SPEED_POLICY.encoderPaddingSeconds)
  return { count, duration, rate, target: policy.target, unit: policy.unit, requiredTempo, tempo: rate >= policy.target ? 1 : Math.min(SPEED_POLICY.maxTempo, Math.max(policy.margin / rate, tempoWithPadding)), status: rate >= policy.target ? 'preserve' : requiredTempo > SPEED_POLICY.maxTempo ? 'speed-too-slow' : 'speed-up' }
}

async function measuredSpeed(text, locale, file) {
  const duration = Number((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file])).trim())
  return speedPlan(text, locale, duration)
}

async function encodeMp3(source, output, tempo = 1) {
  await run('ffmpeg', ['-nostdin', '-n', '-hide_banner', '-loglevel', 'error', '-i', source, ...(tempo === 1 ? [] : ['-af', `atempo=${tempo.toFixed(8)}`]), '-ac', '1', '-ar', '24000', '-c:a', MP3_SETTINGS.codec, '-b:a', MP3_SETTINGS.bitrate, output])
}

export async function reusableSynthesis(entry, processingHash) {
  if (!entry.synthesisCompletedAt) return null
  const attempt = entry.attempts.find((item) => item.synthesisCompletedAt && item.synthesisProcessingHash === processingHash && item.synthesisMp3 && item.synthesisSpeed)
  if (!attempt || !await exists(attempt.synthesisMp3)) return null
  if (!attempt.wav || !await adoptAttemptWav(attempt, attempt.wav)) throw new Error('Completed synthesis WAV is missing; preserve the run for diagnosis')
  if (sha(await readFile(attempt.synthesisMp3)) !== attempt.synthesisMp3Hash) throw new Error('Synthesis candidate MP3 hash mismatch; preserve the original for diagnosis')
  return { candidate: attempt.synthesisMp3, speed: attempt.synthesisSpeed, flags: attempt.synthesisFlags || [] }
}

export async function synthesizeEntry(row, entry, options, gemini, checkpoint) {
  const reused = await reusableSynthesis(entry, options.processingHash)
  if (reused) return reused
  const preservedStatus = ['published', 'held'].includes(entry.status) ? entry.status : null
  const directory = join(options.run, row.id, row.locale)
  await mkdir(directory, { recursive: true })
  let attempt = entry.attempts.find((a) => a.wav && a.status === 'passed') || entry.attempts.find((a) => a.wav) || entry.attempts.find((a) => !a.wav)
  if (!attempt) {
    attempt = { number: entry.attempts.length + 1, startedAt: now() }
    entry.attempts.push(attempt)
  }
  await checkpoint()
  const wav = join(directory, `attempt-${attempt.number}.wav`)
  if (!await adoptAttemptWav(attempt, wav)) {
    // A single successful waveform is the first-pass boundary, including across process restarts.
    if (entry.attempts.some((a) => a.wav) || entry.singlePassGenerationUsed) throw new Error('An earlier generated WAV is missing; preserve the run for diagnosis')
    await writeFile(wav, await gemini.generate(row.text, row.locale), { flag: 'wx' })
    await adoptAttemptWav(attempt, wav)
    entry.singlePassGenerationUsed = true
    attempt.synthesizedAt = now()
    await checkpoint()
  }
  let candidate = attempt.synthesisMp3
  if (candidate && attempt.synthesisProcessingHash === options.processingHash && await exists(candidate)) {
    if (sha(await readFile(candidate)) !== attempt.synthesisMp3Hash) throw new Error('Synthesis candidate MP3 hash mismatch; preserve the original for diagnosis')
  } else {
    const originalSpeed = await measuredSpeed(row.text, row.locale, attempt.wav)
    const tempo = originalSpeed.status === 'speed-too-slow' ? 1 : originalSpeed.tempo
    candidate = join(directory, `attempt-${attempt.number}-synthesis-${Date.now()}.mp3`)
    await encodeMp3(attempt.wav, candidate, tempo)
    await run('ffmpeg', ['-nostdin', '-v', 'error', '-i', candidate, '-f', 'null', '-'])
    attempt.synthesisMp3 = candidate
    attempt.synthesisMp3Hash = sha(await readFile(candidate))
    attempt.synthesisProcessingHash = options.processingHash
    attempt.synthesisOriginalSpeed = originalSpeed
    attempt.synthesisTempo = tempo
  }
  attempt.synthesisSpeed = await measuredSpeed(row.text, row.locale, candidate)
  attempt.synthesisFlags = attempt.synthesisOriginalSpeed?.status === 'speed-too-slow'
    ? ['speed-too-slow'] : attempt.synthesisSpeed.rate < attempt.synthesisSpeed.target ? ['speed-rounding'] : []
  attempt.synthesisCompletedAt = now()
  entry.synthesisCompletedAt = now()
  entry.status = preservedStatus || 'generated'
  delete entry.synthesisError
  await checkpoint()
  return { candidate, speed: attempt.synthesisSpeed, flags: attempt.synthesisFlags }
}

export async function environment() {
  // Only explicitly named FREE keys are accepted; no generic Gemini/paid fallbacks.
  const free = new Map()
  for (const relative of ['sw/remotion/.env', 'sw/web-bo/.env']) {
    const path = join(ROOT, relative)
    if (!await exists(path)) continue
    for (const [key, value] of Object.entries(parseEnv(await readFile(path, 'utf8')))) {
      if (/^GOOGLE_GENAI_API_KEY_FREE\d*$/.test(key) && value) free.set(key, value)
      if (!process.env[key]) process.env[key] = value
    }
  }
  return [...new Set([...free.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([, value]) => value))]
}

export async function targets(db, options) {
  if (options.queueFile && await exists(options.queueFile)) {
    const handoff = JSON.parse(await readFile(options.queueFile, 'utf8'))
    const items = Array.isArray(handoff.items) ? handoff.items : []
    options.queueSelection = Number.isInteger(handoff.selected) ? handoff.selected : items.length
    if (!items.length) return []
    const ids = [...new Set(items.map((item) => item.id).filter(Boolean))]
    const people = []
    for (let offset = 0; offset < ids.length; offset += 100) {
      let query = db.from('celebs').select('id,slug,nickname,voice_v').in('id', ids.slice(offset, offset + 100))
      query = options['include-inactive'] ? query.in('publication_status', ['active', 'inactive']) : query.eq('publication_status', 'active')
      const { data, error } = await query
      if (error) throw new Error(`Target queue query failed: ${error.message}`)
      people.push(...data)
    }
    const peopleById = new Map(people.map((person) => [person.id, person]))
    const rows = []
    const explanations = new Map()
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { data, error } = await db.from('celeb_explanations').select('profile_id,plain_text,plain_text_en').in('profile_id', ids.slice(offset, offset + 100))
      if (error) throw new Error(`Reading queue query failed: ${error.message}`)
      for (const explanation of data) explanations.set(explanation.profile_id, explanation)
    }
    for (const item of items) {
      const celeb = peopleById.get(item.id)
      if (!celeb || !options.locales.includes(item.locale)) continue
      const source = explanations.get(item.id)?.[item.locale === 'ko' ? 'plain_text' : 'plain_text_en']
      const text = typeof source === 'string' ? source.trim() : ''
      rows.push({ id: celeb.id, slug: celeb.slug, nickname: celeb.nickname, locale: item.locale, text, sourceHash: sha(text) })
    }
    return rows
  }
  const people = []
  for (let offset = 0; ; offset += 500) {
    let query = db.from('celebs').select('id,slug,nickname,voice_v').order('id').range(offset, offset + 499)
    query = options['include-inactive'] ? query.in('publication_status', ['active', 'inactive']) : query.eq('publication_status', 'active')
    if (options.slug) query = query.eq('slug', options.slug)
    const { data, error } = await query
    if (error) throw new Error(`Target query failed: ${error.message}`)
    people.push(...data)
    if (data.length < 500 || people.length >= options.limit) break
  }
  if (!people.length) throw new Error('No matching active people')
  const selected = people.slice(0, options.limit)
  const rows = []
  for (let offset = 0; offset < selected.length; offset += 100) {
    const batch = selected.slice(offset, offset + 100)
    const { data, error } = await db.from('celeb_explanations').select('profile_id,plain_text,plain_text_en').in('profile_id', batch.map((p) => p.id))
    if (error) throw new Error(`Reading query failed: ${error.message}`)
    const sources = new Map(data.map((r) => [r.profile_id, r]))
    for (const celeb of batch) for (const locale of options.locales) {
      const source = sources.get(celeb.id)?.[locale === 'ko' ? 'plain_text' : 'plain_text_en']
      const text = typeof source === 'string' ? source.trim() : ''
      rows.push({ id: celeb.id, slug: celeb.slug, nickname: celeb.nickname, locale, text, sourceHash: sha(text) })
    }
  }
  return rows
}

export function pcmToWav(pcm, sampleRate = 24000) {
  if (pcm.length < 4800 || pcm.length % 2) throw new Error('Gemini returned invalid or empty PCM audio')
  const h = Buffer.alloc(44)
  h.write('RIFF'); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28)
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

export function isQualityFailure(message = '') {
  return /^(?:QC regenerate:|Final MP3 QC regenerate:|speed-too-slow:|speed-rounding:)/.test(message)
    || /^(?:QC|Final MP3 QC) error: insufficient-alignment-frames:\s*1$/.test(message)
}

export function qcFailure(result, label = 'QC') {
  return `${label} ${result.status}: ${result.status === 'error' && result.error ? result.error : (result.flags || []).join(', ')}`
}

export function verifiedPublished(entry) {
  return entry.status === 'published' && entry.finalQcHash === entry.mp3Hash && entry.qc?.ok === true && ['passed', 'repaired'].includes(entry.qc.status)
}

export function reusableAttempt(attempt, qcScriptHash, processingHash) {
  if (!attempt.wav) return false
  if (attempt.qcScriptHash !== qcScriptHash || attempt.processingHash !== processingHash) return true
  // Raw QC has completed in these checkpoints, but encoding/final QC may still be unfinished.
  // A terminal content rejection must wait for the later retry pass instead of looping now.
  return attempt.status !== 'passed' && !(attempt.status === 'failed' && isQualityFailure(attempt.error))
}

function validateSavedWav(body) {
  const invalid = () => { throw new Error('SAVED_WAV_INVALID: preserve the existing file for diagnosis; no new synthesis requested') }
  if (body.length < 44 || body.toString('ascii', 0, 4) !== 'RIFF' || body.toString('ascii', 8, 12) !== 'WAVE' || body.readUInt32LE(4) !== body.length - 8) invalid()
  let formatFound = false
  let dataFound = false
  let offset = 12
  while (offset + 8 <= body.length) {
    const kind = body.toString('ascii', offset, offset + 4)
    const size = body.readUInt32LE(offset + 4)
    const start = offset + 8
    if (start + size > body.length) invalid()
    if (kind === 'fmt ') {
      if (size < 16 || body.readUInt16LE(start) !== 1 || body.readUInt16LE(start + 2) !== 1 || body.readUInt32LE(start + 4) !== 24000 || body.readUInt32LE(start + 8) !== 48000 || body.readUInt16LE(start + 12) !== 2 || body.readUInt16LE(start + 14) !== 16) invalid()
      formatFound = true
    }
    if (kind === 'data') { if (size < 4800 || size % 2) invalid(); dataFound = true }
    offset = start + size + (size % 2)
  }
  if (!formatFound || !dataFound || offset !== body.length) invalid()
}

export async function adoptAttemptWav(attempt, expectedPath) {
  const path = attempt.wav || expectedPath
  let body
  try { body = await readFile(path) }
  catch (error) { if (error.code === 'ENOENT' && !attempt.wav) return false; throw error }
  validateSavedWav(body)
  const hash = sha(body)
  if (attempt.wavHash && attempt.wavHash !== hash) throw new Error('Saved WAV hash mismatch; preserve the original file for diagnosis')
  attempt.wav = path
  attempt.wavHash = hash
  return true
}

export class RequestPacer {
  constructor(requestsPerSecond = 1, sleep = delay, clock = Date.now) { this.interval = 1000 / requestsPerSecond; this.nextAt = 0; this.sleep = sleep; this.clock = clock }
  async wait() {
    const now_ = this.clock()
    const start = Math.max(now_, this.nextAt)
    this.nextAt = start + this.interval
    if (start > now_) await this.sleep(start - now_)
  }
}

export function safeApiError(status, responseBody, keys) {
  let parsed
  try { parsed = JSON.parse(responseBody) } catch { parsed = null }
  let message = String(parsed?.error?.message || 'No structured error message')
  for (const key of keys) if (key) message = message.split(key).join('[REDACTED]')
  message = message.replace(/AIza[A-Za-z0-9_-]+/g, '[REDACTED]').replace(/[\r\n]+/g, ' ').slice(0, 500)
  const code = String(parsed?.error?.status || parsed?.error?.code || status).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60)
  let diagnostic = `Gemini HTTP ${status} ${code}: ${message}`
  for (const key of keys) if (key) diagnostic = diagnostic.split(key).join('[REDACTED]')
  return diagnostic.replace(/AIza[A-Za-z0-9_-]+/g, '[REDACTED]')
}

export function parseQuotaResponse(status, responseBody, retryAfter, keys = [], observedAt = Date.now()) {
  let details = []
  try { details = JSON.parse(responseBody)?.error?.details || [] } catch { /* Unstructured limits remain unknown. */ }
  if (!Array.isArray(details)) details = []
  const safeIdentifier = (value) => {
    let text = String(value || '')
    for (const key of keys) if (key) text = text.split(key).join('REDACTED')
    return text.replace(/AIza[A-Za-z0-9_-]+/g, 'REDACTED').replace(/[^A-Za-z0-9_./:-]/g, '').slice(0, 200)
  }
  const violations = details.filter((detail) => /[/.]QuotaFailure$/.test(String(detail?.['@type'] || ''))).flatMap((detail) => Array.isArray(detail.violations) ? detail.violations : []).slice(0, 24)
  const quotaIds = [...new Set(violations.map((item) => safeIdentifier(item.quotaId)).filter(Boolean))]
  const quotaMetrics = [...new Set(violations.map((item) => safeIdentifier(item.quotaMetric)).filter(Boolean))]
  const retryInfo = details.find((detail) => /[/.]RetryInfo$/.test(String(detail?.['@type'] || '')))?.retryDelay
  let retryDelayMs = typeof retryInfo === 'string' && /^\d+(?:\.\d+)?s$/.test(retryInfo) ? Number(retryInfo.slice(0, -1)) * 1000
    : retryInfo && typeof retryInfo === 'object' ? (Number(retryInfo.seconds || 0) * 1000 + Number(retryInfo.nanos || 0) / 1e6) : 0
  const headerMs = retryAfter ? (/^\d+(?:\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - observedAt) : 0
  retryDelayMs = Math.max(Number.isFinite(retryDelayMs) ? retryDelayMs : 0, Number.isFinite(headerMs) ? headerMs : 0, 0)
  const identifiers = [...quotaIds, ...quotaMetrics].join(' ')
  const kind = /per[_-]?day|daily/i.test(identifiers) ? 'daily'
    : /per[_-]?minute|per[_-]?min\b/i.test(identifiers) ? 'minute' : status === 429 ? 'unknown-429' : 'forbidden'
  return { status, kind, quotaIds, quotaMetrics, retryDelayMs, observedAt: new Date(observedAt).toISOString() }
}

export function nextPacificResetAt(clock = Date.now()) {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
  const parts = (time) => Object.fromEntries(formatter.formatToParts(new Date(time)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
  const current = parts(clock)
  const wallMidnight = Date.UTC(current.year, current.month - 1, current.day + 1)
  let instant = wallMidnight + 8 * 60 * 60 * 1000
  for (let iteration = 0; iteration < 3; iteration++) {
    const local = parts(instant)
    const delta = wallMidnight - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
    instant += delta
    if (delta === 0) break
  }
  return instant + 2 * 60 * 1000
}

export function summarizeQuota(observations, disabledCount = 0, clock = Date.now()) {
  const records = [...observations]
  const keyCounts = { daily: 0, minute: 0, 'unknown-429': 0, forbidden: 0, invalid: disabledCount }
  for (const item of records) keyCounts[item.kind]++
  const kind = keyCounts.minute ? 'minute' : keyCounts['unknown-429'] ? 'unknown-429' : keyCounts.daily ? 'daily' : 'unavailable'
  const recoverable = records.filter((item) => item.kind === kind)
  const retryAfterMs = recoverable.length ? Math.max(0, Math.min(...recoverable.map((item) => (item.cooldownUntil || clock + KEY_COOLDOWN_MS) - clock))) : 0
  return { kind, keyCounts, retryAfterMs, quotaIds: [...new Set(records.flatMap((item) => item.quotaIds))], quotaMetrics: [...new Set(records.flatMap((item) => item.quotaMetrics))], observedAt: new Date(clock).toISOString() }
}

export async function renameCheckpoint(source, target, { renameFile = rename, sleep = delay } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await renameFile(source, target) }
    catch (error) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 7) throw error
      await sleep(Math.min(50 * 2 ** attempt, 1000))
    }
  }
}

export async function archiveQcReport(report, runDirectory, verified = new Map()) {
  if (!report || !['words', 'transcript', 'pauses'].some((key) => Object.hasOwn(report, key))) return report
  const body = JSON.stringify(report) + '\n'
  const reportHash = sha(body)
  let reportPath = verified.get(reportHash)
  if (!reportPath) {
    const directory = join(runDirectory, 'qc-reports')
    await mkdir(directory, { recursive: true })
    reportPath = join(directory, `${reportHash}.json`)
    try { await writeFile(reportPath, body, { flag: 'wx' }) }
    catch (error) { if (error.code !== 'EEXIST') throw error }
    if (sha(await readFile(reportPath)) !== reportHash) throw new Error('QC_REPORT_HASH_MISMATCH: preserve the inline report and archive for diagnosis')
    verified.set(reportHash, reportPath)
  }
  const compact = { ...report, reportPath, reportHash }
  // Preserve every other field, including unknown future QC fields and publication/resume checks.
  delete compact.words; delete compact.transcript; delete compact.pauses
  return compact
}

export async function compactManifestQc(manifest, runDirectory) {
  const verified = new Map()
  let compacted = 0
  for (const entry of Object.values(manifest.entries || {})) {
    for (const item of [entry, ...(entry.attempts || [])]) {
      for (const key of ['qc', 'finalQc']) {
        const compact = await archiveQcReport(item[key], runDirectory, verified)
        if (compact !== item[key]) { item[key] = compact; compacted++ }
      }
    }
  }
  return { compacted, reports: verified.size }
}

export class Gemini {
  constructor(keys, requestsPerSecond = 1) { this.keys = keys; this.next = 0; this.cooldowns = new Map(); this.disabled = new Set(); this.quotaObservations = new Map(); this.pacer = new RequestPacer(requestsPerSecond) }
  async generate(text, locale, paceRetry = false) {
    // Each request may inspect each configured key once, then stops. Never loops overnight.
    keyLoop: for (let tried = 0; tried < this.keys.length; tried++) {
      const index = this.next++ % this.keys.length
      if (this.disabled.has(index) || (this.cooldowns.get(index) || 0) > Date.now()) continue
      let response
      for (let retry = 0; retry <= MAX_TRANSIENT_RETRIES; retry++) {
        await this.pacer.wait()
        if (this.disabled.has(index)) continue keyLoop
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.keys[index] },
          body: JSON.stringify({ contents: [{ parts: [{ text: (paceRetry ? (locale === 'ko' ? '문장 사이를 길게 끌지 말고 초당 약 6자 이상 속도로 명료하게 읽어 주세요.\n' : 'Use a clear, flowing pace of at least 156 words per minute, without drawn-out pauses.\n') : '') + PROMPTS[locale] + text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        if (!TRANSIENT_HTTP_STATUSES.has(response.status) || retry === MAX_TRANSIENT_RETRIES) break
        await response.body?.cancel()
        log('transient-retry', { keyIndex: index + 1, status: response.status, retry: retry + 1 })
        await delay(TRANSIENT_BACKOFF_MS * (2 ** retry))
      }
      if ([403, 429].includes(response.status)) {
        const quota = parseQuotaResponse(response.status, await response.text(), response.headers.get('retry-after'), this.keys)
        const cooldownUntil = quota.kind === 'daily' ? nextPacificResetAt() : Date.now() + Math.max(KEY_COOLDOWN_MS, quota.retryDelayMs)
        this.cooldowns.set(index, cooldownUntil)
        this.quotaObservations.set(index, { ...quota, cooldownUntil })
        log('key-cooldown', { keyIndex: index + 1, ...quota, nextEligibleAt: new Date(cooldownUntil).toISOString() })
        continue
      }
      if (!response.ok) {
        const responseBody = await response.text()
        if (response.status === 400) {
          let error
          try { error = JSON.parse(responseBody).error } catch { error = null }
          const invalidKey = /^API key not valid\. Please pass a valid API key\.?$/i.test(String(error?.message || '').trim())
            || (Array.isArray(error?.details) && error.details.some((detail) => detail.reason === 'API_KEY_INVALID'))
          if (invalidKey) {
            this.disabled.add(index)
            this.quotaObservations.delete(index)
            log('key-disabled', { keyIndex: index + 1, status: 400, reason: 'API_KEY_INVALID' })
            continue
          }
        }
        throw new Error(safeApiError(response.status, responseBody, this.keys))
      }
      const result = await response.json()
      this.quotaObservations.delete(index)
      if (result.candidates?.[0]?.finishReason !== 'STOP') throw new Error(`Gemini did not finish normally: ${result.candidates?.[0]?.finishReason || 'missing finishReason'}`)
      const parts = result.candidates?.[0]?.content?.parts || []
      const audio = parts.filter((part) => part.inlineData?.data).map((part) => part.inlineData)
      if (!audio.length) throw new Error('Gemini returned no audio')
      if (audio.some((part) => !/^audio\/L16(?:;|$)/i.test(part.mimeType || ''))) throw new Error('Gemini returned unsupported audio encoding')
      const rates = audio.map((part) => Number(/rate=(\d+)/i.exec(part.mimeType)?.[1] || 24000))
      if (rates.some((rate) => rate !== rates[0])) throw new Error('Gemini returned mixed sample rates')
      return pcmToWav(Buffer.concat(audio.map((part) => Buffer.from(part.data, 'base64'))), rates[0])
    }
    const quota = summarizeQuota(this.quotaObservations.values(), this.disabled.size)
    log('quota-exhausted', { quota })
    throw Object.assign(new Error(`FREE_KEYS_EXHAUSTED: ${quota.kind}; checkpoint saved`), { quota })
  }
}

function run(command, arguments_, timeout = 120_000) {
  return new Promise((done, reject) => {
    const child = spawn(command, arguments_, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    let stdout = ''
    child.stdout.on('data', (value) => { stdout = (stdout + value.toString()).slice(-100_000) })
    child.stderr.on('data', (value) => { stderr = (stderr + value.toString()).slice(-3000) })
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${command} timed out`)) }, timeout)
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.on('close', (code) => { clearTimeout(timer); if (code === 0) done(stdout); else reject(new Error(`${command} exited ${code}: ${stderr}`)) })
  })
}

class QcWorker {
  constructor(options) {
    const command = options.python || 'py'
    const prefix = options.python ? [] : ['-3']
    this.child = spawn(command, [...prefix, QC_SCRIPT, '--worker', '--device', options.device || 'auto'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    this.failure = null
    this.pending = null
    this.child.stderr.on('data', (value) => process.stderr.write(value))
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      if (!this.pending) return
      try { const result = JSON.parse(line); this.pending.resolve(result) }
      catch { this.pending.reject(new Error('QC worker returned invalid JSON')) }
      this.pending = null
    })
    const fail = (error) => { this.failure = error; this.pending?.reject(error); this.pending = null }
    this.child.on('error', fail)
    this.child.on('close', (code) => fail(new Error(`QC worker exited ${code}`)))
  }
  check(input) {
    if (this.failure) return Promise.reject(this.failure)
    return new Promise((resolve_, reject_) => {
      const timer = setTimeout(() => { this.child.kill(); reject_(new Error('QC worker timed out')) }, QC_TIMEOUT_MS)
      this.pending = { resolve: (value) => { clearTimeout(timer); resolve_(value) }, reject: (error) => { clearTimeout(timer); reject_(error) } }
      this.child.stdin.write(JSON.stringify(input) + '\n')
    })
  }
  close() { this.child.stdin.end(); this.child.kill() }
}

export async function currentSource(db, row, options) {
  const [{ data: celeb, error: a }, { data: reading, error: b }] = await Promise.all([
    db.from('celebs').select('id,slug,voice_v,publication_status').eq('id', row.id).single(),
    db.from('celeb_explanations').select('plain_text,plain_text_en').eq('profile_id', row.id).single(),
  ])
  if (a || b) throw new Error('Could not recheck current DB source')
  const statuses = options?.['include-inactive'] ? ['active', 'inactive'] : ['active']
  if (!statuses.includes(celeb.publication_status) || celeb.slug !== row.slug || sha((reading[row.locale === 'ko' ? 'plain_text' : 'plain_text_en'] || '').trim()) !== row.sourceHash) throw new Error('STALE_SOURCE: current DB text/identity/publication differs; regenerate from current source')
  return celeb
}

export async function publish(db, r2, row, entry, options, checkpoint, helpers, qc) {
  const body = await readFile(entry.mp3)
  if (body.length < 1024 || sha(body) !== entry.mp3Hash || !['passed', 'repaired'].includes(entry.qc?.status) || !entry.qc?.ok) throw new Error('Publish requires an intact QC-passed MP3')
  if (options.processingHash && (entry.processingHash !== options.processingHash || entry.speed?.rate < SPEED_POLICY[row.locale].target)) throw new Error('Publish requires current speed-verified processing')
  if (!verifiedPublished(entry) && (entry.finalQcHash !== entry.mp3Hash || entry.qcScriptHash !== options.qcScriptHash)) {
    const result = await qc.check({ id: `${row.id}/${row.locale}`, audio: entry.mp3, text: row.text, locale: row.locale })
    entry.finalQc = await archiveQcReport(result, options.run)
    if (!result.ok || result.status !== 'passed') { await checkpoint(); throw new Error(qcFailure(result, 'Final MP3 QC')) }
    entry.finalQcHash = entry.mp3Hash
    entry.qcScriptHash = options.qcScriptHash
    await checkpoint()
  }
  await currentSource(db, row, options)
  const key = helpers.voiceR2Key(row.id, row.locale, helpers.voiceFileName('reading'))
  const bucket = required('R2_BUCKET_NAME')
  const send = (command) => r2.send(command, { abortSignal: AbortSignal.timeout(60_000) })
  const get = async () => {
    try { const object = await send(new GetObjectCommand({ Bucket: bucket, Key: key })); return { body: Buffer.from(await object.Body.transformToByteArray()), contentType: object.ContentType, cacheControl: object.CacheControl, metadata: object.Metadata, etag: object.ETag } }
    catch (error) { if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null; throw error }
  }
  // On resume, verify the remote object too; never trust a local published marker alone.
  const previous = await get()
  const remoteMatches = previous && sha(previous.body) === entry.mp3Hash
  const publishTiming = async (audioEtag) => {
    try { entry.timing = await publishReadingTiming(r2, entry, options, undefined, { audioEtag }) }
    catch (error) { entry.timing = { status: 'failed', error: error.message, attemptedAt: now() }; log('timing-publish-failed', { id: row.id, locale: row.locale, error: error.message }) }
    await checkpoint()
  }
  if (entry.status === 'published' && remoteMatches) {
    await publishTiming(previous.etag)
    if (!entry.revalidatedAt) { await helpers.revalidateWebCeleb(row.id, row.slug); entry.revalidatedAt = now(); await checkpoint() }
    return
  }
  if (previous && !remoteMatches) {
    const backup = join(options.run, '_backup', row.id, row.locale, `${Date.now()}-reading.mp3`)
    await mkdir(dirname(backup), { recursive: true })
    await writeFile(backup, previous.body, { flag: 'wx' })
    await writeFile(`${backup}.json`, JSON.stringify({ key, contentType: previous.contentType, cacheControl: previous.cacheControl, metadata: previous.metadata, sha256: sha(previous.body) }, null, 2))
    entry.backup = backup
    await checkpoint()
  }
  let versionUpdateStarted = false
  try {
    if (!remoteMatches) await send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable', Metadata: { 'source-sha256': row.sourceHash, 'audio-sha256': entry.mp3Hash, 'settings-sha256': entry.settingsHash } }))
    const uploaded = await get()
    if (!uploaded || sha(uploaded.body) !== entry.mp3Hash) throw new Error('R2 uploaded SHA-256 mismatch')
    const base = required('R2_PUBLIC_URL').replace(/\/$/, '')
    const verify = await fetch(`${base}/${key}?verify=${entry.mp3Hash}`, { signal: AbortSignal.timeout(60_000), cache: 'no-store' })
    if (!verify.ok || sha(Buffer.from(await verify.arrayBuffer())) !== entry.mp3Hash) throw new Error('Public MP3 verification failed')
    entry.status = 'uploaded'; entry.key = key; await checkpoint()
    let version
    for (let attempt = 0; attempt < 8; attempt++) {
      const celeb = await currentSource(db, row, options)
      version = (celeb.voice_v || 0) + 1
      let query = db.from('celebs').update({ voice_v: version }).eq('id', row.id)
      query = celeb.voice_v == null ? query.is('voice_v', null) : query.eq('voice_v', celeb.voice_v)
      versionUpdateStarted = true
      const { data, error } = await query.select('voice_v')
      if (error) throw new Error(`voice_v update uncertain: ${error.message}`)
      if (data?.length) break
      if (attempt === 7) throw new Error('voice_v changed concurrently too often; resume to retry')
    }
    entry.status = 'published'; entry.publishedAt = now(); entry.voiceVersion = version
    entry.publicUrl = `${base}/${key}?v=${version}`
    await checkpoint()
    await publishTiming(uploaded.etag)
    await helpers.revalidateWebCeleb(row.id, row.slug)
    entry.revalidatedAt = now(); await checkpoint()
  } catch (error) {
    // A DB request may have committed before a network failure; do not roll that back blindly.
    if (!versionUpdateStarted && !remoteMatches) {
      if (previous) await send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: previous.body, ContentType: previous.contentType, CacheControl: previous.cacheControl, Metadata: previous.metadata }))
      else await send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      entry.status = 'ready'
    }
    throw error
  }
}

async function main() {
  const options = args()
  if (options.help) { console.log('node --import tsx scripts/celeb/reading-voice.mjs (--slug SLUG | --all-active) [--locales ko,en] [--dry-run | --generate | --synthesize-only] [--single-pass] [--publish] [--concurrency N (max16 synth-only,3 QC)] [--requests-per-second 1] [--run DIR] [--python EXE] [--device auto|cuda|cpu] [--limit PEOPLE]'); return }
  const keys = await environment()
  const db = createClient(required('NEXT_PUBLIC_DB_API_URL'), required('DB_SECRET_KEY'), { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(60_000) }) } })
  let rows = await targets(db, options)
  const selectionTotal = Number.isInteger(options.queueSelection) ? options.queueSelection : rows.length
  const missing = rows.filter((row) => !row.text)
  log('preflight', { people: selectionTotal / options.locales.length, files: selectionTotal, queuedFiles: rows.length, locales: options.locales, missingTexts: missing.length, freeKeys: keys.length, run: options.run, dryRun: options['dry-run'], concurrency: options.concurrency, requestsPerSecond: options.requestsPerSecond, synthesizeOnly: Boolean(options['synthesize-only']), singlePass: Boolean(options['single-pass']), queueFile: options.queueFile || null, preview: rows.slice(0, 4).map(({ text, ...row }) => ({ ...row, characters: text.length })) })
  if (missing.length) throw new Error(`Missing source texts: ${missing.map((row) => `${row.slug}/${row.locale}`).join(', ')}`)
  if (options['dry-run']) return
  if (options.generate && !keys.length) throw new Error('No explicitly named GOOGLE_GENAI_API_KEY_FREE keys in allowed env files')
  if (!options['synthesize-only']) await access(QC_SCRIPT)
  const settings = { model: MODEL, voice: VOICE, prompts: PROMPTS }
  const processing = { mp3: MP3_SETTINGS, speed: SPEED_POLICY }
  options.processingHash = sha(JSON.stringify(processing))
  if (!options['synthesize-only']) options.qcScriptHash = sha(await readFile(QC_SCRIPT))
  const settingsHash = sha(JSON.stringify(settings))
  await mkdir(options.run, { recursive: true })
  const lockPath = join(options.run, 'reading-voice.lock')
  let lock
  try { lock = await open(lockPath, 'wx') }
  catch { throw new Error(`Run is locked: ${lockPath}. Check that its recorded PID has stopped before removing a stale lock.`) }
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: now() }))
  const qcWorkers = []
  let r2
  try {
    const manifestPath = join(options.run, 'manifest.json')
    const manifest = await exists(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : { schemaVersion: 1, createdAt: now(), settings, settingsHash, entries: {} }
    // Early runs included QC code in settings. Migrate that checkpoint without regenerating audio.
    const previousSynthesisSettings = { ...manifest.settings }
    delete previousSynthesisSettings.qcScriptHash
    delete previousSynthesisSettings.mp3
    if (manifest.schemaVersion !== 1 || sha(JSON.stringify(previousSynthesisSettings)) !== settingsHash) throw new Error('Synthesis settings changed. Use a new --run directory to preserve old audio.')
    manifest.settings = settings; manifest.settingsHash = settingsHash
    manifest.processing = processing; manifest.processingHash = options.processingHash
    if (!options['synthesize-only']) manifest.qcScriptHash = options.qcScriptHash
    let checkpointTail = Promise.resolve()
    const checkpoint = () => {
      checkpointTail = checkpointTail.then(async () => {
        manifest.updatedAt = now()
        await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n')
        await renameCheckpoint(`${manifestPath}.tmp`, manifestPath)
      })
      return checkpointTail
    }
    const compactedQc = await compactManifestQc(manifest, options.run)
    if (compactedQc.compacted) { await checkpoint(); log('qc-reports-archived', compactedQc) }
    const gemini = new Gemini(keys, options.requestsPerSecond)
    if (options.generate || options.publish) await run('ffmpeg', ['-version'])
    let helpers
    if (options.publish) {
      for (const name of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL', 'CRON_SECRET', 'NEXT_PUBLIC_WEB_URL']) required(name)
      const voicePaths = await import('../../src/lib/voice-path.ts')
      const revalidation = await import('../../src/lib/revalidate-web.ts')
      helpers = { ...(voicePaths.default || voicePaths), ...(revalidation.default || revalidation) }
      if (helpers.voiceFileName('reading') !== 'reading.mp3') throw new Error('voice-path.ts reading slot is not available')
      r2 = new S3Client({ region: 'auto', endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`, credentials: { accessKeyId: required('R2_ACCESS_KEY_ID'), secretAccessKey: required('R2_SECRET_ACCESS_KEY') }, maxAttempts: 3 })
    }
    const selectedRows = rows
    let synthesisQueue = null
    if (options['synthesize-only']) {
      const queue = []
      let reused = 0
      let heldEntries = 0
      let publishedEntries = 0
      for (const row of selectedRows) {
        const entry = manifest.entries[`${row.id}/${row.locale}`]
        if (entry?.status === 'held') {
          heldEntries++
          continue
        }
        if (entry?.status === 'published') {
          publishedEntries++
          continue
        }
        if (entry && await reusableSynthesis(entry, options.processingHash)) {
          reused++
          continue
        }
        queue.push(row)
      }
      synthesisQueue = { schemaVersion: 1, selected: selectionTotal, queued: queue.length, reused, held: heldEntries, published: publishedEntries, order: 'celebs.id asc, locale ko then en', createdAt: now(), items: queue.map(({ id, slug, locale, sourceHash }) => ({ id, slug, locale, sourceHash })) }
      rows = queue
      const queuePath = options.queueFile || join(options.run, 'reading-voice-synthesis-queue.json')
      await writeFile(`${queuePath}.tmp`, JSON.stringify(synthesisQueue, null, 2) + '\n')
      await renameCheckpoint(`${queuePath}.tmp`, queuePath)
      await checkpoint()
      log('synthesis-queue-planned', { ...synthesisQueue, items: undefined })
    }
    let consecutiveFailures = 0
    let failed = 0
    let held = 0
    const processRow = async (index, qc) => {
      const row = rows[index]
      const id = `${row.id}/${row.locale}`
      let entry = manifest.entries[id]
      if (entry && entry.sourceHash !== row.sourceHash) throw new Error(`Source changed for ${row.slug}/${row.locale}; use a new run directory`)
      entry ||= manifest.entries[id] = { ...row, settingsHash, status: 'pending', attempts: [] }
      entry.settingsHash = settingsHash
      if (entry.generationBudgetHash !== options.processingHash) {
        entry.generationBaseline = entry.attempts.length
        entry.generationBudgetHash = options.processingHash
      }
      try {
        if (options['synthesize-only']) {
          if (entry.status === 'held') return
          const reused = await reusableSynthesis(entry, options.processingHash)
          if (reused) { consecutiveFailures = 0; return }
          await currentSource(db, row, options)
          log('synthesize', { progress: `${index + 1}/${rows.length}`, slug: row.slug, locale: row.locale })
          const result = await synthesizeEntry(row, entry, options, gemini, checkpoint)
          consecutiveFailures = 0
          log('synthesized', { progress: `${index + 1}/${rows.length}`, slug: row.slug, locale: row.locale, ...result })
          return
        }
        if (options['existing-only'] && !entry.mp3 && !entry.attempts.some((a) => a.wav)) {
          const orphanFiles = await Promise.all(entry.attempts.map((a) => exists(join(options.run, row.id, row.locale, `attempt-${a.number}.wav`))))
          if (!orphanFiles.some(Boolean)) { log('skipped-missing-audio', { slug: row.slug, locale: row.locale }); return }
        }
        if (options.publish && r2 && entry.status === 'published' && !entry.mp3 && !entry.attempts.some((a) => a.wav)) {
          // 로컬 원본이 사라진 등록분이다. R2에 음원이 살아 있으면 재생성하지 않고 넘긴다.
          const remoteKey = helpers.voiceR2Key(row.id, row.locale, helpers.voiceFileName('reading'))
          let remoteExists = false
          try {
            await r2.send(new HeadObjectCommand({ Bucket: required('R2_BUCKET_NAME'), Key: remoteKey }), { abortSignal: AbortSignal.timeout(30_000) })
            remoteExists = true
          } catch (error) {
            if (!['NoSuchKey', 'NotFound'].includes(error.name) && error.$metadata?.httpStatusCode !== 404) throw error
          }
          if (remoteExists) { log('remote-published', { progress: `${index + 1}/${rows.length}`, slug: row.slug, locale: row.locale, key: remoteKey }); return }
          entry.status = 'pending'
          await checkpoint()
        }
        if (entry.mp3 && entry.mp3Hash && sha(await readFile(entry.mp3)) !== entry.mp3Hash) throw new Error('Local MP3 hash mismatch; original run must be preserved')
        if (entry.mp3) {
          entry.speed = await measuredSpeed(row.text, row.locale, entry.mp3)
          if (entry.speed.status === 'preserve') entry.processingHash = options.processingHash
          else {
            entry.previousOutputs ||= []
            entry.previousOutputs.push({ mp3: entry.mp3, mp3Hash: entry.mp3Hash, speed: entry.speed, publicUrl: entry.publicUrl })
            entry.preferredAttempt = Number(/attempt-(\d+)/.exec(entry.mp3)?.[1])
            delete entry.mp3; delete entry.mp3Hash; delete entry.revalidatedAt
            entry.status = 'pending'
          }
          await checkpoint()
        }
        if (!entry.mp3 && (options.generate || options.publish)) {
          const directory = join(options.run, row.id, row.locale)
          await mkdir(directory, { recursive: true })
          let runAttempts = 0
          let freshSyntheses = 0
          const processingLimit = entry.attempts.length + MAX_ATTEMPTS
          while (runAttempts++ < processingLimit && !entry.mp3) {
            // Reuse paid-in-time synthesis after interruption or a QC correction.
            const reusable = entry.attempts.filter((a) => reusableAttempt(a, options.qcScriptHash, options.processingHash))
            let attempt = reusable.find((a) => a.number === entry.preferredAttempt) || reusable.find((a) => a.status === 'passed') || reusable.at(-1)
              || entry.attempts.find((a) => !a.wav)
            if (!attempt) {
              if (!options.generate || entry.attempts.length - entry.generationBaseline >= MAX_ATTEMPTS || (options['single-pass'] && (freshSyntheses >= 1 || entry.singlePassGenerationUsed || entry.attempts.some((a) => a.wav)))) break
              attempt = { number: entry.attempts.length + 1, startedAt: now() }
              entry.attempts.push(attempt)
            }
            attempt.status = 'processing'
            await checkpoint()
            try {
              log('generate', { progress: `${index + 1}/${rows.length}`, slug: row.slug, locale: row.locale, attempt: attempt.number })
              await currentSource(db, row, options)
              const wav = join(directory, `attempt-${attempt.number}.wav`)
              if (await adoptAttemptWav(attempt, wav)) {
                if (options['single-pass']) entry.singlePassGenerationUsed = true
                await checkpoint()
              } else {
                if (!options.generate || freshSyntheses >= MAX_ATTEMPTS || (options['single-pass'] && (freshSyntheses >= 1 || entry.singlePassGenerationUsed || entry.attempts.some((a) => a.wav)))) break
                freshSyntheses++
                const paceRetry = entry.attempts.some((a) => a.speed?.status === 'speed-too-slow')
                await writeFile(wav, await gemini.generate(row.text, row.locale, paceRetry), { flag: 'wx' })
                await adoptAttemptWav(attempt, wav)
                if (options['single-pass']) entry.singlePassGenerationUsed = true
                await checkpoint()
              }
              // Charon inhales between sentences. Mute breaths and tidy pauses on the WAV before any
              // encoding or QC; the -clean suffix keeps this to one pass per attempt across resumes.
              if (!/-(clean|nbt)\.wav$/i.test(attempt.wav)) {
                const cleaned = attempt.wav.replace(/\.wav$/i, '-clean.wav')
                await cleanVoiceFile(attempt.wav, cleaned, 'reading')
                attempt.wav = cleaned
                attempt.wavHash = sha(await readFile(cleaned))
                delete attempt.candidateMp3; delete attempt.candidateMp3Hash
                await checkpoint()
              }
              const revision = `${options.qcScriptHash.slice(0, 10)}-${Date.now()}`
              if (!attempt.candidateMp3) {
                attempt.candidateMp3 = join(directory, `attempt-${attempt.number}-${revision}-candidate.mp3`)
                await encodeMp3(attempt.wav, attempt.candidateMp3)
                attempt.candidateMp3Hash = sha(await readFile(attempt.candidateMp3)); await checkpoint()
              }
              const result = await qc.check({ id, audio: attempt.wav, text: row.text, locale: row.locale, output: join(directory, `attempt-${attempt.number}-${revision}-repaired.wav`) })
              attempt.qc = await archiveQcReport(result, options.run)
              attempt.qcScriptHash = options.qcScriptHash
              attempt.processingHash = options.processingHash
              await writeFile(join(directory, `attempt-${attempt.number}-${revision}-qc.json`), JSON.stringify(result, null, 2) + '\n')
              if (!result.ok || !['passed', 'repaired'].includes(result.status) || !result.audio) throw new Error(qcFailure(result))
              attempt.speed = await measuredSpeed(row.text, row.locale, result.audio)
              if (attempt.speed.status === 'speed-too-slow') throw new Error(`speed-too-slow: ${attempt.speed.rate.toFixed(3)} ${attempt.speed.unit}, required tempo ${attempt.speed.requiredTempo.toFixed(3)}`)
              const mp3 = join(directory, `attempt-${attempt.number}-${revision}.mp3`)
              await encodeMp3(result.audio, mp3, attempt.speed.tempo)
              await run('ffmpeg', ['-nostdin', '-v', 'error', '-i', mp3, '-f', 'null', '-'])
              const finalSpeed = await measuredSpeed(row.text, row.locale, mp3)
              if (finalSpeed.rate < finalSpeed.target) throw new Error(`speed-rounding: encoded audio ${finalSpeed.rate.toFixed(4)} below ${finalSpeed.target}`)
              const finalQc = await qc.check({ id, audio: mp3, text: row.text, locale: row.locale })
              attempt.finalQc = await archiveQcReport(finalQc, options.run)
              await writeFile(join(directory, `attempt-${attempt.number}-${revision}-mp3-qc.json`), JSON.stringify(finalQc, null, 2) + '\n')
              if (!finalQc.ok || finalQc.status !== 'passed') throw new Error(qcFailure(finalQc, 'Final MP3 QC'))
              entry.mp3 = mp3; entry.mp3Hash = sha(await readFile(mp3)); entry.qc = attempt.finalQc; entry.finalQc = attempt.finalQc; entry.finalQcHash = entry.mp3Hash; entry.qcScriptHash = options.qcScriptHash; entry.status = 'ready'
              entry.speed = finalSpeed; entry.appliedTempo = attempt.speed.tempo; entry.processingHash = options.processingHash
              delete entry.revalidatedAt
              attempt.status = 'passed'
            } catch (error) {
              attempt.status = 'failed'; attempt.error = error.message; entry.status = 'failed'; await checkpoint()
              if (error.message.includes('FREE_KEYS_EXHAUSTED') || qc.failure) throw error
              log('attempt-failed', { slug: row.slug, locale: row.locale, attempt: attempt.number, error: error.message })
              if (!options['single-pass']) await delay(2000)
            }
            await checkpoint()
          }
        }
        if (!entry.mp3) throw new Error(entry.attempts.at(-1)?.error || 'No generated MP3; use --generate first')
        if (options.generate && !verifiedPublished(entry) && (entry.finalQcHash !== entry.mp3Hash || entry.qcScriptHash !== options.qcScriptHash)) {
          const result = await qc.check({ id, audio: entry.mp3, text: row.text, locale: row.locale })
          entry.finalQc = await archiveQcReport(result, options.run)
          if (!result.ok || result.status !== 'passed') { await checkpoint(); throw new Error(qcFailure(result, 'Final MP3 QC')) }
          entry.finalQcHash = entry.mp3Hash; entry.qcScriptHash = options.qcScriptHash
          await checkpoint()
        }
        if (options.publish) await publish(db, r2, row, entry, options, checkpoint, helpers, qc)
        consecutiveFailures = 0
        log(entry.status, { progress: `${index + 1}/${rows.length}`, slug: row.slug, locale: row.locale, mp3: entry.mp3, publicUrl: entry.publicUrl })
      } catch (error) {
        const qualityHold = isQualityFailure(error.message)
        entry.lastError = error.message; entry.failedAt = now()
        if (options['synthesize-only']) {
          entry.synthesisError = error.message
          if (!['published', 'held'].includes(entry.status)) entry.status = 'failed'
        }
        if (qualityHold) { held++; entry.status = 'held'; consecutiveFailures = 0 }
        else { failed++; consecutiveFailures++ }
        await checkpoint()
        log(qualityHold ? 'held' : 'failed', { slug: row.slug, locale: row.locale, error: error.message })
        if (error.message.includes('FREE_KEYS_EXHAUSTED') || qc?.failure || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) throw error
      }
    }
    let nextIndex = 0
    let stopError
    await Promise.all(Array.from({ length: Math.min(options.concurrency, rows.length) }, async () => {
      const qc = options['synthesize-only'] ? null : new QcWorker(options)
      if (qc) qcWorkers.push(qc)
      try {
        while (!stopError) {
          const index = nextIndex++
          if (index >= rows.length) break
          try { await processRow(index, qc) }
          catch (error) { stopError ||= error }
        }
      } finally { qc?.close() }
    }))
    await checkpointTail
    if (stopError) throw stopError
    log('finished', { selected: selectionTotal, queued: synthesisQueue?.queued, failed, held, manifest: manifestPath })
    if (failed || held) process.exitCode = 1
  } finally {
    for (const qc of qcWorkers) qc.close()
    r2?.destroy(); await lock.close(); await unlink(lockPath)
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
