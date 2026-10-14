/** Triage held/failed reading-voice entries instead of letting them pile up.
 *
 *  Classification from the last error:
 *    - cosmetic: content QC passed but pacing/spacing post-steps rejected the
 *      file (narration-spacing, speed-too-slow, speed-rounding)
 *    - timing: TIMING_INCOMPLETE (audio fine but sentence timing unusable)
 *    - content: real mismatches (gaps, unexpected speech, silence, jumps)
 *    - other: unclassified — needs a human look
 *
 *  --accept: for cosmetic entries only, promote the newest usable attempt file
 *  into entry.mp3 and reset status to 'pending'. The normal publish gates then
 *  re-verify content QC, speed and timing, so anything genuinely broken lands
 *  back on held — promotion can never force bad audio live.
 *
 *  Always writes <run>/held-review.md with the per-entry breakdown; content
 *  entries stay held and are listed there for source-text fixes or discard.
 *
 *  Usage: node --import tsx scripts/celeb/_scratch-reading-held-triage.mjs [--run DIR] [--accept] [--dry-run] */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const sha = (value) => createHash('sha256').update(value).digest('hex')

const COSMETIC = /(?:Narration spacing|Final narration spacing)|speed-too-slow|speed-rounding/
const TIMING = /TIMING_INCOMPLETE/
const CONTENT = /QC (?:regenerate|error)|Final MP3 QC|sample-jump|silent|clipping|insufficient-alignment/

function classify(error = '') {
  if (TIMING.test(error)) return 'timing'
  if (COSMETIC.test(error)) return 'cosmetic'
  if (CONTENT.test(error)) return 'content'
  return 'other'
}

function parseArgs(argv) {
  const options = { run: 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908', accept: false, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--accept') options.accept = true
    else if (argv[i] === '--dry-run') options.dryRun = true
    else if (argv[i] === '--run' && argv[i + 1]) options.run = argv[++i]
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  return options
}

const options = parseArgs(process.argv.slice(2))
const run = resolve(options.run)
const manifestPath = join(run, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const groups = { cosmetic: [], timing: [], content: [], other: [] }
for (const [key, e] of Object.entries(manifest.entries || {})) {
  if (!['held', 'failed'].includes(e.status)) continue
  const cls = classify(e.lastError || [...(e.attempts || [])].reverse().find((a) => a.error)?.error || '')
  groups[cls].push({ key, e })
}

let promoted = 0
const promotedList = []
if (options.accept) {
  for (const { key, e } of groups.cosmetic) {
    if (e.promotedAt) continue // already promoted once; publish gates rejected it again
    const lastError = e.lastError || ''
    if (/speed-too-slow|speed-rounding/.test(lastError)) continue // the publish speed gate rejects these regardless — leave them to re-synthesis
    const dir = join(run, key.split('/')[0], e.locale)
    if (!existsSync(dir)) continue
    // Prefer the spacing-normalized final, then the post-QC encode, then the candidate.
    const files = readdirSync(dir).filter((n) => /-spacing\.mp3$|attempt-\d+-\S+\.mp3$|candidate\.mp3$/i.test(n))
    const best = files
      .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs, size: statSync(join(dir, name)).size }))
      .filter((f) => f.size > 1024)
      .sort((a, b) => (/-spacing\.mp3$/.test(b.name) - /-spacing\.mp3$/.test(a.name)) || b.mtime - a.mtime)[0]
    if (!best) continue
    const qc = [...(e.attempts || [])].reverse().find((a) => a.qc || a.finalQc)
    const report = qc?.finalQc || qc?.qc
    if (!report?.ok) continue // no QC-passing report anywhere — cannot promote
    const file = join(dir, best.name)
    if (!options.dryRun) {
      e.mp3 = file
      e.mp3Hash = sha(readFileSync(file))
      e.qc = report
      e.status = 'pending'
      e.promotedAt = new Date().toISOString()
      delete e.revalidatedAt
      promoted++
      promotedList.push(key)
    } else promoted++
  }
}

if ((promoted || options.accept) && !options.dryRun) {
  manifest.updatedAt = new Date().toISOString()
  writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2))
  renameSync(`${manifestPath}.tmp`, manifestPath)
}

const lines = ['# 읽어보기 보류 항목 검토', `갱신: ${new Date().toISOString()}`, '']
for (const cls of ['cosmetic', 'timing', 'content', 'other']) {
  lines.push(`## ${cls} (${groups[cls].length})`)
  for (const { key, e } of groups[cls].slice(0, 60)) {
    const err = e.lastError || [...(e.attempts || [])].reverse().find((a) => a.error)?.error || '-'
    lines.push(`- ${e.slug || key}/${e.locale} — ${err} (attempts ${(e.attempts || []).length})`)
  }
  if (groups[cls].length > 60) lines.push(`- …외 ${groups[cls].length - 60}건`)
  lines.push('')
}
writeFileSync(join(run, 'held-review.md'), lines.join('\n'))

console.log(`${options.dryRun ? 'dry-run: ' : ''}cosmetic=${groups.cosmetic.length} timing=${groups.timing.length} content=${groups.content.length} other=${groups.other.length} promoted=${promoted}`)
