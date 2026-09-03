/**
 * crop-faces — 인물 화보에서 "얼굴 정사각 크롭"을 뽑는다. 아바타(celebs.avatar_url)용.
 *
 * 전신 크롭(단독 화보 REF 재료)은 photo/crop-body.ts를 쓴다. 용도가 다르다.
 *
 * 구도와 크롭의 의미는 docs/project/celeb/celeb-08-01-avatar.md가 쥐고,
 * 좌표 계산은 src/lib/avatar-geometry.ts 한 곳이 담당한다. 등록 스크립트와 같은 구현을 쓴다.
 * 눈과 턱을 랜드마크로 직접 재서 규격 자리에 놓는다. 수치는 avatar-geometry.ts 의 AVATAR_SPEC 에만 있다.
 * 자를 크기·위치를 옵션으로 흔들 수 없다 — 그래야 인물마다 결과가 같아진다.
 *
 * 사용법:
 *   cd sw/web-bo
 *   pnpm exec tsx scripts/photo/crop-faces.ts <이미지경로|폴더> [출력폴더] [옵션]
 *
 * 옵션:
 *   --size <n>          출력 한 변 픽셀. 기본 800
 *   --all-faces         한 장에서 검출된 얼굴을 전부 뽑는다(기본: 가장 큰 얼굴 1개)
 *   폐기된 옵션: --frame-ratio, --headroom (넘기면 경고 후 무시)
 *
 * 산출물: <원본명>_face.png (--all-faces면 <원본명>_face_<번호>.png)
 *
 * 배경 제거(누끼)는 이 스크립트가 하지 않는다. nobg 프로젝트를 쓴다(nobg-cutout 스킬 참조).
 * 산출물을 그대로 avatar/upload.ts --image-file 에 넘겨 등록한다
 * (그 스크립트는 알파를 보존하며, 이미 얼굴 크롭된 이미지도 그대로 통과한다).
 */
import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve, dirname, basename, extname, join } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import {
  computeCropFromBox,
  computeCropFromLandmarks,
  judgeGeometry,
  type CropResult,
  type FaceAnchors,
} from '../../src/lib/avatar-geometry'
import { createRequire } from 'module'
import { boPath } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')


// ─── 초기화 ────────────────────────────────────────────────

let modelsLoaded = false
async function ensureFaceModels() {
  if (modelsLoaded) return
  const modelDir = boPath('node_modules', '@vladmandic', 'face-api', 'model')
  if (!existsSync(modelDir)) {
    throw new Error(`face-api 모델 디렉토리 없음: ${modelDir}`)
  }
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  // 눈·턱 좌표를 직접 재려면 랜드마크 모델이 필요하다. 규격 기하의 기준점이다.
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
  modelsLoaded = true
}

