/**
 * BookRecommend TTS 생성 — script.ts 단일원천
 *
 * 사용법:
 *   pnpm voice                              → Gemini TTS (기본)
 *   pnpm voice -- --engine cloud            → Google Cloud TTS (무료 테스트)
 *   pnpm voice -- --only book-0-summary     → 특정 파일만
 *   pnpm voice -- --only book-0-title,book-1-title  → 복수 지정
 *   pnpm voice -- --list                    → 생성 대상 목록만 출력
 *
 * 보이스: Kore(나레이터), Charon(요약맨), Puck(셀럽)
 */

import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import wav from 'wav'
import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
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

// 엔진 선택: --engine cloud | gemini | elevenlabs (기본: gemini)
const engineIdx = args.indexOf('--engine')
const ENGINE = engineIdx >= 0 ? args[engineIdx + 1] : 'gemini'

const BASE_DIR = path.join(ROOT, 'public', 'voice', EPISODE_NAME)
const OUT_DIR = path.join(BASE_DIR, ENGINE)

// 역할 필터: --role narrator,summary,celeb
const roleIdx = args.indexOf('--role')
const ROLE_FILTER = roleIdx >= 0 ? args[roleIdx + 1]?.split(',') : null

async function loadEpisode(name: string): Promise<BookRecommendScript> {
  const raw = await readFile(path.join(EPISODES_DIR, `${name}.json`), 'utf-8')
  return JSON.parse(raw) as BookRecommendScript
}

// --- API 키 로테이션 ---
const API_KEYS = Array.from({ length: 50 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY${i + 1}`]).filter(Boolean) as string[]
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
    if (!data) {
      console.error('  응답:', JSON.stringify(response.candidates?.[0]?.content?.parts?.[0], null, 2)?.slice(0, 500))
      // audio 없으면 다음 키로 재시도
      if (retries > 0) {
        keyIndex = (keyIndex + 1) % API_KEYS.length
        ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
        console.log(`  키 ${keyIndex + 1}로 전환 (no audio)`)
        return synthesize(text, voiceName, outputFile, retries - 1)
      }
      throw new Error(`No audio: ${outputFile}`)
    }
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

// --- Google Cloud TTS ---
const CLOUD_TTS_KEY = process.env.GOOGLE_CLOUD_TTS_KEY
const CLOUD_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

// Gemini Voice → Cloud TTS Voice 매핑 (한국어 Neural2)
const CLOUD_VOICE_MAP: Record<Voice, string> = {
  Kore: 'ko-KR-Neural2-A',    // 여성 (나레이터)
  Charon: 'ko-KR-Neural2-C',  // 남성 (요약맨)
  Puck: 'ko-KR-Neural2-B',    // 남성 (셀럽)
}

async function synthesizeCloud(text: string, voiceName: Voice, outputFile: string): Promise<number> {
  if (!CLOUD_TTS_KEY) throw new Error('GOOGLE_CLOUD_TTS_KEY 없음. .env에 추가하세요.')
  const body = {
    input: { text },
    voice: { languageCode: 'ko-KR', name: CLOUD_VOICE_MAP[voiceName] },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
  }
  const res = await fetch(`${CLOUD_TTS_URL}?key=${CLOUD_TTS_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cloud TTS ${res.status}: ${err}`)
  }
  const json = await res.json() as { audioContent: string }
  let pcm = Buffer.from(json.audioContent, 'base64')
  // Cloud TTS가 WAV 헤더를 포함하면 잘라낸다 (RIFF 매직넘버 체크)
  if (pcm.length > 44 && pcm.toString('ascii', 0, 4) === 'RIFF') {
    pcm = pcm.subarray(44)
  }
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s`)
  return duration
}

// --- ElevenLabs TTS ---
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

async function synthesizeElevenlabs(text: string, voiceId: string, outputFile: string): Promise<number> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY 없음. .env에 추가하세요.')
  if (!voiceId) throw new Error('elevenlabsVoiceId 없음. 에피소드 JSON host에 추가하세요.')

  const res = await fetch(`${ELEVENLABS_URL}/${voiceId}?output_format=pcm_24000`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 300)}`)
  }
  const arrayBuf = await res.arrayBuffer()
  const pcm = Buffer.from(arrayBuf)
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s [ElevenLabs]`)
  return duration
}

// 엔진별 합성 디스패치
// ElevenLabs 자동 호출 차단 — 셀럽 음성은 백오피스(VoiceGenWorkspace)에서 수동 생성.
// celeb 역할은 Gemini/Cloud로 폴백하여 프리뷰용으로만 생성.
async function tts(text: string, voiceName: Voice, outputFile: string, _role: Role): Promise<number> {
  return ENGINE === 'cloud'
    ? synthesizeCloud(text, voiceName, outputFile)
    : synthesize(text, voiceName, outputFile)
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
    case 'serviceIntro': return tts?.narrator?.serviceIntro ?? episode.narrator.serviceIntro
    case 'celebIntro': return tts?.narrator?.celebIntro ?? episode.narrator.celebIntro
    case 'philosophy': return tts?.host?.philosophy ?? episode.host.philosophy
    case 'outro': return tts?.narrator?.outro ?? episode.narrator.outro
    default: throw new Error(`Unknown field: ${field}`)
  }
}

