import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

export const timingHash = (value) => createHash('sha256').update(value).digest('hex')
export const TIMING_REVISION = 2
const normalized = (value) => [...value.normalize('NFKC').toLowerCase()].filter((char) => /[\p{L}\p{N}]/u.test(char))
const etagValue = (value) => String(value || '').replace(/^"|"$/g, '')

export function readingSentences(text, locale) {
  const result = []
  for (const item of new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(text)) {
    const leading = item.segment.length - item.segment.trimStart().length
    const part = { textStart: item.index + leading, textEnd: item.index + item.segment.trimEnd().length }
    if (part.textStart === part.textEnd) continue
    const previous = result.at(-1)
    // ICU treats some English honorifics and initials as complete sentences.
    if (previous && locale === 'en' && /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr)|\b[A-Z])\.$/.test(text.slice(previous.textStart, previous.textEnd))) previous.textEnd = part.textEnd
    else result.push(part)
  }
  return result
}

// Exact character matches only. No proportional timestamps or invented positions.
function alignCharacters(source, heard) {
  const width = heard.length + 1
  if ((source.length + 1) * width > 16_000_000) throw new Error('TIMING_ALIGNMENT_TOO_LARGE')
  const table = new Uint16Array((source.length + 1) * width)
  for (let i = source.length - 1; i >= 0; i--) {
    for (let j = heard.length - 1; j >= 0; j--) {
      table[i * width + j] = source[i] === heard[j] ? 1 + table[(i + 1) * width + j + 1] : Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
    }
  }
  const matches = new Map()
  let i = 0; let j = 0
  while (i < source.length && j < heard.length) {
    if (source[i] === heard[j]) { matches.set(i++, j++); continue }
    if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++
    else j++
  }
  return matches
}

