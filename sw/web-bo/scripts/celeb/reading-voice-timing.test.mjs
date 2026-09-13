import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildReadingTiming, prepareReadingTiming, readingSentences, timingHash, publishReadingTiming, TIMING_REVISION } from './reading-voice-timing.mjs'
import { timingArgs } from './reading-voice-timing-backfill.mjs'

const make = (text, words, locale = 'en') => buildReadingTiming({ text, locale, words, sourceHash: timingHash(text.trim()), audioHash: 'a'.repeat(64), audioEtag: '"etag"', duration: 10 })
test('sentence times use observed words and preserve gaps, punctuation and UTF16 offsets', () => {
  const text = '😀 Hello world.\n\nGoodbye moon!'
  const result = make(text, [{ word: 'Hello', start: 0.3, end: 1 }, { word: 'world.', start: 1, end: 2 }, { word: 'Goodbye', start: 3.5, end: 4 }, { word: 'moon!', start: 4, end: 5 }])
  assert.deepEqual(result.timing.segments, [{ start: 0.3, end: 2, textStart: 0, textEnd: 15 }, { start: 3.5, end: 5, textStart: 17, textEnd: 30 }])
  assert.equal(result.timing.audioEtag, '"etag"')
})
test('English initials and honorifics stay with their sentence', () => {
  const text = 'Dr. J. Robert spoke. He left.'
  assert.deepEqual(readingSentences(text, 'en').map((x) => text.slice(x.textStart, x.textEnd)), ['Dr. J. Robert spoke.', 'He left.'])
})
test('unspoken first sentence is omitted instead of proportionally timed', () => {
  const result = make('Zebras gather quietly. Birds sing.', [{ word: 'Birds', start: 3, end: 4 }, { word: 'sing.', start: 4, end: 5 }])
  assert.ok(result.timing.segments.every((segment) => segment.textStart >= 22))
  assert.ok(result.rejected.some((segment) => segment.textStart === 0))
})
test('missing boundary word uses the observed interval without borrowing the following word start', () => {
  const text = 'X this is a sentence with enough words to make the observed interval reliable.'
  const result = make(text, 'this is a sentence with enough words to make the observed interval reliable.'.split(' ').map((word, i) => ({ word, start: i * 0.5, end: i * 0.5 + 0.4 })))
  assert.equal(result.timing.segments.length, 1)
  assert.deepEqual(result.timing.segments[0], { start: 0, end: 6.4, textStart: 0, textEnd: text.length })
})
test('Korean boundary word with observed partial spelling uses its actual time', () => {
  const text = '시나노로 군대를 이끌고 많은 전투에서 승리했다.'
  const result = make(text, ['신하노로', '군대를', '이끌고', '많은', '전투에서', '승리했다.'].map((word, i) => ({ word, start: i, end: i + 0.8 })), 'ko')
  assert.equal(result.timing.segments.length, 1)
  assert.equal(result.timing.segments[0].start, 0)
})
test('overlapping sentence times are omitted and invalid word times rejected', () => {
  const result = make('Hello. Goodbye.', [{ word: 'Hello.', start: 0, end: 2 }, { word: 'Goodbye.', start: 1, end: 3 }])
  assert.equal(result.timing.segments.length, 1)
  assert.throws(() => make('Hello.', [{ word: 'Hello.', start: 0, end: 11 }]), /INVALID_WORD_TIME/)
})
test('words bridging punctuation cannot invent an internal timestamp', () => {
  assert.equal(make('Hello. Goodbye.', [{ word: 'Hello.Goodbye', start: 0, end: 3 }]).timing.segments.length, 0)
})
test('repeated phrases align in chronological sequence', () => {
  const text = 'He read books. He read books again.'
  const words = text.split(' ').map((word, i) => ({ word, start: i, end: i + 0.6 }))
  const result = make(text, words)
  assert.deepEqual(result.timing.segments.map(({ start, end }) => [start, end]), [[0, 2.6], [3, 6.6]])
})
test('final QC archive integrity and audio binding are required', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reading-timing-test-'))
  try {
    const mp3 = join(directory, 'final.mp3'); const reportPath = join(directory, 'report.json')
    const audio = Buffer.from('test-audio'); await writeFile(mp3, audio)
    const report = JSON.stringify({ audio: mp3, ok: true, status: 'passed', metrics: { duration: 2 }, words: [{ word: 'Hello.', start: 0, end: 1 }] })
    await writeFile(reportPath, report)
    const entry = { mp3, mp3Hash: timingHash(audio), finalQcHash: timingHash(audio), finalQc: { reportPath, reportHash: timingHash(report) }, text: 'Hello.', sourceHash: timingHash('Hello.'), locale: 'en' }
    assert.equal((await prepareReadingTiming(entry)).timing.segments.length, 1)
    await assert.rejects(prepareReadingTiming({ ...entry, finalQcHash: 'b'.repeat(64) }), /FINAL_AUDIO_QC_HASH_MISMATCH/)
    await writeFile(reportPath, report + ' ')
    await assert.rejects(prepareReadingTiming(entry), /REPORT_HASH_MISMATCH/)
    await writeFile(reportPath, report); await writeFile(mp3, 'changed')
    await assert.rejects(prepareReadingTiming(entry), /AUDIO_FILE_HASH_MISMATCH/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
test('backfill defaults to read-only and rejects generation or contradictory arguments', () => {
  assert.equal(timingArgs([]).publish, undefined)
  assert.throws(() => timingArgs(['--generate']), /Unknown/)
  assert.throws(() => timingArgs(['--dry-run', '--publish']), /Choose/)
})
test('timing publication verifies MP3 ETag, local bytes, R2 and public JSON; replacement backs up old data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reading-timing-publish-test-'))
  const previousFetch = globalThis.fetch
  const env = { R2_BUCKET_NAME: process.env.R2_BUCKET_NAME, R2_PUBLIC_URL: process.env.R2_PUBLIC_URL }
  process.env.R2_BUCKET_NAME = 'test'; process.env.R2_PUBLIC_URL = 'https://timing.example'
  try {
    const audio = Buffer.from('verified-test-mp3'); const mp3 = join(directory, 'audio.mp3'); await writeFile(mp3, audio)
    const etag = `"${createHash('md5').update(audio).digest('hex')}"`
    const entry = { id: 'test-id', locale: 'en', text: 'Hello.', sourceHash: timingHash('Hello.'), mp3, mp3Hash: timingHash(audio) }
    const objects = new Map(); const calls = []
    const r2 = { send: async (command) => {
      const { Key: key, Body: body } = command.input; calls.push(command.constructor.name)
      if (command.constructor.name === 'HeadObjectCommand') return { ETag: etag, Metadata: { 'audio-sha256': entry.mp3Hash } }
      if (command.constructor.name === 'PutObjectCommand') { objects.set(key, Buffer.from(body)); return {} }
      if (!objects.has(key)) { const error = new Error('missing'); error.name = 'NoSuchKey'; throw error }
      return { Body: { transformToByteArray: async () => objects.get(key) } }
    } }
    globalThis.fetch = async (url) => new Response(objects.get(new URL(url).pathname.slice(1)))
    const prepared = () => buildReadingTiming({ ...entry, audioHash: entry.mp3Hash, duration: 2, words: [{ word: entry.text, start: 0.1, end: 1.2 }] })
    const first = await publishReadingTiming(r2, entry, { run: directory }, prepared())
    assert.equal(first.status, 'published'); assert.equal(first.revision, TIMING_REVISION)
    assert.equal(JSON.parse(await readFile(first.path, 'utf8')).audioEtag, etag)
    assert.equal(timingHash(await readFile(first.path)), first.hash)
    const puts = calls.filter((call) => call === 'PutObjectCommand').length
    await publishReadingTiming(r2, entry, { run: directory }, prepared())
    assert.equal(calls.filter((call) => call === 'PutObjectCommand').length, puts)
    entry.text = 'Goodbye.'; entry.sourceHash = timingHash(entry.text)
    const second = await publishReadingTiming(r2, entry, { run: directory }, prepared())
    assert.notEqual(first.hash, second.hash)
    assert.equal(timingHash(await readFile(join(directory, '_backup', entry.id, entry.locale, `reading-${first.hash}.json`))), first.hash)
    const badR2 = { send: async () => ({ ETag: '"incorrect"', Metadata: { 'audio-sha256': entry.mp3Hash } }) }
    await assert.rejects(publishReadingTiming(badR2, entry, { run: directory }, prepared()), /REMOTE_AUDIO_ETAG_MISMATCH/)
  } finally {
    globalThis.fetch = previousFetch
    for (const [key, value] of Object.entries(env)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
    await rm(directory, { recursive: true, force: true })
  }
})
