/** Rebuild synthesis queues after a manifest/run reset. Queues only items whose
 *  published R2 audio is missing or stale against the current DB source.
 *  Usage: node --import tsx scripts/celeb/_scratch-reading-queue-build.mjs [--run DIR] [--dry-run] */
import { createHash } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@feelandnote/db'
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { environment, required, renameCheckpoint, log, now } from './reading-voice.mjs'

const sha = (value) => createHash('sha256').update(value).digest('hex')

function args(argv = process.argv.slice(2)) {
  const options = { run: 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') options.help = true
    else if (argv[i] === '--dry-run') options.dryRun = true
    else if (argv[i] === '--run' && argv[i + 1] && !argv[i + 1].startsWith('--')) options.run = argv[++i]
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  options.run = resolve(options.run)
  return options
}

async function main() {
  const options = args()
  if (options.help) { console.log('node --import tsx scripts/celeb/_scratch-reading-queue-build.mjs [--run DIR] [--dry-run]'); return }
  await environment()
  const db = createClient(required('NEXT_PUBLIC_DB_API_URL'), required('DB_SECRET_KEY'), { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(60_000) }) } })
  const bucket = required('R2_BUCKET_NAME')
  const r2 = new S3Client({ region: 'auto', endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`, credentials: { accessKeyId: required('R2_ACCESS_KEY_ID'), secretAccessKey: required('R2_SECRET_ACCESS_KEY') }, maxAttempts: 3 })
  const { voiceR2Key, voiceFileName } = await import('../../src/lib/voice-path.ts').then((m) => m.default || m)

  const celebs = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('celebs').select('id,slug,publication_status').in('publication_status', ['active', 'inactive']).order('id').range(offset, offset + 499)
    if (error) throw new Error(`Celeb query failed: ${error.message}`)
    celebs.push(...data)
    if (data.length < 500) break
  }
  const explanations = new Map()
  for (let offset = 0; offset < celebs.length; offset += 100) {
    const { data, error } = await db.from('celeb_explanations').select('profile_id,plain_text,plain_text_en').in('profile_id', celebs.slice(offset, offset + 100).map((c) => c.id))
    if (error) throw new Error(`Explanation query failed: ${error.message}`)
    for (const row of data) explanations.set(row.profile_id, row)
  }

  const settledRemote = async (id, locale, sourceHash) => {
    const timingKey = voiceR2Key(id, locale, 'reading.json')
    let timing
    try { timing = JSON.parse(await (await r2.send(new GetObjectCommand({ Bucket: bucket, Key: timingKey }), { abortSignal: AbortSignal.timeout(30_000) })).Body.transformToString()) }
    catch { return false }
    if (timing.sourceHash !== sourceHash || !timing.audioHash) return false
    try {
      const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: voiceR2Key(id, locale, voiceFileName('reading')) }), { abortSignal: AbortSignal.timeout(30_000) })
      return head.Metadata?.['audio-sha256'] === timing.audioHash
    } catch { return false }
  }

  const items = { active: [], inactive: [] }
  let settled = 0, empty = 0
  const pending = []
  for (const celeb of celebs) {
    const source = explanations.get(celeb.id)
    for (const locale of ['ko', 'en']) {
      const text = typeof source?.[locale === 'ko' ? 'plain_text' : 'plain_text_en'] === 'string' ? source[locale === 'ko' ? 'plain_text' : 'plain_text_en'].trim() : ''
      if (!text) { empty++; continue }
      pending.push({ celeb, locale, sourceHash: sha(text) })
    }
  }
  const CONCURRENCY = 8
  for (let index = 0; index < pending.length; index += CONCURRENCY) {
    await Promise.all(pending.slice(index, index + CONCURRENCY).map(async ({ celeb, locale, sourceHash }) => {
      if (await settledRemote(celeb.id, locale, sourceHash)) { settled++; return }
      items[celeb.publication_status === 'active' ? 'active' : 'inactive'].push({ id: celeb.id, slug: celeb.slug, locale, sourceHash })
    }))
  }
  for (const list of Object.values(items)) list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.locale < b.locale ? -1 : 1))

  const queues = [
    { file: join(options.run, 'reading-voice-synthesis-queue.json'), items: items.active },
    { file: join(options.run, 'inactive-missing-items.json'), items: items.inactive },
  ]
  log('queue-build-scan', { celebs: celebs.length, checked: pending.length, settled, emptyText: empty, activeQueued: items.active.length, inactiveQueued: items.inactive.length, dryRun: Boolean(options.dryRun) })
  if (options.dryRun) return
  await mkdir(options.run, { recursive: true })
  for (const { file, items: list } of queues) {
    const body = { schemaVersion: 1, selected: list.length, queued: list.length, purpose: 'synthesis', order: 'celebs.id asc, locale ko then en', createdAt: now(), items: list }
    await writeFile(`${file}.tmp`, JSON.stringify(body, null, 2) + '\n')
    await renameCheckpoint(`${file}.tmp`, file)
    log('queue-built', { file, items: list.length })
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1 })
