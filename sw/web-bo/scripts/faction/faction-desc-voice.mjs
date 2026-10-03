/**
 * Resumable KO/EN faction overview (faction_lv2.description) narration.
 * Same synthesis/QC/publish machinery as scripts/celeb/reading-voice.mjs, except
 * synthesis runs in sentence-bundle units stitched with paragraph-aware room-tone
 * gaps (the celeb-monologue-voice-generate.py design) — long overviews no longer
 * degrade toward the tail of one big synthesis call.
 *
 *   node --import tsx scripts/faction/faction-desc-voice.mjs --myth --dry-run
 *   node --import tsx scripts/faction/faction-desc-voice.mjs --myth --generate --publish
 *   node --import tsx scripts/faction/faction-desc-voice.mjs --slug myth-bible --locales ko --generate --publish
 *   node --import tsx scripts/faction/faction-desc-voice.mjs --all --generate --publish   (전체 세력)
 *
 * R2 key: factions/{id}/voice/{locale}/description.mp3 (+ description.json timing)
 * faction_lv2 has no voice_v column — cache busting uses ?v={mp3Hash prefix} and the
 * timing JSON doubles as the client-side "audio exists" manifest. No web revalidation:
 * screens fetch the fixed R2 paths directly.
 * --run selects the persistent local checkpoint directory. No writes in --dry-run.
 */
import { readFile, writeFile, mkdir, open, unlink, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@feelandnote/db'
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { cleanVoiceFile } from '@feelandnote/shared/bo/voice-cleanup'
import {
  QC_SCRIPT, MODEL, VOICE, PROMPTS, MAX_ATTEMPTS, MAX_CONSECUTIVE_FAILURES,
  SPEED_POLICY, MP3_SETTINGS, sha, now, delay, exists, log, required,
  measuredSpeed, encodeMp3, run, QcWorker, Gemini, environment,
  adoptAttemptWav, reusableAttempt, reusableSynthesis, synthesizeEntry,
  isQualityFailure, qcFailure, verifiedPublished,
  archiveQcReport, compactManifestQc, renameCheckpoint,
} from '../celeb/reading-voice.mjs'
import { publishReadingTiming } from '../celeb/reading-voice-timing.mjs'
import { buildUnits, stitchUnits, qcGapVerdict, decode, encodeWav, spawnBuffer } from './desc-unit-stitch.mjs'

const OBJECT_NAME = 'description'

/** 세력 개요 음성 R2 경로 단일 원천 — 웹 플레이어는 같은 규칙으로 URL을 만든다 */
export const factionDescR2Key = (id, locale) => `factions/${id}/voice/${locale}/${OBJECT_NAME}.mp3`
export const factionDescPublicUrl = (base, id, locale, audioHash) =>
  `${base.replace(/\/$/, '')}/${factionDescR2Key(id, locale)}${audioHash ? `?v=${String(audioHash).slice(0, 12)}` : ''}`

/** 합성 엔진은 유닛마다 다른 속도로 읽는다 — 파일 평균만 맞추면 재생 중 빠르기가
 *  흔들리므로, 각 유닛을 정책 목표 속도(한 6cps·영 156wpm)에 개별로 맞춘다.
 *  atempo를 통째로 걸면 문장 간 쉼도 압축되어 문장이 달라붙어 들리므로,
 *  발성 구간만 배속하고 쉼 구간은 원래 길이를 보존한다. */
export const UNIT_TEMPO_RANGE = [0.8, 1.25]
const SPEECH_TEMPO_LIMIT = [0.6, 1.5]
const PAUSE_RMS = 0.004
const PAUSE_MIN_SECONDS = 0.18
const ENV_WINDOW_SECONDS = 0.025
const ENV_HOP_SECONDS = 0.005

/** 유닛 PCM을 발성/쉼 구간으로 나눈다 — PAUSE_MIN 미만의 짧은 틈은 발성 리듬으로 흡수한다. */
export function speechPauseSpans(samples, rate) {
  const width = Math.round(rate * ENV_WINDOW_SECONDS)
  const hop = Math.round(rate * ENV_HOP_SECONDS)
  const minPauseFrames = Math.round(PAUSE_MIN_SECONDS / ENV_HOP_SECONDS)
  const voiced = []
  for (let i = 0; i + width <= samples.length; i += hop) {
    let sum = 0
    for (let j = i; j < i + width; j++) sum += samples[j] * samples[j]
    voiced.push(Math.sqrt(sum / width) >= PAUSE_RMS)
  }
  for (let i = 0; i < voiced.length; i++) {
    if (voiced[i]) continue
    let j = i
    while (j < voiced.length && !voiced[j]) j++
    if (j - i < minPauseFrames && i > 0 && j < voiced.length) for (let k = i; k < j; k++) voiced[k] = true
    i = j
  }
  const spans = []
  let i = 0
  while (i < voiced.length) {
    let j = i
    while (j < voiced.length && voiced[j] === voiced[i]) j++
    spans.push({ speech: voiced[i], start: i * hop, end: Math.min(samples.length, j * hop) })
    i = j
  }
  if (!spans.length || spans[0].start > 0) spans.unshift({ speech: false, start: 0, end: spans[0]?.start ?? samples.length })
  if (spans[spans.length - 1].end < samples.length) spans.push({ speech: false, start: spans[spans.length - 1].end, end: samples.length })
  return spans
}

const atempoChain = (tempo) => {
  const parts = []
  let t = tempo
  while (t > 2) { parts.push(2); t /= 2 }
  while (t < 0.5) { parts.push(0.5); t /= 0.5 }
  parts.push(t)
  return parts.map((x) => `atempo=${x.toFixed(8)}`).join(',')
}

async function atempoPcm(samples, rate, tempo) {
  const input = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) input.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2)
  const out = await spawnBuffer('ffmpeg', ['-nostdin', '-v', 'error', '-f', 's16le', '-ac', '1', '-ar', String(rate), '-i', '-', '-af', atempoChain(tempo), '-f', 's16le', '-ac', '1', '-ar', String(rate), '-'], input)
  const int16 = new Int16Array(out.buffer, out.byteOffset, Math.floor(out.length / 2))
  const result = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) result[i] = int16[i] / 32768
  return result
}

