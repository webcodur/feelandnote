/**
 * 로컬 이미지 → 아바타 규격 크롭
 *
 * 생성기(agy·codex)가 뽑은 정사각 원본을 눈·턱 랜드마크로 다시 잘라 규격에 맞춘다.
 * 자를 영역이 원본 밖으로 나가면 가장자리 색으로 캔버스를 넓힌 뒤 자른다 —
 * 생성물은 얼굴이 프레임 위쪽·좌우에 붙는 일이 잦아 이 여유가 없으면 규격을 못 맞춘다.
 *
 * 규격 SSoT: docs/project/celeb/celeb-avatar-spec.md §1·§6
 * 좌표 계산은 src/lib/avatar-geometry.ts 하나만 쓴다. 여기서 수치를 다시 만들지 않는다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/crop-local.ts <입력폴더> <출력폴더> [--size 800] [--quality 95] [--png]
 *
 *   입력폴더의 <이름>.png|jpg|webp 를 읽어 출력폴더에 <이름>.webp 로 쓴다.
 *   --png 를 주면 webp 대신 png 로 쓴다(다음 단계에서 배경 제거를 할 때 쓴다).
 *
 * 얼굴 미검출은 실패로 집계하고 건너뛴다. 짐승 머리(BEAST) 아바타가 여기 걸리는데,
 * 그쪽은 애초에 눈·턱 규격 대상이 아니므로 원본을 그대로 쓰면 된다.
 */
import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join, parse as parsePath } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { AVATAR_SPEC, judgeGeometry, type FaceAnchors } from '../../src/lib/avatar-geometry'
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
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--png'))
const inDir = positional[0]
const outDir = positional[1]
const size = Number(flag('size') ?? 800)
const quality = Number(flag('quality') ?? 95)
const asPng = args.includes('--png')

