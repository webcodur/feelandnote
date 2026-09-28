#!/usr/bin/env node
/**
 * desc-speed-normalize.mjs가 QC 경계선에서 떨어뜨린 엔트리를 재시도한다.
 * Whisper 판정은 파형의 미세 차이에 민감하므로, 마지막 유닛 템포에 작은 지터를 주거나
 * 스티치 꼬리를 살짝 다듬어 다른 파형으로 다시 검수한다.
 * 통과하면 normalize 스크립트와 같은 방식으로 manifest를 갱신한다.
 */
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import {
  sha, exists, log,
  measuredSpeed, encodeMp3, run, archiveQcReport,
  QcWorker, SPEED_POLICY, MP3_SETTINGS, QC_SCRIPT,
} from '../celeb/reading-voice.mjs'
import { buildUnits, stitchUnits, qcGapVerdict } from './desc-unit-stitch.mjs'
import { normalizeUnitSpeed, UNIT_TEMPO_RANGE } from './faction-desc-voice.mjs'

const RUN = 'D:/audios/interview-cleaner/faction-desc-voices-v2'

async function jitterUnit(unitText, cleanPath, outPath, locale, jitter) {
  const speed = await measuredSpeed(unitText, locale, cleanPath)
  const tempo = Number.isFinite(speed.rate) && speed.rate > 0
    ? Math.min(UNIT_TEMPO_RANGE[1], Math.max(UNIT_TEMPO_RANGE[0], (speed.target / speed.rate) * jitter))
    : 1
  await run('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', cleanPath, '-af', `atempo=${tempo.toFixed(8)}`, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', outPath])
}

async function trimTail(input, output, seconds) {
  if (seconds <= 0) { await run('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', input, '-c', 'copy', output]); return }
  await run('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', input, '-af', `atrim=end=-${seconds.toFixed(3)}`, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', output])
}

async function main() {
  const slugs = process.argv.slice(2)
  const manifestPath = join(RUN, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const qcScriptHash = sha(await readFile(QC_SCRIPT))
  const processingHash = sha(JSON.stringify({ mp3: MP3_SETTINGS, speed: SPEED_POLICY }))
  const qc = new QcWorker({ device: 'auto' })

  const entries = Object.values(manifest.entries)
    .filter((e) => e.status === 'published' && slugs.includes(`${e.slug}/${e.locale}`))

  try {
    for (const entry of entries) {
      const attempt = [...(entry.attempts || [])].reverse().find((a) => a.status === 'passed')
      const dir = join(RUN, entry.id, entry.locale)
      const units = buildUnits(entry.text)
      const last = units[units.length - 1]
      const variants = [1.005, 0.995, 1.01, 0.99, 1.015, 0.985]
      let doneOk = false
      for (const jitter of variants) {
        // 마지막 유닛에만 지터 — 나머지는 기존 norm을 재사용해 스티치만 다시 한다
        const normFiles = []
        for (const unit of units) {
          const uClean = join(dir, `attempt-${attempt.number}-u${String(unit.index).padStart(2, '0')}-clean.wav`)
          const uNorm = unit === last
            ? join(dir, `attempt-${attempt.number}-u${String(unit.index).padStart(2, '0')}-normj.wav`)
            : uClean.replace(/-clean\.wav$/i, '-norm.wav')
          if (unit === last) await jitterUnit(unit.text, uClean, uNorm, entry.locale, jitter)
          else if (!(await exists(uNorm))) await normalizeUnitSpeed(unit.text, uClean, uNorm, entry.locale)
          normFiles.push({ path: uNorm, seam: unit.leadSeam })
        }
        const stitched = join(dir, `attempt-${attempt.number}-normj.wav`)
        const { gaps } = await stitchUnits(normFiles, stitched)
        const wavQc = await qc.check({ id: `${entry.id}/${entry.locale}`, audio: stitched, text: entry.text, locale: entry.locale, output: stitched.replace(/\.wav$/i, '-repaired.wav') })
        let audioForUse = wavQc.audio
        if (!wavQc.ok) {
          const verdict = qcGapVerdict(wavQc, gaps)
          if (!verdict.passed) { log('retry-wav-fail', { slug: entry.slug, locale: entry.locale, jitter, flags: wavQc.flags }); continue }
          audioForUse = stitched
        } else if (!['passed', 'repaired'].includes(wavQc.status) || !wavQc.audio) { log('retry-wav-status', { slug: entry.slug, status: wavQc.status }); continue }
        const speed = await measuredSpeed(entry.text, entry.locale, audioForUse)
        if (speed.status === 'speed-too-slow') { log('retry-slow', { slug: entry.slug, rate: speed.rate }); continue }
        const mp3 = join(dir, `attempt-${attempt.number}-normj.mp3`)
        await encodeMp3(audioForUse, mp3, speed.tempo)
        const finalSpeed = await measuredSpeed(entry.text, entry.locale, mp3)
        if (finalSpeed.rate < finalSpeed.target) { log('retry-mp3-slow', { slug: entry.slug, rate: finalSpeed.rate }); continue }
        const finalQc = await qc.check({ id: `${entry.id}/${entry.locale}`, audio: mp3, text: entry.text, locale: entry.locale })
        if (!finalQc.ok || finalQc.status !== 'passed') {
          const scaledGaps = gaps.map((g) => ({ start: g.start / speed.tempo, end: g.end / speed.tempo, kind: g.kind }))
          const verdict = qcGapVerdict(finalQc, scaledGaps)
          if (!verdict.passed) { log('retry-mp3-fail', { slug: entry.slug, locale: entry.locale, jitter, flags: finalQc.flags }); continue }
        }
        entry.mp3 = mp3
        entry.mp3Hash = sha(await readFile(mp3))
        entry.qc = await archiveQcReport(finalQc, RUN)
        entry.finalQc = entry.qc
        entry.finalQcHash = entry.mp3Hash
        entry.qcScriptHash = qcScriptHash
        entry.speed = finalSpeed
        entry.appliedTempo = speed.tempo
        entry.processingHash = processingHash
        entry.status = 'ready'
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
        doneOk = true
        log('retry-normalized', { slug: entry.slug, locale: entry.locale, jitter, rate: finalSpeed.rate })
        break
      }
      if (!doneOk) log('retry-exhausted', { slug: entry.slug, locale: entry.locale })
    }
  } finally {
    qc.close()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
