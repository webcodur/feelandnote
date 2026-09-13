/** Move reading voices whose sentence alignment remains unresolved to a verified backup, then remove their published R2 objects. */
import { access, cp, readFile, writeFile, open, unlink, rm, mkdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { environment, currentSource, renameCheckpoint } from './reading-voice.mjs'
import { prepareReadingTiming } from './reading-voice-timing.mjs'

const DEFAULT_RUN = 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908'
const exists = (path) => access(path).then(() => true, () => false)

export function discardArgs(argv = process.argv.slice(2)) {
  const options = { run: DEFAULT_RUN }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--discard' || arg === '--help') options[arg.slice(2)] = true
    else if (['--run', '--slug', '--locale', '--limit'].includes(arg) && argv[i + 1] && !argv[i + 1].startsWith('--')) options[arg.slice(2)] = argv[++i]
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (options.locale && !['ko', 'en'].includes(options.locale)) throw new Error('Invalid locale')
  options.limit = options.limit === undefined ? Infinity : Number(options.limit)
  if (!(options.limit > 0)) throw new Error('Invalid limit')
  options.run = resolve(options.run)
  return options
}

function assertInside(root, child) {
  const base = resolve(root); const target = resolve(child)
  if (target === base || (!target.startsWith(base + '\\') && !target.startsWith(`${base}/`))) throw new Error(`Path outside run: ${target}`)
}

async function headOrNull(r2, bucket, key) {
  try { return await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key })) }
  catch (error) { if (error.name === 'NotFound' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null; throw error }
}

async function removeObject(r2, bucket, key, expectedHash) {
  const before = await headOrNull(r2, bucket, key)
  if (!before) return false
  if (expectedHash && before.Metadata?.['audio-sha256'] !== expectedHash) throw new Error(`R2 hash mismatch before discard: ${key}`)
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  if (await headOrNull(r2, bucket, key)) throw new Error(`R2 object still present after discard: ${key}`)
  return true
}

async function writeJson(path, value) {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n')
  await renameCheckpoint(`${path}.tmp`, path)
}

async function findUnresolved(manifest, options) {
  const entries = Object.values(manifest.entries || {}).filter((entry) => entry.status === 'published' && (!options.slug || entry.slug === options.slug) && (!options.locale || entry.locale === options.locale)).slice(0, options.limit)
  const unresolved = []
  for (const entry of entries) {
    const prepared = await prepareReadingTiming(entry)
    if (prepared.timing.segments.length < prepared.sentences) unresolved.push({ entry, prepared })
  }
  return unresolved
}

async function main() {
  const options = discardArgs()
  if (options.help) { console.log('node --import tsx scripts/celeb/reading-voice-discard-unresolved.mjs [--discard] [--slug SLUG] [--locale ko|en] [--run DIR] [--limit AUDIO_COUNT]'); return }
  const manifestPath = join(options.run, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const unresolved = await findUnresolved(manifest, options)
  const summary = unresolved.map(({ entry, prepared }) => ({ id: entry.id, slug: entry.slug, nickname: entry.nickname, locale: entry.locale, sentences: prepared.sentences, segments: prepared.timing.segments.length, reasons: [...new Set(prepared.rejected.map((item) => item.reason))] }))
  console.log(JSON.stringify({ event: 'discard-plan', dryRun: !options.discard, selected: summary.length, rows: summary }, null, 2))
  if (!options.discard || !unresolved.length) return

  await environment()
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(30_000) }) } })
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('Missing R2_BUCKET_NAME')
  const r2 = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }, maxAttempts: 3 })
  const lockPath = join(options.run, 'reading-voice.lock')
  const lock = await open(lockPath, 'wx')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupRoot = join(options.run, '_backup', `removed-timing-unresolved-${stamp}`)
  const manifestBackup = join(backupRoot, 'manifest-before.json')
  const statePath = join(options.run, 'reading-voice-timings.json')
  const state = await exists(statePath) ? JSON.parse(await readFile(statePath, 'utf8')) : null
  try {
    await mkdir(backupRoot, { recursive: true })
    await cp(manifestPath, manifestBackup)
    if (state) await cp(statePath, join(backupRoot, 'reading-voice-timings-before.json'))
    const audit = { version: 1, createdAt: new Date().toISOString(), reason: 'TIMING_UNRESOLVED_DISCARDED', entries: [] }
    await writeJson(join(backupRoot, 'discard-audit.json'), audit)
    for (const { entry, prepared } of unresolved) {
      await currentSource(db, entry)
      const sourceDir = resolve(dirname(entry.mp3))
      assertInside(options.run, sourceDir)
      const backupDir = join(backupRoot, entry.id, entry.locale)
      await mkdir(dirname(backupDir), { recursive: true })
      await cp(sourceDir, backupDir, { recursive: true, errorOnExist: true })
      const audioKey = `celebs/${entry.id}/voice/${entry.locale}/reading.mp3`
      const timingKey = `celebs/${entry.id}/voice/${entry.locale}/reading.json`
      try {
        await removeObject(r2, bucket, audioKey, entry.mp3Hash)
        await removeObject(r2, bucket, timingKey)
        await rm(sourceDir, { recursive: true, force: true })
      } catch (error) {
        await rm(backupDir, { recursive: true, force: true })
        throw error
      }
      entry.status = 'held'
      entry.lastError = 'TIMING_UNRESOLVED_DISCARDED'
      entry.failedAt = new Date().toISOString()
      for (const key of ['key', 'publicUrl', 'voiceVersion', 'publishedAt', 'revalidatedAt', 'backup', 'timing']) delete entry[key]
      const id = `${entry.id}/${entry.locale}`
      if (state?.entries) delete state.entries[id]
      audit.entries.push({ id: entry.id, slug: entry.slug, locale: entry.locale, sentences: prepared.sentences, segments: prepared.timing.segments.length, reasons: [...new Set(prepared.rejected.map((item) => item.reason))], backupDir: relative(options.run, backupDir), audioKey, timingKey })
      await writeJson(manifestPath, manifest)
      if (state) await writeJson(statePath, state)
      await writeJson(join(backupRoot, 'discard-audit.json'), audit)
      console.log(JSON.stringify({ event: 'discarded', id, slug: entry.slug, locale: entry.locale }))
    }
    console.log(JSON.stringify({ event: 'discard-finished', selected: unresolved.length, backupRoot, manifestBackup }))
  } finally {
    r2.destroy(); await lock.close(); await unlink(lockPath)
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
