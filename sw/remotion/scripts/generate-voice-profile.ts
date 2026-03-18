/**
 * 인물 열전 TTS 생성 — Google Cloud TTS
 *
 * 사용법:
 *   pnpm voice:profile -- --episode alexander-the-great --update-json
 *   pnpm voice:profile -- --episode alexander-the-great --list
 *   pnpm voice:profile -- --episode alexander-the-great --force --update-json
 */

import 'dotenv/config'
import wav from 'wav'
import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type { CelebProfileScript } from '../src/compositions/CelebProfile/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const EPISODES_DIR = path.join(ROOT, 'episodes', 'celeb-profile')

// CLI
const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const EPISODE_NAME = epIdx >= 0 ? args[epIdx + 1] : 'alexander-the-great'

const BASE_DIR = path.join(ROOT, 'public', 'voice-profile', EPISODE_NAME)

// --- Google Cloud TTS ---
const CLOUD_TTS_KEY = process.env.GOOGLE_CLOUD_TTS_KEY
const CLOUD_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

const VOICE_MAP: Record<string, string> = {
  narrator: 'ko-KR-Neural2-A',  // 여성 (나레이터 Kore)
  celeb: 'ko-KR-Neural2-B',     // 남성 (셀럽)
}

async function saveWav(filename: string, pcmData: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, { channels: 1, sampleRate: 24000, bitDepth: 16 })
    writer.on('finish', () => resolve(pcmData.length / (24000 * 2)))
    writer.on('error', reject)
    writer.write(pcmData)
    writer.end()
  })
}

