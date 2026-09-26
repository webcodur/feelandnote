/**
 * 후보 인물 원본 사진의 아바타 적합도 채점
 *
 * measure.ts는 "이미 잘린 아바타"를 재지만, 이 스크립트는 "원본 사진이 아바타용
 * 크롭 재료가 되는가"를 본다. 얼굴 수·주 얼굴 크기·프레임 가장자리 여백·랜드마크
 * 기반 정면성으로 good/weak/fail을 매긴다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/face-source-score.ts <이미지폴더> [--json <출력경로>]
 */
import sharp from 'sharp'
import { readdirSync, writeFileSync } from 'fs'
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
const dir = process.argv.slice(2).find((x) => !x.startsWith('--'))
const argJson = (() => {
  const i = process.argv.indexOf('--json')
  return i >= 0 ? process.argv[i + 1] : join(dir!, '..', 'face-score.json')
})()

if (!dir) {
  console.error('사용법: npx tsx scripts/avatar/face-source-score.ts <이미지폴더> [--json 출력]')
  process.exit(1)
}

async function loadModels() {
  await setWasmPaths(resolve(BO, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
}

interface Row {
  file: string
  grade: 'good' | 'weak' | 'fail'
  reason: string
  faces?: number
  /** 주 얼굴 상자 면적 / 이미지 면적 */
  faceFrac?: number
  /** 얼굴 중심을 감싸는 정사각 크롭(상자×2.4)이 프레임 안에 들어가는 비율 0~1 */
  cropFit?: number
  /** 랜드마크 좌우 비대칭 (0=정면) */
  yawProxy?: number
  score?: number
  width?: number
  height?: number
}

async function scoreOne(buf: Buffer, file: string): Promise<Row> {
  const meta = await sharp(buf).rotate().metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (!W || !H) return { file, grade: 'fail', reason: 'decode' }
  const { data, info } = await sharp(buf)
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
  const dets = await faceapi
    .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
    .withFaceLandmarks()
  tensor.dispose()
  if (!dets.length) return { file, grade: 'fail', reason: 'no-face', faces: 0, width: W, height: H }
  dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
  const d = dets[0]
  const box = d.detection.box
  const faceFrac = box.area / (W * H)
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // 목표 크롭: 얼굴 상자의 2.4배 정사각(이마·턱·목 여유)
  const side = Math.max(box.width, box.height) * 2.4
  const left = Math.min(cx - side / 2, 0) * -1 // 넘친 만큼(+)
  const right = Math.max(cx + side / 2 - W, 0)
  const top = Math.min(cy - side / 2, 0) * -1
  const bottom = Math.max(cy + side / 2 - H, 0)
  const overflow = Math.max(left, right, top, bottom, 0)
  const cropFit = Math.max(0, 1 - overflow / side)
  // 정면성: 코끝이 양쪽 눈꼬리 중점에 얼마나 가까운가
  const lm = d.landmarks
  const le = lm.getLeftEye()[0] // 왼쪽 눈 바깥꼬리
  const re = lm.getRightEye()[3] // 오른쪽 눈 바깥꼬리
  const nose = lm.getNose()[3] // 콧등 아래
  const mid = (le.x + re.x) / 2
  const eyeSpan = Math.abs(re.x - le.x) || 1
  const yawProxy = Math.abs(nose.x - mid) / eyeSpan

  const multi = dets.length > 1 && dets[1].detection.box.area > box.area * 0.35
  const base = {
    file,
    faces: dets.length,
    faceFrac: +faceFrac.toFixed(4),
    cropFit: +cropFit.toFixed(3),
    yawProxy: +yawProxy.toFixed(3),
    score: +d.detection.score.toFixed(3),
    width: W,
    height: H,
  }
  if (faceFrac < 0.01) return { ...base, grade: 'fail', reason: 'face-tiny' }
  if (multi && faceFrac < 0.05) return { ...base, grade: 'fail', reason: 'multi-face' }
  if (cropFit < 0.55) return { ...base, grade: 'fail', reason: 'face-at-edge' }
  if (yawProxy > 0.45) return { ...base, grade: 'weak', reason: 'side-angle' }
  if (faceFrac < 0.03 || cropFit < 0.8 || multi || yawProxy > 0.25)
    return { ...base, grade: 'weak', reason: multi ? 'multi-face' : 'tight' }
  return { ...base, grade: 'good', reason: 'ok' }
}

async function main() {
  const files = readdirSync(dir!).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  console.log(`${files.length}장 채점`)
  await loadModels()
  const rows: Row[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    try {
      const buf = await sharp(join(dir!, f)).toBuffer()
      rows.push(await scoreOne(buf, f))
    } catch (e) {
      rows.push({ file: f, grade: 'fail', reason: 'error' })
    }
    if (i % 200 === 0) console.log(i)
  }
  writeFileSync(argJson, JSON.stringify(rows, null, 1))
  const g = { good: 0, weak: 0, fail: 0 }
  const reasons: Record<string, number> = {}
  for (const r of rows) {
    g[r.grade]++
    reasons[r.reason] = (reasons[r.reason] ?? 0) + 1
  }
  console.log('good', g.good, 'weak', g.weak, 'fail', g.fail)
  console.log(reasons)
}
main()
