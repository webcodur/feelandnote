/** Return discarded reading voices (timing unresolved) to pending so the pipeline regenerates them. Dry-run by default; --apply writes. */
import { readdir, readFile, rename, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const DEFAULT_RUN = 'D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908'
/** 폐기 스크립트가 남기는 필드 — 이것만 남기고 나머지 시도 기록·파생 필드를 지운다 */
const KEEP = new Set(['id', 'slug', 'nickname', 'locale', 'text', 'sourceHash', 'settingsHash'])
const exists = (p) => access(p).then(() => true, () => false)

export function resetArgs(argv = process.argv.slice(2)) {
  const options = { run: DEFAULT_RUN }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--apply' || arg === '--help') options[arg.slice(2)] = true
    else if (['--run', '--audit'].includes(arg) && argv[i + 1] && !argv[i + 1].startsWith('--')) options[arg.slice(2)] = argv[++i]
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

/** 폐기 직후 생긴 가장 최근 감사 파일을 집는다 — 폐기 → 복귀를 잇달아 하므로 늘 존재한다 */
async function latestAudit(run) {
  const backup = join(run, '_backup')
  const dirs = (await readdir(backup, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && d.name.startsWith('removed-timing-unresolved-'))
    .map((d) => d.name).sort()
  for (const name of dirs.reverse()) {
    const path = join(backup, name, 'discard-audit.json')
    if (await exists(path)) return path
  }
  throw new Error('discard-audit.json을 찾지 못했다 — 먼저 reading-voice-discard-unresolved.mjs --discard를 실행한다')
}

async function main() {
  const options = resetArgs()
  if (options.help) { console.log('node --import tsx scripts/celeb/reading-voice-reset-discarded.mjs [--apply] [--run DIR] [--audit FILE]'); return }

  for (const lock of ['reading-voice.lock', 'reading-voice-batch.lock']) {
    if (await exists(join(options.run, lock))) throw new Error(`배치 실행 중(${lock}). 종료 후 다시 실행한다.`)
  }

  const auditPath = options.audit ?? await latestAudit(options.run)
  const manifestPath = join(options.run, 'manifest.json')
  const queuePath = join(options.run, 'reading-voice-synthesis-queue.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const queue = JSON.parse(await readFile(queuePath, 'utf8'))
  const audit = JSON.parse(await readFile(auditPath, 'utf8'))

  const targets = []
  const skipped = []
  for (const item of audit.entries) {
    const key = `${item.id}/${item.locale}`
    const entry = manifest.entries[key]
    if (!entry) { skipped.push([key, 'manifest 없음']); continue }
    if (entry.status === 'published') { skipped.push([key, '다시 게시됨']); continue }
    // 필드가 아니라 실제 파일로 판정한다 — 폐기분은 음원이 백업으로 옮겨져 경로 필드만 남는다
    const audio = [...(entry.attempts || []).map((a) => a.wav), typeof entry.mp3 === 'string' ? entry.mp3 : entry.mp3?.path].filter(Boolean)
    if ((await Promise.all(audio.map(exists))).some(Boolean)) { skipped.push([key, '음원 파일 존재']); continue }
    targets.push({ key, entry })
  }

  const queued = new Set(queue.items.map((i) => `${i.id}/${i.locale}`))
  const toQueue = targets.filter(({ key }) => !queued.has(key))
  console.log(JSON.stringify({ event: 'reset-plan', dryRun: !options.apply, audit: auditPath, entries: audit.entries.length, targets: targets.length, skipped: skipped.length, alreadyQueued: targets.length - toQueue.length, toQueue: toQueue.length }))
  if (skipped.length) console.log(JSON.stringify({ event: 'skipped', rows: skipped.slice(0, 20) }))
  if (!options.apply || !targets.length) return

  for (const { entry } of targets) {
    for (const k of Object.keys(entry)) if (!KEEP.has(k)) delete entry[k]
    entry.status = 'pending'
    entry.attempts = []
  }
  for (const { entry } of toQueue) queue.items.push({ id: entry.id, slug: entry.slug, locale: entry.locale, sourceHash: entry.sourceHash })
  queue.items.sort((a, b) => a.id.localeCompare(b.id) || (a.locale === b.locale ? 0 : a.locale === 'ko' ? -1 : 1))
  queue.queued = queue.items.length
  queue.held = Math.max(0, (queue.held || 0) - toQueue.length)
  manifest.updatedAt = new Date().toISOString()

  const writeJson = async (path, data) => { await writeFile(`${path}.tmp`, JSON.stringify(data, null, 2) + '\n'); await rename(`${path}.tmp`, path) }
  await writeJson(manifestPath, manifest)
  await writeJson(queuePath, queue)
  console.log(JSON.stringify({ event: 'reset-finished', cleared: targets.length, queuedAdded: toQueue.length, queueTotal: queue.items.length }))
}

await main()
