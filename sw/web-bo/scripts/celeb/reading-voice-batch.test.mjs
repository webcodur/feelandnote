import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { batchArgs, batchStages, completedScan, runBatch, batchStatus, quotaWaitPlan, updateContinuousStatus } from './reading-voice-batch.mjs'

test('Quota waits use daily reset before short RetryInfo and bound unknown or no-progress retries', () => {
  const clock = Date.parse('2026-09-08T12:32:00Z')
  assert.equal(batchArgs(['--wait-for-quota'])['wait-for-quota'], true)
  assert.equal(quotaWaitPlan({ kind: 'daily', retryAfterMs: 58000 }, {}, 1453, clock).nextRetryAt, '2026-09-09T07:02:00.000Z')
  assert.equal(Date.parse(quotaWaitPlan({ kind: 'minute', retryAfterMs: 90000 }, {}, 1, clock).nextRetryAt) - clock, 93000)
  let previous = {}
  for (let count = 1; count <= 3; count++) {
    const plan = quotaWaitPlan({ kind: 'unknown-429' }, previous, count, clock)
    assert.equal(Date.parse(plan.nextRetryAt) - clock, 15 * 60000 * 2 ** (count - 1))
    previous = plan.counters
  }
  assert.equal(quotaWaitPlan({ kind: 'unknown-429' }, previous, 4, clock), null)
  assert.equal(quotaWaitPlan({ kind: 'unavailable' }, {}, 0, clock), null)
  assert.equal(quotaWaitPlan({ kind: 'daily' }, { lastGenerated: 1, noProgress: 3 }, 1, clock), null)
})

test('Status counts only actual audio as QC pending and counts empty or stale references as missing', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-audio-count-test-'))
  try {
    const wav = join(run, 'real.wav')
    const mp3 = join(run, 'real.mp3')
    await writeFile(wav, 'fixture'); await writeFile(mp3, 'fixture')
    await writeFile(join(run, 'manifest.json'), JSON.stringify({ entries: {
      empty: { status: 'pending', attempts: [] },
      stale: { status: 'pending', attempts: [{ wav: join(run, 'missing.wav') }] },
      raw: { status: 'pending', attempts: [{ wav }] },
      encoded: { status: 'failed', mp3, attempts: [] },
      published: { status: 'published', mp3, attempts: [] },
    } }))
    const status = await batchStatus(run)
    assert.equal(status.generated, 1)
    assert.equal(status.pendingQc, 2)
    assert.equal(status.missingAudio, 2)
  } finally { await rm(run, { recursive: true, force: true }) }
})

test('Continuous status updates only the marked paragraph for the full default run, and never on read-only or sample options', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-doc-test-'))
  const path = join(run, 'status.md')
  const original = '# Preserve title\r\n<!-- reading-voice-status:start -->\r\nOld status\r\n<!-- reading-voice-status:end -->\r\nPreserve policy\r\n'
  const options = batchArgs([])
  const summary = { selected: 6568, generated: 1114, published: 1114, pendingQc: 0, held: 0, failed: 0, missingAudio: 5454 }
  try {
    await writeFile(path, original)
    for (const override of [{ status: true }, { 'dry-run': true }, { slug: 'sample' }, { limit: 1 }, { run }]) {
      assert.equal((await updateContinuousStatus({ ...options, ...override }, summary, '종료', { path })).updated, false)
      assert.equal(await readFile(path, 'utf8'), original)
    }
    assert.equal((await updateContinuousStatus(options, summary, '생성 단계 종료', { path, clock: Date.parse('2026-09-09T07:02:00Z') })).updated, true)
    const revised = await readFile(path, 'utf8')
    assert.match(revised, /2026-09-09 16:02 KST 확인: 생성 단계 종료/)
    assert.match(revised, /음성 미보유 5454개/)
    assert.equal(revised.split('<!-- reading-voice-status:start -->')[0], original.split('<!-- reading-voice-status:start -->')[0])
    assert.equal(revised.split('<!-- reading-voice-status:end -->')[1], original.split('<!-- reading-voice-status:end -->')[1])
    await writeFile(path, 'No markers')
    assert.equal((await updateContinuousStatus(options, summary, '종료', { path })).error, 'STATUS_MARKERS_INVALID')
    assert.equal(await readFile(path, 'utf8'), 'No markers')
  } finally { await rm(run, { recursive: true, force: true }) }
})

test('Synthesis and termination each report once, while reporting errors do not change the audio result', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-report-test-'))
  const phases = []
  try {
    const result = await runBatch({ run, device: 'cpu' }, async () => ({ exitCode: 1, lastError: 'FREE_KEYS_EXHAUSTED', quota: { kind: 'daily' }, finished: null }), undefined, async (_options, _summary, phase) => { phases.push(phase); throw new Error('Document write denied') })
    assert.equal(result.exitCode, 2)
    assert.equal(result.stopReason, 'FREE_KEYS_EXHAUSTED')
    assert.equal(phases.length, 2)
    assert.match(phases[0], /생성 단계 종료/)
    assert.match(phases[1], /이번 배치 중단/)
  } finally { await rm(run, { recursive: true, force: true }) }
})

