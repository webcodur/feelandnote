/**
 * REF 감사 — 배역이 요구한 성별·나이와 실제 얼굴이 맞는지 잰다
 *
 *   npx tsx scripts/avatar/audit-refs.ts <배치폴더> [--json <출력경로>]
 *
 * 배치폴더는 casting.json · casting-bands.json · cast/<slug>-ref/ref.png 를 가진 폴더다.
 *
 * 왜 필요한가(26.08.21 실측): 캐스팅은 남성 모델 Ayush Chopra 였는데 프로필에서 긁힌 사진이
 * 여성 배우 Priyanka Chopra 였다. 그대로 생성해 아르주나가 여자로 나왔다.
 * 사람이 143장을 눈으로 다 볼 수 없으므로 성별·나이를 기계로 걸러 의심분만 본다.
 */
import sharp from 'sharp'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require(
  '@vladmandic/face-api/dist/face-api.node-wasm.js'
) as typeof import('@vladmandic/face-api')

const BO = BO_ROOT
const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : null
}
const batchDir = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--json')
if (!batchDir) {
  console.error('사용법: npx tsx scripts/avatar/audit-refs.ts <배치폴더>')
  process.exit(1)
}

async function loadModels() {
  await setWasmPaths(resolve(BO, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.ageGenderNet.loadFromDisk(modelDir)
}

async function readFace(file: string) {
  const { data, info } = await sharp(readFileSync(file)).rotate().removeAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 5 }))
      .withAgeAndGender()
    if (!dets.length) return null
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const d = dets[0]
    return { gender: d.gender, genderProbability: d.genderProbability, age: d.age }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

async function main() {
  await loadModels()
  const casting = JSON.parse(readFileSync(resolve(batchDir!, 'casting.json'), 'utf8'))
  const bands = JSON.parse(readFileSync(resolve(batchDir!, 'casting-bands.json'), 'utf8'))
  const targets = JSON.parse(readFileSync(resolve(batchDir!, 'targets.json'), 'utf8'))
  const byslug = new Map(targets.map((r: Record<string, unknown>) => [r.slug, r]))

  // --out 을 주면 REF 가 아니라 산출물(out/<slug>/avatar.png)을 검사한다.
  // REF 가 멀쩡해도 생성 과정에서 성별이 뒤집힐 수 있어 둘 다 봐야 한다.
  const auditOut = args.includes('--out')
  const subjects = auditOut ? targets : casting

  const rows: Record<string, unknown>[] = []
  let checked = 0
  for (const row of subjects) {
    const ref = auditOut
      ? resolve(batchDir!, 'out', row.slug, 'avatar.png')
      : resolve(batchDir!, 'cast', `${row.slug}-ref`, 'ref.png')
    if (!existsSync(ref)) continue
    if (auditOut && bands.bands[row.slug] === 'B') continue
    const role = byslug.get(row.slug) as Record<string, unknown> | undefined
    const wantMale = (bands.genderOverride[row.slug] ?? (role?.gender ? 'male' : 'female')) === 'male'
    const face = await readFace(ref).catch(() => null)
    checked++
    if (!face) { rows.push({ slug: row.slug, nickname: row.nickname, error: '얼굴 미검출' }); continue }

    const gotMale = face.gender === 'male'
    const band = bands.bands[row.slug]
    const [minAge, maxAge] = bands.ageRange[band] ?? [0, 99]
    const genderMismatch = gotMale !== wantMale && face.genderProbability > 0.9
    const ageOff = face.age < minAge - 8 || face.age > maxAge + 8

    rows.push({
      slug: row.slug,
      nickname: row.nickname ?? role?.nickname,
      model: row.model ?? null,
      want: wantMale ? 'male' : 'female',
      got: face.gender,
      genderProbability: +face.genderProbability.toFixed(2),
      age: Math.round(face.age),
      band,
      genderMismatch,
      ageOff,
    })
  }

  const bad = rows.filter((r) => r.genderMismatch)
  const old = rows.filter((r) => !r.genderMismatch && r.ageOff)
  const none = rows.filter((r) => r.error)

  console.log(`검사 ${checked}건`)
  console.log(`\n성별 어긋남 ${bad.length}건`)
  for (const r of bad) console.log(`  ${r.nickname} (${r.model}) — ${r.want} 이어야 하는데 ${r.got} (${r.genderProbability}) · 추정 ${r.age}세`)
  console.log(`\n나이 벗어남 ${old.length}건`)
  for (const r of old.slice(0, 20)) console.log(`  ${r.nickname} — ${r.band} 등급인데 추정 ${r.age}세`)
  if (none.length) console.log(`\n얼굴 미검출 ${none.length}건`)

  const out = flag('json') ?? join(batchDir!, auditOut ? 'audit-out.json' : 'audit-refs.json')
  writeFileSync(out, JSON.stringify(rows, null, 2))
  console.log(`\n→ ${out}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
