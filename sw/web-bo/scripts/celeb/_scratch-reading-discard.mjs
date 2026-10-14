/** One-shot discard sweep for unusable reading-voice audio.
 *
 *  1. Remote (service-registered) discard: manifest entries dropped by
 *     hash-sync had their local dirs moved to _backup/quarantine/<id>-<locale>-*.
 *     Their R2 reading.mp3/reading.json may still be live serving audio made
 *     from old text. If the remote timing hash differs from the current DB
 *     source hash, both remote objects are deleted.
 *  2. Local unusable discard: held/failed manifest entries keep their QC
 *     reports and records, but the rejected wav/mp3/candidate files are
 *     deleted. The retry stage regenerates them from current text; the same
 *     bad audio is never reused.
 *
 *  Usage: node --import tsx scripts/celeb/_scratch-reading-discard.mjs [--run DIR] [--dry-run] */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@feelandnote/db'
import { S3Client, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { environment, required } from './reading-voice.mjs'

const sha = (value) => createHash('sha256').update(value).digest('hex')

function parseArgs(argv) {
  const options = { run: 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') options.dryRun = true
    else if (argv[i] === '--run' && argv[i + 1]) options.run = argv[++i]
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  return options
}

const options = parseArgs(process.argv.slice(2))
const run = resolve(options.run)
await environment()
const db = createClient(required('NEXT_PUBLIC_DB_API_URL'), required('DB_SECRET_KEY'), { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(60_000) }) } })
const bucket = required('R2_BUCKET_NAME')
const r2 = new S3Client({ region: 'auto', endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`, credentials: { accessKeyId: required('R2_ACCESS_KEY_ID'), secretAccessKey: required('R2_SECRET_ACCESS_KEY') }, maxAttempts: 3 })

// Collect quarantined id/locale pairs (local audio already moved aside by
// quarantine/hash-sync) plus held/failed entries still in the manifest.
const quarantineDir = join(run, '_backup', 'quarantine')
const quarantined = new Map()
if (existsSync(quarantineDir)) {
  for (const name of readdirSync(quarantineDir)) {
    const match = /^([0-9a-f-]{36})-(ko|en)-\d+$/.exec(name)
    if (match) quarantined.set(`${match[1]}/${match[2]}`, { id: match[1], locale: match[2] })
  }
}

const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'))
const reject = []
for (const [key, e] of Object.entries(manifest.entries || {})) {
  if (['held', 'failed'].includes(e.status)) reject.push({ key, id: key.split('/')[0], locale: e.locale, slug: e.slug, status: e.status })
}

// Current DB source hash for every id we may touch.
const ids = new Set([...quarantined.values()].map((q) => q.id))
for (const r of reject) ids.add(r.id)
const textById = new Map()
const idList = [...ids]
for (let i = 0; i < idList.length; i += 100) {
  const { data, error } = await db
    .from('celeb_explanations')
    .select('profile_id,plain_text,plain_text_en')
    .in('profile_id', idList.slice(i, i + 100))
  if (error) throw new Error(`celeb_explanations fetch: ${error.message}`)
  for (const row of data) textById.set(row.profile_id, row)
}
const currentHash = (id, locale) => {
  const text = (textById.get(id)?.[locale === 'ko' ? 'plain_text' : 'plain_text_en'] || '').trim()
  return text ? sha(text) : null
}

// 1. Remote discard: live audio whose timing sourceHash no longer matches the
//    DB text is stale narration and must come down.
let remoteChecked = 0, remoteDeleted = 0
const remoteLog = []
for (const { id, locale } of quarantined.values()) {
  remoteChecked++
  const jsonKey = `celebs/${id}/voice/${locale}/reading.json`
  const mp3Key = `celebs/${id}/voice/${locale}/reading.mp3`
  let remoteHash = null
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: jsonKey }), { abortSignal: AbortSignal.timeout(30_000) })
    remoteHash = JSON.parse(await res.Body.transformToString()).sourceHash || null
  } catch (error) {
    if (!['NoSuchKey', 'NotFound'].includes(error.name) && error.$metadata?.httpStatusCode !== 404) throw error
    continue
  }
  const hash = currentHash(id, locale)
  if (remoteHash && hash && remoteHash === hash) continue
  if (!options.dryRun) {
    for (const key of [mp3Key, jsonKey]) {
      try { await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(30_000) }) }
      catch (error) { if (!['NoSuchKey', 'NotFound'].includes(error.name)) throw error }
    }
  }
  remoteDeleted++
  remoteLog.push(`${id}/${locale}`)
}

// 2. Local discard: drop rejected audio files under held/failed entry dirs.
//    QC reports and manifest records stay; the retry stage synthesizes fresh.
let localDropped = 0, bytesFreed = 0
for (const { id, locale } of reject) {
  const dir = join(run, id, locale)
  if (!existsSync(dir)) continue
  for (const name of readdirSync(dir)) {
    if (!/\.(wav|mp3|ogg|flac)$/i.test(name) || /-qc\.json$/i.test(name)) continue
    const file = join(dir, name)
    bytesFreed += statSync(file).size
    if (!options.dryRun) rmSync(file, { force: true })
    localDropped++
  }
}

const mib = (bytesFreed / 1e6).toFixed(1)
console.log(`${options.dryRun ? 'dry-run: ' : ''}remote checked=${remoteChecked} deleted=${remoteDeleted} local audio dropped=${localDropped} files (${mib} MB)`)
if (remoteLog.length) console.log(`remote-deleted: ${remoteLog.join(', ')}`)
