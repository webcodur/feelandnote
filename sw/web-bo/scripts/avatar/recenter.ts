/**
 * 얼굴 중심축이 프레임 45~55%를 벗어난 아바타를 AVATAR_SPEC 규격으로 다시 자른다.
 *
 * 우측크롭으로 얼굴이 60%에 밀린 파일을 저장본에서 재배치한다 — 눈·턱 랜드마크로
 * computeCropFromLandmarks가 정한 정사각을 떠서 1024로 내린다. roll이 3도를 넘는 파일은
 * 먼저 눈 중점 기준으로 회전시켜 수평을 맞춘 뒤 같은 크롭을 적용한다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/recenter.ts <이미지폴더> --names "a.jpg,b.jpg" [--roll "a.jpg:-9.2"] --out <출력폴더>
 *   npx tsx scripts/avatar/recenter.ts <이미지폴더> --json <목록.json> --out <출력폴더>
 *     목록: [{ "name": "a.jpg", "src": "원본 절대경로(선택)" }] — src가 있으면 원본에서 자른다.
 */
import sharp from 'sharp'
import { mkdirSync, readdirSync, readFileSync } from 'fs'
import { resolve, join } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { computeCropFromLandmarks } from '../../src/lib/avatar-geometry'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : null
}
const namesArg = flag('names')
const jsonArg = flag('json')
const outDir = flag('out') ?? join(dir as string, '_recentered')
const rollArg = flag('roll') ?? ''
const rollMap = new Map<string, number>()
for (const kv of rollArg.split(',')) {
  const [k, v] = kv.split(':')
  if (k && v) rollMap.set(k.trim(), parseFloat(v))
}
const sparkleRightMap = new Map<string, number>()
for (const kv of (flag('sparkle-right') ?? '').split(',')) {
  const [k, v] = kv.split(':')
  if (k && v) sparkleRightMap.set(k.trim(), parseFloat(v))
}
const sparkleRightDefault = flag('sparkle-right-default') ? parseFloat(flag('sparkle-right-default')!) : null
if (!dir) {
  console.error('사용법: npx tsx scripts/avatar/recenter.ts <폴더> [--names a.jpg,b.jpg] [--roll a.jpg:-9.2] --out <폴더>')
  process.exit(1)
}

