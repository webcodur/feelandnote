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
import { execFile } from 'child_process'
import type { BookRecommendScript } from '../src/compositions/BookRecommend/types'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter,
  VN_OUTRO, VN_INTERLUDE, VN_RETURN_INTRO, VN_PREV_RECAP,
  vnShort, vnTimingKey, COMMON_VOICE_FILES,
} from '../src/compositions/BookRecommend/voice-names'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const EPISODES_DIR = path.join(ROOT, 'episodes', 'book-recommend')

// CLI에서 --episode <name> 또는 기본값
const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const EPISODE_NAME = epIdx >= 0 ? args[epIdx + 1] : 'elon-musk'

// 엔진 선택: --engine cloud | gemini | elevenlabs (기본: gemini)
const engineIdx = args.indexOf('--engine')
const ENGINE = engineIdx >= 0 ? args[engineIdx + 1] : 'gemini'

const BASE_DIR = path.join(ROOT, 'public', 'voice', EPISODE_NAME)
const OUT_DIR = path.join(BASE_DIR, ENGINE)
const COMMON_DIR = path.join(ROOT, 'public', 'voice', 'common')

/** 공통 음성 — 한국어 에피소드만 common/ 재사용. 영문은 에피소드별 생성 */
let COMMON_FILES = new Set(COMMON_VOICE_FILES)

// 역할 필터: --role narrator,summary,celeb
const roleIdx = args.indexOf('--role')
const ROLE_FILTER = roleIdx >= 0 ? args[roleIdx + 1]?.split(',') : null

async function loadEpisode(name: string): Promise<BookRecommendScript> {
  const raw = await readFile(path.join(EPISODES_DIR, `${name}.json`), 'utf-8')
  return JSON.parse(raw) as BookRecommendScript
}

// --- API 키 로테이션 ---
const API_KEYS = Array.from({ length: 100 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY${i + 1}`]).filter(Boolean) as string[]
const startKeyIdx = args.indexOf('--start-key')
let keyIndex = startKeyIdx >= 0 ? Math.min(Number(args[startKeyIdx + 1]) - 1, API_KEYS.length - 1) : 0
let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })

const MODEL = 'gemini-2.5-flash-preview-tts'
type Voice = string

// --- 보이스 역할 ---
const VOICE = {
  narrator: 'Kore' as Voice,
  summary: 'Charon' as Voice,
  celeb: 'Puck' as Voice,  // 기본값 — 에피소드 JSON의 geminiVoice로 오버라이드 가능
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
async function synthesize(text: string, voiceName: Voice, outputFile: string, retries = 5, keyRetries = API_KEYS.length - 1): Promise<number> {
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
      // audio 없으면 같은 키로 재시도 (서버 일시 오류, 최대 5회)
      if (retries > 0) {
        console.log(`  빈 응답 — 2초 후 재시도 (${retries}회 남음)`)
        await new Promise(r => setTimeout(r, 2000))
        return synthesize(text, voiceName, outputFile, retries - 1, keyRetries)
      }
      throw new Error(`No audio: ${outputFile}`)
    }
    const pcm = Buffer.from(data, 'base64')
    const duration = await saveWav(outputFile, pcm)
    console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s`)
    return duration
  } catch (e: any) {
    if ([429, 403].includes(e.status) && keyRetries > 0) {
      // 할당량 초과/차단 → 다음 키로 전환
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (${e.status})`)
      return synthesize(text, voiceName, outputFile, 5, keyRetries - 1)
    }
    if ([400].includes(e.status) && e.message?.includes('expired') && keyRetries > 0) {
      // 만료된 키 → 다음 키로 전환
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (만료)`)
      return synthesize(text, voiceName, outputFile, 5, keyRetries - 1)
    }
    if ([500].includes(e.status) && retries > 0) {
      // 서버 오류 → 같은 키로 재시도 (최대 5회)
      console.log(`  서버 오류(500) — 3초 후 재시도 (${retries}회 남음)`)
      await new Promise(r => setTimeout(r, 3000))
      return synthesize(text, voiceName, outputFile, retries - 1, keyRetries)
    }
    throw e
  }
}

