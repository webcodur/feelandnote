/**
 * 얼굴 임베딩 감사 — 시드 대비 동일인물 거리 + 저장본 간 중복 얼굴 탐지
 *
 * hero-batch.json의 facePath(시드)와 avatars/<nick>.jpg 저장본을 faceRecognitionNet
 * 128차원 임베딩으로 비교한다.
 * - seedDist: 시드↔저장본 L2 거리 — 클수록 다른 사람(전형적 임계 0.6)
 * - dupPairs: 저장본끼리 가장 가까운 쌍 — 모델 얼굴 재사용 탐지
 *
 * 사용법 (sw/web-bo 에서): npx tsx scripts/avatar/embed-audit.ts [--json <출력>]
 */
import sharp from 'sharp'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

const AV_DIR = 'D:/image/_avatar-work/avatars'
const BATCH = 'D:/image/_avatar-work/hero-batch.json'
const jsonIdx = process.argv.indexOf('--json')
const jsonPath: string | null = jsonIdx >= 0 ? (process.argv[jsonIdx + 1] ?? null) : null

type BatchEntry = { slug: string; nick: string; facePath?: string }

async function descriptor(file: string): Promise<Float32Array | null> {
  const buf = readFileSync(file)
  const { data, info } = await sharp(buf)
    .flatten({ background: '#808080' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32') as unknown as Parameters<
    typeof faceapi.detectAllFaces
  >[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 5 }))
      .withFaceLandmarks()
      .withFaceDescriptors()
    if (!dets.length) return null
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    return dets[0].descriptor
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

const l2 = (a: Float32Array, b: Float32Array) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2
  return Math.sqrt(s)
}

async function main() {
  await setWasmPaths(resolve(BO_ROOT, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO_ROOT, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelDir)

  const batch = JSON.parse(readFileSync(BATCH, 'utf8')) as BatchEntry[]
  const rows: { nick: string; slug: string; seedDist: number | null; note?: string }[] = []
  const descs = new Map<string, Float32Array>()
  const seedDescs = new Map<string, Float32Array>()

  for (const e of batch) {
    const avPath = join(AV_DIR, `${e.nick}.jpg`)
    if (!existsSync(avPath)) {
      rows.push({ nick: e.nick, slug: e.slug, seedDist: null, note: '저장본 없음' })
      continue
    }
    const av = await descriptor(avPath)
    if (!av) {
      rows.push({ nick: e.nick, slug: e.slug, seedDist: null, note: '저장본 얼굴 미검출' })
      continue
    }
    descs.set(e.nick, av)
    if (!e.facePath || !existsSync(e.facePath)) {
      rows.push({ nick: e.nick, slug: e.slug, seedDist: null, note: '시드 없음' })
      continue
    }
    const sd = await descriptor(e.facePath)
    if (sd) seedDescs.set(e.nick, sd)
    rows.push({ nick: e.nick, slug: e.slug, seedDist: sd ? +l2(sd, av).toFixed(3) : null, note: sd ? undefined : '시드 얼굴 미검출' })
  }

  // 임베딩 저장 — 재계산 없이 후속 분석에 쓴다
  const dump: Record<string, { av: number[]; seed: number[] | null }> = {}
  for (const [k, v] of descs) dump[k] = { av: [...v], seed: seedDescs.has(k) ? [...seedDescs.get(k)!] : null }
  writeFileSync('D:/image/_avatar-work/audit/embeddings.json', JSON.stringify(dump))

  // 저장본 쌍대 최근접 — 중복 얼굴
  const names = [...descs.keys()]
  const pairs: { a: string; b: string; d: number }[] = []
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const d = l2(descs.get(names[i])!, descs.get(names[j])!)
      if (d < 0.45) pairs.push({ a: names[i], b: names[j], d: +d.toFixed(3) })
    }
  pairs.sort((x, y) => x.d - y.d)

  rows.sort((x, y) => (y.seedDist ?? -1) - (x.seedDist ?? -1))
  console.log('\n=== 시드 대비 거리 상위 (의심) ===')
  for (const r of rows.filter((r) => r.seedDist !== null).slice(0, 60)) console.log(`${r.nick.padEnd(20)} ${r.seedDist}`)
  console.log('\n=== 시드 없음/미검출 ===')
  for (const r of rows.filter((r) => r.note)) console.log(`${r.nick.padEnd(20)} ${r.note}`)
  console.log('\n=== 저장본 중복 의심 쌍 (d<0.45) ===')
  for (const p of pairs) console.log(`${p.a} ↔ ${p.b}  d=${p.d}`)

  if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ rows, pairs }, null, 2))
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
