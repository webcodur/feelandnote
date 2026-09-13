import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, writeFile, readFile, rename, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renameCheckpoint, archiveQcReport, compactManifestQc } from './reading-voice.mjs'

test('Checkpoint replacement retries only temporary sharing errors and never removes the destination', async () => {
  const errors = ['EPERM', 'EBUSY', 'EACCES']
  const waits = []
  let calls = 0
  await renameCheckpoint('pending.tmp', 'manifest.json', {
    renameFile: async (source, target) => {
      assert.equal(source, 'pending.tmp'); assert.equal(target, 'manifest.json')
      if (calls++ < errors.length) throw Object.assign(new Error('sharing error'), { code: errors[calls - 1] })
    },
    sleep: async (ms) => { waits.push(ms) },
  })
  assert.equal(calls, 4)
  assert.deepEqual(waits, [50, 100, 200])
})

test('Manifest compaction archives and verifies full QC, preserving publication checks and all unknown fields', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reading-voice-qc-archive-test-'))
  const report = { ok: true, status: 'passed', audio: 'original.wav', flags: [], metrics: { seconds: 30 }, words: [{ word: 'Original', start: 0 }], transcript: 'Original transcript', pauses: [{ duration: 0.4 }], futureField: { untouched: true } }
  const entry = { status: 'published', mp3Hash: 'hash', finalQcHash: 'hash', qc: structuredClone(report), finalQc: structuredClone(report), attempts: [{ qc: structuredClone(report) }] }
  const manifest = { entries: { sample: entry } }
  try {
    const result = await compactManifestQc(manifest, directory)
    assert.deepEqual(result, { compacted: 3, reports: 1 })
    assert.deepEqual(JSON.parse(await readFile(entry.qc.reportPath, 'utf8')), report)
    assert.equal(createHash('sha256').update(await readFile(entry.qc.reportPath)).digest('hex'), entry.qc.reportHash)
    assert.equal(entry.qc.words, undefined)
    assert.equal(entry.qc.transcript, undefined)
    assert.equal(entry.qc.pauses, undefined)
    assert.deepEqual(entry.qc.futureField, { untouched: true })
    assert.deepEqual(entry.qc.metrics, report.metrics)
    assert.equal(verifiedPublished(entry), true)
    assert.deepEqual(await compactManifestQc(manifest, directory), { compacted: 0, reports: 0 })
    await writeFile(entry.qc.reportPath, 'corrupted')
    await assert.rejects(archiveQcReport(report, directory), /QC_REPORT_HASH_MISMATCH/)
    assert.deepEqual(report.words, [{ word: 'Original', start: 0 }], 'Failure must preserve the full input report')
    assert.equal(await readFile(entry.qc.reportPath, 'utf8'), 'corrupted', 'Existing reports are never overwritten')
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('Checkpoint replacement bounds permanent permission errors and fails immediately on missing source', async () => {
  for (const code of ['EPERM', 'ENOENT']) {
    let calls = 0
    const waits = []
    await assert.rejects(renameCheckpoint('pending.tmp', 'manifest.json', {
      renameFile: async () => { calls++; throw Object.assign(new Error(code), { code }) },
      sleep: async (ms) => { waits.push(ms) },
    }), (error) => error.code === code)
    assert.equal(calls, code === 'EPERM' ? 8 : 1)
    assert.ok(waits.reduce((sum, value) => sum + value, 0) <= 4000)
  }
})

test('Windows shared handle blocks original rename but checkpoint retry succeeds after release with both versions preserved until then', { skip: process.platform !== 'win32', timeout: 15000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reading-voice-sharing-test-'))
  const target = join(directory, 'manifest.json')
  const source = target + '.tmp'
  let child
  try {
    await writeFile(target, 'old'); await writeFile(source, 'new')
    const script = "$stream = [System.IO.File]::Open($env:READING_TEST_LOCK_PATH, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite); [Console]::WriteLine('READY'); [Console]::ReadLine() | Out-Null; $stream.Dispose()"
    child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, env: { ...process.env, READING_TEST_LOCK_PATH: target }, stdio: ['pipe', 'pipe', 'pipe'] })
    const closed = once(child, 'close')
    const [ready] = await once(child.stdout, 'data')
    assert.match(ready.toString(), /READY/)
    await assert.rejects(rename(source, target), (error) => ['EPERM', 'EBUSY', 'EACCES'].includes(error.code))
    assert.equal(await readFile(target, 'utf8'), 'old')
    assert.equal(await readFile(source, 'utf8'), 'new')
    const replacing = renameCheckpoint(source, target)
    setTimeout(() => child.stdin.end('\n'), 150)
    await replacing
    await closed
    assert.equal(await readFile(target, 'utf8'), 'new')
    await assert.rejects(readFile(source), { code: 'ENOENT' })
  } finally {
    if (child && child.exitCode === null) { child.kill(); await once(child, 'close') }
    await rm(directory, { recursive: true, force: true })
  }
})
import { args, pcmToWav, Gemini, publish, speedPlan, reusableAttempt, adoptAttemptWav, isQualityFailure, RequestPacer, safeApiError, synthesizeEntry, qcFailure, verifiedPublished, parseQuotaResponse, summarizeQuota, nextPacificResetAt } from './reading-voice.mjs'

