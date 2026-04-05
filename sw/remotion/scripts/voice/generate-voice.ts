/**
 * BookRecommend TTS 생성 — script.ts 단일원천
 *
 * 사용법:
 *   pnpm voice                              → Gemini TTS (기본)
 *   pnpm voice -- --engine elevenlabs       → ElevenLabs (셀럽 커스텀 보이스)
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
import { existsSync } from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import type { BookRecommendScript } from '../../src/compositions/BookRecommend/types'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  vnBookTitle, vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter, vnBookQuote2, vnBookContextAfter2,
  VN_OUTRO, VN_INTERLUDE, VN_RETURN_INTRO, VN_PREV_RECAP,
  vnShort, vnTimingKey, COMMON_VOICE_FILES,
} from '../../src/compositions/BookRecommend/voice-names'
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath, resolveTimingPath } from '../lib/episode.js'

// CLI에서 --episode <name> 또는 기본값
const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const EPISODE_NAME = epIdx >= 0 ? args[epIdx + 1] : 'elon-musk'

// 엔진 선택: --engine gemini | elevenlabs (기본: gemini)
const engineIdx = args.indexOf('--engine')
const ENGINE = engineIdx >= 0 ? args[engineIdx + 1] : 'gemini'

const { person: EP_PERSON, locale: EP_LOCALE } = parseEpName(EPISODE_NAME)
const BASE_DIR = path.join(findEpisodeDir(EP_PERSON), 'voice', EP_LOCALE)
const OUT_DIR = path.join(BASE_DIR, ENGINE)
const IS_EN = EPISODE_NAME.endsWith('-en')
const COMMON_DIR = path.join(ROOT, 'public', 'common', 'voice', IS_EN ? 'en' : 'ko')

/** 공통 음성 — common/voice/{locale}/ 재사용. 에피소드별 생성 건너뜀.
 *  --only로도 공통 파일은 보호됨. 재생성하려면 --include-common 필수. */
const onlyArg = args[args.indexOf('--only') + 1]
const onlyTargets = args.includes('--only') && onlyArg ? onlyArg.split(',') : []
const includeCommon = args.includes('--include-common')
let COMMON_FILES = includeCommon ? new Set<string>() : new Set(COMMON_VOICE_FILES)

// 역할 필터: --role narrator,summary,celeb
const roleIdx = args.indexOf('--role')
const ROLE_FILTER = roleIdx >= 0 ? args[roleIdx + 1]?.split(',') : null

async function loadEpisode(name: string): Promise<BookRecommendScript> {
  const raw = await readFile(resolveEpisodePath(name), 'utf-8')
  return JSON.parse(raw) as BookRecommendScript
}

// --- API 키 로테이션 ---
const API_KEYS = Array.from({ length: 100 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY_FREE${i + 1}`]).filter(Boolean) as string[]
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

/** Gemini TTS → PCM Buffer (키 로테이션·재시도 포함) */
async function synthesizeRaw(text: string, voiceName: Voice, retries = 5, keyRetries = API_KEYS.length - 1): Promise<Buffer> {
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
      if (retries > 0) {
        console.log(`  빈 응답 — 2초 후 재시도 (${retries}회 남음)`)
        await new Promise(r => setTimeout(r, 2000))
        return synthesizeRaw(text, voiceName, retries - 1, keyRetries)
      }
      throw new Error('No audio data')
    }
    return Buffer.from(data, 'base64')
  } catch (e: any) {
    if ([429, 403].includes(e.status) && keyRetries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (${e.status})`)
      return synthesizeRaw(text, voiceName, 5, keyRetries - 1)
    }
    if ([400].includes(e.status) && e.message?.includes('expired') && keyRetries > 0) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (만료)`)
      return synthesizeRaw(text, voiceName, 5, keyRetries - 1)
    }
    if ([500].includes(e.status) && retries > 0) {
      console.log(`  서버 오류(500) — 3초 후 재시도 (${retries}회 남음)`)
      await new Promise(r => setTimeout(r, 3000))
      return synthesizeRaw(text, voiceName, retries - 1, keyRetries)
    }
    throw e
  }
}

async function synthesize(text: string, voiceName: Voice, outputFile: string): Promise<number> {
  const pcm = await synthesizeRaw(text, voiceName)
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(30)} ${duration.toFixed(2)}s`)
  return duration
}