if (!inDir || !outDir) {
  console.error('사용법: npx tsx scripts/avatar/crop-local.ts <입력폴더> <출력폴더> [--size 800] [--png]')
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

async function anchorsOf(buf: Buffer): Promise<{ anchors: FaceAnchors; W: number; H: number } | null> {
  const meta = await sharp(buf).rotate().metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  const { data, info } = await sharp(buf).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
      .withFaceLandmarks()
    if (!dets.length) return null
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const lm = dets[0].landmarks
    const eyePts = [...lm.getLeftEye(), ...lm.getRightEye()]
    const jaw = lm.getJawOutline()
    return {
      W,
      H,
      anchors: {
        eyeX: eyePts.reduce((s, p) => s + p.x, 0) / eyePts.length,
        eyeY: eyePts.reduce((s, p) => s + p.y, 0) / eyePts.length,
        chinY: jaw[Math.floor(jaw.length / 2)].y,
      },
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

/**
 * 자를 정사각이 원본 밖으로 나가는 만큼 캔버스를 넓힌다.
 * 단색으로 채우면 배경 그라데이션과 어긋나 띠가 보이므로 가장자리 픽셀을 늘려 채운다.
 */
async function padToFit(buf: Buffer, want: { left: number; top: number; size: number }, W: number, H: number) {
  const padLeft = Math.max(0, Math.ceil(-want.left))
  const padTop = Math.max(0, Math.ceil(-want.top))
  const padRight = Math.max(0, Math.ceil(want.left + want.size - W))
  const padBottom = Math.max(0, Math.ceil(want.top + want.size - H))
  if (!padLeft && !padTop && !padRight && !padBottom) return { buf, dx: 0, dy: 0, pad: 0 }

  const padded = await sharp(buf)
    .extend({ left: padLeft, top: padTop, right: padRight, bottom: padBottom, extendWith: 'copy' })
    .toBuffer()
  const pad = Math.max(padLeft, padTop, padRight, padBottom) / want.size
  return { buf: padded, dx: padLeft, dy: padTop, pad }
}

async function main() {
  await loadModels()
  mkdirSync(outDir, { recursive: true })
  const files = readdirSync(inDir).filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).sort()
  console.log(`크롭 대상 ${files.length}장`)

  const report: Record<string, unknown>[] = []
  let ok = 0
  let skipped = 0
  for (const file of files) {
    const name = parsePath(file).name
    const buf = readFileSync(join(inDir, file))
    const found = await anchorsOf(buf)
    if (!found) {
      console.log(`  ${name} — 얼굴 미검출, 건너뜀`)
      report.push({ name, error: '얼굴 미검출' })
      skipped++
      continue
    }
    const { anchors, W, H } = found
    // avatar-geometry의 computeCrop은 좌표를 원본 안으로 clamp해 눈·중심축이 함께 밀린다.
    // 여기서는 눈높이와 중심축을 정확히 맞추는 것이 목적이므로 같은 상수로 직접 계산한다.
    const { eyeLine, centerX, eyeChinSpan } = AVATAR_SPEC
    const eyeChin = anchors.chinY - anchors.eyeY
    const wantedSize = eyeChin / eyeChinSpan

    // 정사각이 원본을 넘지 않는 최대 크기. 이 안에서 잡으면 눈·중심축이 정확히 규격에 앉고
    // 얼굴만 규격보다 커진다 — 얼굴 크기는 판정 항목이 아니다(spec §5.1).
    const fits = Math.min(
      anchors.eyeY / eyeLine,
      (H - anchors.eyeY) / (1 - eyeLine),
      anchors.eyeX / centerX,
      (W - anchors.eyeX) / (1 - centerX)
    )
    // 그래도 턱이 프레임 밖으로 나갈 만큼 좁아지면 그때만 캔버스를 넓힌다.
    const chinFloor = eyeChin / (AVATAR_SPEC.tolerance.chinLine[1] - eyeLine)
    const cropSize = Math.max(Math.min(wantedSize, fits), chinFloor)

    const crop = {
      left: anchors.eyeX - cropSize * centerX,
      top: anchors.eyeY - cropSize * eyeLine,
      size: cropSize,
    }
    const { buf: canvas, dx, dy, pad } = await padToFit(buf, crop, W, H)
    // 반올림과 랜드마크 오차로 좌표가 캔버스 밖으로 삐져나가는 일이 있다(실측: left -17).
    const canvasMeta = await sharp(canvas).metadata()
    const canvasW = canvasMeta.width ?? W
    const canvasH = canvasMeta.height ?? H
    const side = Math.max(16, Math.min(Math.round(crop.size), canvasW, canvasH))
    const left = Math.max(0, Math.min(canvasW - side, Math.round(crop.left + dx)))
    const top = Math.max(0, Math.min(canvasH - side, Math.round(crop.top + dy)))

    const out = sharp(canvas).extract({ left, top, width: side, height: side }).resize(size, size)
    const outPath = join(outDir, `${name}.${asPng ? 'png' : 'webp'}`)
    await (asPng ? out.png() : out.webp({ quality })).toFile(outPath)

    const shifted: FaceAnchors = {
      eyeX: anchors.eyeX + dx,
      eyeY: anchors.eyeY + dy,
      chinY: anchors.chinY + dy,
    }
    const verdict = judgeGeometry(shifted, { left, top, size: side })
    const line = `eye ${(verdict.eyeLine * 100).toFixed(1)} chin ${(verdict.chinLine * 100).toFixed(1)} center ${(verdict.centerX * 100).toFixed(1)}`
    const padNote = pad > 0.02 ? ` · 가장자리 ${Math.round(pad * 100)}% 늘림` : ''
    // 크롭 정사각이 목표 크기보다 작으면 늘려 쓰는 것이라 얼굴이 흐려진다.
    const thin = side < size ? ` · ⚠ 원본 얼굴이 작다 (${side}px → ${size}px 확대)` : ''
    console.log(`  ${name} — ${verdict.pass ? '합격' : `이탈: ${verdict.faults.join(', ')}`} (${line}) crop ${side}px${padNote}${thin}`)
    report.push({ name, ...verdict, cropPx: side, upscaled: side < size, pad: +pad.toFixed(3) })
    if (verdict.pass) ok++
  }

  writeFileSync(join(outDir, '_crop-report.json'), JSON.stringify(report, null, 2))
  console.log(`\n합격 ${ok} / 이탈 ${files.length - skipped - ok} / 미검출 ${skipped}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