export async function normalizeUnitSpeed(unitText, cleanPath, normPath, locale) {
  const speed = await measuredSpeed(unitText, locale, cleanPath)
  const tempo = Number.isFinite(speed.rate) && speed.rate > 0
    ? Math.min(UNIT_TEMPO_RANGE[1], Math.max(UNIT_TEMPO_RANGE[0], speed.target / speed.rate))
    : 1
  const { samples, rate } = await decode(cleanPath)
  const spans = speechPauseSpans(samples, rate)
  const pauseTotal = spans.filter((s) => !s.speech).reduce((n, s) => n + (s.end - s.start), 0) / rate
  const duration = samples.length / rate
  // 통째 tempo 배속한 길이를 맞추되 쉼은 보존한다 — 발성 구간만 speechTempo 배속.
  const speechTempo = Math.min(SPEECH_TEMPO_LIMIT[1], Math.max(SPEECH_TEMPO_LIMIT[0],
    (duration - pauseTotal) / Math.max(duration * 0.05, duration / tempo - pauseTotal)))
  if (!Number.isFinite(speechTempo) || Math.abs(speechTempo - 1) < 0.004) {
    await run('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', cleanPath, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', normPath])
    return 1
  }
  const chunks = []
  for (const span of spans) {
    const segment = samples.slice(span.start, span.end)
    chunks.push(span.speech ? await atempoPcm(segment, rate, speechTempo) : segment)
  }
  const merged = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let offset = 0
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length }
  await encodeWav(merged, rate, normPath)
  return speechTempo
}

