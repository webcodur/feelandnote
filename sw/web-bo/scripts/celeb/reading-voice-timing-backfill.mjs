/** Published MP3 timing backfill; no synthesis, ffmpeg or Whisper. Defaults to read-only. */
import { readFile, writeFile, open, unlink } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { S3Client } from '@aws-sdk/client-s3'
import { environment, currentSource, renameCheckpoint } from './reading-voice.mjs'
import { prepareReadingTiming, publishReadingTiming, TIMING_REVISION, timingHash } from './reading-voice-timing.mjs'

export function timingArgs(argv) {
  const options = { run: 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908', concurrency: 6 }
  for (let i = 0; i < argv.length; i++) {
    if (['--publish', '--dry-run', '--help'].includes(argv[i])) options[argv[i].slice(2)] = true
    else if (['--run', '--slug', '--locale', '--limit', '--concurrency'].includes(argv[i]) && argv[i + 1] && !argv[i + 1].startsWith('--')) options[argv[i].slice(2)] = argv[++i]
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  if (options.publish && options['dry-run']) throw new Error('Choose --publish or --dry-run')
  if (options.locale && !['ko', 'en'].includes(options.locale)) throw new Error('Invalid locale')
  options.concurrency = Number(options.concurrency)
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) throw new Error('Concurrency must be 1 through 8')
  options.limit = options.limit === undefined ? Infinity : Number(options.limit)
  if (!(options.limit > 0)) throw new Error('Invalid limit')
  options.run = resolve(options.run)
  return options
}

async function main() {
  const options = timingArgs(process.argv.slice(2))
  if (options.help) { console.log('node --import tsx scripts/celeb/reading-voice-timing-backfill.mjs [--dry-run | --publish] [--slug SLUG] [--locale ko|en] [--run DIR] [--concurrency 6] [--limit AUDIO_COUNT]'); return }
  let r2; let db; let lock
  const lockPath = join(options.run, 'reading-voice.lock')
  const statePath = join(options.run, 'reading-voice-timings.json')
  let state = { version: 1, entries: {} }
  if (options.publish) {
    await environment()
    db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(30_000) }) } })
    r2 = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }, maxAttempts: 3 })
    lock = await open(lockPath, 'wx')
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), operation: 'timings-only' }))
  }
  try {
    const manifest = JSON.parse(await readFile(join(options.run, 'manifest.json'), 'utf8'))
    if (options.publish) { try { state = JSON.parse(await readFile(statePath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error } }
    const entries = Object.values(manifest.entries).filter((entry) => entry.status === 'published' && (!options.slug || entry.slug === options.slug) && (!options.locale || entry.locale === options.locale)).slice(0, options.limit)
    let checkpointTail = Promise.resolve()
    const checkpoint = () => {
      checkpointTail = checkpointTail.then(async () => { state.updatedAt = new Date().toISOString(); await writeFile(`${statePath}.tmp`, JSON.stringify(state) + '\n'); await renameCheckpoint(`${statePath}.tmp`, statePath) })
      return checkpointTail
    }
    const totals = { selected: entries.length, full: 0, partial: 0, unavailable: 0, failed: 0, published: 0, resumed: 0, sentences: 0, segments: 0, locales: {}, reasons: {} }
    let next = 0; let consecutiveFailures = 0; let stopped = false
    const worker = async () => {
      while (next < entries.length && !stopped) {
        const entry = entries[next++]; const id = `${entry.id}/${entry.locale}`
        try {
          const prepared = await prepareReadingTiming(entry)
          totals.sentences += prepared.sentences; totals.segments += prepared.timing.segments.length
          const outcome = prepared.timing.segments.length === prepared.sentences ? 'full' : prepared.timing.segments.length ? 'partial' : 'unavailable'
          totals[outcome]++
          const localeTotals = totals.locales[entry.locale] ||= { full: 0, partial: 0, unavailable: 0 }; localeTotals[outcome]++
          for (const item of prepared.rejected) totals.reasons[item.reason] = (totals.reasons[item.reason] || 0) + 1
          if (options.publish) {
            await currentSource(db, entry)
            const previous = state.entries[id]
            // A completed, unchanged checkpoint requires no upload. The proxy still
            // checks the current MP3 ETag before serving any timing to the browser.
            if (previous?.status === 'published' && previous.revision === TIMING_REVISION && previous.audioHash === entry.mp3Hash && previous.sourceHash === entry.sourceHash && previous.path && timingHash(await readFile(previous.path).catch(() => Buffer.alloc(0))) === previous.hash) totals.resumed++
            else {
              let published
              for (let attempt = 0; attempt < 3; attempt++) {
                try { published = await publishReadingTiming(r2, entry, options, prepared); break }
                catch (error) { if (attempt === 2 || /HASH_MISMATCH|ETAG_MISMATCH/.test(error.message)) throw error; await new Promise((done) => setTimeout(done, 500 * 2 ** attempt)) }
              }
              state.entries[id] = published
              if (published.status === 'published') totals.published++
              await checkpoint()
            }
          }
          consecutiveFailures = 0
          if (options.slug || next % 100 === 0) console.log(JSON.stringify({ event: 'timing-progress', id, slug: entry.slug, outcome, completed: totals.full + totals.partial + totals.unavailable + totals.failed, ...totals }))
        } catch (error) {
          totals.failed++; consecutiveFailures++
          console.log(JSON.stringify({ event: 'timing-failed', id, slug: entry.slug, error: error.message }))
          if (options.publish) { state.entries[id] = { status: 'failed', error: error.message, attemptedAt: new Date().toISOString() }; await checkpoint() }
          if (options.publish && consecutiveFailures >= 8) stopped = true
        }
      }
    }
    await Promise.all(Array.from({ length: options.publish ? options.concurrency : 1 }, worker))
    await checkpointTail
    console.log(JSON.stringify({ event: 'timing-finished', dryRun: !options.publish, stopped, ...totals }))
    if (totals.failed || stopped) process.exitCode = 1
  } finally { r2?.destroy(); if (lock) { await lock.close(); await unlink(lockPath) } }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