test('Automatic quota wait persists live state then resumes the same stage before QC', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-quota-test-'))
  const calls = []
  let waits = 0
  try {
    const result = await runBatch({ run, device: 'cpu', 'wait-for-quota': true }, async (stage) => {
      calls.push(stage.id)
      if (calls.length === 1) return { exitCode: 1, finished: null, lastError: 'FREE_KEYS_EXHAUSTED', quota: { kind: 'daily', retryAfterMs: 58000 } }
      assert.equal(waits, 1)
      return { exitCode: 0, finished: { event: 'finished', selected: 1 } }
    }, async (nextRetryAt) => {
      waits++
      const status = await batchStatus(run)
      assert.equal(status.batchStatus, 'waiting-quota')
      assert.equal(status.running, true)
      assert.equal(status.nextRetryAt, nextRetryAt)
      assert.equal(status.quotaResumes, 1)
      assert.deepEqual(calls, ['synthesize'])
    })
    assert.equal(result.exitCode, 1, 'The fake scan has no actual audio and must remain unresolved')
    assert.deepEqual(calls, ['synthesize', 'synthesize', 'qc-publish', 'retry'])
    assert.equal((await batchStatus(run)).nextRetryAt, null)
  } finally { await rm(run, { recursive: true, force: true }) }
})

test('Forbidden or invalid keys stop without waiting even when quota waiting is enabled', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-forbidden-test-'))
  try {
    const result = await runBatch({ run, device: 'cpu', 'wait-for-quota': true }, async () => ({ exitCode: 1, finished: null, lastError: 'FREE_KEYS_EXHAUSTED', quota: { kind: 'unavailable' } }), async () => { throw new Error('Must not wait') })
    assert.equal(result.exitCode, 2)
    assert.equal(result.batchStatus, 'stopped')
  } finally { await rm(run, { recursive: true, force: true }) }
})

test('Interrupted quota waiting resumes the saved deadline without another API scan first', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-wait-resume-test-'))
  const options = { run, device: 'cpu', 'wait-for-quota': true }
  try {
    await assert.rejects(runBatch(options, async () => ({ exitCode: 1, finished: null, lastError: 'FREE_KEYS_EXHAUSTED', quota: { kind: 'daily' } }), async () => { throw new Error('Simulated interruption') }), /Simulated interruption/)
    const interrupted = await batchStatus(run)
    assert.equal(interrupted.batchStatus, 'interrupted')
    assert.equal(interrupted.running, false)
    let waited = false
    await runBatch(options, async () => {
      assert.equal(waited, true)
      return { exitCode: 0, finished: { event: 'finished', selected: 1 } }
    }, async (deadline) => {
      assert.equal(deadline, interrupted.nextRetryAt)
      assert.equal((await batchStatus(run)).quotaResumes, 1)
      waited = true
    })
  } finally { await rm(run, { recursive: true, force: true }) }
})

test('The three stages generate all once before existing-only QC and bounded retries', () => {
  const stages = batchStages(batchArgs(['--run', 'example']))
  assert.deepEqual(stages.map((stage) => stage.id), ['synthesize', 'qc-publish', 'retry'])
  assert.ok(stages[0].args.includes('--synthesize-only'))
  assert.ok(stages[0].args.includes('--single-pass'))
  assert.ok(stages[1].args.includes('--existing-only'))
  assert.equal(stages[1].args.includes('--generate'), false)
  assert.ok(stages[2].args.includes('--generate'))
  assert.equal(stages[2].args.includes('--single-pass'), false)
})

test('Exit 1 advances only with an actual finished full-scan event', () => {
  assert.equal(completedScan(1, { event: 'finished', selected: 6568, failed: 2, held: 3 }), true)
  assert.equal(completedScan(1, null), false)
  assert.equal(completedScan(null, { event: 'finished', selected: 6568 }), false)
  assert.equal(completedScan(0, { event: 'preflight', selected: 6568 }), false)
})