const dailyQuotaBody = JSON.stringify({ error: { details: [
  { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', description: 'secret-test-key' }] },
  { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '58s' },
] } })

test('Daily quota takes precedence over RetryInfo 58s, without exposing descriptions or keys', async () => {
  const quota = parseQuotaResponse(429, dailyQuotaBody, null, ['secret-test-key'])
  assert.equal(quota.kind, 'daily')
  assert.equal(quota.retryDelayMs, 58000)
  assert.equal(JSON.stringify(quota).includes('secret-test-key'), false)
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return new Response(dailyQuotaBody, { status: 429 }) }
  try {
    const gemini = new Gemini(['secret-test-key'], 20)
    await assert.rejects(gemini.generate('Text.', 'en'), (error) => error.quota.kind === 'daily')
    assert.equal(gemini.cooldowns.get(0), nextPacificResetAt())
    await assert.rejects(gemini.generate('Text.', 'en'), /FREE_KEYS_EXHAUSTED/)
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})

test('Pacific resets follow local midnight across summer, winter and both DST transitions', () => {
  for (const [before, after] of [
    ['2026-09-08T12:32:00Z', '2026-09-09T07:02:00.000Z'],
    ['2026-01-01T12:00:00Z', '2026-01-02T08:02:00.000Z'],
    ['2026-03-08T08:00:00Z', '2026-03-09T07:02:00.000Z'],
    ['2026-11-01T07:00:00Z', '2026-11-02T08:02:00.000Z'],
  ]) assert.equal(new Date(nextPacificResetAt(Date.parse(before))).toISOString(), after)
})

test('Minute/unknown quota and forbidden keys remain distinguishable', () => {
  const minute = parseQuotaResponse(429, dailyQuotaBody.replace('PerDay', 'PerMinute'), '90')
  assert.equal(minute.kind, 'minute')
  assert.equal(minute.retryDelayMs, 90000)
  assert.equal(parseQuotaResponse(429, '{"error":{"details":{}}}').kind, 'unknown-429')
  const forbidden = parseQuotaResponse(403, '{"error":{"message":"Permission denied"}}')
  assert.equal(summarizeQuota([forbidden], 2).kind, 'unavailable')
  assert.equal(summarizeQuota([minute, parseQuotaResponse(429, dailyQuotaBody)]).kind, 'minute')
})

test('CLI defaults to read only and requires explicit person scope', () => {
  assert.equal(args(['--slug', 'takeda-shingen'])['dry-run'], true)
  assert.deepEqual(args(['--all-active', '--locales', 'ko,en']).locales, ['ko', 'en'])
  assert.throws(() => args([]), /exactly one/)
  assert.throws(() => args(['--slug', 'one', '--all-active']), /exactly one/)
  assert.throws(() => args(['--slug', 'one', '--dry-run', '--publish']), /cannot be combined/)
  assert.throws(() => args(['--slug', 'one', '--locales', 'ja']), /Locales/)
  const detached = args(['--all-active', '--synthesize-only', '--single-pass', '--concurrency', '8'])
  assert.equal(detached.generate, true)
  assert.equal(detached.concurrency, 8)
  assert.equal(detached.requestsPerSecond, 1)
  assert.throws(() => args(['--all-active', '--synthesize-only', '--publish']), /cannot publish/)
  assert.throws(() => args(['--all-active', '--concurrency', '8']), /between 1 and 3/)
  assert.equal(args(['--all-active', '--synthesize-only', '--dry-run'])['dry-run'], true)
  assert.equal(args(['--all-active', '--publish', '--existing-only'])['existing-only'], true)
  assert.throws(() => args(['--all-active', '--generate', '--publish', '--existing-only']), /without generation/)
})

test('Alignment frame guard is a narrow quality hold and published verified audio skips repeated QC', () => {
  assert.equal(isQualityFailure(qcFailure({ status: 'error', error: 'insufficient-alignment-frames: 1', flags: ['qc-error'] })), true)
  assert.equal(isQualityFailure('QC worker exited 3221225620'), false)
  assert.equal(isQualityFailure('QC error: insufficient-alignment-frames: 17'), false)
  assert.equal(isQualityFailure('QC error: CUDA unavailable'), false)
  assert.equal(verifiedPublished({ status: 'published', mp3Hash: 'hash', finalQcHash: 'hash', qc: { ok: true, status: 'passed' } }), true)
  assert.equal(verifiedPublished({ status: 'ready', mp3Hash: 'hash', finalQcHash: 'hash', qc: { ok: true, status: 'passed' } }), false)
})

test('Shared request pacer reserves separate starts for parallel callers and redacts diagnostic errors', async () => {
  const waits = []
  const pacer = new RequestPacer(1, async (ms) => { waits.push(ms) }, () => 1000)
  await Promise.all(Array.from({ length: 8 }, () => pacer.wait()))
  assert.deepEqual(waits, [1000, 2000, 3000, 4000, 5000, 6000, 7000])
  const error = safeApiError(400, JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'Rejected secret-key and AIzaUnexpectedKey value' } }), ['secret-key'])
  assert.match(error, /HTTP 400 INVALID_ARGUMENT/)
  assert.equal(error.includes('secret-key'), false)
  assert.equal(error.includes('AIzaUnexpectedKey'), false)
})