// --- 긴 텍스트 분할 ---
const TTS_SPLIT_CHARS = IS_EN ? 800 : 500

/** 문장 경계 기준 분할 (마침표·물음표·느낌표 뒤) */
function splitTextForTts(text: string): string[] {
  if (text.length <= TTS_SPLIT_CHARS) return [text]
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ''
  for (const sent of sentences) {
    if (current && (current + ' ' + sent).length > TTS_SPLIT_CHARS) {
      chunks.push(current)
      current = sent
    } else {
      current = current ? current + ' ' + sent : sent
    }
  }
  if (current) chunks.push(current)
  return chunks
}

// --- ElevenLabs TTS ---
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

async function synthesizeElevenlabs(text: string, voiceId: string, outputFile: string): Promise<number> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY 없음. .env에 추가하세요.')
  if (!voiceId) throw new Error('elevenlabsVoiceId 없음. 에피소드 JSON host에 추가하세요.')
  if (!/^\[.+?\]/.test(text.trim())) throw new Error(`ElevenLabs 감정 태그 누락: "${text.slice(0, 50)}…" — 텍스트 앞에 [감정, 톤] 태그를 추가하세요.`)

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

// --- 쇼츠 속도 지시 ---
// 쇼츠: narrator/summary 1.2배, celeb 정속 (voiceStyle만)
const SHORTS_SPEED = '1.2배속으로'

// 엔진별 합성 디스패치
// ElevenLabs는 --engine elevenlabs 명시 시에만 사용 (수동 제어)
async function tts(rawText: string, voiceName: Voice, outputFile: string, role: Role, isShort?: boolean, shortSegId?: string): Promise<number> {
  const text = rawText.replace(/\n/g, ' ')
  if (ENGINE === 'elevenlabs') {
    return synthesizeElevenlabs(text, episode.host.elevenlabsVoiceId!, outputFile)
  }

  // 스타일 프리픽스 결정 (분할 시 각 청크에 독립 적용)
  // 쇼츠 celeb은 정속 (voiceStyle만 적용)
  let stylePrefix = ''
  if (isShort) {
    if (role === 'celeb') {
      stylePrefix = episode.host.voiceStyle || ''
    } else {
      const segStyle = shortSegId && episode.shorts?.segments?.find((s: { id: string }) => s.id === shortSegId)?.style
      stylePrefix = segStyle || SHORTS_SPEED
    }
  } else if (role === 'celeb' && episode.host.voiceStyle) {
    stylePrefix = episode.host.voiceStyle
  }
  const applyStyle = (t: string) => stylePrefix ? `${stylePrefix}: ${t}` : t

  // 청크 분할 비활성화 — 단일 호출로 생성 (분할 경계 끊김 방지)
  // TODO: Gemini TTS에 길이 제한이 있으면 복원 필요
  // const chunks = splitTextForTts(text)
  // if (chunks.length > 1) { ... }

  return synthesize(applyStyle(text), voiceName, outputFile)
}

// 에피소드 데이터 (main에서 로드)
let episode: BookRecommendScript