test('Manual quota stop scans existing audio once and leaves synthesis and full QC unfinished for the next command', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-partial-qc-test-'))
  const options = { run, device: 'cpu' }
  const calls = []
  const finished = { exitCode: 1, finished: { event: 'finished', selected: 2, held: 1 } }
  try {
    await writeFile(join(run, 'saved.wav'), 'fixture')
    await writeFile(join(run, 'manifest.json'), JSON.stringify({ entries: { sample: { status: 'held', attempts: [{ wav: join(run, 'saved.wav') }] } } }))
    const result = await runBatch(options, async (stage) => {
      calls.push(stage.id)
      if (stage.id === 'synthesize') return { exitCode: 1, lastError: 'FREE_KEYS_EXHAUSTED', quota: { kind: 'daily' }, finished: null }
      assert.equal(stage.id, 'qc-publish-partial')
      assert.ok(stage.args.includes('--existing-only'))
      assert.ok(stage.args.includes('--publish'))
      assert.equal(stage.args.includes('--generate'), false)
      assert.equal((await batchStatus(run)).stage, 'qc-publish-partial')
      return finished
    }, async () => { throw new Error('Manual execution must not wait') })
    assert.deepEqual(calls, ['synthesize', 'qc-publish-partial'])
    assert.equal(result.exitCode, 2)
    assert.equal(result.stage, 'synthesize')
    assert.deepEqual(result.completedStages, [])
    assert.equal(result.partialQc.completed, true)
    assert.equal(result.stopReason, 'FREE_KEYS_EXHAUSTED')
    assert.equal(result.nextRetryAt, null)
    calls.length = 0
    await runBatch(options, async (stage) => { calls.push(stage.id); return finished })
    assert.deepEqual(calls, ['synthesize', 'qc-publish', 'retry'])
  } finally { await rm(run, { recursive: true, force: true }) }
})

test('Non-quota failures never start partial QC and a partial QC crash remains an incomplete stop', async () => {
  for (const reason of ['Database unavailable', 'FREE_KEYS_EXHAUSTED']) {
    const run = await mkdtemp(join(tmpdir(), 'reading-voice-partial-failure-test-'))
    const calls = []
    try {
      await writeFile(join(run, 'saved.wav'), 'fixture')
      await writeFile(join(run, 'manifest.json'), JSON.stringify({ entries: { sample: { status: 'generated', attempts: [{ wav: join(run, 'saved.wav') }] } } }))
      const result = await runBatch({ run, device: 'cpu' }, async (stage) => {
        calls.push(stage.id)
        if (stage.id === 'synthesize') return { exitCode: 1, lastError: reason, quota: { kind: 'daily' }, finished: null }
        throw new Error('QC worker exited')
      })
      assert.equal(result.exitCode, 2)
      assert.deepEqual(result.completedStages, [])
      if (reason === 'FREE_KEYS_EXHAUSTED') {
        assert.deepEqual(calls, ['synthesize', 'qc-publish-partial'])
        assert.equal(result.partialQc.completed, false)
        assert.match(result.stopReason, /QC worker exited/)
      } else assert.deepEqual(calls, ['synthesize'])
    } finally { await rm(run, { recursive: true, force: true }) }
  }
})

test('A live standalone QC process takes precedence over stale stopped batch status without modifying history', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-standalone-status-test-'))
  try {
    await writeFile(join(run, 'reading-voice-batch.json'), JSON.stringify({ status: 'stopped', currentStage: 'synthesize', stopReason: 'USER_STOPPED', completedStages: [] }))
    await writeFile(join(run, 'reading-voice.lock'), JSON.stringify({ pid: process.pid }))
    const status = await batchStatus(run, async (pid) => { assert.equal(pid, process.pid); return 'qc-publish-existing' })
    assert.equal(status.running, true)
    assert.equal(status.stage, 'qc-publish-existing')
    assert.equal(status.batchStatus, 'standalone-running')
    assert.equal(status.stopReason, null)
    assert.equal(status.savedStopReason, 'USER_STOPPED')
    assert.equal(status.savedBatchStatus, 'stopped')
  } finally { await rm(run, { recursive: true, force: true }) }
})

test('Quota stops before QC; resume reuses completed stages and does not rerun finite retries', async () => {
  const run = await mkdtemp(join(tmpdir(), 'reading-voice-batch-test-'))
  const options = { run, device: 'cpu' }
  const calls = []
  try {
    const stopped = await runBatch(options, async (stage) => {
      calls.push(stage.id)
      return { exitCode: 1, finished: null, lastError: 'FREE_KEYS_EXHAUSTED' }
    })
    assert.equal(stopped.exitCode, 2)
    assert.deepEqual(calls, ['synthesize'])
    assert.equal((await batchStatus(run)).stopReason, 'FREE_KEYS_EXHAUSTED')
    await writeFile(join(run, 'saved.wav'), 'fixture')
    await writeFile(join(run, 'manifest.json'), JSON.stringify({ entries: { sample: { status: 'held', attempts: [{ wav: join(run, 'saved.wav') }] } } }))
    const resumed = await runBatch(options, async (stage) => {
      calls.push(stage.id)
      return { exitCode: 1, finished: { event: 'finished', selected: 1, held: 1, failed: 0 } }
    })
    assert.equal(resumed.exitCode, 1)
    assert.equal(resumed.batchStatus, 'finished-with-unresolved')
    assert.deepEqual(calls, ['synthesize', 'synthesize', 'qc-publish', 'retry'])
    await runBatch(options, async () => { throw new Error('Completed stages must not run again') })
    assert.equal((await batchStatus(run)).generated, 1)
    assert.deepEqual((await batchStatus(run)).completedStages, ['synthesize', 'qc-publish', 'retry'])
  } finally { await rm(run, { recursive: true, force: true }) }
})
