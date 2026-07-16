/**
 * crop-faces — 인물 화보에서 "얼굴 정사각 크롭"을 뽑는다. 아바타(profiles.avatar_url)용.
 *
 * 전신 크롭(단독 화보 REF 재료)은 crop-body.ts를 쓴다. 용도가 다르다.
 *
 * 사용법:
 *   cd sw/web-bo
 *   pnpm exec tsx scripts/crop-faces.ts <이미지경로|폴더> [출력폴더] [옵션]
 *
 * 옵션:
 *   --cutout            배경을 지운다(rembg). 인물만 남은 투명 PNG가 된다
 *   --frame-ratio <n>   정사각 변 대비 얼굴 비율. 기본 0.45 (작을수록 얼굴이 작게=여백 넓게)
 *   --size <n>          출력 한 변 픽셀. 기본 800
 *   --all-faces         한 장에서 검출된 얼굴을 전부 뽑는다(기본: 가장 큰 얼굴 1개)
 *
 * 산출물: <원본명>_face.png (--all-faces면 <원본명>_face_<번호>.png)
 *
 * 누끼는 얼굴을 자르기 "전에" 한다. 먼저 자르면 목 단면을 배경으로 오인해 함께 지워진다.
 * 산출물을 그대로 upload-celeb-image-from-wikimedia.ts --image-file 에 넘겨 등록한다
 * (그 스크립트는 알파를 보존하며, 이미 얼굴 크롭된 이미지도 그대로 통과한다).
 */
import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve, dirname, basename, extname, join } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── 초기화 ────────────────────────────────────────────────

let modelsLoaded = false
async function ensureFaceModels() {
  if (modelsLoaded) return
  const modelDir = resolve(__dirname, '..', 'node_modules', '@vladmandic', 'face-api', 'model')
  if (!existsSync(modelDir)) {
    throw new Error(`face-api 모델 디렉토리 없음: ${modelDir}`)
  }
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  modelsLoaded = true
}

let tfReady = false
async function ensureTf() {
  if (tfReady) return
  const wasmDir = resolve(__dirname, '..', 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + '/'
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
    const detections = await faceapi.detectAllFaces(
      tensor,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 20 })
    )
    const inv = 1 / scale
    return detections
      .map(d => ({
        x: d.box.x * inv,
        y: d.box.y * inv,
        width: d.box.width * inv,
        height: d.box.height * inv,
        score: d.score,
      }))
      .sort((a, b) => b.width * b.height - a.width * a.height)
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

/** 얼굴을 감싸는 정사각 영역. frameRatio = 정사각 변 대비 얼굴 크기 */
function computeSquareCrop(
  face: DetectedFace,
  imgW: number,
  imgH: number,
  frameRatio: number
): { left: number; top: number; size: number } {
  const faceSize = Math.max(face.width, face.height)
  let size = Math.round(faceSize / frameRatio)
  size = Math.min(size, imgW, imgH)

  const cx = face.x + face.width / 2
  // 눈높이가 가운데 오도록 얼굴 중심보다 살짝 위를 기준으로 잡는다(정수리 여백 확보)
  const cy = face.y + face.height * 0.45

  let left = Math.round(cx - size / 2)
  let top = Math.round(cy - size / 2)
  left = Math.max(0, Math.min(left, imgW - size))
  top = Math.max(0, Math.min(top, imgH - size))

  return { left, top, size }
}

// ─── 누끼(rembg) ───────────────────────────────────────────

/** rembg로 배경 제거. 실패하면 던진다 — 조용히 원본을 흘려보내면 누끼된 줄 알고 등록된다 */
function removeBackground(srcPath: string, outPath: string): void {
  const py = `from rembg import remove, new_session
from PIL import Image
im = Image.open(r"${srcPath}")
out = remove(im, session=new_session("u2net"))
out.save(r"${outPath}")`

  const candidates = [
    { cmd: 'py', args: ['-3.12', '-c', py] },
    { cmd: 'python', args: ['-c', py] },
  ]

  const errors: string[] = []
  for (const { cmd, args } of candidates) {
    const r = spawnSync(cmd, args, { encoding: 'utf-8' })
    if (r.status === 0 && existsSync(outPath)) return
    errors.push(`${cmd}: ${r.error?.message ?? r.stderr?.slice(-300) ?? `exit ${r.status}`}`)
  }
  throw new Error(
    `rembg 배경 제거 실패. python에 rembg가 설치돼 있어야 한다(pip install rembg).\n${errors.join('\n')}`
  )
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
    if (key === 'cutout' || key === 'all-faces') {
      flags.set(key, 'true')
    } else {
      flags.set(key, argv[++i] ?? '')
    }
  }

  const frameRatio = Number(flags.get('frame-ratio') ?? '0.45')
  const size = Number(flags.get('size') ?? '800')
  if (!(frameRatio > 0 && frameRatio <= 1)) {
    throw new Error(`--frame-ratio 는 0~1 사이여야 한다: ${flags.get('frame-ratio')}`)
  }
  if (!Number.isFinite(size) || size < 64) {
    throw new Error(`--size 값이 부적절하다: ${flags.get('size')}`)
  }

  return {
    input: positional[0],
    outDir: positional[1],
    cutout: flags.has('cutout'),
    allFaces: flags.has('all-faces'),
    frameRatio,
    size,
  }
}

// ─── 처리 ──────────────────────────────────────────────────

async function processOne(
  imagePath: string,
  outDir: string,
  opts: { cutout: boolean; allFaces: boolean; frameRatio: number; size: number }
): Promise<{ done: number; skipped: boolean }> {
  const name = basename(imagePath, extname(imagePath))

  // 1) 누끼는 얼굴을 자르기 전에. 순서를 바꾸면 목 단면이 배경으로 오인돼 지워진다
  let workPath = imagePath
  if (opts.cutout) {
    const cutPath = resolve(outDir, `${name}_cut.png`)
    removeBackground(imagePath, cutPath)
    workPath = cutPath
  }

  const rotated = await sharp(readFileSync(workPath)).rotate().toBuffer()
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
    const box = computeSquareCrop(face, W, H, opts.frameRatio)
    const outPath = resolve(
      outDir,
      opts.allFaces ? `${name}_face_${i + 1}.png` : `${name}_face.png`
    )

    await sharp(rotated)
      .extract({ left: box.left, top: box.top, width: box.size, height: box.size })
      .resize(opts.size, opts.size, { fit: 'cover' })
      .png() // 누끼 투명도를 보존하려면 png. webp 변환은 업로드 스크립트가 한다
      .toFile(outPath)

    console.log(`  face score=${face.score.toFixed(3)} -> ${basename(outPath)}`)
    done++
  }

  return { done, skipped: false }
}

async function main() {
  const args = parseArgs()

  if (!args.input) {
    console.error('사용법: pnpm exec tsx scripts/crop-faces.ts <이미지경로|폴더> [출력폴더] [--cutout] [--frame-ratio 0.45] [--size 800] [--all-faces]')
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

  console.log(`초기화 중 (TF, FaceAPI)... 대상 ${targets.length}장, 누끼=${args.cutout}`)
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
