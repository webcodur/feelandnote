/**
 * book-person/tts.ts — 「책과 사람」 나레이션 합성 (Gemini TTS, 무료 키 로테이션)
 *
 * ko.json의 lead와 books[].text를 비트마다 한 파일로 합성해 voice/ko/ 아래에 두고,
 * 측정한 길이를 leadDuration·books[].duration에, 파일 경로를 leadVoice·books[].voice에 기록한다.
 * 나레이터 음성·스타일은 서재 탐방과 같은 voice-policy 값을 쓴다.
 *
 *   pnpm --filter remotion exec tsx scripts/book-person/tts.ts --episode elon-musk-hitchhiker
 *   pnpm --filter remotion exec tsx scripts/book-person/tts.ts --episodes a,b,c [--force]
 *   pnpm --filter remotion exec tsx scripts/book-person/tts.ts --episode x --engine elevenlabs --voice-id <id>   # 유료. 사용자 지시 뒤에만
 *
 * 🔴 전체 폴더를 도는 --all 은 두지 않는다. public/book-person/ 에는 사용자가 만든 편 수십 개가 함께 있어
 *    한 번의 --all 이 그 전부를 유료 합성한 사고가 있었다(26.09.02). 대상은 항상 이름으로 지정한다.
 *
 * ElevenLabs(eleven_v3)는 문장 앞에 오디오 태그가 있어야 한다. 나레이션 하한 태그 `[deliberate]`를 기본으로 붙이고,
 * 세부 감정 태그는 elevenlabs-v3-tags 스킬로 원고에 직접 넣는다(원고에 이미 태그가 있으면 덧붙이지 않는다).
 *
 * 합성 코어는 voice/faction/engine.ts와 같다. 그 모듈은 faction cli(argv 검증)를 import해
 * 여기서 끌어오면 충돌하므로 복제한다. (정책 변경 시 함께 갱신)
 */

import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import wav from 'wav'
import { MODEL_GEMINI_25, NARRATOR_STYLE_DEFAULT, VOICE } from '@feelandnote/shared/lib/voice-policy'
import { getEleAccounts, resolveEleAccountForVoice } from '@feelandnote/shared/lib/ele-accounts'
import { spawn } from 'child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const BASE = path.join(ROOT, 'public', 'book-person')
/** 문장 사이 숨. 측정 길이에 더해 비트 길이로 기록한다 */
const BREATH_SEC = 0.35

const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epsIdx = args.indexOf('--episodes')
const FORCE = args.includes('--force')
const EPISODE = epIdx >= 0 ? args[epIdx + 1] : undefined
const EPISODES = epsIdx >= 0 ? args[epsIdx + 1].split(',').map(s => s.trim()).filter(Boolean) : []
const engIdx = args.indexOf('--engine')
const ENGINE: 'gemini' | 'elevenlabs' = engIdx >= 0 && args[engIdx + 1] === 'elevenlabs' ? 'elevenlabs' : 'gemini'
const vidIdx = args.indexOf('--voice-id')
const ELE_VOICE_ID = vidIdx >= 0 ? args[vidIdx + 1] : ''
if (!EPISODE && EPISODES.length === 0) {
  console.error('✗ --episode <폴더명> 또는 --episodes a,b,c 가 필요하다')
  process.exit(1)
}
if (ENGINE === 'elevenlabs' && !ELE_VOICE_ID) {
  console.error('✗ --engine elevenlabs 에는 --voice-id <나레이터 voice ID> 가 필요하다')
  process.exit(1)
}

const API_KEYS = Array.from({ length: 100 }, (_, i) => process.env[`GOOGLE_GENAI_API_KEY_FREE${i + 1}`]).filter(Boolean) as string[]
if (API_KEYS.length === 0) { console.error('✗ GOOGLE_GENAI_API_KEY_FREE* 키가 없다'); process.exit(1) }
let keyIndex = 0
let ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })

function saveWav(filename: string, pcm: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, { channels: 1, sampleRate: 24000, bitDepth: 16 })
    writer.on('finish', () => resolve(pcm.length / (24000 * 2)))
    writer.on('error', reject)
    writer.write(pcm)
    writer.end()
  })
}

async function synthesizeRaw(text: string, retries = 5, keyRetries = API_KEYS.length - 1): Promise<Buffer> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_GEMINI_25,
      contents: [{ parts: [{ text }] }],
      config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE.soloNarrator } } } },
    })
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!data) {
      if (retries > 0) { await new Promise(r => setTimeout(r, 2000)); return synthesizeRaw(text, retries - 1, keyRetries) }
      throw new Error('No audio data')
    }
    return Buffer.from(data, 'base64')
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    const rotate = ([429, 403].includes(err.status ?? 0) || (err.status === 400 && err.message?.includes('expired'))) && keyRetries > 0
    if (rotate) {
      keyIndex = (keyIndex + 1) % API_KEYS.length
      ai = new GoogleGenAI({ apiKey: API_KEYS[keyIndex] })
      console.log(`  키 ${keyIndex + 1}로 전환 (${err.status})`)
      return synthesizeRaw(text, 5, keyRetries - 1)
    }
    if (err.status === 500 && retries > 0) { await new Promise(r => setTimeout(r, 3000)); return synthesizeRaw(text, retries - 1, keyRetries) }
    throw e
  }
}