// --- Job 목록 생성 ---
type Role = 'narrator' | 'summary' | 'celeb'
type Job = { file: string; voice: Voice; text: string; role: Role }

function buildJobs(): Job[] {
  const jobs: Job[] = []

  // 섹션 라벨 (1회 생성, 모든 책에서 재활용)
  jobs.push({ file: 'label-summary.wav', voice: VOICE.narrator, text: '핵심 요약', role: 'narrator' })
  jobs.push({ file: 'label-context.wav', voice: VOICE.narrator, text: '추천 및 감상경위', role: 'narrator' })

  // 서비스 인트로 (템플릿 자동 생성)
  const serviceIntroText = `안녕하세요, 필앤노트입니다. 서재 탐방 코너에서는 한 인물의 서재를 열어, 그들이 사랑한 것들과 그 이유를 소개합니다. 오늘 함께할 인물은 ${episode.host.nickname}입니다.`
  jobs.push({ file: 'service-intro.wav', voice: VOICE.narrator, text: serviceIntroText, role: 'narrator' })
  // 대표 명언 (셀럽 목소리)
  if (episode.host.featuredQuote) {
    jobs.push({ file: 'featured-quote.wav', voice: VOICE.celeb, text: episode.host.featuredQuote, role: 'celeb' })
  }
  // 나레이터 셀럽 소개
  jobs.push({ file: 'narrator-celeb-intro.wav', voice: VOICE.narrator, text: ttsText('celebIntro'), role: 'narrator' })
  // 셀럽 감상철학
  jobs.push({ file: 'philosophy.wav', voice: VOICE.celeb, text: ttsText('philosophy'), role: 'celeb' })

  // 도서별
  for (let i = 0; i < episode.books.length; i++) {
    const b = episode.books[i]
    jobs.push({ file: `book-${i}-title.wav`, voice: VOICE.narrator, text: ttsText('title', i), role: 'narrator' })
    jobs.push({ file: `book-${i}-summary.wav`, voice: VOICE.summary, text: ttsText('summary', i), role: 'summary' })
    jobs.push({ file: `book-${i}-context.wav`, voice: VOICE.narrator, text: ttsText('context', i), role: 'narrator' })
    if (b.directQuote) {
      jobs.push({ file: `book-${i}-quote.wav`, voice: VOICE.celeb, text: ttsText('directQuote', i), role: 'celeb' })
    }
    if (b.contextAfter) {
      jobs.push({ file: `book-${i}-context-after.wav`, voice: VOICE.narrator, text: ttsText('contextAfter', i), role: 'narrator' })
    }
  }

  // 중간안내 (10개 초과 시)
  if (episode.books.length > 10 && episode.narrator.interlude) {
    jobs.push({ file: 'interlude.wav', voice: VOICE.narrator, text: episode.narrator.interlude, role: 'narrator' })
  }

  // 아웃트로
  jobs.push({ file: 'narrator-outro.wav', voice: VOICE.narrator, text: ttsText('outro'), role: 'narrator' })

  // 쇼츠 전용 — 세그먼트 기반
  if (episode.shorts?.segments) {
    for (const seg of episode.shorts.segments) {
      const voice = seg.role === 'celeb' ? VOICE.celeb : VOICE.narrator
      jobs.push({ file: `short-${seg.id}.wav`, voice, text: seg.text, role: seg.role as Role })
    }
  }

  return jobs
}

// --- 매니페스트: 텍스트 해시 기반 변경 감지 ---
type Manifest = Record<string, string> // file → sha256(text+voice)

function jobHash(text: string, voice: string): string {
  return createHash('sha256').update(`${voice}:${text}`).digest('hex').slice(0, 16)
}

async function loadManifest(dir: string = OUT_DIR): Promise<Manifest> {
  try {
    const raw = await readFile(path.join(dir, 'manifest.json'), 'utf-8')
    return JSON.parse(raw) as Manifest
  } catch { return {} }
}

async function saveManifest(m: Manifest, dir: string = OUT_DIR): Promise<void> {
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n', 'utf-8')
}

