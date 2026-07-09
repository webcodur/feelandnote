import sharp from 'sharp'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

const __dirname = dirname(fileURLToPath(import.meta.url))

let modelsLoaded = false
async function ensureFaceModels() {
  if (modelsLoaded) return
  const modelDir = resolve(
    __dirname,
    '..',
    'node_modules',
    '@vladmandic',
    'face-api',
    'model'
  )
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
  const scale = longSide > 1536 ? 1536 / longSide : 1
  const targetW = Math.round(origW * scale)
  const targetH = Math.round(origH * scale)
  
  const { data, info } = await sharp(imgBuf)
    .rotate()
    .resize(targetW, targetH, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
  
  try {
    const options = new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.4,
      maxResults: 20,
    })
    const detections = await faceapi.detectAllFaces(tensor, options)
    const inv = 1 / scale
    return detections.map(d => ({
      x: d.box.x * inv,
      y: d.box.y * inv,
      width: d.box.width * inv,
      height: d.box.height * inv,
      score: d.score,
    }))
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

function computeKneePaddedCrop(
  face: DetectedFace,
  imgWidth: number,
  imgHeight: number
): { left: number; top: number; width: number; height: number } {
  const cx = face.x + face.width / 2
  const cy = face.y + face.height / 2
  
  // 얼굴(머리) 크기 기준
  const baseSize = Math.max(face.width, face.height)
  
  // 인물 좌우로 배경을 충분히 포함시키기 위해 너비 확장 (총 4.5배수)
  const targetWidth = baseSize * 4.5
  
  // 하단은 무릎까지 충분히 내려가도록 세로 길이를 대폭 확장 (총 7배수 복구)
  const targetHeight = baseSize * 7
  
  // 이상적인 상단 위치 (얼굴 중심에서 1.5배수 올림 = 머리 위로 1배수(충분한) 여백)
  let top = cy - baseSize * 1.5
  if (top < 0) top = 0

  // 하단이 원본 이미지를 벗어나는지 확인하고, 벗어나면 높이를 잘라냄 (위로 박스를 끌어올리지 않음!)
  let height = targetHeight
  if (top + height > imgHeight) {
    height = imgHeight - top
  }

  // 4.5:7 비율 유지를 위해 너비도 비례해서 축소
  let width = height * (4.5 / 7)
  
  // 가로는 얼굴 중심(cx) 기준 정중앙 정렬
  let left = cx - width / 2
  if (left < 0) {
    left = 0
  } else if (left + width > imgWidth) {
    left = imgWidth - width
  }
  
  return { 
    left: Math.round(left), 
    top: Math.round(top), 
    width: Math.round(width), 
    height: Math.round(height) 
  }
}

async function main() {
  const imagePath = process.argv[2]
  const outDir = process.argv[3] || dirname(imagePath)
  
  if (!imagePath) {
    console.error('사용법: node --experimental-loader tsx crop-faces.ts <이미지경로> [출력디렉토리]')
    process.exit(1)
  }
  
  if (!existsSync(imagePath)) {
    console.error(`이미지를 찾을 수 없습니다: ${imagePath}`)
    process.exit(1)
  }
  
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  const outputWidth = 900 // 가로 비율 4.5배수에 맞춤
  const outputHeight = 1400 // 세로 비율 7배수

  console.log('초기화 중 (TF, FaceAPI 모델)...')
  await ensureTf()
  await ensureFaceModels()

  console.log(`이미지 로드 중: ${imagePath}`)
  const imgBuf = readFileSync(imagePath)
  const rotated = await sharp(imgBuf).rotate().toBuffer()
  const metaInfo = await sharp(rotated).metadata()
  const W = metaInfo.width ?? 0
  const H = metaInfo.height ?? 0
  console.log(`원본 크기 (회전 반영): ${W}x${H}`)

  console.log('얼굴 탐지 중...')
  const faces = await detectFaces(rotated)
  console.log(`탐지된 얼굴 수: ${faces.length}`)
  
  // 얼굴 면적 순으로 내림차순 정렬 (가장 큰 얼굴이 1번)
  faces.sort((a, b) => (b.width * b.height) - (a.width * a.height))

  const baseName = basename(imagePath, extname(imagePath))

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i]
    const cropBox = computeKneePaddedCrop(face, W, H)
    const outPath = resolve(outDir, `${baseName}_face_${i + 1}.jpg`)

    console.log(`[얼굴 ${i + 1}] confidence: ${face.score.toFixed(3)}, box: ${Math.round(face.width)}x${Math.round(face.height)} -> crop 영역: ${cropBox.width}x${cropBox.height}`)
    
    await sharp(rotated)
      .extract({
        left: cropBox.left,
        top: cropBox.top,
        width: cropBox.width,
        height: cropBox.height,
      })
      .resize(outputWidth, outputHeight, { fit: 'cover' })
      .jpeg({ quality: 90 }) // 범용적인 jpg 포맷으로 저장
      .toFile(outPath)
      
    console.log(`저장 완료: ${outPath}`)
  }
  
  const txtPath = resolve(outDir, `${baseName}_rename.txt`)
  let txtContent = `[얼굴 크기순 매핑 (1번이 가장 큼)]\n# 아래 '이름' 부분을 실제 인물명으로 수정하세요.\n`
  for (let i = 0; i < faces.length; i++) {
    txtContent += `${i + 1}=이름${i + 1}-crop.jpg\n`
  }
  writeFileSync(txtPath, txtContent, 'utf-8')
  console.log(`매핑 템플릿 생성 완료: ${txtPath}`)

  console.log('\n작업 완료!')
}

main().catch((err) => {
  console.error('실패:', err instanceof Error ? (err.stack ?? err.message) : err)
  process.exit(1)
})
