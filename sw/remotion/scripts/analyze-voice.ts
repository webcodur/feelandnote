/**
 * analyze-voice.ts — 텍스트 + 파형 결합 분석으로 문장별 타이밍 생성
 *
 * 접근법:
 *   1. 텍스트를 쉼표/마침표로 분할 → 문장 수 결정
 *   2. 글자 수 비례로 각 문장 경계의 추정 시각 계산
 *   3. WAV 파형에서 무음 구간 탐지
 *   4. 각 추정 경계에 가장 가까운 무음 구간의 중심을 실제 경계로 선택
 *
 * Usage:
 *   pnpm analyze -- --episode alexander-the-great --update-json
 *   pnpm analyze -- --episode alexander-the-great --only book-0-context
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// --- WAV 파싱 ---
function parseWav(path: string) {
  const buf = readFileSync(path)
  const sampleRate = buf.readUInt32LE(24)
  const bitsPerSample = buf.readUInt16LE(34)

  let pos = 12
  while (pos < buf.length - 8) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'data') {
      const dataStart = pos + 8
      const numSamples = size / (bitsPerSample / 8)
      const samples = new Float32Array(numSamples)
      if (bitsPerSample === 16) {
        for (let i = 0; i < numSamples; i++) {
          samples[i] = buf.readInt16LE(dataStart + i * 2) / 32768
        }
      }
      return { sampleRate, samples }
    }
    pos += 8 + size
  }
  throw new Error(`No data chunk in ${path}`)
}

// --- 무음 구간 탐지 ---
type Silence = { start: number; end: number; center: number }

function detectSilences(path: string, opts: {
  windowSec?: number
  threshold?: number
  minSilenceSec?: number
} = {}): { duration: number; silences: Silence[] } {
  const { windowSec = 0.02, threshold = 0.015, minSilenceSec = 0.2 } = opts
  const { sampleRate, samples } = parseWav(path)
  const windowSize = Math.round(sampleRate * windowSec)
  const duration = samples.length / sampleRate

  // RMS per window
  const rms: number[] = []
  for (let i = 0; i < samples.length; i += windowSize) {
    let sum = 0
    const end = Math.min(i + windowSize, samples.length)
    for (let j = i; j < end; j++) sum += samples[j] * samples[j]
    rms.push(Math.sqrt(sum / (end - i)))
  }

  // 무음 구간 병합
  const silences: Silence[] = []
  let silStart = -1
  for (let i = 0; i <= rms.length; i++) {
    const isSilent = i < rms.length ? rms[i] < threshold : false
    if (isSilent && silStart < 0) {
      silStart = i
    } else if (!isSilent && silStart >= 0) {
      const start = silStart * windowSec
      const end = i * windowSec
      if (end - start >= minSilenceSec) {
        silences.push({ start, end, center: (start + end) / 2 })
      }
      silStart = -1
    }
  }

  return { duration, silences }
}

// --- 텍스트 + 파형 결합 분석 ---
type SentenceTiming = { start: number; end: number }

function analyzeWithText(
  wavPath: string,
  text: string,
): SentenceTiming[] {
  const sentences = text.split(/(?<=[.?!,。])\s+/).filter(Boolean)
  if (sentences.length <= 1) {
    // 단일 문장 → 전체 duration
    const { duration } = detectSilences(wavPath)
    return [{ start: 0, end: Math.round(duration * 1000) / 1000 }]
  }

  const { duration, silences } = detectSilences(wavPath)

  // 글자 수 비례로 각 문장 경계의 추정 시각
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
  const estimatedBoundaries: number[] = [] // n-1개 경계점
  let charCursor = 0
  for (let i = 0; i < sentences.length - 1; i++) {
    charCursor += sentences[i].length
    estimatedBoundaries.push((charCursor / totalChars) * duration)
  }

  // 각 추정 경계에 가장 가까운 무음 구간 선택
  const usedSilences = new Set<number>()
  const boundaries: number[] = []

  for (const estimated of estimatedBoundaries) {
    let bestIdx = -1
    let bestDist = Infinity

    for (let si = 0; si < silences.length; si++) {
      if (usedSilences.has(si)) continue
      const dist = Math.abs(silences[si].start - estimated)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = si
      }
    }

    if (bestIdx >= 0 && bestDist < duration * 0.15) {
      // 추정 시각의 ±15% 이내에 무음이 있으면 채택
      boundaries.push(silences[bestIdx].start)
      usedSilences.add(bestIdx)
    } else {
      // 무음이 없으면 추정 시각 그대로 사용
      boundaries.push(estimated)
    }
  }

  boundaries.sort((a, b) => a - b)

  // 경계로 segment 생성
  const result: SentenceTiming[] = []
  let cursor = 0
  for (const boundary of boundaries) {
    result.push({
      start: Math.round(cursor * 1000) / 1000,
      end: Math.round(boundary * 1000) / 1000,
    })
    cursor = boundary
  }
  result.push({
    start: Math.round(cursor * 1000) / 1000,
    end: Math.round(duration * 1000) / 1000,
  })

  return result
}

// --- 텍스트 조회 ---
function getTextForTarget(episode: any, textField: string, bookIndex?: number): string | null {
  if (bookIndex !== undefined) {
    const book = episode.books[bookIndex]
    if (!book) return null
    // TTS 오버라이드 우선
    const ttsBook = episode.tts?.books?.[bookIndex]
    return ttsBook?.[textField] ?? book[textField] ?? null
  }
  // narrator/host
  const ttsNarrator = episode.tts?.narrator
  const ttsHost = episode.tts?.host
  switch (textField) {
    case 'celebIntro': return ttsNarrator?.celebIntro ?? episode.narrator.celebIntro
    case 'philosophy': return ttsHost?.philosophy ?? episode.host.philosophy
    case 'outro': return ttsNarrator?.outro ?? episode.narrator.outro
    case 'serviceIntro': return ttsNarrator?.serviceIntro ?? episode.narrator.serviceIntro
    default:
      // shorts segments
      if (textField.startsWith('short-')) {
        const segId = textField.replace('short-', '')
        const seg = episode.shorts?.segments?.find((s: any) => s.id === segId)
        return seg?.text ?? null
      }
      // serviceGreeting parts
      if (textField.startsWith('serviceGreeting-')) {
        const idx = parseInt(textField.split('-')[1])
        return episode.narrator.serviceGreetingParts?.[idx]?.text ?? null
      }
      return null
  }
}

// --- CLI ---
const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null
const onlyIdx = args.indexOf('--only')
const onlyFilter = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null
const updateJson = args.includes('--update-json')

if (!epName) {
  console.error('Usage: pnpm analyze -- --episode <name> [--only file1,file2] [--update-json]')
  process.exit(1)
}

const voiceDir = join(__dirname, '..', 'public', 'voice', epName)
const epPath = join(__dirname, '..', 'episodes', `${epName}.json`)
const episode = JSON.parse(readFileSync(epPath, 'utf-8'))

// 분석 대상
type Target = { file: string; textField: string; bookIndex?: number }
const targets: Target[] = []

if (episode.narrator.serviceGreetingParts) {
  for (let i = 0; i < episode.narrator.serviceGreetingParts.length; i++) {
    targets.push({ file: `service-greeting-${i + 1}.wav`, textField: `serviceGreeting-${i}` })
  }
}
targets.push({ file: 'service-intro.wav', textField: 'serviceIntro' })
targets.push({ file: 'narrator-celeb-intro.wav', textField: 'celebIntro' })
targets.push({ file: 'philosophy.wav', textField: 'philosophy' })
targets.push({ file: 'narrator-outro.wav', textField: 'outro' })

for (let i = 0; i < episode.books.length; i++) {
  targets.push({ file: `book-${i}-summary.wav`, textField: 'summary', bookIndex: i })
  targets.push({ file: `book-${i}-context.wav`, textField: 'context', bookIndex: i })
  if (episode.books[i].directQuote) {
    targets.push({ file: `book-${i}-quote.wav`, textField: 'directQuote', bookIndex: i })
  }
  if (episode.books[i].contextAfter) {
    targets.push({ file: `book-${i}-context-after.wav`, textField: 'contextAfter', bookIndex: i })
  }
}

if (episode.shorts?.segments) {
  for (const seg of episode.shorts.segments) {
    targets.push({ file: `short-${seg.id}.wav`, textField: `short-${seg.id}` })
  }
}

const filtered = onlyFilter
  ? targets.filter(t => onlyFilter.some(f => t.file.includes(f)))
  : targets

console.log(`에피소드: ${epName}`)
console.log(`${filtered.length}개 파일 분석 (텍스트+파형 결합)\n`)

const results: Record<string, SentenceTiming[]> = {}

for (const target of filtered) {
  const wavPath = join(voiceDir, target.file)
  const text = getTextForTarget(episode, target.textField, target.bookIndex)

  if (!text) {
    console.log(`[${target.file}] 텍스트 없음 — 건너뜀`)
    continue
  }

  try {
    const timings = analyzeWithText(wavPath, text)
    const sentences = text.split(/(?<=[.?!,。])\s+/).filter(Boolean)
    results[target.file] = timings

    console.log(`[${target.file}] ${sentences.length}문장 → ${timings.length} segments`)
    timings.forEach((t, i) => {
      const sent = sentences[i] || ''
      const preview = sent.length > 30 ? sent.slice(0, 30) + '...' : sent
      console.log(`  ${i + 1}. ${t.start.toFixed(2)}s ~ ${t.end.toFixed(2)}s  "${preview}"`)
    })
  } catch (e: any) {
    console.log(`[${target.file}] 건너뜀 — ${e.message}`)
  }
}

if (updateJson) {
  if (!episode.voiceTimings) episode.voiceTimings = {}
  for (const [file, timings] of Object.entries(results)) {
    episode.voiceTimings[file.replace('.wav', '')] = timings
  }
  writeFileSync(epPath, JSON.stringify(episode, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ ${epName}.json voiceTimings 반영 완료`)
}

console.log('\n완료.')
