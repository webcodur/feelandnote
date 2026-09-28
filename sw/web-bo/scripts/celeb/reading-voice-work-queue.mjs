/** Build a QC/publish work queue from the run manifest: every entry that is not a fully
 *  settled publication (verified mp3 + published timing on current source/audio) stays in.
 *  Usage: node --import tsx scripts/celeb/reading-voice-work-queue.mjs [--run DIR] [--out FILE] */
import { access, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { renameCheckpoint } from './reading-voice.mjs'

const exists = (path) => access(path).then(() => true, () => false)

function args(argv = process.argv.slice(2)) {
  const options = { run: 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') options.help = true
    else if (['--run', '--out'].includes(argv[i]) && argv[i + 1] && !argv[i + 1].startsWith('--')) options[argv[i].slice(2)] = argv[++i]
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  options.run = resolve(options.run)
  options.out = resolve(options.out || join(options.run, 'reading-voice-work-queue.json'))
  return options
}

export function settled(entry) {
  if (entry.status !== 'published') return false
  if (entry.finalQcHash !== entry.mp3Hash || entry.qc?.ok !== true || !['passed', 'repaired'].includes(entry.qc?.status)) return false
  const timing = entry.timing
  return timing?.status === 'published' && timing.audioHash === entry.mp3Hash && timing.sourceHash === entry.sourceHash
}

async function main() {
  const options = args()
  if (options.help) { console.log('node --import tsx scripts/celeb/reading-voice-work-queue.mjs [--run DIR] [--out FILE]'); return }
  const manifest = JSON.parse(await readFile(join(options.run, 'manifest.json'), 'utf8'))
  const items = []
  const skipped = { settled: 0, noAudio: 0 }
  for (const entry of Object.values(manifest.entries || {})) {
    if (settled(entry)) { skipped.settled++; continue }
    const hasMaterial = entry.mp3 || (entry.attempts || []).some((a) => a.wav || a.synthesisMp3)
    if (!hasMaterial && !['held', 'failed'].includes(entry.status)) { skipped.noAudio++; continue }
    items.push({ id: entry.id, slug: entry.slug, locale: entry.locale, sourceHash: entry.sourceHash })
  }
  items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.locale < b.locale ? -1 : 1))
  const queue = { schemaVersion: 1, selected: items.length, purpose: 'qc-publish-work', createdAt: new Date().toISOString(), items }
  await writeFile(`${options.out}.tmp`, JSON.stringify(queue, null, 2) + '\n')
  await renameCheckpoint(`${options.out}.tmp`, options.out)
  console.log(JSON.stringify({ event: 'work-queue-built', queued: items.length, ...skipped, out: options.out }))
}

if (process.argv[1] && import.meta.url === new URL(`file:///${resolve(process.argv[1]).replace(/\\/g, '/')}`).href) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