// --- Google Cloud TTS ---
const CLOUD_TTS_KEY = process.env.GOOGLE_CLOUD_TTS_KEY
const CLOUD_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

// Gemini Voice → Cloud TTS Voice 매핑
// 커스텀 셀럽 보이스(Orus 등)는 Cloud에 없으므로 폴백
const CLOUD_VOICE_MAP_KO: Record<string, string> = {
  Kore: 'ko-KR-Neural2-A',    // 여성 (나레이터)
  Charon: 'ko-KR-Neural2-C',  // 남성 (요약맨)
  Puck: 'ko-KR-Neural2-B',    // 남성 (셀럽 기본)
}
const CLOUD_VOICE_MAP_EN: Record<string, string> = {
  Kore: 'en-US-Neural2-F',    // 여성 (나레이터)
  Charon: 'en-US-Neural2-D',  // 남성 (요약맨)
  Puck: 'en-US-Neural2-J',    // 남성 (셀럽 기본)
}
function getCloudVoice(geminiVoice: string): string {
  const map = episode?.locale === 'en' ? CLOUD_VOICE_MAP_EN : CLOUD_VOICE_MAP_KO
  const fallback = episode?.locale === 'en' ? 'en-US-Neural2-J' : 'ko-KR-Neural2-B'
  return map[geminiVoice] || fallback
}
function getCloudLang(): string {
  return episode?.locale === 'en' ? 'en-US' : 'ko-KR'
}

