/**
 * BookRecommend TTS 생성 — script.ts 단일원천
 *
 * 사용법:
 *   pnpm voice                        → 전체 생성
 *   pnpm voice -- --only book-0-summary  → 특정 파일만
 *   pnpm voice -- --only book-0-title,book-1-title  → 복수 지정
 *   pnpm voice -- --list              → 생성 대상 목록만 출력
 *
 * 보이스: Kore(나레이터), Charon(요약맨), Puck(셀럽)
 */

import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import wav from 'wav'
import { mkdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type { BookRecommendScript } from '../src/compositions/BookRecommend/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const EPISODES_DIR = path.join(ROOT, 'episodes')

// CLI에서 --episode <name> 또는 기본값
const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const EPISODE_NAME = epIdx >= 0 ? args[epIdx + 1] : 'elon-musk'
const OUT_DIR = path.join(ROOT, 'public', 'voice', EPISODE_NAME)

async function loadEpisode(name: string): Promise<BookRecommendScript> {
  const raw = await readFile(path.join(EPISODES_DIR, `${name}.json`), 'utf-8')
  return JSON.parse(raw) as BookRecommendScript
}

// --- API 키 로테이션 ---
const API_KEYS = Array.from({ length: 30 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY${i + 1}`]).filter(Boolean)
let keyIndex = 0
let ai = new GoogleGenAI({ apiKey: API_KEYS[0] })

const MODEL = 'gemini-2.5-flash-preview-tts'
type Voice = 'Kore' | 'Charon' | 'Puck'

// --- 보이스 역할 ---
const VOICE = {
  narrator: 'Kore' as Voice,
  summary: 'Charon' as Voice,
  celeb: 'Puck' as Voice,
}

// --- WAV 저장 ---
async function saveWav(filename: string, pcmData: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, { channels: 1, sampleRate: 24000, bitDepth: 16 })
    writer.on('finish', () => resolve(pcmData.length / (24000 * 2)))
    writer.on('error', reject)
    writer.write(pcmData)
    writer.end()
  })
}

// --- TTS 합성 ---
async function synthesize(text: string, voiceName: Voice, outputFile: string, retries = API_KEYS.length - 1): Promise<number> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    })
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!data) throw new Error(`No audio: ${outputFile}`)
    const pcm = Buffer.from(data, 'base64')
    const duration = await saveWav(outputFile, pcm)
    console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s`)
    return duration
  } catch (e: any) {
    if ((e.status === 429 || e.status === 403) && retries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환`)
      return synthesize(text, voiceName, outputFile, retries - 1)
    }
    throw e
  }
}

// 에피소드 데이터 (main에서 로드)
let episode: BookRecommendScript

// --- TTS 텍스트 추출 (tts 오버라이드 우선) ---
function ttsText(field: string, bookIndex?: number): string {
  const tts = episode.tts

  if (bookIndex !== undefined) {
    const bookTts = tts?.books?.[bookIndex]
    const book = episode.books[bookIndex]
    switch (field) {
      case 'title': return bookTts?.title ?? `${book.title}, ${book.creator}`
      case 'summary': return bookTts?.summary ?? book.summary
      case 'context': return bookTts?.context ?? book.context
      case 'contextAfter': return bookTts?.contextAfter ?? book.contextAfter ?? ''
      case 'directQuote': return bookTts?.directQuote ?? book.directQuote ?? ''
      default: throw new Error(`Unknown book field: ${field}`)
    }
  }

  switch (field) {
    case 'celebIntro': return tts?.narrator?.celebIntro ?? episode.narrator.celebIntro
    case 'philosophy': return tts?.host?.philosophy ?? episode.host.philosophy
    case 'outro': return tts?.narrator?.outro ?? episode.narrator.outro
    default: throw new Error(`Unknown field: ${field}`)
  }
}

// --- Job 목록 생성 ---
type Job = { file: string; voice: Voice; text: string }

function buildJobs(): Job[] {
  const jobs: Job[] = []

  // 섹션 라벨 (1회 생성, 모든 책에서 재활용)
  jobs.push({ file: 'label-summary.wav', voice: VOICE.narrator, text: '핵심 요약' })
  jobs.push({ file: 'label-context.wav', voice: VOICE.narrator, text: '추천 경위' })

  // 나레이터 셀럽 소개
  jobs.push({ file: 'narrator-celeb-intro.wav', voice: VOICE.narrator, text: ttsText('celebIntro') })
  // 셀럽 감상철학
  jobs.push({ file: 'philosophy.wav', voice: VOICE.celeb, text: ttsText('philosophy') })

  // 도서별
  for (let i = 0; i < episode.books.length; i++) {
    const b = episode.books[i]
    jobs.push({ file: `book-${i}-title.wav`, voice: VOICE.narrator, text: ttsText('title', i) })
    jobs.push({ file: `book-${i}-summary.wav`, voice: VOICE.summary, text: ttsText('summary', i) })
    jobs.push({ file: `book-${i}-context.wav`, voice: VOICE.narrator, text: ttsText('context', i) })
    if (b.directQuote && b.quoteDuration) {
      jobs.push({ file: `book-${i}-quote.wav`, voice: VOICE.celeb, text: ttsText('directQuote', i) })
    }
    if (b.contextAfter && b.contextAfterDuration) {
      jobs.push({ file: `book-${i}-context-after.wav`, voice: VOICE.narrator, text: ttsText('contextAfter', i) })
    }
  }

  // 아웃트로
  jobs.push({ file: 'narrator-outro.wav', voice: VOICE.narrator, text: ttsText('outro') })

  return jobs
}

// --- CLI ---
async function main() {
  // 에피소드 로드
  episode = await loadEpisode(EPISODE_NAME)
  console.log(`에피소드: ${EPISODE_NAME}`)

  await mkdir(OUT_DIR, { recursive: true })

  const listOnly = args.includes('--list')
  const onlyIdx = args.indexOf('--only')
  const onlyFiles = onlyIdx >= 0 ? args[onlyIdx + 1]?.split(',') : null

  let jobs = buildJobs()
  if (onlyFiles) {
    jobs = jobs.filter(j => onlyFiles.some(f => j.file.includes(f)))
    if (jobs.length === 0) {
      console.log('일치하는 파일 없음. --list로 확인하세요.')
      return
    }
  }

  if (listOnly) {
    console.log('생성 대상:')
    for (const j of jobs) console.log(`  ${j.file.padEnd(30)} [${j.voice}]`)
    return
  }

  console.log(`${jobs.length}개 음성 생성 시작...\n`)
  const results: Record<string, number> = {}
  for (const job of jobs) {
    console.log(`[${job.file}]`)
    results[job.file] = await synthesize(job.text, job.voice, path.join(OUT_DIR, job.file))
  }

  // duration 출력
  console.log('\n=== script.ts duration 업데이트 ===')
  for (const [file, dur] of Object.entries(results)) {
    console.log(`${file.padEnd(30)} ${dur.toFixed(2)}s`)
  }
}

main().catch(console.error)