function args(argv = process.argv.slice(2)) {
  const flags = new Set(['--myth', '--all', '--featured', '--generate', '--publish', '--dry-run', '--help', '--synthesize-only', '--existing-only'])
  const values = new Set(['--slug', '--locale', '--locales', '--run', '--python', '--device', '--limit', '--concurrency', '--requests-per-second'])
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
  if ([result.myth, result.all, result.featured, Boolean(result.slug)].filter(Boolean).length !== 1) throw new Error('Specify exactly one of --myth, --all, --featured, or --slug <slug>')
  if (result.locale && result.locales) throw new Error('Use --locale or --locales, not both')
  result.locales = [...new Set((result.locales || result.locale || 'ko,en').split(','))]
  if (result.locales.some((locale) => !['ko', 'en'].includes(locale))) throw new Error('Locales must be ko and/or en')
  if (result['dry-run'] && (result.generate || result.publish)) throw new Error('--dry-run cannot be combined with --generate or --publish')
  result['dry-run'] ||= !result.generate && !result.publish
  result.run = resolve(result.run || 'D:/audios/interview-cleaner/faction-desc-voices')
  result.limit = result.limit ? Number(result.limit) : Infinity
  if (!(result.limit > 0) || (result.limit !== Infinity && !Number.isInteger(result.limit))) throw new Error('--limit must be a positive integer (number of factions)')
  result.concurrency = Number(result.concurrency || 1)
  const maxConcurrency = result['synthesize-only'] ? 16 : 3
  if (!Number.isInteger(result.concurrency) || result.concurrency < 1 || result.concurrency > maxConcurrency) throw new Error(`--concurrency must be between 1 and ${maxConcurrency}`)
  result.requestsPerSecond = Number(result['requests-per-second'] || 1)
  if (!Number.isFinite(result.requestsPerSecond) || result.requestsPerSecond < 0.25 || result.requestsPerSecond > 20) throw new Error('--requests-per-second must be between 0.25 and 20')
  return result
}

const descColumn = (locale) => (locale === 'ko' ? 'description' : 'description_en')

async function targets(db, options) {
  const factions = []
  for (let offset = 0; ; offset += 500) {
    let query = db.from('faction_lv2').select('id,slug,name,description,description_en,is_myth,published').order('sort_order').range(offset, offset + 499)
    if (options.myth) query = query.eq('is_myth', true)
    if (options.featured) query = query.eq('is_featured', true)
    if (options.slug) query = query.eq('slug', options.slug)
    const { data, error } = await query
    if (error) throw new Error(`Target query failed: ${error.message}`)
    factions.push(...data)
    if (data.length < 500 || factions.length >= options.limit) break
  }
  if (!factions.length) throw new Error('No matching factions')
  const rows = []
  for (const faction of factions.slice(0, options.limit)) {
    for (const locale of options.locales) {
      const text = (faction[descColumn(locale)] || '').trim()
      rows.push({ id: faction.id, slug: faction.slug, name: faction.name, isMyth: faction.is_myth === true, published: faction.published === true, locale, text, sourceHash: sha(text) })
    }
  }
  return rows
}

async function currentSource(db, row) {
  const { data, error } = await db.from('faction_lv2').select('id,slug,description,description_en').eq('id', row.id).single()
  if (error || !data) throw new Error('Could not recheck current DB source')
  if (data.slug !== row.slug || sha((data[descColumn(row.locale)] || '').trim()) !== row.sourceHash) throw new Error('STALE_SOURCE: current DB text/identity differs; regenerate from current source')
  return data
}