test('Synthesis-only resumes partial MP3 work with one WAV and preserves existing published or held states', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reading-voice-synthesize-test-'))
  const row = { id: 'test-id', locale: 'en', text: 'word '.repeat(8) }
  const entry = { status: 'pending', attempts: [] }
  let calls = 0
  const gemini = { generate: async () => { calls++; return pcmToWav(Buffer.alloc(96000)) } }
  const options = { run: directory, processingHash: 'processing', 'single-pass': true }
  try {
    const first = await synthesizeEntry(row, entry, options, gemini, async () => {})
    assert.equal(entry.status, 'generated')
    assert.equal(calls, 1)
    assert.ok((await readFile(first.candidate)).length > 1024)
    assert.equal(entry.mp3, undefined, 'unverified candidates must not become publishable MP3s')
    delete entry.attempts[0].synthesisMp3
    const second = await synthesizeEntry(row, entry, options, gemini, async () => {})
    assert.equal(calls, 1, 'encoding interruption must not trigger synthesis')
    assert.notEqual(first.candidate, second.candidate)
    for (const status of ['published', 'held']) {
      entry.status = status
      entry.mp3 = 'existing-published.mp3'
      await synthesizeEntry(row, entry, options, gemini, async () => { throw new Error('Completed synthesis should not rewrite checkpoints') })
      assert.equal(entry.status, status)
      assert.equal(entry.mp3, 'existing-published.mp3')
      assert.equal(calls, 1)
    }
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('PCM WAV header describes the actual samples and rejects empty audio', () => {
  const pcm = Buffer.alloc(48000)
  const wav = pcmToWav(pcm)
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF')
  assert.equal(wav.readUInt32LE(4), wav.length - 8)
  assert.equal(wav.readUInt32LE(24), 24000)
  assert.equal(wav.readUInt32LE(40), pcm.length)
  assert.throws(() => pcmToWav(Buffer.alloc(20)), /invalid or empty/)
})

test('Speed uses Unicode nonwhitespace KO characters and approved English word counting', () => {
  assert.equal(speedPlan('가 나.😀', 'ko', 1).count, 4)
  const ko = speedPlan('가'.repeat(205), 'ko', 37.891)
  assert.equal(ko.status, 'speed-up')
  assert.ok(ko.tempo > 1.109 && ko.tempo < 1.12)
  assert.equal(speedPlan('가'.repeat(60), 'ko', 9).tempo, 1)
  assert.equal(speedPlan('가'.repeat(60), 'ko', 13).status, 'speed-too-slow')
  assert.equal(speedPlan('가'.repeat(60), 'ko', 12.5).status, 'speed-up')
  assert.equal(speedPlan("Don't re-read Mary's notes.", 'en', 2).count, 4)
  const en = speedPlan('word '.repeat(91), 'en', 35.011)
  assert.equal(en.target, 156)
  assert.equal(en.status, 'speed-up')
  assert.ok(91 * 60 / (35.011 / en.tempo + 0.05) >= 156)
  assert.equal(args(['--all-active', '--generate', '--single-pass'])['single-pass'], true)
})

test('Interrupted same-hash processing resumes its WAV while terminal quality holds do not repeat', () => {
  const saved = { wav: 'attempt-1.wav', qcScriptHash: 'qc', processingHash: 'processing' }
  assert.equal(reusableAttempt(saved, 'qc', 'processing'), true, 'legacy checkpoint after raw QC but before final MP3')
  assert.equal(reusableAttempt({ ...saved, status: 'processing' }, 'qc', 'processing'), true)
  assert.equal(reusableAttempt({ ...saved, status: 'failed', error: 'ffmpeg timed out' }, 'qc', 'processing'), true)
  assert.equal(reusableAttempt({ ...saved, status: 'failed', error: 'QC error: CUDA unavailable' }, 'qc', 'processing'), true)
  assert.equal(isQualityFailure('QC error: CUDA unavailable'), false)
  for (const error of ['QC regenerate: low-match', 'Final MP3 QC regenerate: clipping', 'speed-too-slow: 4.2 cps', 'speed-rounding: 5.99']) {
    assert.equal(reusableAttempt({ ...saved, status: 'failed', error }, 'qc', 'processing'), false)
    assert.equal(reusableAttempt({ ...saved, status: 'failed', error }, 'new-qc', 'processing'), true)
  }
  assert.equal(reusableAttempt({ ...saved, status: 'passed' }, 'qc', 'processing'), false)
})

test('Orphan WAV is adopted before synthesis, while malformed existing WAV is preserved without an API call', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reading-voice-orphan-test-'))
  const path = join(directory, 'attempt-1.wav')
  const original = pcmToWav(Buffer.alloc(48000))
  let synthesisCalls = 0
  const recoverOrGenerate = async (attempt) => {
    if (!await adoptAttemptWav(attempt, path)) synthesisCalls++
  }
  try {
    await writeFile(path, original)
    const interrupted = { number: 1, startedAt: '2026-09-08T00:00:00Z' }
    await recoverOrGenerate(interrupted)
    assert.equal(synthesisCalls, 0)
    assert.equal(interrupted.wav, path)
    assert.equal(interrupted.wavHash, createHash('sha256').update(original).digest('hex'))
    assert.deepEqual(await readFile(path), original)
    await assert.rejects(adoptAttemptWav({ wav: path, wavHash: 'wrong-hash' }, path), /hash mismatch/)
    for (const malformed of [original.subarray(0, 100), pcmToWav(Buffer.alloc(48000), 22050)]) {
      await writeFile(path, malformed)
      await assert.rejects(recoverOrGenerate({ number: 1 }), /SAVED_WAV_INVALID/)
      assert.equal(synthesisCalls, 0)
      assert.deepEqual(await readFile(path), malformed)
    }
    assert.equal(await adoptAttemptWav({}, join(directory, 'missing.wav')), false)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('Gemini rejects incomplete output and never puts a key into the URL', async () => {
  const original = globalThis.fetch
  let call
  globalThis.fetch = async (url, options) => {
    call = { url, options }
    return Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: Buffer.alloc(4800).toString('base64') } }] } }] })
  }
  try {
    await assert.rejects(new Gemini(['test-free-key']).generate('Hello.', 'en'), /did not finish normally/)
    assert.equal(call.url.includes('test-free-key'), false)
    assert.equal(call.options.headers['x-goog-api-key'], 'test-free-key')
    const payload = JSON.parse(call.options.body)
    assert.equal(payload.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Charon')
    assert.match(payload.contents[0].parts[0].text, /Read comfortably and naturally/)
  } finally { globalThis.fetch = original }
})