async function synthesizeCloud(text: string, role: 'narrator' | 'celeb', outputFile: string): Promise<number> {
  if (!CLOUD_TTS_KEY) throw new Error('GOOGLE_CLOUD_TTS_KEY 없음. .env에 추가하세요.')
  const voiceName = VOICE_MAP[role]
  const body = {
    input: { text },
    voice: { languageCode: 'ko-KR', name: voiceName },
    audioConfig: { audioEncoding: 'LINEAR16' as const, sampleRateHertz: 24000 },
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
  if (pcm.length > 44 && pcm.toString('ascii', 0, 4) === 'RIFF') {
    pcm = pcm.subarray(44)
  }
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(40)} ${duration.toFixed(2)}s`)
  return duration
}

// --- 숫자 → 한글 변환 ---
const UNITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const TENS = ['', '십', '이십', '삼십', '사십', '오십', '육십', '칠십', '팔십', '구십']

function numToKorean(n: number): string {
  if (n === 0) return '영'
  const abs = Math.abs(n)
  const prefix = n < 0 ? '마이너스 ' : ''
  if (abs < 10) return prefix + UNITS[abs]
  if (abs < 100) return prefix + TENS[Math.floor(abs / 10)] + UNITS[abs % 10]
  return prefix + String(abs) // 100 이상은 아라비아
}

function scoreText(score: number, unit = '점'): string {
  const prefix = score > 0 && unit !== '점' ? '플러스 ' : ''
  return `${prefix}${numToKorean(score)}${unit}`
}

// --- Job 빌더 ---
type Job = { file: string; role: 'narrator' | 'celeb'; text: string; jsonPath: string }

function buildJobs(ep: CelebProfileScript): Job[] {
  const jobs: Job[] = []
  const n = ep.narrator
  const ttsN = ep.tts?.narrator ?? {}

  // 나레이터 파트
  jobs.push({ file: 'narrator-series-intro.wav', role: 'narrator', text: n.seriesIntro, jsonPath: 'narrator.seriesIntroDuration' })
  jobs.push({ file: 'narrator-intro.wav', role: 'narrator', text: ttsN.intro ?? n.intro, jsonPath: 'narrator.introDuration' })
  jobs.push({ file: 'narrator-bio-to-persona.wav', role: 'narrator', text: ttsN.bioToPersona ?? n.bioToPersona, jsonPath: 'narrator.bioToPersonaDuration' })
  jobs.push({ file: 'narrator-abilities-to-virtues.wav', role: 'narrator', text: n.abilitiesToVirtues, jsonPath: 'narrator.abilitiesToVirtuesDuration' })
  jobs.push({ file: 'narrator-virtues-to-dispositions.wav', role: 'narrator', text: n.virtuesToDispositions, jsonPath: 'narrator.virtuesToDispositionsDuration' })
  jobs.push({ file: 'narrator-persona-to-influence.wav', role: 'narrator', text: n.personaToInfluence, jsonPath: 'narrator.personaToInfluenceDuration' })
  jobs.push({ file: 'narrator-total-score.wav', role: 'narrator', text: ttsN.totalScoreLine ?? n.totalScoreLine, jsonPath: 'narrator.totalScoreLineDuration' })
  jobs.push({ file: 'narrator-bridge.wav', role: 'narrator', text: n.bridge, jsonPath: 'narrator.bridgeDuration' })

  // 페르소나 — 능력 reason (점수 포함)
  for (const [key, entry] of Object.entries(ep.persona.abilities)) {
    const text = `${scoreText(entry.score)}. ${entry.reason}`
    jobs.push({ file: `persona-ability-${key}.wav`, role: 'narrator', text, jsonPath: `persona.abilities.${key}.duration` })
  }

  // 페르소나 — 내적 덕목 reason (점수 포함)
  for (const [key, entry] of Object.entries(ep.persona.innerVirtues)) {
    const text = `${scoreText(entry.score)}. ${entry.reason}`
    jobs.push({ file: `persona-inner-${key}.wav`, role: 'narrator', text, jsonPath: `persona.innerVirtues.${key}.duration` })
  }

  // 페르소나 — 외적 덕목 reason (점수 포함)
  for (const [key, entry] of Object.entries(ep.persona.outerVirtues)) {
    const text = `${scoreText(entry.score)}. ${entry.reason}`
    jobs.push({ file: `persona-outer-${key}.wav`, role: 'narrator', text, jsonPath: `persona.outerVirtues.${key}.duration` })
  }

  // 페르소나 — 성향 reason (점수 포함, ±표기)
  for (const [key, entry] of Object.entries(ep.persona.dispositions)) {
    const sign = entry.score >= 0 ? '플러스 ' : '마이너스 '
    const text = `${sign}${numToKorean(Math.abs(entry.score))}. ${entry.reason}`
    jobs.push({ file: `persona-disp-${key}.wav`, role: 'narrator', text, jsonPath: `persona.dispositions.${key}.duration` })
  }

  // 페르소나 — rationale
  jobs.push({ file: 'persona-rationale.wav', role: 'narrator', text: ep.persona.rationale, jsonPath: 'persona.rationaleDuration' })

  // 영향력 — 각 축 exp (점수 포함)
  for (const [key, axis] of Object.entries(ep.influence.axes)) {
    const text = `${scoreText(axis.score)}. ${axis.exp}`
    jobs.push({ file: `influence-${key}.wav`, role: 'narrator', text, jsonPath: `influence.axes.${key}.duration` })
  }

  // 영향력 — 통시성 (점수 포함)
  const trans = ep.influence.transhistoricity
  jobs.push({ file: 'influence-transhistoricity.wav', role: 'narrator', text: `${scoreText(trans.score)}. ${trans.exp}`, jsonPath: 'influence.transhistoricity.duration' })

  return jobs.filter(j => j.text.trim().length > 0)
}

// --- 매니페스트 ---
type Manifest = Record<string, string>

function jobHash(text: string, role: string): string {
  return createHash('sha256').update(`${role}:${text}`).digest('hex').slice(0, 16)
}

async function loadManifest(): Promise<Manifest> {
  try {
    const raw = await readFile(path.join(BASE_DIR, 'manifest.json'), 'utf-8')
    return JSON.parse(raw) as Manifest
  } catch { return {} }
}

async function saveManifest(m: Manifest): Promise<void> {
  await writeFile(path.join(BASE_DIR, 'manifest.json'), JSON.stringify(m, null, 2) + '\n', 'utf-8')
}

// --- JSON duration 반영 ---
function setNestedValue(obj: any, path: string, value: number): void {
  const keys = path.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]]
    if (!cur) return
  }
  cur[keys[keys.length - 1]] = value
}

// --- main ---
async function main() {
  const raw = await readFile(path.join(EPISODES_DIR, `${EPISODE_NAME}.json`), 'utf-8')
  const episode = JSON.parse(raw) as CelebProfileScript

  console.log(`인물 열전: ${EPISODE_NAME}`)

  await mkdir(BASE_DIR, { recursive: true })

  const listOnly = args.includes('--list')
  const forceAll = args.includes('--force')
  const onlyIdx = args.indexOf('--only')
  const onlyFiles = onlyIdx >= 0 ? args[onlyIdx + 1]?.split(',') : null

  let jobs = buildJobs(episode)

  if (onlyFiles) {
    jobs = jobs.filter(j => onlyFiles.some(f => j.file.includes(f)))
  }

  // 변경 감지
  const manifest = await loadManifest()
  if (!forceAll && !onlyFiles) {
    const before = jobs.length
    jobs = jobs.filter(j => jobHash(j.text, j.role) !== manifest[j.file])
    const skipped = before - jobs.length
    if (skipped > 0) console.log(`변경 없는 ${skipped}개 스킵`)
    if (jobs.length === 0) {
      console.log('변경된 텍스트 없음. --force로 전체 재생성')
      return
    }
  }

  if (listOnly) {
    console.log(`\n생성 대상 (${jobs.length}개):`)
    for (const j of jobs) {
      const changed = jobHash(j.text, j.role) !== manifest[j.file]
      console.log(`  ${j.file.padEnd(40)} [${j.role}] ${changed ? '← 변경' : ''}`)
    }
    return
  }

  console.log(`\n${jobs.length}개 음성 생성 시작... [Cloud TTS]\n`)
  const results: Record<string, { duration: number; jsonPath: string }> = {}

  for (const job of jobs) {
    const outputFile = path.join(BASE_DIR, job.file)
    const duration = await synthesizeCloud(job.text, job.role, outputFile)
    results[job.file] = { duration, jsonPath: job.jsonPath }
    manifest[job.file] = jobHash(job.text, job.role)
  }

  await saveManifest(manifest)

  // duration 결과
  console.log('\n=== duration 결과 ===')
  for (const [file, { duration }] of Object.entries(results)) {
    console.log(`${file.padEnd(40)} ${duration.toFixed(2)}s`)
  }

  // --update-json
  if (args.includes('--update-json')) {
    const jsonPath = path.join(EPISODES_DIR, `${EPISODE_NAME}.json`)
    const jsonRaw = await readFile(jsonPath, 'utf-8')
    const json = JSON.parse(jsonRaw)

    for (const [, { duration, jsonPath: jp }] of Object.entries(results)) {
      setNestedValue(json, jp, Math.round(duration * 100) / 100)
    }

    await writeFile(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
    console.log(`\n✓ ${EPISODE_NAME}.json duration 자동 반영 완료`)
  }
}

main().catch(console.error)