// --- TTS 텍스트 추출 (tts 오버라이드 우선) ---
function ttsText(field: string, bookIndex?: number): string {
  const tts = episode.tts

  if (bookIndex !== undefined) {
    const book = episode.books[bookIndex]
    switch (field) {
      case 'title': {
        const titleOverride = tts?.titles?.[bookIndex]
        if (titleOverride) return titleOverride
        const year = book.stats?.publishYear
        return year ? `${book.title}, ${book.creator}, ${year}` : `${book.title}, ${book.creator}`
      }
      case 'summary': return applyReplacements(book.summary)
      case 'context': return applyReplacements(book.context)
      case 'contextAfter': return applyReplacements(book.contextAfter ?? '')
      case 'directQuote': return applyReplacements(book.directQuote ?? '')
      case 'directQuote2': return applyReplacements(book.directQuote2 ?? '')
      case 'contextAfter2': return applyReplacements(book.contextAfter2 ?? '')
      default: throw new Error(`Unknown book field: ${field}`)
    }
  }

  switch (field) {
    case 'serviceGreeting': return applyReplacements(episode.narrator.serviceGreeting ?? '')
    case 'serviceIntro': return applyReplacements(episode.narrator.serviceIntro ?? '')
    case 'celebIntro': return applyReplacements(episode.narrator.celebIntro ?? '')
    case 'philosophy': return applyReplacements(episode.host.philosophy ?? '')
    case 'returnIntro': return applyReplacements(episode.narrator.returnIntro ?? '')
    case 'prevRecap': return applyReplacements(episode.narrator.prevRecap ?? '')
    case 'outro': return applyReplacements(episode.narrator.outro)
    default: throw new Error(`Unknown field: ${field}`)
  }
}

/** tts.replace 맵 적용 — 긴 키부터 치환하여 부분 매칭 충돌 방지 */
function applyReplacements(text: string): string {
  const replace = episode.tts?.replace
  if (!replace) return text
  let result = text
  const sorted = Object.entries(replace).sort((a, b) => b[0].length - a[0].length)
  for (const [from, to] of sorted) {
    result = result.replaceAll(from, to)
  }
  return result
}

// --- Job 목록 생성 ---
type Role = 'narrator' | 'summary' | 'celeb'
type Job = { file: string; voice: Voice; text: string; role: Role; isShort?: boolean; shortSegId?: string }

