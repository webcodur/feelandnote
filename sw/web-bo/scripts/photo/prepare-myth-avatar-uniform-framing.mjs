/** Reframe the mythology avatar cutouts to the exact Priam face scale without preserving headgear bounds. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'

const require = createRequire(import.meta.url)
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js')

const ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const BATCH_ROOT = path.join(ROOT, '개인초상화-업로드본-한국이름')
const EXTRA_ROOT = path.join(ROOT, '개인초상화-추가-3명-업로드본')
const OUTPUT = path.join(ROOT, '개인초상화-프리아모스-동일크기-재업로드본')
const IMAGE_DIR = path.join(OUTPUT, '01-교정-800-WebP')
const REVIEW_DIR = path.join(OUTPUT, '02-검수')
const MANIFEST_FILE = path.join(OUTPUT, 'manifest.json')
const SIZE = 800
const TARGET = { eyeLine: 0.46, chinLine: 0.81, centerX: 0.5 }

// Human face detection is intentionally bypassed for nonhuman faces and two known false detections.
// Coordinates are normalized to each source and use the analogous eye line and lower jaw/muzzle point.
const MANUAL_ANCHORS = {
  '마리차': { eyeX: 0.5, eyeY: 0.58, chinY: 0.815 },
  '소베크': { eyeX: 0.5, eyeY: 0.265, chinY: 0.67 },
  '자타유': { eyeX: 0.5, eyeY: 0.36, chinY: 0.61 },
  '황풍괴': { eyeX: 0.5, eyeY: 0.44, chinY: 0.68 },
  '흑웅괴': { eyeX: 0.5, eyeY: 0.28, chinY: 0.48 },
  '크눔': { eyeX: 0.5, eyeY: 0.405, chinY: 0.72 },
  '콘월의 마크 왕': { eyeX: 0.5, eyeY: 0.45, chinY: 0.71 },
}

function readRows(root, batch) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'))
  if (!Array.isArray(manifest.rows)) throw new Error(`Manifest rows missing: ${root}`)
  return manifest.rows.map((row) => ({
    ...row,
    batch,
    source_file: row.nobg_output_file,
    old_preview_file: row.upload_preview_file,
  }))
}

async function loadModels() {
  const boRoot = path.resolve('.')
  await setWasmPaths(path.join(boRoot, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const models = path.join(boRoot, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(models)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(models)
}

async function detectAnchors(buffer) {
  const { data, info } = await sharp(buffer).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32',
  )
  try {
    const detections = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
      .withFaceLandmarks()
    if (!detections.length) throw new Error('face not detected')
    detections.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const landmarks = detections[0].landmarks
    const eyes = [...landmarks.getLeftEye(), ...landmarks.getRightEye()]
    const jaw = landmarks.getJawOutline()
    return {
      eyeX: eyes.reduce((sum, point) => sum + point.x, 0) / eyes.length,
      eyeY: eyes.reduce((sum, point) => sum + point.y, 0) / eyes.length,
      chinY: jaw[Math.floor(jaw.length / 2)].y,
      score: detections[0].detection.score,
    }
  } finally {
    tensor.dispose()
  }
}

async function renderVirtualCrop(buffer, width, height, crop, outputFile) {
  const sourceLeft = Math.max(0, Math.floor(crop.left))
  const sourceTop = Math.max(0, Math.floor(crop.top))
  const sourceRight = Math.min(width, Math.ceil(crop.left + crop.size))
  const sourceBottom = Math.min(height, Math.ceil(crop.top + crop.size))
  const sourceWidth = sourceRight - sourceLeft
  const sourceHeight = sourceBottom - sourceTop
  if (sourceWidth <= 0 || sourceHeight <= 0) throw new Error('Crop does not intersect source')

  const targetLeft = Math.max(0, Math.round(((sourceLeft - crop.left) / crop.size) * SIZE))
  const targetTop = Math.max(0, Math.round(((sourceTop - crop.top) / crop.size) * SIZE))
  const targetWidth = Math.min(
    SIZE - targetLeft,
    Math.max(1, Math.round((sourceWidth / crop.size) * SIZE)),
  )
  const targetHeight = Math.min(
    SIZE - targetTop,
    Math.max(1, Math.round((sourceHeight / crop.size) * SIZE)),
  )
  const visible = await sharp(buffer)
    .extract({ left: sourceLeft, top: sourceTop, width: sourceWidth, height: sourceHeight })
    .resize(targetWidth, targetHeight, { fit: 'fill' })
    .png()
    .toBuffer()
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: visible, left: targetLeft, top: targetTop }])
    .webp({ quality: 95, alphaQuality: 100 })
    .toFile(outputFile)
}

mkdirSync(IMAGE_DIR, { recursive: true })
mkdirSync(REVIEW_DIR, { recursive: true })
await loadModels()

const mergedById = new Map()
for (const row of readRows(BATCH_ROOT, 'main-198')) mergedById.set(row.target_id, row)
// The bespoke extra Phoenix replaces the earlier Phoenix from the 198-person batch.
for (const row of readRows(EXTRA_ROOT, 'extra-3')) mergedById.set(row.target_id, row)
const rows = [...mergedById.values()]
if (rows.length !== 200) throw new Error(`Expected 200 unique targets, got ${rows.length}`)

const results = []
for (const [index, row] of rows.entries()) {
  const buffer = readFileSync(row.source_file)
  const metadata = await sharp(buffer).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`Unreadable image: ${row.source_file}`)

  const manual = MANUAL_ANCHORS[row.name_ko]
  const anchors = manual
    ? {
        eyeX: manual.eyeX * metadata.width,
        eyeY: manual.eyeY * metadata.height,
        chinY: manual.chinY * metadata.height,
        score: null,
      }
    : await detectAnchors(buffer)
  const eyeChin = anchors.chinY - anchors.eyeY
  if (!(eyeChin > 0)) throw new Error(`Invalid anchors: ${row.name_ko}`)
  const cropSize = eyeChin / (TARGET.chinLine - TARGET.eyeLine)
  const crop = {
    left: anchors.eyeX - cropSize * TARGET.centerX,
    top: anchors.eyeY - cropSize * TARGET.eyeLine,
    size: cropSize,
  }
  const outputFile = path.join(IMAGE_DIR, `${row.name_ko}.webp`)
  await renderVirtualCrop(buffer, metadata.width, metadata.height, crop, outputFile)
  results.push({
    order: index + 1,
    target_id: row.target_id,
    slug: row.slug,
    name_ko: row.name_ko,
    batch: row.batch,
    source_file: row.source_file,
    old_preview_file: row.old_preview_file,
    corrected_file: outputFile,
    anchor_basis: manual ? 'manual-nonhuman-or-false-detection' : 'face-landmarks',
    detection_score: anchors.score === null ? null : Number(anchors.score.toFixed(3)),
    source_width: metadata.width,
    source_height: metadata.height,
    crop: {
      left: Number(crop.left.toFixed(2)),
      top: Number(crop.top.toFixed(2)),
      size: Number(crop.size.toFixed(2)),
      source_scale: Number((metadata.width / crop.size).toFixed(3)),
    },
    target_geometry: TARGET,
  })
  if ((index + 1) % 20 === 0 || index + 1 === rows.length) {
    console.log(`prepared ${index + 1}/${rows.length}`)
  }
}

writeFileSync(
  MANIFEST_FILE,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      applied_to_db_or_storage: false,
      target_count: results.length,
      original_sources_untouched: true,
      framing_rule: 'All faces target eye 46%, chin 81%, center 50%; headgear bounds are not exceptions.',
      rows: results,
    },
    null,
    2,
  )}\n`,
  'utf8',
)
console.log(JSON.stringify({ prepared: results.length, output: OUTPUT }, null, 2))
