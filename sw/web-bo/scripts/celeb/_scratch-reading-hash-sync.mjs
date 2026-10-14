/** Re-sync stale sourceHash values after DB text edits. A manifest entry or
 *  queue item stamped with an older hash fatally aborts every scan
 *  ('Source changed for ...'), so this compares each stamped hash to
 *  sha(current DB text) and repairs in place:
 *    - manifest entries with a stale hash -> files moved to _backup/quarantine,
 *      entry deleted (later scans rebuild it fresh -> regen + republish)
 *    - synthesis/work queue items -> sourceHash updated to the current hash
 *  Published entries are not exempt: a published hash mismatch means the live
 *  audio was made from old text, so it must be regenerated.
 *  Usage: node --import tsx scripts/celeb/_scratch-reading-hash-sync.mjs [--run DIR] [--dry-run] */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@feelandnote/db'
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

const atomicWrite = (path, data) => {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, data)
  renameSync(tmp, path)
}

const options = parseArgs(process.argv.slice(2))
const run = resolve(options.run)
await environment()
const db = createClient(required('NEXT_PUBLIC_DB_API_URL'), required('DB_SECRET_KEY'), { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(60_000) }) } })

const manifestPath = join(run, 'manifest.json')
const queuePaths = ['reading-voice-synthesis-queue.json', 'reading-voice-work-queue.json']
  .map((name) => join(run, name))
  .filter(existsSync)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const queues = queuePaths.map((path) => ({ path, json: JSON.parse(readFileSync(path, 'utf8')) }))

const ids = new Set()
for (const key of Object.keys(manifest.entries || {})) ids.add(key.split('/')[0])
for (const { json } of queues) for (const item of json.items || []) ids.add(item.id)

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
  const row = textById.get(id)
  const text = (row?.[locale === 'ko' ? 'plain_text' : 'plain_text_en'] || '').trim()
  return text ? sha(text) : null
}

let dropped = 0
const missingSource = []
for (const [key, e] of Object.entries(manifest.entries || {})) {
  const hash = currentHash(key.split('/')[0], e.locale)
  if (hash === null) { missingSource.push(key); continue }
  if (e.sourceHash === hash) continue
  if (!options.dryRun) {
    const dir = join(run, e.id, e.locale)
    if (existsSync(dir)) {
      const dst = join(run, '_backup', 'quarantine', `${e.id}-${e.locale}-${Date.now()}`)
      mkdirSync(join(run, '_backup', 'quarantine'), { recursive: true })
      renameSync(dir, dst)
    }
    delete manifest.entries[key]
  }
  dropped++
}

let patched = 0
for (const { json } of queues) {
  for (const item of json.items || []) {
    const hash = currentHash(item.id, item.locale)
    if (hash && item.sourceHash !== hash) { item.sourceHash = hash; patched++ }
  }
}

if (options.dryRun) {
  console.log(`dry-run: stale manifest entries=${dropped} stale queue items=${patched} no-source=${missingSource.length}`)
  if (missingSource.length) console.log(`no-source: ${missingSource.slice(0, 10).join(', ')}`)
} else {
  if (dropped) { manifest.updatedAt = new Date().toISOString(); atomicWrite(manifestPath, JSON.stringify(manifest, null, 2)) }
  if (patched) for (const { path, json } of queues) atomicWrite(path, JSON.stringify(json, null, 2))
  console.log(`synced: dropped stale manifest entries=${dropped} patched queue items=${patched} no-source=${missingSource.length}`)
  if (missingSource.length) console.log(`no-source: ${missingSource.slice(0, 10).join(', ')}`)
}