let tfReady = false
async function ensureTf() {
  if (tfReady) return
  const wasmDir = boPath('node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + '/'
  setWasmPaths(wasmDir)
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  tfReady = true
}

// ─── 얼굴 검출 ──────────────────────────────────────────────

interface DetectedFace {
  x: number
  y: number
  width: number
  height: number
  score: number
  /** 눈·턱끝 좌표(원본 픽셀 기준). 랜드마크를 못 얻으면 null이고 상자 폴백으로 넘어간다 */
  anchors: FaceAnchors | null
}

async function detectFaces(imgBuf: Buffer): Promise<DetectedFace[]> {
  const meta = await sharp(imgBuf).rotate().metadata()
  const origW = meta.width ?? 0
  const origH = meta.height ?? 0
  const longSide = Math.max(origW, origH)
  const scale = longSide > 1024 ? 1024 / longSide : 1

  const { data, info } = await sharp(imgBuf)
    .rotate()
    .resize(Math.round(origW * scale), Math.round(origH * scale), { fit: 'inside' })
    .removeAlpha() // 검출용 텐서는 RGB만 받는다. 원본 알파는 그대로 둔다
    .raw()
    .toBuffer({ resolveWithObject: true })

  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]

  try {
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 20 })
    const inv = 1 / scale

    // 눈·턱을 직접 재는 기본 경로. 랜드마크 단계가 터지면 상자만으로 후퇴한다.
    const withLandmarks = await faceapi
      .detectAllFaces(tensor, options)
      .withFaceLandmarks()
      .run()
      .catch((e: unknown) => {
        console.warn(
          `  [경고] 랜드마크 검출 실패 → 상자 기준으로 후퇴: ${e instanceof Error ? e.message : String(e)}`
        )
        return null
      })

    if (withLandmarks) {
      return withLandmarks
        .map(d => {
          const lm = d.landmarks
          const eyePoints = [...lm.getLeftEye(), ...lm.getRightEye()]
          const eyeX = eyePoints.reduce((s, p) => s + p.x, 0) / eyePoints.length
          const eyeY = eyePoints.reduce((s, p) => s + p.y, 0) / eyePoints.length
          // 턱끝 = 턱 윤곽선의 가운데 점(68점 규약의 8번)
          const jaw = lm.getJawOutline()
          const chin = jaw[Math.floor(jaw.length / 2)]
          return {
            x: d.detection.box.x * inv,
            y: d.detection.box.y * inv,
            width: d.detection.box.width * inv,
            height: d.detection.box.height * inv,
            score: d.detection.score,
            anchors: { eyeX: eyeX * inv, eyeY: eyeY * inv, chinY: chin.y * inv },
          }
        })
        .sort((a, b) => b.width * b.height - a.width * a.height)
    }

    const detections = await faceapi.detectAllFaces(tensor, options)
    return detections
      .map(d => ({
        x: d.box.x * inv,
        y: d.box.y * inv,
        width: d.box.width * inv,
        height: d.box.height * inv,
        score: d.score,
        anchors: null,
      }))
      .sort((a, b) => b.width * b.height - a.width * a.height)
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

// ─── 규격 좌표 산출 (계산은 avatar-geometry가 한다) ─────────────

function resolveCrop(face: DetectedFace, imgW: number, imgH: number): CropResult {
  const box = { x: face.x, y: face.y, width: face.width, height: face.height }
  if (!face.anchors) return computeCropFromBox(box, imgW, imgH)
  try {
    const crop = computeCropFromLandmarks(face.anchors, imgW, imgH)
    const verdict = judgeGeometry(face.anchors, crop)
    if (!verdict.pass) crop.warnings.push(`규격 이탈: ${verdict.faults.join(' / ')}`)
    return crop
  } catch (e) {
    console.warn(
      `  [경고] 랜드마크 좌표가 이상해 상자 기준으로 후퇴: ${e instanceof Error ? e.message : String(e)}`
    )
    return computeCropFromBox(box, imgW, imgH)
  }
}

/** 반올림 뒤에도 잘라낼 영역이 원본 안에 있도록 마지막으로 조인다. */
function toExtractArea(
  crop: CropResult,
  imgW: number,
  imgH: number
): { left: number; top: number; size: number } {
  const size = Math.min(crop.size, imgW, imgH)
  return {
    left: Math.max(0, Math.min(imgW - size, crop.left)),
    top: Math.max(0, Math.min(imgH - size, crop.top)),
    size,
  }
}

// ─── 인자 ──────────────────────────────────────────────────

function parseArgs() {
  const argv = process.argv.slice(2)
  const positional: string[] = []
  const flags = new Map<string, string>()

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) {
      positional.push(a)
      continue
    }
    const key = a.slice(2)
    if (key === 'all-faces') {
      flags.set(key, 'true')
    } else {
      flags.set(key, argv[++i] ?? '')
    }
  }

  // 폐기된 옵션 — 규격이 코드로 고정됐다. 기존 호출이 깨지지 않게 받아만 주고 무시한다.
  for (const dead of ['frame-ratio', 'headroom']) {
    if (flags.has(dead)) {
      console.warn(
        `[경고] --${dead} 는 이제 쓰지 않는다. `
        + '규격은 docs/project/celeb/celeb-08-01-avatar.md 가 정하며 src/lib/avatar-geometry.ts 가 그대로 따른다. 무시한다.'
      )
    }
  }

  const size = Number(flags.get('size') ?? '800')
  if (!Number.isFinite(size) || size < 64) {
    throw new Error(`--size 값이 부적절하다: ${flags.get('size')}`)
  }

  return {
    input: positional[0],
    outDir: positional[1],
    allFaces: flags.has('all-faces'),
    size,
  }
}