async function synthesizeCloud(text: string, voiceName: Voice, outputFile: string): Promise<number> {
  if (!CLOUD_TTS_KEY) throw new Error('GOOGLE_CLOUD_TTS_KEY 없음. .env에 추가하세요.')
  const body = {
    input: { text },
    voice: { languageCode: getCloudLang(), name: getCloudVoice(voiceName) },
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
// ElevenLabs는 --engine elevenlabs 명시 시에만 사용 (수동 제어)
async function tts(text: string, voiceName: Voice, outputFile: string, _role: Role): Promise<number> {
  if (ENGINE === 'elevenlabs') {
    return synthesizeElevenlabs(text, episode.host.elevenlabsVoiceId!, outputFile)
  }
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
    case 'serviceGreeting': return tts?.narrator?.serviceGreeting ?? episode.narrator.serviceGreeting ?? ''
    case 'serviceIntro': return tts?.narrator?.serviceIntro ?? episode.narrator.serviceIntro ?? ''
    case 'celebIntro': return tts?.narrator?.celebIntro ?? episode.narrator.celebIntro ?? ''
    case 'philosophy': return tts?.host?.philosophy ?? episode.host.philosophy ?? ''
    case 'returnIntro': return tts?.narrator?.returnIntro ?? episode.narrator.returnIntro ?? ''
    case 'prevRecap': return tts?.narrator?.prevRecap ?? episode.narrator.prevRecap ?? ''
    case 'outro': return tts?.narrator?.outro ?? episode.narrator.outro
    default: throw new Error(`Unknown field: ${field}`)
  }
}

// --- Job 목록 생성 ---
type Role = 'narrator' | 'summary' | 'celeb'
type Job = { file: string; voice: Voice; text: string; role: Role }

function buildJobs(): Job[] {
  const jobs: Job[] = []

  // 섹션 라벨 — locale 기반, common/ 에 있으면 건너뜀
  const isEn = episode.locale === 'en'
  const labelSummaryText = isEn ? 'Summary' : '핵심 요약'
  const labelContextText = isEn ? 'Context and Recommendation' : '추천 및 감상경위'
  if (!COMMON_FILES.has(VN_LABEL_SUMMARY)) {
    jobs.push({ file: VN_LABEL_SUMMARY, voice: VOICE.narrator, text: labelSummaryText, role: 'narrator' })
  }
  if (!COMMON_FILES.has(VN_LABEL_CONTEXT)) {
    jobs.push({ file: VN_LABEL_CONTEXT, voice: VOICE.narrator, text: labelContextText, role: 'narrator' })
  }

  const cont = (episode.series?.part ?? 1) > 1

  if (cont) {
    // continuation: returnIntro + prevRecap
    if (episode.narrator.returnIntro) {
      jobs.push({ file: VN_RETURN_INTRO, voice: VOICE.narrator, text: ttsText('returnIntro'), role: 'narrator' })
    }
    if (episode.narrator.prevRecap) {
      jobs.push({ file: VN_PREV_RECAP, voice: VOICE.narrator, text: ttsText('prevRecap'), role: 'narrator' })
    }
  } else {
    // Part 1: 서비스 인트로 — parts 분할 또는 단일 (common/ 재사용)
    const greetParts = episode.narrator.serviceGreetingParts
    if (greetParts && greetParts.length > 0) {
      for (let gi = 0; gi < greetParts.length; gi++) {
        jobs.push({ file: VN_SERVICE_GREETING.replace('.wav', `-${gi + 1}.wav`), voice: VOICE.narrator, text: greetParts[gi].text, role: 'narrator' })
      }
    } else if (!COMMON_FILES.has(VN_SERVICE_GREETING)) {
      jobs.push({ file: VN_SERVICE_GREETING, voice: VOICE.narrator, text: ttsText('serviceGreeting'), role: 'narrator' })
    }
    jobs.push({ file: VN_SERVICE_INTRO, voice: VOICE.narrator, text: ttsText('serviceIntro'), role: 'narrator' })
    // 나레이터 셀럽 소개
    jobs.push({ file: VN_CELEB_INTRO, voice: VOICE.narrator, text: ttsText('celebIntro'), role: 'narrator' })
    // 셀럽 감상철학
    if (episode.host.philosophy) {
      jobs.push({ file: VN_PHILOSOPHY, voice: VOICE.celeb, text: ttsText('philosophy'), role: 'celeb' })
    }
  }
  // 대표 명언 (셀럽 목소리, 공통)
  if (episode.host.featuredQuote) {
    jobs.push({ file: VN_FEATURED_QUOTE, voice: VOICE.celeb, text: episode.host.featuredQuote, role: 'celeb' })
  }

  // 도서별
  for (let i = 0; i < episode.books.length; i++) {
    const b = episode.books[i]
    jobs.push({ file: vnBookTitle(i), voice: VOICE.narrator, text: ttsText('title', i), role: 'narrator' })
    jobs.push({ file: vnBookSummary(i), voice: VOICE.summary, text: ttsText('summary', i), role: 'summary' })
    jobs.push({ file: vnBookContext(i), voice: VOICE.narrator, text: ttsText('context', i), role: 'narrator' })
    if (b.directQuote) {
      jobs.push({ file: vnBookQuote(i), voice: VOICE.celeb, text: ttsText('directQuote', i), role: 'celeb' })
    }
    if (b.contextAfter) {
      jobs.push({ file: vnBookContextAfter(i), voice: VOICE.narrator, text: ttsText('contextAfter', i), role: 'narrator' })
    }
  }

  // 중간안내 (10개 초과 시)
  if (episode.books.length > 10 && episode.narrator.interlude) {
    jobs.push({ file: VN_INTERLUDE, voice: VOICE.narrator, text: episode.narrator.interlude, role: 'narrator' })
  }

  // 아웃트로
  jobs.push({ file: VN_OUTRO, voice: VOICE.narrator, text: ttsText('outro'), role: 'narrator' })

  // 쇼츠 전용 — 세그먼트 기반
  if (episode.shorts?.segments) {
    episode.shorts.segments.forEach((seg, i) => {
      const voice = seg.role === 'celeb' ? VOICE.celeb : VOICE.narrator
      jobs.push({ file: vnShort(i, seg.id), voice, text: seg.text, role: seg.role as Role })
    })
  }

  return jobs.filter(j => j.text.trim().length > 0)
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
  // 영문 에피소드는 공통 음성 직접 생성
  if (episode.locale === 'en') {
    COMMON_FILES = new Set()
  }
  // 셀럽 보이스 오버라이드 (geminiVoice → voice-actors.md 참조)
  if (episode.host.geminiVoice) {
    VOICE.celeb = episode.host.geminiVoice
  }
  console.log(`에피소드: ${EPISODE_NAME}`)
  if (VOICE.celeb !== 'Puck') console.log(`셀럽 보이스: ${VOICE.celeb}`)

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

      if (file === VN_SERVICE_GREETING) { json.narrator.serviceGreetingDuration = rounded; continue }
      const greetPartMatch = file.match(/^A1-service-greeting-(\d+)\.wav$/)
      if (greetPartMatch && json.narrator.serviceGreetingParts) {
        const gi = parseInt(greetPartMatch[1]) - 1
        if (json.narrator.serviceGreetingParts[gi]) {
          json.narrator.serviceGreetingParts[gi].duration = rounded
          // 총 duration 갱신
          json.narrator.serviceGreetingDuration = json.narrator.serviceGreetingParts.reduce((s: number, p: { duration: number }) => s + p.duration, 0)
        }
        continue
      }
      if (file === VN_SERVICE_INTRO) { json.narrator.serviceIntroDuration = rounded; continue }
      if (file === VN_CELEB_INTRO) { json.narrator.celebIntroDuration = rounded; continue }
      if (file === VN_PHILOSOPHY) { json.host.voiceDuration = rounded; continue }
      if (file === VN_OUTRO) { json.narrator.outroDuration = rounded; continue }
      if (file === VN_FEATURED_QUOTE) { json.host.featuredQuoteDuration = rounded; continue }
      if (file === VN_LABEL_SUMMARY) { json.narrator.labelSummaryDuration = rounded; continue }
      if (file === VN_LABEL_CONTEXT) { json.narrator.labelContextDuration = rounded; continue }
      if (file === VN_RETURN_INTRO) { json.narrator.returnIntroDuration = rounded; continue }
      if (file === VN_PREV_RECAP) { json.narrator.prevRecapDuration = rounded; continue }
      if (file === VN_INTERLUDE && json.narrator.interludeDuration !== undefined) { json.narrator.interludeDuration = rounded; continue }
      // 쇼츠 세그먼트: S{NN}-{id}.wav → segments[].duration
      const shortMatch = file.match(/^S\d{2}-(.+)\.wav$/)
      if (shortMatch && json.shorts?.segments) {
        const seg = json.shorts.segments.find((s: { id: string }) => s.id === shortMatch[1])
        if (seg) { seg.duration = rounded; continue }
      }

      // D{NN}{letter}-{phase}.wav
      const bookMatch = file.match(/^D(\d{2})[a-e]-(title|summary|context|quote|context-after)\.wav$/)
      if (bookMatch) {
        const idx = parseInt(bookMatch[1]) - 1  // 1-based -> 0-based
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

  // --upload: 생성 후 R2 자동 업로드
  if (args.includes('--upload')) {
    console.log(`\nR2 업로드 시작...`)
    const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
    await new Promise<void>((resolve, reject) => {
      execFile(pnpmCmd, ['voice:upload', '--', '--episode', EPISODE_NAME], { cwd: ROOT }, (err, stdout, stderr) => {
        if (stdout) console.log(stdout)
        if (stderr) console.error(stderr)
        if (err) reject(err); else resolve()
      })
    })
  }
}

main().catch(console.error)
