/**
 * 세력 개요 낭독의 문장묶음 합성 단위 + 스티칭.
 * sw/audio-bo/scripts/celeb-monologue-voice-generate.py와 같은 설계:
 * 문장 단위가 아니라 문장 묶음 단위로 합성하고, 문단 경계엔 긴 쉼·문단 중간
 * 이음엔 짧은 쉼을 룸톤으로 끼워 하나의 WAV로 잇는다.
 */
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

export const UNIT_MIN_SENTENCES = 3
export const UNIT_MAX_SENTENCES = 6
export const PARAGRAPH_GAP_SECONDS = 1.0
export const SENTENCE_GAP_SECONDS = 0.45

// QC가 긴 쉼을 고장으로 잡을 때, 그 쉼이 삽입된 문단 쉼 안에만 있으면 통과로 읽는다.
export const PARAGRAPH_GAP_FLAGS = new Set([
  'pause-repair-required',
  'uncertain-sentence-boundary',
  'uncertain-source-boundary',
  'long-mid-sentence-pause',
])
const GAP_MATCH_MARGIN = 0.35

// voice_cleanup.py와 같은 분석 상수 — 단위는 초, RMS는 정규화 진폭이다.
const WINDOW = 0.025
const HOP = 0.010
const VOICE_RMS = 0.005
const TRIM_GUARD = 0.040
const BREATH_FLOOR_RMS = 0.0012
const FALLBACK_TONE_RMS = 0.0005
const STITCH_HEAD_KEEP = 0.06
const STITCH_TAIL_KEEP = 0.15
const MIN_INSERT_GAP = 0.05
const FADE_SECONDS = 0.03