export function buildReadingTiming({ text, locale, sourceHash, audioHash, audioEtag, duration, words }) {
  text = text.trim()
  if (timingHash(text) !== sourceHash || !/^[a-f0-9]{64}$/.test(audioHash || '')) throw new Error('TIMING_SOURCE_OR_AUDIO_HASH_MISMATCH')
  if (!Number.isFinite(duration) || duration <= 0 || !Array.isArray(words) || !words.length) throw new Error('TIMING_WORDS_MISSING')
  const source = []; const offsets = []
  let offset = 0
  for (const char of text) {
    for (const letter of normalized(char)) { source.push(letter); offsets.push(offset) }
    offset += char.length
  }
  const heard = []; const wordIndices = []
  let previousStart = 0
  for (const [index, word] of words.entries()) {
    if (!Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < previousStart || word.start < 0 || word.end < word.start || word.end > duration + 0.05) throw new Error('TIMING_INVALID_WORD_TIME')
    previousStart = word.start
    for (const letter of normalized(word.word || '')) { heard.push(letter); wordIndices.push(index) }
  }
  const mapping = alignCharacters(source, heard)
  const segments = []; const rejected = []
  const sentences = readingSentences(text, locale)
  for (const sentence of sentences) {
    const indices = offsets.flatMap((position, index) => position >= sentence.textStart && position < sentence.textEnd ? [index] : [])
    const mapped = indices.filter((index) => mapping.has(index))
    const fail = (reason) => rejected.push({ ...sentence, reason })
    if (!indices.length || mapped.length / indices.length < 0.85) { fail('insufficient-text-match'); continue }
    // Both boundary words must be observed. A few misrecognized letters within an
    // otherwise aligned boundary word can reuse that word's measured bounds.
    const first = indices[0]; const last = indices.at(-1)
    const boundaryWord = (edge, reverse) => {
      if (mapping.has(edge)) return wordIndices[mapping.get(edge)]
      const sentenceText = text.slice(sentence.textStart, sentence.textEnd)
      const token = reverse ? sentenceText.match(/\S+$/u)?.[0] : sentenceText.match(/^\S+/u)?.[0]
      const size = normalized(token || '').length
      const tokenIndices = reverse ? indices.slice(-size) : indices.slice(0, size)
      const tokenMatches = tokenIndices.filter((index) => mapping.has(index))
      if (size < 3 || tokenMatches.length / size < 0.5 || !tokenMatches.length) return undefined
      if (Math.abs((reverse ? tokenMatches.at(-1) : tokenMatches[0]) - edge) > 2) return undefined
      const word = wordIndices[mapping.get(tokenMatches[0])]
      if (!tokenMatches.every((index) => wordIndices[mapping.get(index)] === word)) return undefined
      const heardSize = normalized(words[word].word).length
      return heardSize / size >= 0.5 && heardSize / size <= 1.5 ? word : undefined
    }
    const heardCount = mapping.get(mapped.at(-1)) - mapping.get(mapped[0]) + 1
    if (mapped.length / heardCount < 0.85) { fail('unexpected-spoken-text'); continue }
    const firstWord = boundaryWord(first, false); const lastWord = boundaryWord(last, true)
    if (firstWord === undefined || lastWord === undefined) {
      // When the sentence itself is well matched but a name, acronym or number
      // is transcribed differently at an edge, keep the measured interval of
      // the observed words. Do not stretch it across an unobserved gap.
      const observedFirstWord = wordIndices[mapping.get(mapped[0])]
      const observedLastWord = wordIndices[mapping.get(mapped.at(-1))]
      const observedStart = words[observedFirstWord].start
      const observedEnd = Math.min(duration, words[observedLastWord].end)
      if (mapped.length / indices.length >= 0.85 && observedEnd > observedStart && (!segments.length || observedStart >= segments.at(-1).end)) {
        segments.push({ start: observedStart, end: observedEnd, ...sentence })
        continue
      }
      fail('unmatched-sentence-boundary'); continue
    }
    // A Whisper word crossing a source sentence boundary has no measured split point.
    const before = first > 0 ? mapping.get(first - 1) : undefined
    const after = last + 1 < source.length ? mapping.get(last + 1) : undefined
    if ((before !== undefined && wordIndices[before] === firstWord) || (after !== undefined && wordIndices[after] === lastWord)) { fail('word-crosses-sentence-boundary'); continue }
    const start = words[firstWord].start; const end = Math.min(duration, words[lastWord].end)
    if (end <= start || (segments.length && start < segments.at(-1).end)) { fail('overlapping-or-empty-time'); continue }
    segments.push({ start, end, ...sentence })
  }
  return { timing: { version: 1, sourceHash, audioHash, audioEtag, duration, segments }, sentences: sentences.length, rejected }
}

export async function prepareReadingTiming(entry) {
  if (entry.finalQcHash !== entry.mp3Hash) throw new Error('TIMING_FINAL_AUDIO_QC_HASH_MISMATCH')
  const audio = await readFile(entry.mp3)
  if (timingHash(audio) !== entry.mp3Hash) throw new Error('TIMING_AUDIO_FILE_HASH_MISMATCH')
  let report = entry.finalQc
  if (report?.reportPath) {
    const body = await readFile(report.reportPath)
    if (timingHash(body) !== report.reportHash) throw new Error('TIMING_QC_REPORT_HASH_MISMATCH')
    report = JSON.parse(body)
  }
  if (!report?.ok || report.status !== 'passed' || !report.audio || resolve(report.audio) !== resolve(entry.mp3)) throw new Error('TIMING_REQUIRES_FINAL_MP3_QC')
  return buildReadingTiming({ text: entry.text, locale: entry.locale, sourceHash: entry.sourceHash, audioHash: entry.mp3Hash, audioEtag: '', duration: report.metrics?.duration, words: report.words })
}