async function publish(db, r2, row, entry, options, checkpoint, qc) {
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
  await currentSource(db, row)
  const key = factionDescR2Key(row.id, row.locale)
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
    try { entry.timing = await publishReadingTiming(r2, entry, options, undefined, { audioEtag, objectName: OBJECT_NAME, audioKey: key }) }
    catch (error) { entry.timing = { status: 'failed', error: error.message, attemptedAt: now() }; log('timing-publish-failed', { id: row.id, locale: row.locale, error: error.message }) }
    await checkpoint()
  }
  if (entry.status === 'published' && remoteMatches) {
    await publishTiming(previous.etag)
    return
  }
  if (previous && !remoteMatches) {
    const backup = join(options.run, '_backup', row.id, row.locale, `${Date.now()}-description.mp3`)
    await mkdir(dirname(backup), { recursive: true })
    await writeFile(backup, previous.body, { flag: 'wx' })
    await writeFile(`${backup}.json`, JSON.stringify({ key, contentType: previous.contentType, cacheControl: previous.cacheControl, metadata: previous.metadata, sha256: sha(previous.body) }, null, 2))
    entry.backup = backup
    await checkpoint()
  }
  try {
    if (!remoteMatches) await send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable', Metadata: { 'source-sha256': row.sourceHash, 'audio-sha256': entry.mp3Hash, 'settings-sha256': entry.settingsHash } }))
    const uploaded = await get()
    if (!uploaded || sha(uploaded.body) !== entry.mp3Hash) throw new Error('R2 uploaded SHA-256 mismatch')
    const base = required('R2_PUBLIC_URL').replace(/\/$/, '')
    const verify = await fetch(`${base}/${key}?verify=${entry.mp3Hash}`, { signal: AbortSignal.timeout(60_000), cache: 'no-store' })
    if (!verify.ok || sha(Buffer.from(await verify.arrayBuffer())) !== entry.mp3Hash) throw new Error('Public MP3 verification failed')
    entry.status = 'published'; entry.publishedAt = now()
    entry.publicUrl = factionDescPublicUrl(base, row.id, row.locale, entry.mp3Hash)
    await checkpoint()
    await publishTiming(uploaded.etag)
  } catch (error) {
    // An upload may have committed before a network failure; do not roll that back blindly.
    if (!remoteMatches) {
      if (previous) await send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: previous.body, ContentType: previous.contentType, CacheControl: previous.cacheControl, Metadata: previous.metadata }))
      else await send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      entry.status = 'ready'
    }
    throw error
  }
}