function buildJobs(): Job[] {
  const jobs: Job[] = []

  // 섹션 라벨 — locale 기반, common/ 에 있으면 건너뜀
  const isEn = episode.locale === 'en'
  const labelSummaryText = isEn ? 'Summary' : '핵심 요약'
  const labelContextText = isEn ? 'Context' : '감상 배경'
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
    // Part 1: 서비스 인사 — 공용 고정 오디오 (common/ 재사용, --only로 재생성 가능)
    if (!COMMON_FILES.has(VN_SERVICE_GREETING)) {
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
    if (b.directQuote2) {
      jobs.push({ file: vnBookQuote2(i), voice: VOICE.celeb, text: ttsText('directQuote2', i), role: 'celeb' })
    }
    if (b.contextAfter2) {
      jobs.push({ file: vnBookContextAfter2(i), voice: VOICE.narrator, text: ttsText('contextAfter2', i), role: 'narrator' })
    }
  }

  // 중간안내 (10개 초과 시)
  if (episode.books.length > 10 && episode.narrator.interlude) {
    jobs.push({ file: VN_INTERLUDE, voice: VOICE.narrator, text: episode.narrator.interlude, role: 'narrator' })
  }

  // 아웃트로
  jobs.push({ file: VN_OUTRO, voice: VOICE.narrator, text: ttsText('outro'), role: 'narrator' })

  // 쇼츠 V1 — 세그먼트 기반 (cta는 음성 없이 chime만 사용)
  if (episode.shorts?.segments) {
    let si = 0
    for (const seg of episode.shorts.segments) {
      if (seg.id === 'cta') { si++; continue }
      const voice = seg.role === 'celeb' ? VOICE.celeb : seg.role === 'summary' ? VOICE.summary : VOICE.narrator
      const text = applyReplacements(seg.text)
      jobs.push({ file: vnShort(si, seg.id), voice, text, role: seg.role as Role, isShort: true, shortSegId: seg.id })
      si++
    }
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

/** job이 원래 공용 파일인지 */
function isCommonFile(file: string): boolean {
  return COMMON_VOICE_FILES.has(file)
}

/** job의 출력 디렉토리 — 국문 공용 파일은 common/, 나머지는 episode/engine/ */
function jobOutDir(job: Job): string {
  return isCommonFile(job.file) ? COMMON_DIR : OUT_DIR
}

/** job의 매니페스트 디렉토리 */
function manifestDir(job: Job): string {
  return jobOutDir(job)
}

// --- CLI ---
async function main() {
  // 에피소드 로드
  episode = await loadEpisode(EPISODE_NAME)
  // 공통 음성은 common/voice/{locale}/에서 해소. 에피소드별 생성 건너뜀.
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
  const shortsOnly = args.includes('--shorts')
  const longOnly = args.includes('--long')
  const forceAll = args.includes('--force')
  const initManifest = args.includes('--init-manifest')

  let jobs = buildJobs()

  // 범위 필터: --shorts / --long
  if (shortsOnly) {
    jobs = jobs.filter(j => j.file.startsWith('S'))
    console.log(`쇼츠만: ${jobs.length}개`)
  } else if (longOnly) {
    jobs = jobs.filter(j => !j.file.startsWith('S'))
    console.log(`롱폼만: ${jobs.length}개`)
  }

  // 역할 필터: --role narrator,summary,celeb
  if (ROLE_FILTER) {
    jobs = jobs.filter(j => ROLE_FILTER.includes(j.role))
    console.log(`역할 필터: [${ROLE_FILTER.join(', ')}] → ${jobs.length}개`)
  }

  // ElevenLabs 보이스가 있는 셀럽: Gemini 엔진일 때 celeb role 생성 차단
  // ─── 왜 건너뛰는가 ───
  // ElevenLabs 커스텀 보이스는 자동화·LLM 판단이 불가능하다.
  // 생성된 음성을 사람이 직접 듣고 품질을 판단해야 하므로,
  // 유저가 ElevenLabs 사이트에서 개별적으로 생성·선별한다.
  // 따라서 elevenlabsVoiceId가 있는 에피소드의 celeb 음성은
  // Gemini 파이프라인에서 제외하고 유저 수작업 영역으로 남긴다.
  if (ENGINE === 'gemini' && episode.host.elevenlabsVoiceId) {
    const before = jobs.length
    jobs = jobs.filter(j => j.role !== 'celeb')
    const skipped = before - jobs.length
    if (skipped > 0) console.log(`ElevenLabs 보이스 존재 → celeb ${skipped}개 건너뜀 (Gemini 생성 차단)`)
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
    const dir = jobOutDir(job)
    await mkdir(dir, { recursive: true })
    console.log(`[${job.file}]${isCommonFile(job.file) ? ' (common)' : ''}`)
    results[job.file] = await tts(job.text, job.voice, path.join(dir, job.file), job.role, job.isShort, job.shortSegId)
    // 성공 시 매니페스트 업데이트
    const mDir = manifestDir(job)
    const m = await getManifest(mDir)
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

  // --update-json: duration을 timing.json에 자동 반영
  if (args.includes('--update-json')) {
    const timingPath = resolveTimingPath(EPISODE_NAME)
    const timingRaw = existsSync(timingPath) ? await readFile(timingPath, 'utf-8') : '{}'
    const timing = JSON.parse(timingRaw)
    if (!timing.narrator) timing.narrator = {}
    if (!timing.host) timing.host = {}
    if (!timing.books) timing.books = []
    if (!timing.shorts) timing.shorts = {}

    for (const [file, dur] of Object.entries(results)) {
      const rounded = Math.round(dur * 100) / 100

      if (file === VN_SERVICE_GREETING) { timing.narrator.serviceGreetingDuration = rounded; continue }
      if (file === VN_SERVICE_INTRO) { timing.narrator.serviceIntroDuration = rounded; continue }
      if (file === VN_CELEB_INTRO) { timing.narrator.celebIntroDuration = rounded; continue }
      if (file === VN_PHILOSOPHY) { timing.host.voiceDuration = rounded; continue }
      if (file === VN_OUTRO) { timing.narrator.outroDuration = rounded; continue }
      if (file === VN_FEATURED_QUOTE) { timing.host.featuredQuoteDuration = rounded; continue }
      if (file === VN_LABEL_SUMMARY) { timing.narrator.labelSummaryDuration = rounded; continue }
      if (file === VN_LABEL_CONTEXT) { timing.narrator.labelContextDuration = rounded; continue }
      if (file === VN_RETURN_INTRO) { timing.narrator.returnIntroDuration = rounded; continue }
      if (file === VN_PREV_RECAP) { timing.narrator.prevRecapDuration = rounded; continue }
      if (file === VN_INTERLUDE && timing.narrator.interludeDuration !== undefined) { timing.narrator.interludeDuration = rounded; continue }
      // 쇼츠 V1 세그먼트: S{NN}-{id}.wav → shorts.segments[].duration
      const shortMatch = file.match(/^S\d{2}-(.+)\.wav$/)
      if (shortMatch && timing.shorts?.segments) {
        const seg = timing.shorts.segments.find((s: { id: string }) => s.id === shortMatch[1])
        if (seg) { seg.duration = rounded; continue }
      }
      // D{NN}{letter}-{phase}.wav
      const bookMatch = file.match(/^D(\d{2})[a-g]-(title|summary|context|quote|context-after|quote2|context-after2)\.wav$/)
      if (bookMatch) {
        const idx = parseInt(bookMatch[1]) - 1  // 1-based -> 0-based
        if (!timing.books[idx]) timing.books[idx] = {}
        switch (bookMatch[2]) {
          case 'title': timing.books[idx].titleDuration = rounded; break
          case 'summary': timing.books[idx].summaryDuration = rounded; break
          case 'context': timing.books[idx].contextDuration = rounded; break
          case 'quote': timing.books[idx].quoteDuration = rounded; break
          case 'context-after': timing.books[idx].contextAfterDuration = rounded; break
          case 'quote2': timing.books[idx].quoteDuration2 = rounded; break
          case 'context-after2': timing.books[idx].contextAfterDuration2 = rounded; break
        }
      }
    }

    await writeFile(timingPath, JSON.stringify(timing, null, 2) + '\n', 'utf-8')
    console.log(`\n✓ ${EPISODE_NAME} timing.json duration 자동 반영 완료`)

    // 공용 파일 duration → 전체 에피소드 timing.json 일괄 반영
    const commonResults = Object.entries(results).filter(([f]) => COMMON_VOICE_FILES.has(f))
    if (commonResults.length > 0) {
      const { readdirSync, statSync } = await import('fs')
      const EPISODES_BASE = path.join(ROOT, 'public', 'episodes')
      let count = 0
      for (const status of ['todo', 'live', 'done']) {
        const statusDir = path.join(EPISODES_BASE, status)
        if (!existsSync(statusDir)) continue
        const allDirs = readdirSync(statusDir).filter((d: string) => statSync(path.join(statusDir, d)).isDirectory())
        for (const d of allDirs) {
          const dir = path.join(statusDir, d)
          for (const fname of readdirSync(dir).filter((f: string) => f.endsWith('.timing.json'))) {
            const fp = path.join(dir, fname)
            if (fp === timingPath) continue // 이미 처리됨
            const tRaw = await readFile(fp, 'utf-8')
            const tJson = JSON.parse(tRaw)
            if (!tJson.narrator) tJson.narrator = {}
            let changed = false
            for (const [file, dur] of commonResults) {
              const rounded = Math.round(dur * 100) / 100
              if (file === VN_SERVICE_GREETING) { tJson.narrator.serviceGreetingDuration = rounded; changed = true }
              if (file === VN_LABEL_SUMMARY) { tJson.narrator.labelSummaryDuration = rounded; changed = true }
              if (file === VN_LABEL_CONTEXT) { tJson.narrator.labelContextDuration = rounded; changed = true }
            }
            if (changed) {
              await writeFile(fp, JSON.stringify(tJson, null, 2) + '\n', 'utf-8')
              count++
            }
          }
        }
      }
      if (count > 0) console.log(`✓ 공용 파일 duration → ${count}개 timing.json 일괄 반영`)
    }
  }

}

main().catch(console.error)