async function objectOrNull(r2, command) {
  try { return await r2.send(command, { abortSignal: AbortSignal.timeout(30_000) }) }
  catch (error) { if (error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return null; throw error }
}

export async function publishReadingTiming(r2, entry, options, prepared, { audioEtag } = {}) {
  const result = prepared || await prepareReadingTiming(entry)
  if (!result.timing.segments.length) return { status: 'unavailable', reason: 'No confidently aligned sentences', rejected: result.rejected.length }
  const bucket = process.env.R2_BUCKET_NAME
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
  if (!bucket || !base) throw new Error('Missing R2 timing configuration')
  const audioKey = `celebs/${entry.id}/voice/${entry.locale}/reading.mp3`
  const key = audioKey.replace(/\.mp3$/, '.json')
  if (!audioEtag) {
    const object = await objectOrNull(r2, new HeadObjectCommand({ Bucket: bucket, Key: audioKey }))
    const audio = await readFile(entry.mp3)
    if (!object || object.Metadata?.['audio-sha256'] !== entry.mp3Hash) throw new Error('TIMING_REMOTE_AUDIO_HASH_MISMATCH')
    // All narration uploads are single-part PutObject. Check the actual object ETag
    // against the local bytes as well as the publisher's SHA metadata.
    if (etagValue(object.ETag) !== createHash('md5').update(audio).digest('hex')) throw new Error('TIMING_REMOTE_AUDIO_ETAG_MISMATCH')
    audioEtag = object.ETag
  }
  result.timing.audioEtag = audioEtag
  const body = Buffer.from(JSON.stringify(result.timing) + '\n')
  const hash = timingHash(body)
  const path = join(options.run, entry.id, entry.locale, `reading-timing-${hash}.json`)
  await mkdir(dirname(path), { recursive: true })
  try { await writeFile(path, body, { flag: 'wx' }) } catch (error) { if (error.code !== 'EEXIST') throw error }
  if (timingHash(await readFile(path)) !== hash) throw new Error('TIMING_LOCAL_FILE_HASH_MISMATCH')
  const previous = await objectOrNull(r2, new GetObjectCommand({ Bucket: bucket, Key: key }))
  const previousBody = previous ? Buffer.from(await previous.Body.transformToByteArray()) : null
  if (!previousBody || timingHash(previousBody) !== hash) {
    if (previousBody) {
      const backup = join(options.run, '_backup', entry.id, entry.locale, `reading-${timingHash(previousBody)}.json`)
      await mkdir(dirname(backup), { recursive: true })
      try { await writeFile(backup, previousBody, { flag: 'wx' }) } catch (error) { if (error.code !== 'EEXIST') throw error }
      if (timingHash(await readFile(backup)) !== timingHash(previousBody)) throw new Error('TIMING_BACKUP_HASH_MISMATCH')
    }
    await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'application/json; charset=utf-8', CacheControl: 'public, max-age=300, must-revalidate', Metadata: { 'source-sha256': entry.sourceHash, 'audio-sha256': entry.mp3Hash } }), { abortSignal: AbortSignal.timeout(30_000) })
    const uploaded = await objectOrNull(r2, new GetObjectCommand({ Bucket: bucket, Key: key }))
    if (!uploaded || timingHash(Buffer.from(await uploaded.Body.transformToByteArray())) !== hash) throw new Error('TIMING_UPLOAD_VERIFICATION_FAILED')
  }
  const response = await fetch(`${base}/${key}?verify=${hash}`, { cache: 'no-store', signal: AbortSignal.timeout(30_000) })
  if (!response.ok || timingHash(Buffer.from(await response.arrayBuffer())) !== hash) throw new Error('TIMING_PUBLIC_VERIFICATION_FAILED')
  return { status: 'published', revision: TIMING_REVISION, path, key, hash, audioHash: entry.mp3Hash, sourceHash: entry.sourceHash, audioEtag, segments: result.timing.segments.length, sentences: result.sentences, rejected: result.rejected.length, publishedAt: new Date().toISOString() }
}