/** ElevenLabs MP3 → 24kHz mono PCM. 2-synthesize/engines.ts와 같은 ffmpeg 경로 */
function mp3ToPcm24k(mp3: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-i', 'pipe:0', '-f', 's16le', '-ar', '24000', '-ac', '1', 'pipe:1'])
    const chunks: Buffer[] = []
    let stderr = ''
    ff.stdout.on('data', d => chunks.push(d as Buffer))
    ff.stderr.on('data', d => { stderr += d.toString() })
    ff.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg(MP3→PCM) ${code}: ${stderr.slice(0, 300)}`)))
    ff.stdin.write(mp3)
    ff.stdin.end()
  })
}

async function synthesizeEle(text: string): Promise<Buffer> {
  if (getEleAccounts().length === 0) throw new Error('ElevenLabs 계정 키가 없다 (ELEVENLABS_API_KEY*)')
  const account = await resolveEleAccountForVoice(ELE_VOICE_ID)
  if (!account) throw new Error(`해당 음성을 가진 ElevenLabs 계정을 찾지 못함: ${ELE_VOICE_ID}`)
  const tagged = /^\[.+?\]/.test(text.trim()) ? text : `[deliberate] ${text}`
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELE_VOICE_ID)}`, {
    method: 'POST',
    headers: { 'xi-api-key': account.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: tagged, model_id: 'eleven_v3', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 }, speed: 1.0 }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return mp3ToPcm24k(Buffer.from(await res.arrayBuffer()))
}

type Book = { title: string; text: string; duration?: number; image?: string; voice?: string }
type Script = { person: string; lead?: string; leadDuration?: number; leadVoice?: string; intro: string; books: Book[]; [k: string]: unknown }

async function synthesizeEpisode(slug: string) {
  const dir = path.join(BASE, slug)
  const jsonPath = path.join(dir, 'ko.json')
  if (!existsSync(jsonPath)) { console.log(`- ${slug}: ko.json 없음, 건너뜀`); return }
  const script = JSON.parse(readFileSync(jsonPath, 'utf-8')) as Script
  const voiceDir = path.join(dir, 'voice', 'ko')
  mkdirSync(voiceDir, { recursive: true })
  console.log(`▶ ${slug} (${script.person})`)

  const jobs: { id: string; text: string; apply: (rel: string, sec: number) => void }[] = []
  if (script.lead?.trim()) jobs.push({ id: 'lead', text: script.lead.trim(), apply: (rel, sec) => { script.leadVoice = rel; script.leadDuration = sec } })
  script.books.forEach((book, i) => {
    const id = String(i + 1).padStart(2, '0')
    jobs.push({ id, text: book.text, apply: (rel, sec) => { book.voice = rel; book.duration = sec } })
  })

  for (const job of jobs) {
    const file = path.join(voiceDir, `${job.id}.wav`)
    const rel = `voice/ko/${job.id}.wav`
    if (existsSync(file) && !FORCE) {
      const sec = measureWav(file) + BREATH_SEC
      job.apply(rel, Number(sec.toFixed(2)))
      console.log(`  ${job.id}.wav 있음 ${sec.toFixed(2)}s`)
      continue
    }
    const pcm = ENGINE === 'elevenlabs'
      ? await synthesizeEle(job.text)
      : await synthesizeRaw(`${NARRATOR_STYLE_DEFAULT}: ${job.text}`)
    const sec = (await saveWav(file, pcm)) + BREATH_SEC
    job.apply(rel, Number(sec.toFixed(2)))
    console.log(`  ${job.id}.wav ${sec.toFixed(2)}s  ${job.text.slice(0, 40)}`)
  }
  writeFileSync(jsonPath, JSON.stringify(script, null, 2) + '\n')
  const total = (script.leadDuration ?? 0) + script.books.reduce((s, b) => s + (b.duration ?? 0), 0)
  console.log(`  합계 ${total.toFixed(1)}s`)
}

/** RIFF 헤더에서 길이(초) 측정. ffmpeg 없이 동작한다 */
function measureWav(file: string): number {
  const buf = readFileSync(file)
  let byteRate = 0, dataSize = 0, off = 12
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') byteRate = buf.readUInt32LE(off + 16)
    else if (id === 'data') { dataSize = size; break }
    off += 8 + size + (size % 2)
  }
  if (byteRate <= 0 || dataSize <= 0) throw new Error(`WAV 길이 측정 실패: ${file}`)
  return dataSize / byteRate
}

const targets = EPISODE ? [EPISODE] : EPISODES
for (const slug of targets) await synthesizeEpisode(slug)