test('Gemini checks each free key at most once on quota exhaustion', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return new Response('', { status: 429 }) }
  try {
    const gemini = new Gemini(['first-test-key', 'second-test-key'])
    await assert.rejects(gemini.generate('text', 'ko'), /FREE_KEYS_EXHAUSTED/)
    assert.equal(calls, 2)
    await assert.rejects(gemini.generate('text', 'ko'), /FREE_KEYS_EXHAUSTED/)
    assert.equal(calls, 2, 'cooling keys must not be called again immediately')
  } finally { globalThis.fetch = original }
})

const successfulGeminiAudio = () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: Buffer.alloc(4800).toString('base64') } }] } }] })

test('Gemini disables a confirmed invalid key for this process and retries the same text with an allowed key', async () => {
  const original = globalThis.fetch
  const calledKeys = []
  globalThis.fetch = async (_url, options) => {
    const key = options.headers['x-goog-api-key']
    calledKeys.push(key)
    return key === 'invalid-test-key'
      ? Response.json({ error: { status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.' } }, { status: 400 })
      : successfulGeminiAudio()
  }
  try {
    const gemini = new Gemini(['invalid-test-key', 'valid-test-key'], 20)
    assert.ok((await gemini.generate('First text.', 'en')).length > 44)
    assert.ok((await gemini.generate('Second text.', 'en')).length > 44)
    assert.deepEqual(calledKeys, ['invalid-test-key', 'valid-test-key', 'valid-test-key'])
    assert.equal(gemini.disabled.has(0), true)
  } finally { globalThis.fetch = original }
})

test('Gemini leaves content-related HTTP 400 as a target failure instead of disabling or rotating keys', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return Response.json({ error: { status: 'INVALID_ARGUMENT', message: 'Input text exceeds the accepted length.' } }, { status: 400 }) }
  try {
    const gemini = new Gemini(['first-key', 'second-key'], 20)
    await assert.rejects(gemini.generate('Long text.', 'en'), /HTTP 400 INVALID_ARGUMENT: Input text exceeds/)
    assert.equal(calls, 1)
    assert.equal(gemini.disabled.size, 0)
  } finally { globalThis.fetch = original }
})

test('Gemini bounds 5xx retries, backs off, and applies the same shared request pacer to every retry', async () => {
  const original = globalThis.fetch
  const starts = []
  const statuses = [500, 502, 504]
  globalThis.fetch = async () => {
    const status = statuses[starts.length]
    starts.push(Date.now())
    return Response.json({ error: { status: 'INTERNAL', message: 'Failure for bounded-test-key' } }, { status })
  }
  try {
    const gemini = new Gemini(['bounded-test-key', 'must-not-fallback-key'], 1)
    let paced = 0
    const wait = gemini.pacer.wait.bind(gemini.pacer)
    gemini.pacer.wait = async () => { paced++; await wait() }
    await assert.rejects(gemini.generate('Text.', 'en'), (error) => /HTTP 504 INTERNAL/.test(error.message) && !error.message.includes('bounded-test-key'))
    assert.equal(starts.length, 3)
    assert.equal(paced, 3)
    assert.ok(starts[1] - starts[0] >= 900, 'global 1 RPS also constrains the first retry')
    assert.ok(starts[2] - starts[1] >= 900, 'second backoff is at least one second')
    assert.equal(gemini.disabled.size, 0)
  } finally { globalThis.fetch = original }
})

test('Gemini recovers a transient 503 without changing the text or the selected free key', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (_url, options) => {
    calls.push({ key: options.headers['x-goog-api-key'], body: options.body })
    return calls.length === 1 ? new Response('', { status: 503 }) : successfulGeminiAudio()
  }
  try {
    const gemini = new Gemini(['recovery-key'], 20)
    assert.ok((await gemini.generate('Keep this exact text.', 'en')).length > 44)
    assert.equal(calls.length, 2)
    assert.deepEqual(calls[0], calls[1])
  } finally { globalThis.fetch = original }
})