// ─── 처리 ──────────────────────────────────────────────────

async function processOne(
  imagePath: string,
  outDir: string,
  opts: { allFaces: boolean; size: number }
): Promise<{ done: number; skipped: boolean }> {
  const name = basename(imagePath, extname(imagePath))
  const rotated = await sharp(readFileSync(imagePath)).rotate().toBuffer()
  const meta = await sharp(rotated).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0

  const faces = await detectFaces(rotated)
  if (faces.length === 0) {
    console.warn(`  [건너뜀] 얼굴 미검출: ${basename(imagePath)}`)
    return { done: 0, skipped: true }
  }

  const targets = opts.allFaces ? faces : [faces[0]]
  let done = 0

  for (let i = 0; i < targets.length; i++) {
    const face = targets[i]
    const crop = resolveCrop(face, W, H)
    const box = toExtractArea(crop, W, H)
    const outPath = resolve(
      outDir,
      opts.allFaces ? `${name}_face_${i + 1}.png` : `${name}_face.png`
    )

    await sharp(rotated)
      .extract({ left: box.left, top: box.top, width: box.size, height: box.size })
      .resize(opts.size, opts.size, { fit: 'cover' })
      .png() // 누끼 투명도를 보존하려면 png. webp 변환은 업로드 스크립트가 한다
      .toFile(outPath)

    console.log(
      `  face score=${face.score.toFixed(3)} 기준=${crop.basis === 'landmarks' ? '눈·턱' : '상자(폴백)'} -> ${basename(outPath)}`
    )
    // 규격 이탈은 조용히 넘기지 않는다.
    for (const w of crop.warnings) console.warn(`    [규격 경고] ${w}`)
    done++
  }

  return { done, skipped: false }
}

async function main() {
  const args = parseArgs()

  if (!args.input) {
    console.error('사용법: pnpm exec tsx scripts/photo/crop-faces.ts <이미지경로|폴더> [출력폴더] [--size 800] [--all-faces]')
    process.exit(1)
  }
  if (!existsSync(args.input)) {
    console.error(`입력을 찾을 수 없다: ${args.input}`)
    process.exit(1)
  }

  const isDir = statSync(args.input).isDirectory()
  const targets = isDir
    ? readdirSync(args.input)
        .filter(f => /\.(png|jpe?g|webp)$/i.test(f))
        .filter(f => !/_face(_\d+)?\.png$|_cut\.png$/i.test(f)) // 산출물 재처리 방지
        // _group·_logo·_background 등 인물 개인샷이 아닌 파일. 단체샷은 여러 명이라
        // 얼굴 하나만 뽑으면 누구인지 알 수 없다(필요하면 파일을 직접 지정해 --all-faces)
        .filter(f => !f.startsWith('_'))
        .map(f => join(args.input, f))
    : [args.input]

  if (targets.length === 0) {
    console.error(`처리할 이미지가 없다: ${args.input}`)
    process.exit(1)
  }

  const outDir = args.outDir ?? (isDir ? args.input : dirname(args.input))
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  console.log(`초기화 중 (TF, FaceAPI)... 대상 ${targets.length}장`)
  await ensureTf()
  await ensureFaceModels()

  let total = 0
  const skipped: string[] = []
  for (const t of targets) {
    console.log(basename(t))
    const r = await processOne(t, outDir, args)
    total += r.done
    if (r.skipped) skipped.push(basename(t))
  }

  console.log(`\n완료: ${total}장 생성 → ${outDir}`)
  if (skipped.length > 0) {
    console.log(`얼굴 미검출 ${skipped.length}장: ${skipped.join(', ')}`)
  }
}

main().catch(err => {
  console.error('실패:', err instanceof Error ? (err.stack ?? err.message) : err)
  process.exit(1)
})
