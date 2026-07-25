/**
 * 프로필 사진(avatar)이 없는 세력도감 인물에게, 전용 화보(단독샷)에서 얼굴을 검출·정사각 크롭해 아바타로 박는다.
 * face-api(SSD MobileNet) + sharp. 얼굴 미검출 시 상단 정사각 fallback.
 *
 * 실행: sw/web-bo 에서  node --env-file=.env --import tsx scripts/fill-faction-avatars.ts
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import type { TNetInput } from '@vladmandic/face-api'

const __dirname = dirname(fileURLToPath(import.meta.url))
const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

const FACTION_ROOT = resolve(process.cwd(), '../remotion/public/factions/01-llm')

// avatar 없는 인물: celeb_id → 전용 화보 파일
const TARGETS: { id: string; file: string; name: string }[] = [
  { id: '0dbbf444-efac-40ba-821f-31f974040479', file: '04-anthropic/얀 라이케.png', name: '얀 라이케' },
  { id: '92d854ff-9438-45bb-887b-746e89f58027', file: '04-anthropic/로스 노딘.png', name: '로스 노딘' },
  { id: '3eb4970a-51c1-4315-ba3d-80f6a07ae6f7', file: '05-xai/마이클 니콜스.png', name: '마이클 니콜스' },
  { id: '27986934-b5c8-413b-b6c4-32d0f0089fef', file: '05-xai/데벤드라 차플로트.png', name: '데벤드라 차플로트' },
  { id: '70c4ee9e-bf20-453d-b0c4-2f00a1706392', file: '05-xai/앤드루 밀리치.png', name: '앤드루 밀리치' },
  { id: '1505d9ed-4557-4c98-a79c-209aaef3befc', file: '05-xai/제이슨 긴스버그.png', name: '제이슨 긴즈버그' },
]

interface Face { x: number; y: number; width: number; height: number; score: number }

async function detectLargestFace(buf: Buffer): Promise<Face | null> {
  const meta = await sharp(buf).rotate().metadata()
  const W = meta.width ?? 0, H = meta.height ?? 0
  const long = Math.max(W, H)
  const scale = long > 1024 ? 1024 / long : 1
  const { data, info } = await sharp(buf).rotate()
    .resize(Math.round(W * scale), Math.round(H * scale), { fit: 'inside' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32') as unknown as TNetInput
  try {
    const det = await faceapi.detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
    if (!det.length) return null
    det.sort((a, b) => b.box.area - a.box.area)
    const b = det[0], inv = 1 / scale
    return { x: b.box.x * inv, y: b.box.y * inv, width: b.box.width * inv, height: b.box.height * inv, score: b.score }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

function squareCrop(face: Face, W: number, H: number) {
  const cx = face.x + face.width / 2
  const cy = face.y + face.height * 0.5
  const base = Math.max(face.width, face.height)
  const size = Math.min(base * 2.2, Math.min(W, H))
  const half = size / 2
  const left = Math.max(0, Math.min(W - size, cx - half))
  const top = Math.max(0, Math.min(H - size, cy - half))
  return { left: Math.round(left), top: Math.round(top), size: Math.round(size) }
}

async function toAvatar(buf: Buffer): Promise<{ out: Buffer; face: boolean }> {
  const rotated = await sharp(buf).rotate().toBuffer()
  const m = await sharp(rotated).metadata()
  const W = m.width ?? 0, H = m.height ?? 0
  const face = await detectLargestFace(rotated)
  if (face) {
    const { left, top, size } = squareCrop(face, W, H)
    const out = await sharp(rotated).extract({ left, top, width: size, height: size })
      .resize(800, 800, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()
    return { out, face: true }
  }
  // fallback: 상단 정사각 (인물 화보는 얼굴이 위쪽)
  const size = Math.min(W, H)
  const left = Math.round((W - size) / 2)
  const out = await sharp(rotated).extract({ left, top: 0, width: size, height: size })
    .resize(800, 800, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()
  return { out, face: false }
}

async function main() {
  setWasmPaths(resolve(__dirname, '..', 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(
    resolve(__dirname, '..', 'node_modules', '@vladmandic', 'face-api', 'model')
  )
  console.log('[init] face-api 준비 완료')

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  })

  const { readFileSync } = await import('fs')
  for (const tgt of TARGETS) {
    const path = resolve(FACTION_ROOT, tgt.file)
    if (!existsSync(path)) { console.log(`  파일 없음: ${tgt.name} (${tgt.file})`); continue }
    const { out, face } = await toAvatar(readFileSync(path))
    const key = `celebs/${tgt.id}/avatar.webp`
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!, Key: key, Body: out,
      ContentType: 'image/webp', CacheControl: 'no-cache, must-revalidate',
    }))
    const url = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', tgt.id)
    console.log(`  ${tgt.name} → 아바타 등록 (얼굴검출: ${face ? 'O' : 'X-상단크롭'})`)
  }

  const secret = process.env.CRON_SECRET
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  if (secret) {
    try {
      const res = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'celebs', secret }),
      })
      console.log(`캐시 무효화: ${res.status}`)
    } catch { console.log('캐시 무효화 실패') }
  }
  console.log('완료.')
}

main().catch((e) => { console.error(e); process.exit(1) })