/** job의 매니페스트 디렉토리 */
function manifestDir(_job: Job): string {
  return OUT_DIR
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
  const forceAll = args.includes('--force')
  const initManifest = args.includes('--init-manifest')

  let jobs = buildJobs()

  // 역할 필터: --role narrator,summary,celeb
  if (ROLE_FILTER) {
    jobs = jobs.filter(j => ROLE_FILTER.includes(j.role))
    console.log(`역할 필터: [${ROLE_FILTER.join(', ')}] → ${jobs.length}개`)
  }

  if (onlyFiles) {
    jobs = jobs.filter(j => onlyFiles.some(f => j.file.includes(f)))
    if (jobs.length === 0) {
      console.log('일치하는 파일 없음. --list로 확인하세요.')
      return
    }
  }

  // --init-manifest: TTS 실행 없이 현재 텍스트 기준으로 매니페스트만 생성
  if (initManifest) {
    // 엔진별 매니페스트 분리 저장
    const byDir = new Map<string, Manifest>()
    for (const j of jobs) {
      const dir = manifestDir(j)
      if (!byDir.has(dir)) byDir.set(dir, {})
      byDir.get(dir)![j.file] = jobHash(j.text, j.voice)
    }
    for (const [dir, m] of byDir) {
      await mkdir(dir, { recursive: true })
      await saveManifest(m, dir)
    }
    console.log(`✓ manifest.json 초기화 완료 (${jobs.length}개)`)
    return
  }

  // 변경 감지: 엔진별 매니페스트 로드
  const manifestCache = new Map<string, Manifest>()
  async function getManifest(dir: string): Promise<Manifest> {
    if (!manifestCache.has(dir)) manifestCache.set(dir, await loadManifest(dir))
    return manifestCache.get(dir)!
  }

  if (!forceAll && !onlyFiles) {
    const before = jobs.length
    const filtered: Job[] = []
    for (const j of jobs) {
      const m = await getManifest(manifestDir(j))
      if (jobHash(j.text, j.voice) !== m[j.file]) filtered.push(j)
    }
    const skipped = before - filtered.length
    jobs = filtered
    if (skipped > 0) console.log(`변경 없는 ${skipped}개 스킵`)
    if (jobs.length === 0) {
      console.log('변경된 텍스트 없음. 전체 재생성: --force')
      return
    }
  }

  if (listOnly) {
    console.log('생성 대상:')
    for (const j of jobs) {
      const m = await getManifest(manifestDir(j))
      const changed = jobHash(j.text, j.voice) !== m[j.file]
      console.log(`  ${j.file.padEnd(30)} [${j.voice}] ${changed ? '← 변경' : ''}`)
    }
    return
  }

  console.log(`${jobs.length}개 음성 생성 시작... [엔진: ${ENGINE}]\n`)
  const results: Record<string, number> = {}
  for (const job of jobs) {
    console.log(`[${job.file}]`)
    results[job.file] = await tts(job.text, job.voice, path.join(OUT_DIR, job.file), job.role)
    // 성공 시 매니페스트 업데이트
    const dir = manifestDir(job)
    const m = await getManifest(dir)
    m[job.file] = jobHash(job.text, job.voice)
  }
  // 변경된 매니페스트 저장
  for (const [dir, m] of manifestCache) {
    await mkdir(dir, { recursive: true })
    await saveManifest(m, dir)
  }

  // duration 출력
  console.log('\n=== duration 결과 ===')
  for (const [file, dur] of Object.entries(results)) {
    console.log(`${file.padEnd(30)} ${dur.toFixed(2)}s`)
  }

  // --update-json: duration을 에피소드 JSON에 자동 반영
  if (args.includes('--update-json')) {
    const jsonPath = path.join(EPISODES_DIR, `${EPISODE_NAME}.json`)
    const raw = await readFile(jsonPath, 'utf-8')
    const json = JSON.parse(raw) as BookRecommendScript

    for (const [file, dur] of Object.entries(results)) {
      const rounded = Math.round(dur * 100) / 100

      if (file === 'service-intro.wav') { json.narrator.serviceIntroDuration = rounded; continue }
      if (file === 'narrator-celeb-intro.wav') { json.narrator.celebIntroDuration = rounded; continue }
      if (file === 'philosophy.wav') { json.host.voiceDuration = rounded; continue }
      if (file === 'narrator-outro.wav') { json.narrator.outroDuration = rounded; continue }
      if (file === 'featured-quote.wav') { json.host.featuredQuoteDuration = rounded; continue }
      if (file === 'label-summary.wav') { json.narrator.labelSummaryDuration = rounded; continue }
      if (file === 'label-context.wav') { json.narrator.labelContextDuration = rounded; continue }
      if (file === 'interlude.wav' && json.narrator.interludeDuration !== undefined) { json.narrator.interludeDuration = rounded; continue }
      // 쇼츠 세그먼트: short-{id}.wav → segments[].duration
      const shortMatch = file.match(/^short-(.+)\.wav$/)
      if (shortMatch && json.shorts?.segments) {
        const seg = json.shorts.segments.find((s: { id: string }) => s.id === shortMatch[1])
        if (seg) { seg.duration = rounded; continue }
      }

      // book-N-*.wav
      const bookMatch = file.match(/^book-(\d+)-(title|summary|context|quote|context-after)\.wav$/)
      if (bookMatch) {
        const idx = parseInt(bookMatch[1])
        const field = bookMatch[2]
        if (!json.books[idx]) continue
        switch (field) {
          case 'title': json.books[idx].titleDuration = rounded; break
          case 'summary': json.books[idx].summaryDuration = rounded; break
          case 'context': json.books[idx].contextDuration = rounded; break
          case 'quote': json.books[idx].quoteDuration = rounded; break
          case 'context-after': json.books[idx].contextAfterDuration = rounded; break
        }
      }
    }

    await writeFile(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
    console.log(`\n✓ ${EPISODE_NAME}.json duration 자동 반영 완료`)
  }
}

main().catch(console.error)