async function main() {
  const options = args()
  if (options.help) { console.log('node --import tsx scripts/faction/faction-desc-voice.mjs (--myth | --all | --featured | --slug SLUG) [--locales ko,en] [--dry-run | --generate | --synthesize-only] [--publish] [--concurrency N (max16 synth-only,3 QC)] [--requests-per-second 1] [--run DIR] [--python EXE] [--device auto|cuda|cpu] [--limit FACTIONS]'); return }
  const keys = await environment()
  const db = createClient(required('NEXT_PUBLIC_DB_API_URL'), required('DB_SECRET_KEY'), { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(60_000) }) } })
  const rows = await targets(db, options)
  const missing = rows.filter((row) => !row.text)
  log('preflight', { factions: rows.length / options.locales.length, files: rows.length, locales: options.locales, missingTexts: missing.length, freeKeys: keys.length, run: options.run, dryRun: options['dry-run'], concurrency: options.concurrency, requestsPerSecond: options.requestsPerSecond, synthesizeOnly: Boolean(options['synthesize-only']), preview: rows.slice(0, 4).map(({ text, ...row }) => ({ ...row, characters: text.length })) })
  if (missing.length) throw new Error(`Missing source texts: ${missing.map((row) => `${row.slug}/${row.locale}`).join(', ')}`)
  if (options['dry-run']) return
  if (options.generate && !keys.length) throw new Error('No explicitly named GOOGLE_GENAI_API_KEY_FREE keys in allowed env files')
  if (!options['synthesize-only']) await access(QC_SCRIPT)
  const settings = { model: MODEL, voice: VOICE, prompts: PROMPTS, object: 'faction-description' }
  const processing = { mp3: MP3_SETTINGS, speed: SPEED_POLICY }
  options.processingHash = sha(JSON.stringify(processing))
  if (!options['synthesize-only']) options.qcScriptHash = sha(await readFile(QC_SCRIPT))
  const settingsHash = sha(JSON.stringify(settings))
  await mkdir(options.run, { recursive: true })
  const lockPath = join(options.run, 'faction-desc-voice.lock')
  let lock
  try { lock = await open(lockPath, 'wx') }
  catch { throw new Error(`Run is locked: ${lockPath}. Check that its recorded PID has stopped before removing a stale lock.`) }
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: now() }))
  const qcWorkers = []
  let r2
  try {
    const manifestPath = join(options.run, 'manifest.json')
    const manifest = await exists(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : { schemaVersion: 1, createdAt: now(), settings, settingsHash, entries: {} }
    if (manifest.schemaVersion !== 1 || sha(JSON.stringify(manifest.settings)) !== settingsHash) throw new Error('Synthesis settings changed. Use a new --run directory to preserve old audio.')
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
    if (options.publish) {
      for (const name of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']) required(name)
      r2 = new S3Client({ region: 'auto', endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`, credentials: { accessKeyId: required('R2_ACCESS_KEY_ID'), secretAccessKey: required('R2_SECRET_ACCESS_KEY') }, maxAttempts: 3 })
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
          if (entry.status === 'held' || entry.status === 'published') return
          const reused = await reusableSynthesis(entry, options.processingHash)
          if (reused) { consecutiveFailures = 0; return }
          await currentSource(db, row)
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
          const remoteKey = factionDescR2Key(row.id, row.locale)
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
            delete entry.mp3; delete entry.mp3Hash
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
              if (!options.generate || entry.attempts.length - entry.generationBaseline >= MAX_ATTEMPTS || freshSyntheses >= MAX_ATTEMPTS) break
              attempt = { number: entry.attempts.length + 1, startedAt: now() }
              entry.attempts.push(attempt)
            }
            attempt.status = 'processing'
            await checkpoint()
            try {
              log('generate', { progress: `${index + 1}/${rows.length}`, slug: row.slug, locale: row.locale, attempt: attempt.number })
              await currentSource(db, row)
              // 문장묶음 합성: 문장을 묶어 유닛별로 합성·정리한 뒤 문단 이음은 긴 쉼,
              // 문장 이음은 짧은 쉼의 룸톤으로 잇는다 — celeb-monologue-voice-generate.py와 같은 설계.
              // 유닛 WAV는 시도 번호를 달아 재시도 시 재합성하고, 같은 시도의 중단 재개는 디스크에서 재사용한다.
              const stitchedPath = join(directory, `attempt-${attempt.number}-clean.wav`)
              if (!(await adoptAttemptWav(attempt, stitchedPath))) {
                if (!options.generate || freshSyntheses >= MAX_ATTEMPTS) break
                freshSyntheses++
                const paceRetry = entry.attempts.some((a) => a.speed?.status === 'speed-too-slow')
                const units = buildUnits(row.text)
                const unitFiles = []
                for (const unit of units) {
                  const uWav = join(directory, `attempt-${attempt.number}-u${String(unit.index).padStart(2, '0')}.wav`)
                  if (!(await exists(uWav))) {
                    await writeFile(uWav, await gemini.generate(unit.text, row.locale, paceRetry), { flag: 'wx' })
                  }
                  const uClean = uWav.replace(/\.wav$/i, '-clean.wav')
                  if (!(await exists(uClean))) await cleanVoiceFile(uWav, uClean, 'reading')
                  const uNorm = uWav.replace(/\.wav$/i, '-norm.wav')
                  if (!(await exists(uNorm))) await normalizeUnitSpeed(unit.text, uClean, uNorm, row.locale)
                  unitFiles.push({ path: uNorm, seam: unit.leadSeam })
                }
                const { gaps } = await stitchUnits(unitFiles, stitchedPath)
                attempt.stitch = { units: units.length, gaps }
                await adoptAttemptWav(attempt, stitchedPath)
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
              let audioForUse = result.audio
              if (!result.ok) {
                // 삽입한 문단 쉼이 QC의 긴 쉼 수리로 잡히는 것은 정상 — 쉼 안에만 있으면 통과로 읽고
                // 수리본(쉼을 잘라낸 음원)이 아니라 스티치 원본을 그대로 쓴다.
                const verdict = qcGapVerdict(result, attempt.stitch?.gaps || [])
                if (!verdict.passed) throw new Error(qcFailure(result))
                attempt.qcGapVerdict = verdict.verdict
                audioForUse = attempt.wav
              } else if (!['passed', 'repaired'].includes(result.status) || !result.audio) throw new Error(qcFailure(result))
              attempt.speed = await measuredSpeed(row.text, row.locale, audioForUse)
              if (attempt.speed.status === 'speed-too-slow') throw new Error(`speed-too-slow: ${attempt.speed.rate.toFixed(3)} ${attempt.speed.unit}, required tempo ${attempt.speed.requiredTempo.toFixed(3)}`)
              const mp3 = join(directory, `attempt-${attempt.number}-${revision}.mp3`)
              await encodeMp3(audioForUse, mp3, attempt.speed.tempo)
              await run('ffmpeg', ['-nostdin', '-v', 'error', '-i', mp3, '-f', 'null', '-'])
              const finalSpeed = await measuredSpeed(row.text, row.locale, mp3)
              if (finalSpeed.rate < finalSpeed.target) throw new Error(`speed-rounding: encoded audio ${finalSpeed.rate.toFixed(4)} below ${finalSpeed.target}`)
              const finalQc = await qc.check({ id, audio: mp3, text: row.text, locale: row.locale })
              attempt.finalQc = await archiveQcReport(finalQc, options.run)
              await writeFile(join(directory, `attempt-${attempt.number}-${revision}-mp3-qc.json`), JSON.stringify(finalQc, null, 2) + '\n')
              if (!finalQc.ok || finalQc.status !== 'passed') {
                // 배속이 적용됐으면 삽입 쉼의 시간도 1/tempo로 줄어든다 — 같은 비율로 맞춰 판정한다.
                const tempo = attempt.speed?.tempo || 1
                const scaledGaps = (attempt.stitch?.gaps || []).map((g) => ({ start: g.start / tempo, end: g.end / tempo, kind: g.kind }))
                const verdict = qcGapVerdict(finalQc, scaledGaps)
                if (!verdict.passed) throw new Error(qcFailure(finalQc, 'Final MP3 QC'))
                attempt.finalQcGapVerdict = verdict.verdict
              }
              entry.mp3 = mp3; entry.mp3Hash = sha(await readFile(mp3)); entry.qc = attempt.finalQc; entry.finalQc = attempt.finalQc; entry.finalQcHash = entry.mp3Hash; entry.qcScriptHash = options.qcScriptHash; entry.status = 'ready'
              entry.speed = finalSpeed; entry.appliedTempo = attempt.speed.tempo; entry.processingHash = options.processingHash
              attempt.status = 'passed'
            } catch (error) {
              attempt.status = 'failed'; attempt.error = error.message; entry.status = 'failed'; await checkpoint()
              if (error.message.includes('FREE_KEYS_EXHAUSTED') || qc.failure) throw error
              log('attempt-failed', { slug: row.slug, locale: row.locale, attempt: attempt.number, error: error.message })
              await delay(2000)
            }
            await checkpoint()
          }
        }
        if (!entry.mp3) {
          // A quota error recorded on a no-WAV attempt is stale state, not a fresh failure;
          // letting it classify the entry aborts the whole scan on every resume.
          const lastMeaningful = [...entry.attempts].reverse().find((attempt) => attempt.error && !attempt.error.includes('FREE_KEYS_EXHAUSTED'))?.error
          throw new Error(lastMeaningful || 'No generated MP3; use --generate first')
        }
        if (options.generate && !verifiedPublished(entry) && (entry.finalQcHash !== entry.mp3Hash || entry.qcScriptHash !== options.qcScriptHash)) {
          const result = await qc.check({ id, audio: entry.mp3, text: row.text, locale: row.locale })
          entry.finalQc = await archiveQcReport(result, options.run)
          if (!result.ok || result.status !== 'passed') { await checkpoint(); throw new Error(qcFailure(result, 'Final MP3 QC')) }
          entry.finalQcHash = entry.mp3Hash; entry.qcScriptHash = options.qcScriptHash
          await checkpoint()
        }
        if (options.publish) await publish(db, r2, row, entry, options, checkpoint, qc)
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
    log('finished', { selected: rows.length, failed, held, manifest: manifestPath })
    if (failed || held) process.exitCode = 1
  } finally {
    for (const qc of qcWorkers) qc.close()
    r2?.destroy(); await lock.close(); await unlink(lockPath)
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