test('Publisher retries voice version CAS, verifies public bytes, and resumes cache failure without another increment', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reading-voice-publish-test-'))
  const originalFetch = globalThis.fetch
  const previousEnv = { bucket: process.env.R2_BUCKET_NAME, url: process.env.R2_PUBLIC_URL }
  const hash = (value) => createHash('sha256').update(value).digest('hex')
  const body = Buffer.alloc(2048, 1)
  const mp3 = join(directory, 'fixture.mp3')
  await writeFile(mp3, body)
  process.env.R2_BUCKET_NAME = 'test-bucket'
  process.env.R2_PUBLIC_URL = 'https://example.invalid'
  const row = { id: 'id', slug: 'slug', locale: 'en', text: 'Hello.', sourceHash: hash('Hello.') }
  const entry = { mp3, mp3Hash: hash(body), finalQcHash: hash(body), qcScriptHash: 'qc', settingsHash: 'settings', qc: { ok: true, status: 'passed' }, status: 'ready' }
  let version = 2
  const updates = []
  const db = { from: (table) => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: table === 'celebs' ? { id: 'id', slug: 'slug', voice_v: version, publication_status: 'active' } : { plain_text_en: 'Hello.' } }) }) }),
    update: (value) => {
      updates.push(value)
      const query = { eq: () => query, is: () => query, select: async () => {
        if (updates.length === 1) { version = 9; return { data: [] } }
        version = value.voice_v; return { data: [{ voice_v: version }] }
      } }
      return query
    },
  }) }
  let remote = null
  let puts = 0
  const r2 = { send: async (command) => {
    if (command.constructor.name === 'GetObjectCommand') {
      if (!remote) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' })
      return { Body: { transformToByteArray: async () => remote } }
    }
    if (command.constructor.name === 'PutObjectCommand') { remote = command.input.Body; puts++; return {} }
    throw new Error('Unexpected object deletion')
  } }
  let cacheCalls = 0
  const helpers = { voiceR2Key: () => 'reading.mp3', voiceFileName: () => 'reading.mp3', revalidateWebCeleb: async () => { if (++cacheCalls === 1) throw new Error('cache unavailable') } }
  globalThis.fetch = async () => new Response(body)
  try {
    await assert.rejects(publish(db, r2, row, entry, { run: directory, qcScriptHash: 'qc' }, async () => {}, helpers), /cache unavailable/)
    assert.equal(entry.status, 'published')
    assert.equal(version, 10)
    assert.deepEqual(updates, [{ voice_v: 3 }, { voice_v: 10 }])
    assert.equal(puts, 1)
    await publish(db, r2, row, entry, { run: directory, qcScriptHash: 'qc' }, async () => {}, helpers)
    assert.equal(updates.length, 2)
    assert.equal(puts, 1)
    assert.ok(entry.revalidatedAt)
    entry.mp3Hash = 'tampered'
    await assert.rejects(publish(db, r2, row, entry, {}, async () => {}, helpers), /intact QC-passed MP3/)
  } finally {
    globalThis.fetch = originalFetch
    if (previousEnv.bucket === undefined) delete process.env.R2_BUCKET_NAME; else process.env.R2_BUCKET_NAME = previousEnv.bucket
    if (previousEnv.url === undefined) delete process.env.R2_PUBLIC_URL; else process.env.R2_PUBLIC_URL = previousEnv.url
    await rm(directory, { recursive: true, force: true })
  }
})