const SENTENCE_END = /[.!?…]+(?=["'”’」』〉》)\]]*\s|["'”’」』〉》)\]]*$)/g
const SENTENCE_CLOSERS = new Set('"\'”’」』〉》)]'.split(''))

function splitSentences(paragraph) {
  const ends = []
  for (const match of paragraph.matchAll(SENTENCE_END)) {
    let end = match.index + match[0].length
    while (end < paragraph.length && SENTENCE_CLOSERS.has(paragraph[end])) end++
    ends.push(end)
  }
  const pieces = []
  let cursor = 0
  for (const end of ends) {
    const piece = paragraph.slice(cursor, end).trim()
    if (piece) pieces.push(piece)
    cursor = end
  }
  const tail = paragraph.slice(cursor).trim()
  if (tail) pieces.push(tail)
  return pieces.length ? pieces : [paragraph.trim()]
}

/**
 * 합성 단위는 문단이 아니라 문장 묶음이다 — 문단 끝에서 UNIT_MIN_SENTENCES를 채우면
 * 닫고, 어디서든 UNIT_MAX_SENTENCES에 닿으면 끊는다. 짧은 문단은 다음으로 넘어가고
 * 긴 문단은 중간에서 나뉜다. leadSeam은 유닛 앞 이음 종류 — 'paragraph'는 긴 쉼,
 * 'sentence'는 짧은 쉼을 받는다.
 */
export function buildUnits(text) {
  const parts = text.trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const sentences = []
  for (const [pi, part] of parts.entries()) {
    const sents = splitSentences(part)
    for (const [si, sent] of sents.entries()) {
      sentences.push({ text: sent, para: pi + 1, paraStart: si === 0, paraEnd: si === sents.length - 1 })
    }
  }
  const groups = []
  let current = []
  for (const sentence of sentences) {
    current.push(sentence)
    if ((current.length >= UNIT_MIN_SENTENCES && sentence.paraEnd) || current.length >= UNIT_MAX_SENTENCES) {
      groups.push(current)
      current = []
    }
  }
  if (current.length) {
    if (groups.length) groups[groups.length - 1].push(...current)
    else groups.push(current)
  }
  return groups.map((group, n) => ({
    index: n + 1,
    paragraphs: [...new Set(group.map((s) => s.para))].sort((a, b) => a - b),
    sentences: group.length,
    text: group.map((s, i) => (i === 0 ? s.text : (s.paraStart ? '\n\n' : ' ') + s.text)).join(''),
    leadSeam: n === 0 ? null : (group[0].paraStart ? 'paragraph' : 'sentence'),
  }))
}

export function spawnBuffer(command, args, input, timeout = 120_000) {
  return new Promise((done, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] })
    const chunks = []
    let stderr = ''
    child.stdout.on('data', (v) => chunks.push(v))
    child.stderr.on('data', (v) => { stderr = (stderr + v.toString()).slice(-3000) })
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${command} timed out`)) }, timeout)
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) done(Buffer.concat(chunks))
      else reject(new Error(`${command} exited ${code}: ${stderr}`))
    })
    if (input) child.stdin.end(input)
  })
}

async function probeRate(path) {
  const out = await spawnBuffer('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', path])
  const rate = Number(out.toString().trim())
  if (!rate) throw new Error(`ffprobe sample_rate failed: ${path}`)
  return rate
}

export async function decode(path) {
  const rate = await probeRate(path)
  const raw = await spawnBuffer('ffmpeg', ['-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', String(rate), '-'])
  const int16 = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2)
  const samples = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) samples[i] = int16[i] / 32768
  return { samples, rate }
}

export async function encodeWav(samples, rate, path) {
  const int16 = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    int16.writeInt16LE(Math.round(v * 32767), i * 2)
  }
  await spawnBuffer('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ac', '1', '-ar', String(rate), '-i', '-', '-c:a', 'pcm_s16le', '-ar', String(rate), path], int16)
}

function envelope(samples, rate) {
  const width = Math.round(rate * WINDOW)
  const hop = Math.round(rate * HOP)
  const frames = []
  for (let i = 0; i + width <= samples.length; i += hop) {
    let sum = 0
    for (let j = i; j < i + width; j++) sum += samples[j] * samples[j]
    frames.push(Math.sqrt(sum / width))
  }
  return frames
}

function edgeSilences(samples, rate) {
  const env = envelope(samples, rate)
  const voiced = env.map((v, i) => (v >= VOICE_RMS ? i : -1)).filter((i) => i >= 0)
  if (!voiced.length) return { head: 0, tail: 0 }
  const duration = samples.length / rate
  const head = Math.max(0, voiced[0] * HOP - TRIM_GUARD)
  const tail = Math.max(0, duration - (voiced[voiced.length - 1] * HOP + WINDOW + TRIM_GUARD))
  return { head, tail }
}

function roomTonePool(samples, rate) {
  const env = envelope(samples, rate)
  const hop = Math.round(rate * HOP)
  const frames = []
  for (const [i, level] of env.entries()) {
    if (level > 0 && level < BREATH_FLOOR_RMS) frames.push(samples.slice(i * hop, (i + 1) * hop))
  }
  const total = frames.reduce((n, f) => n + f.length, 0)
  if (total < rate * 0.2) {
    // 조용한 구간이 부족하면 정규 노이즈로 대체한다.
    const fallback = new Float32Array(rate)
    let state = 1
    for (let i = 0; i < fallback.length; i++) {
      state = (state * 1103515245 + 12345) & 0x7fffffff
      fallback[i] = ((state / 0x7fffffff) * 2 - 1) * FALLBACK_TONE_RMS
    }
    return fallback
  }
  const pool = new Float32Array(total)
  let cursor = 0
  for (const f of frames) { pool.set(f, cursor); cursor += f.length }
  return pool
}

/**
 * 깨끗이 정리된 유닛 WAV들을 이어 붙인다 — 문단 이음엔 긴 쉼, 문장 이음엔 짧은 쉼.
 * 각 유닛 파일 가장자리 무음은 KEEP 만큼만 남기고, 모자란 쉼은 룸톤으로 채운다.
 * 반환: 삽입한 쉼 목록(gaps) — 문단 쉼 판정에 쓴다.
 */
export async function stitchUnits(unitFiles, outputPath) {
  const decoded = []
  let rate = null
  for (const { path } of unitFiles) {
    const { samples, rate: r } = await decode(path)
    if (rate === null) rate = r
    if (r !== rate) throw new Error(`Mixed sample rates across units: ${path}`)
    const { head, tail } = edgeSilences(samples, rate)
    const headKeep = Math.min(head, STITCH_HEAD_KEEP)
    const tailKeep = Math.min(tail, STITCH_TAIL_KEEP)
    const start = Math.round((head - headKeep) * rate)
    const end = samples.length - Math.round((tail - tailKeep) * rate)
    decoded.push({
      samples: samples.slice(start, end),
      head: Math.round(headKeep * rate),
      tail: Math.round(tailKeep * rate),
    })
  }
  if (!decoded.length || rate === null) throw new Error('Nothing to stitch')
  const total = decoded.reduce((n, u) => n + u.samples.length, 0)
  const concat = new Float32Array(total)
  let off = 0
  for (const u of decoded) { concat.set(u.samples, off); off += u.samples.length }
  const pool = roomTonePool(concat, rate)
  const fadeN = Math.round(FADE_SECONDS * rate)

  let seed = 1
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  const gap = (gapN) => {
    const segment = new Float32Array(gapN)
    const roll = Math.floor(rand() * pool.length)
    for (let i = 0; i < gapN; i++) segment[i] = pool[(i + roll) % pool.length]
    const ramp = Math.min(fadeN, Math.floor(gapN / 2))
    for (let i = 0; i < ramp; i++) { segment[i] *= i / ramp; segment[gapN - 1 - i] *= i / ramp }
    return segment
  }

  const chunks = []
  const gaps = []
  let cursor = 0
  for (const [index, unit] of decoded.entries()) {
    if (index > 0) {
      const previous = decoded[index - 1]
      const seam = unitFiles[index].seam || 'paragraph'
      const target = seam === 'sentence' ? SENTENCE_GAP_SECONDS : PARAGRAPH_GAP_SECONDS
      const kept = (previous.tail + unit.head) / rate
      const insert = Math.max(MIN_INSERT_GAP, target - kept)
      const gapN = Math.round(insert * rate)
      const silenceStart = cursor - previous.tail
      chunks.push(gap(gapN))
      cursor += gapN
      gaps.push({
        start: round4(silenceStart / rate),
        end: round4((cursor + unit.head) / rate),
        kind: seam,
      })
    }
    chunks.push(unit.samples)
    cursor += unit.samples.length
  }
  const stitched = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let cursor2 = 0
  for (const c of chunks) { stitched.set(c, cursor2); cursor2 += c.length }
  await encodeWav(stitched, rate, outputPath)
  return { gaps, rate }
}

const round4 = (v) => Math.round(v * 10000) / 10000

function intervalHitsGap(start, end, gaps) {
  return gaps.some((g) => start >= g.start - GAP_MATCH_MARGIN && end <= g.end + GAP_MATCH_MARGIN)
}

/**
 * QC 실패를 문단 쉼 기준으로 재판정한다 — 플래그가 전부 문단쉼 부류이고
 * 수리·긴쉼 구간이 삽입한 쉼 안에만 있으면 통과.
 * 반환: { passed, verdict }
 */
export function qcGapVerdict(result, gaps) {
  if (result?.ok) return { passed: true, verdict: 'passed' }
  const flags = new Set(result?.flags || [])
  const repairs = result?.repairs || []
  const pauses = result?.pauses || []
  if (flags.size && [...flags].every((f) => PARAGRAPH_GAP_FLAGS.has(f))) {
    const repairsInGaps = !repairs.length || repairs.every((r) => intervalHitsGap(r.start, r.end, gaps))
    const pausesInGaps = !pauses.length || pauses.every((p) => intervalHitsGap(p.start, p.end, gaps))
    if (repairsInGaps && pausesInGaps) return { passed: true, verdict: 'passed-paragraph-gaps' }
  }
  return { passed: false, verdict: `qc-failed: ${[...flags].sort().join(',') || 'no-flags'} repairs=${repairs.length} pauses=${pauses.length}` }
}
