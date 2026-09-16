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
 * 합성 코어(키 로테이션·재시도·wav 저장)는 voice/lib/gemini-engine.ts,
 * ElevenLabs 저수준 호출은 voice/lib/elevenlabs-engine.ts 단일 원천을 쓴다.
 */

import 'dotenv/config'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { MODEL_GEMINI_25, NARRATOR_STYLE_DEFAULT, VOICE } from '@feelandnote/shared/lib/voice-policy'
import { getEleAccounts } from '@feelandnote/shared/lib/ele-accounts'
import { cleanVoiceFile } from '@feelandnote/shared/bo/voice-cleanup'
import { createGeminiTts, saveWav, googleFreeKeyCount } from '../voice/lib/gemini-engine.js'
import { fetchElevenlabsMp3, mp3ToPcm24k } from '../voice/lib/elevenlabs-engine.js'

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

if (googleFreeKeyCount() === 0) { console.error('✗ GOOGLE_GENAI_API_KEY_FREE* 키가 없다'); process.exit(1) }
const gemini = createGeminiTts({ model: MODEL_GEMINI_25 })

async function synthesizeEle(text: string): Promise<Buffer> {
  if (getEleAccounts().length === 0) throw new Error('ElevenLabs 계정 키가 없다 (ELEVENLABS_API_KEY*)')
  const tagged = /^\[.+?\]/.test(text.trim()) ? text : `[deliberate] ${text}`
  return mp3ToPcm24k(await fetchElevenlabsMp3(tagged, ELE_VOICE_ID))
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
      : await gemini.synthesize(`${NARRATOR_STYLE_DEFAULT}: ${job.text}`, VOICE.soloNarrator)
    await saveWav(file, pcm)
    // 들숨·쉼 정리(SSoT) — 길이는 정리 뒤 값에 문장 사이 숨을 더한다
    const sec = (await cleanVoiceFile(file, file, 'reading')).seconds + BREATH_SEC
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
