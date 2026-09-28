#!/usr/bin/env node
/**
 * 발행된 스티치 음원의 유닛별 속도 흔들림을 재정리한다.
 *
 * 같은 run 폴더의 유닛 clean wav를 재사용해 유닛별 atempo → 재스티치 → 재검수 →
 * manifest의 mp3를 새 파일로 바꾸고 status='ready'로 둔다. TTS는 재호출하지 않는다.
 * 이어서 faction-desc-voice.mjs --publish가 새 mp3를 R2에 올리고 타이밍을 재발행한다.
 *
 *   node --import tsx scripts/faction/desc-speed-normalize.mjs --run <dir> [--slug X] [--locale ko|en] [--limit N] [--concurrency N] [--dry-run]
 */
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import {
  sha, now, exists, log,
  measuredSpeed, encodeMp3, run, archiveQcReport,
  QcWorker, SPEED_POLICY, MP3_SETTINGS, QC_SCRIPT,
} from '../celeb/reading-voice.mjs'
import { buildUnits, stitchUnits, qcGapVerdict } from './desc-unit-stitch.mjs'
import { normalizeUnitSpeed } from './faction-desc-voice.mjs'

function args(argv = process.argv.slice(2)) {
  const flags = new Set(['--dry-run', '--help'])
  const values = new Set(['--run', '--slug', '--locale', '--limit', '--concurrency', '--python', '--device'])
  const result = {}
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (flags.has(key)) result[key.slice(2)] = true
    else if (values.has(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) result[key.slice(2)] = argv[++i]
    else throw new Error(`Unknown or incomplete argument: ${key}`)
  }
  if (result.help) return result
  result.run = result.run || 'D:/audios/interview-cleaner/faction-desc-voices-v2'
  result.limit = result.limit ? Number(result.limit) : Infinity
  result.concurrency = Math.min(3, Math.max(1, Number(result.concurrency || 2)))
  return result
}

async function main() {
  const options = args()
  const manifestPath = join(options.run, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const qcScriptHash = sha(await readFile(QC_SCRIPT))
  const processingHash = sha(JSON.stringify({ mp3: MP3_SETTINGS, speed: SPEED_POLICY }))

  const rows = Object.values(manifest.entries)
    .filter((e) => e.status === 'published')
    .filter((e) => !options.slug || e.slug === options.slug)
    .filter((e) => !options.locale || e.locale === options.locale)
    .slice(0, options.limit)
  log('normalize-targets', { total: rows.length, run: options.run, dryRun: Boolean(options['dry-run']) })
  if (options['dry-run']) return

  const workers = Array.from({ length: options.concurrency }, () => new QcWorker(options))
  let next = 0, done = 0, failed = 0
  const checkpoint = async () => writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  async function processEntry(entry, qc) {
    const attempt = [...(entry.attempts || [])].reverse().find((a) => a.status === 'passed')
    if (!attempt) throw new Error('no passed attempt')
    const dir = join(options.run, entry.id, entry.locale)
    const units = buildUnits(entry.text)
    const normFiles = []
    const tempos = []
    for (const unit of units) {
      const uClean = join(dir, `attempt-${attempt.number}-u${String(unit.index).padStart(2, '0')}-clean.wav`)
      if (!(await exists(uClean))) throw new Error(`missing ${uClean}`)
      const uNorm = uClean.replace(/-clean\.wav$/i, '-norm.wav')
      tempos.push(await normalizeUnitSpeed(unit.text, uClean, uNorm, entry.locale))
      normFiles.push({ path: uNorm, seam: unit.leadSeam })
    }
    const stitched = join(dir, `attempt-${attempt.number}-norm.wav`)
    const { gaps } = await stitchUnits(normFiles, stitched)
    const result = await qc.check({ id: `${entry.id}/${entry.locale}`, audio: stitched, text: entry.text, locale: entry.locale, output: stitched.replace(/\.wav$/i, '-repaired.wav') })
    let audioForUse = result.audio
    if (!result.ok) {
      const verdict = qcGapVerdict(result, gaps)
      if (!verdict.passed) throw new Error(`norm stitch QC: ${JSON.stringify(verdict.flags)}`)
      audioForUse = stitched
    } else if (!['passed', 'repaired'].includes(result.status) || !result.audio) throw new Error(`norm stitch QC unexpected status ${result.status}`)

    const speed = await measuredSpeed(entry.text, entry.locale, audioForUse)
    if (speed.status === 'speed-too-slow') throw new Error(`normalized audio still too slow ${speed.rate}`)
    const mp3 = join(dir, `attempt-${attempt.number}-norm.mp3`)
    await encodeMp3(audioForUse, mp3, speed.tempo)
    const finalSpeed = await measuredSpeed(entry.text, entry.locale, mp3)
    if (finalSpeed.rate < finalSpeed.target) throw new Error(`normalized mp3 below target ${finalSpeed.rate}`)

    const finalQc = await qc.check({ id: `${entry.id}/${entry.locale}`, audio: mp3, text: entry.text, locale: entry.locale })
    if (!finalQc.ok || finalQc.status !== 'passed') {
      const scaledGaps = gaps.map((g) => ({ start: g.start / speed.tempo, end: g.end / speed.tempo, kind: g.kind }))
      const verdict = qcGapVerdict(finalQc, scaledGaps)
      if (!verdict.passed) throw new Error(`norm mp3 QC: ${JSON.stringify(finalQc.flags || finalQc)}`)
    }
    entry.mp3 = mp3
    entry.mp3Hash = sha(await readFile(mp3))
    entry.qc = await archiveQcReport(finalQc, options.run)
    entry.finalQc = entry.qc
    entry.finalQcHash = entry.mp3Hash
    entry.qcScriptHash = qcScriptHash
    entry.speed = finalSpeed
    entry.appliedTempo = speed.tempo
    entry.normTempos = tempos
    entry.processingHash = processingHash
    entry.status = 'ready'
    await checkpoint()
  }

  try {
    await Promise.all(workers.map(async (qc) => {
      while (true) {
        const index = next++
        if (index >= rows.length) break
        const entry = rows[index]
        try {
          await processEntry(entry, qc)
          done++
          log('normalized', { progress: `${done}/${rows.length}`, slug: entry.slug, locale: entry.locale, rate: entry.speed?.rate })
        } catch (error) {
          failed++
          log('normalize-failed', { slug: entry.slug, locale: entry.locale, error: error.message })
        }
      }
    }))
  } finally {
    for (const qc of workers) qc.close()
  }
  log('normalize-finished', { done, failed })
  if (failed) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
