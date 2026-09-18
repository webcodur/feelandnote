/**
 * 얼굴 랜드마크 요약 덤프 — 회전(yaw)·기울기 판단용
 *
 * 폴더의 이미지마다 눈 중심 2점, 코끝, 턱끝, 턱선 양끝을 원본 픽셀과 프레임 비율로 찍는다.
 * 재배치 규격의 가로 기준(눈 중점 vs 한쪽 눈)을 정할 때 분포를 보려고 만든 계측 도구다.
 *
 * 사용법 (sw/web-bo 에서): npx tsx scripts/avatar/landmark-dump.ts <이미지폴더> [--json <출력>]
 */
import sharp from 'sharp'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
const jsonIdx = args.indexOf('--json')
const jsonPath: string | null = jsonIdx >= 0 ? (args[jsonIdx + 1] ?? null) : null
if (!dir) {
  console.error('사용법: npx tsx scripts/avatar/landmark-dump.ts <이미지폴더> [--json <출력>]')
  process.exit(1)
}

async function main() {
  await setWasmPaths(resolve(BO_ROOT, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO_ROOT, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)

  const out: Record<string, unknown>[] = []
  const folder = dir as string
  const files = readdirSync(folder).filter((f) => /\.(webp|png|jpe?g)$/i.test(f) && !f.startsWith('_')).sort()
  console.log('name'.padEnd(24) + 'yaw(코-눈중점/반눈간)  roll°  좌눈x  우눈x  코x   턱x')
  for (const f of files) {
    const buf = readFileSync(join(folder, f))
    const { data, info } = await sharp(buf)
      .flatten({ background: '#808080' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32') as unknown as Parameters<
      typeof faceapi.detectAllFaces
    >[0]
    try {
      const dets = await faceapi.detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 })).withFaceLandmarks()
      if (!dets.length) {
        console.log(f.padEnd(24) + '미검출')
        out.push({ name: f, error: '미검출' })
        continue
      }
      dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
      const lm = dets[0].landmarks
      const c = (pts: { x: number; y: number }[]) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length })
      const L = c(lm.getLeftEye()) // 화면 왼쪽 눈
      const R = c(lm.getRightEye()) // 화면 오른쪽 눈
      const nose = lm.getNose()[3] // 코끝(30번)
      const jaw = lm.getJawOutline()
      const chin = jaw[8]
      const mid = { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 }
      const halfEye = Math.hypot(R.x - L.x, R.y - L.y) / 2
      const yaw = (nose.x - mid.x) / halfEye
      const roll = (Math.atan2(R.y - L.y, R.x - L.x) * 180) / Math.PI
      const W = info.width
      const row = { name: f, yaw: +yaw.toFixed(2), roll: +roll.toFixed(1), leftEyeX: +(L.x / W * 100).toFixed(1), rightEyeX: +(R.x / W * 100).toFixed(1), noseX: +(nose.x / W * 100).toFixed(1), chinX: +(chin.x / W * 100).toFixed(1), jawLeftX: +(jaw[0].x / W * 100).toFixed(1), jawRightX: +(jaw[16].x / W * 100).toFixed(1) }
      out.push(row)
      console.log(f.padEnd(24) + String(row.yaw).padStart(8) + String(row.roll).padStart(14) + String(row.leftEyeX).padStart(7) + String(row.rightEyeX).padStart(7) + String(row.noseX).padStart(6) + String(row.chinX).padStart(6))
    } finally {
      ;(tensor as unknown as { dispose?: () => void }).dispose?.()
    }
  }
  if (jsonPath) writeFileSync(jsonPath, JSON.stringify(out, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
