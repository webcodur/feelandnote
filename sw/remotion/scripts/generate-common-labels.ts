/**
 * 인물 열전 — 공통 항목명 음성 생성 (1회만 실행)
 *
 * pnpm voice:labels
 */

import 'dotenv/config'
import wav from 'wav'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'voice-profile', 'common')

const CLOUD_TTS_KEY = process.env.GOOGLE_CLOUD_TTS_KEY
const CLOUD_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

const LABELS: Record<string, string> = {
  // 능력
  'ability-command': '통솔',
  'ability-martial': '무력',
  'ability-intellect': '지력',
  'ability-charm': '매력',
  // 내적 덕목
  'inner-temperance': '절제',
  'inner-diligence': '근면',
  'inner-reflection': '성찰',
  'inner-courage': '용기',
  // 외적 덕목
  'outer-loyalty': '충성',
  'outer-benevolence': '인자',
  'outer-fairness': '공정',
  'outer-humility': '겸양',
  // 성향
  'disp-cautious_bold': '대담성',
  'disp-pessimism_optimism': '낙관성',
  'disp-conservative_progressive': '진보성',
  'disp-individual_social': '사회성',
  // 영향력
  'influence-strategic': '전략',
  'influence-political': '정치',
  'influence-cultural': '문화',
  'influence-social': '사회',
  'influence-economic': '경제',
  'influence-tech': '기술',
  'influence-transhistoricity': '통시성',
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

async function synthesize(text: string, outputFile: string): Promise<number> {
  if (!CLOUD_TTS_KEY) throw new Error('GOOGLE_CLOUD_TTS_KEY 필요')
  const body = {
    input: { text },
    voice: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-A' },
    audioConfig: { audioEncoding: 'LINEAR16' as const, sampleRateHertz: 24000 },
  }
  const res = await fetch(`${CLOUD_TTS_URL}?key=${CLOUD_TTS_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Cloud TTS ${res.status}: ${await res.text()}`)
  const json = await res.json() as { audioContent: string }
  let pcm = Buffer.from(json.audioContent, 'base64')
  if (pcm.length > 44 && pcm.toString('ascii', 0, 4) === 'RIFF') pcm = pcm.subarray(44)
  const duration = await saveWav(outputFile, pcm)
  console.log(`  ${path.basename(outputFile).padEnd(35)} ${duration.toFixed(2)}s`)
  return duration
}

type Manifest = Record<string, string>

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  // 매니페스트 로드
  let manifest: Manifest = {}
  try { manifest = JSON.parse(await readFile(path.join(OUT_DIR, 'manifest.json'), 'utf-8')) } catch {}

  const forceAll = process.argv.includes('--force')
  const results: Record<string, number> = {}

  console.log(`공통 라벨 음성 생성 (${Object.keys(LABELS).length}개)\n`)

  for (const [key, text] of Object.entries(LABELS)) {
    const file = `label-${key}.wav`
    const hash = createHash('sha256').update(text).digest('hex').slice(0, 16)

    if (!forceAll && manifest[file] === hash) {
      continue
    }

    const duration = await synthesize(text, path.join(OUT_DIR, file))
    results[file] = duration
    manifest[file] = hash
  }

  if (Object.keys(results).length === 0) {
    console.log('변경 없음.')
    return
  }

  // duration.json 저장 (컴포지션에서 참조)
  let durations: Record<string, number> = {}
  try { durations = JSON.parse(await readFile(path.join(OUT_DIR, 'durations.json'), 'utf-8')) } catch {}
  Object.assign(durations, results)
  await writeFile(path.join(OUT_DIR, 'durations.json'), JSON.stringify(durations, null, 2) + '\n')
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  console.log(`\n✓ ${Object.keys(results).length}개 생성 완료`)
}

main().catch(console.error)