async function detect(img: sharp.Sharp) {
  const { data, info } = await img.flatten({ background: '#808080' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32') as unknown as Parameters<
    typeof faceapi.detectAllFaces
  >[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
      .withFaceLandmarks()
    if (!dets.length) return null
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const lm = dets[0].landmarks
    const c = (pts: { x: number; y: number }[]) => ({
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    })
    const L = c(lm.getLeftEye())
    const R = c(lm.getRightEye())
    const jaw = lm.getJawOutline()
    return {
      eyeX: (L.x + R.x) / 2,
      eyeY: (L.y + R.y) / 2,
      chinY: jaw[8].y,
      roll: (Math.atan2(R.y - L.y, R.x - L.x) * 180) / Math.PI,
      w: info.width,
      h: info.height,
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

async function main() {
  await setWasmPaths(resolve(BO_ROOT, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO_ROOT, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
  mkdirSync(outDir, { recursive: true })

  const files: { name: string; src: string; sr?: number }[] = jsonArg
    ? (JSON.parse(readFileSync(jsonArg, 'utf8')) as { name: string; src?: string; sr?: number }[]).map((e) => ({
        name: e.name,
        src: e.src ?? join(dir as string, e.name),
        sr: e.sr,
      }))
    : (namesArg ? namesArg.split(',').map((s) => s.trim()) : readdirSync(dir as string).filter((f) => /\.(webp|png|jpe?g)$/i.test(f) && !f.startsWith('_'))).map(
        (name) => ({ name, src: join(dir as string, name) as string })
      )

  for (const { name: f, src, sr: fileSr } of files) {
    try {
    const srcBuf = readFileSync(src)
    let img = sharp(srcBuf)
    let a = await detect(img)
    if (!a) {
      console.log(f.padEnd(28) + '미검출')
      continue
    }
    // roll이 3도 넘으면 확장 캔버스 위에서 수평을 맞춘다.
    // 회전 후 재검출은 오검출이 잦으므로 랜드마크는 회전 행렬로 직접 계산한다
    const wantRoll = rollMap.get(f) ?? a.roll
    if (Math.abs(wantRoll) > 3) {
      const pad = Math.ceil(Math.max(a.w, a.h) * 0.4)
      const rotated = await sharp(srcBuf)
        .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 128, g: 128, b: 128, alpha: 1 } })
        .rotate(-wantRoll, { background: { r: 128, g: 128, b: 128, alpha: 1 } })
        .toBuffer()
      img = sharp(rotated)
      // sharp.rotate(θ)는 시계방향 회전 — 소스 점 (x,y)는 확장 캔버스 중심 기준 θ 회전한 위치로 간다
      const cx0 = a.w / 2 + pad
      const cy0 = a.h / 2 + pad
      const th = (-wantRoll * Math.PI) / 180
      const rot = (x: number, y: number) => ({
        x: cx0 + (x + pad - cx0) * Math.cos(th) - (y + pad - cy0) * Math.sin(th),
        y: cy0 + (x + pad - cx0) * Math.sin(th) + (y + pad - cy0) * Math.cos(th),
      })
      const e = rot(a.eyeX, a.eyeY)
      const ch = rot(a.eyeX, a.chinY) // 턱은 눈 중점과 같은 x로 둔 근사(roll은 이미 평행)
      a = {
        eyeX: e.x,
        eyeY: e.y,
        chinY: ch.y,
        roll: 0,
        w: a.w + pad * 2,
        h: a.h + pad * 2,
      }
    }
    const crop = computeCropFromLandmarks(a, a.w, a.h)
    // 얼굴이 규격보다 커서 크롭이 원본 전체가 됐는데 중심축이 밀려 있으면,
    // 얼굴 중심으로 맞출 수 있는 최대 정사각으로 강제로 자른다(규격보다 얼굴이 크게 담긴다)
    const specCx = (a.eyeX - crop.left) / crop.size
    if (crop.size >= a.w - 8 && Math.abs(specCx - 0.5) > 0.045) {
      const side = Math.round(Math.min(2 * Math.min(a.eyeX, a.w - a.eyeX), a.w, a.h))
      crop.left = Math.round(a.eyeX - side / 2)
      crop.top = Math.max(0, Math.min(a.h - side, Math.round(a.eyeY - side * 0.46)))
      crop.size = side
      crop.warnings.push('얼굴이 규격보다 커 중심축 기준 최대 정사각으로 잘랐다 — 얼굴이 크게 담긴다')
    }
    // 원본에 우하단 스파클이 있는 파일은 우측 경계를 넘지 않게 한다 —
    // 왼쪽으로 밀면 얼굴이 치우치므로, 중심을 유지한 채 한 변을 줄인다
    const sr = fileSr ?? sparkleRightMap.get(f) ?? sparkleRightDefault
    if (sr !== null && sr !== undefined && crop.left + crop.size > sr) {
      const maxSide = Math.round(2 * (sr - a.eyeX))
      if (maxSide > 400) {
        crop.size = Math.min(crop.size, maxSide)
        crop.left = Math.round(a.eyeX - crop.size / 2)
        crop.top = Math.max(0, Math.min(a.h - crop.size, Math.round(a.eyeY - crop.size * 0.46)))
      } else {
        crop.left = Math.max(0, sr - crop.size)
      }
    }
    await img
      .extract({ left: crop.left, top: crop.top, width: crop.size, height: crop.size })
      .resize(1024, 1024)
      .jpeg({ quality: 92 })
      .toFile(join(outDir, f))
    const cx = ((a.eyeX - crop.left) / crop.size * 100).toFixed(1)
    console.log(
      f.padEnd(28) +
        `roll ${a.roll.toFixed(1).padStart(5)}  crop(${crop.left},${crop.top},${crop.size})  얼굴축 ${cx}%` +
        (crop.warnings.length ? '  ⚠ ' + crop.warnings.join(' / ') : '')
    )
    } catch (e) {
      console.log(f.padEnd(28) + '실패: ' + (e as Error).message)
    }
  }
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
