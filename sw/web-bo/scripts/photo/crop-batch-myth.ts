import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import { createRequire } from 'module';
import {
  computeCropFromBox,
  computeCropFromLandmarks,
  judgeGeometry,
  type CropResult,
  type FaceAnchors,
} from '../../src/lib/avatar-geometry.js';
import { boPath } from '../lib/paths.js';

const _require = createRequire(import.meta.url);
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js');

const SRC_ROOT = 'D:/image/_재료/얼굴형/미사용-신화후보';
const DST_ROOT = 'D:/image/_재료/얼굴형/미사용-신화후보_crop';

const SIZE = 800;

interface DetectedFace {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  anchors: FaceAnchors | null;
}

async function initModels() {
  const modelDir = boPath('node_modules', '@vladmandic', 'face-api', 'model');
  const wasmDir = boPath('node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + '/';
  setWasmPaths(wasmDir);
  await import('@tensorflow/tfjs-backend-wasm');
  await tf.setBackend('wasm');
  await tf.ready();

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir);
  console.log('FaceAPI & Landmark models initialized successfully.');
}

async function detectFaces(imgBuf: Buffer): Promise<DetectedFace[]> {
  const meta = await sharp(imgBuf).rotate().metadata();
  const origW = meta.width ?? 0;
  const origH = meta.height ?? 0;
  const longSide = Math.max(origW, origH);
  const scale = longSide > 1024 ? 1024 / longSide : 1;

  const { data, info } = await sharp(imgBuf)
    .rotate()
    .resize(Math.round(origW * scale), Math.round(origH * scale), { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  );

  try {
    const results = await faceapi
      .detectAllFaces(
        tensor as any,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 })
      )
      .withFaceLandmarks();

    if (!results.length) return [];

    return results
      .map((r: any) => {
        const box = r.detection.box;
        const landmarks = r.landmarks;
        const eyePts = [...landmarks.getLeftEye(), ...landmarks.getRightEye()];
        const jaw = landmarks.getJawOutline();
        const chinPt = jaw[Math.floor(jaw.length / 2)];

        const eyeX_scaled = eyePts.reduce((acc: number, p: any) => acc + p.x, 0) / eyePts.length;
        const eyeY_scaled = eyePts.reduce((acc: number, p: any) => acc + p.y, 0) / eyePts.length;
        const chinY_scaled = chinPt.y;

        const anchors: FaceAnchors = {
          eyeX: eyeX_scaled / scale,
          eyeY: eyeY_scaled / scale,
          chinY: chinY_scaled / scale,
        };

        return {
          x: box.x / scale,
          y: box.y / scale,
          width: box.width / scale,
          height: box.height / scale,
          score: r.detection.score,
          anchors,
        };
      })
      .sort((a: DetectedFace, b: DetectedFace) => b.width * b.height - a.width * a.height);
  } finally {
    tensor.dispose();
  }
}

function resolveCrop(face: DetectedFace, imgW: number, imgH: number): CropResult {
  const box = { x: face.x, y: face.y, width: face.width, height: face.height };
  if (!face.anchors) return computeCropFromBox(box, imgW, imgH);
  try {
    const crop = computeCropFromLandmarks(face.anchors, imgW, imgH);
    const verdict = judgeGeometry(face.anchors, crop);
    if (!verdict.pass) crop.warnings.push(`규격 이탈: ${verdict.faults.join(' / ')}`);
    return crop;
  } catch (e) {
    console.warn(`  [경고] 랜드마크 좌표 오류, 상자 기준으로 후퇴: ${e instanceof Error ? e.message : String(e)}`);
    return computeCropFromBox(box, imgW, imgH);
  }
}

function toExtractArea(
  crop: CropResult,
  imgW: number,
  imgH: number
): { left: number; top: number; size: number } {
  const size = Math.min(crop.size, imgW, imgH);
  return {
    left: Math.max(0, Math.min(imgW - size, crop.left)),
    top: Math.max(0, Math.min(imgH - size, crop.top)),
    size,
  };
}

async function processAll() {
  await initModels();

  const subfolders = [
    'female/Asian',
    'female/Black',
    'female/Tan',
    'female/White',
    'male/Asian',
    'male/Black',
    'male/Tan',
    'male/White',
  ];

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalSkipped = 0;
  const folderStats: Record<string, { total: number; success: number; skipped: number }> = {};

  for (const sub of subfolders) {
    const srcDir = path.join(SRC_ROOT, sub);
    const dstDir = path.join(DST_ROOT, sub);
    fs.mkdirSync(dstDir, { recursive: true });

    if (!fs.existsSync(srcDir)) continue;

    const files = fs.readdirSync(srcDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort();
    folderStats[sub] = { total: files.length, success: 0, skipped: 0 };
    console.log(`\nProcessing [${sub}] (${files.length} images)...`);

    for (const file of files) {
      totalProcessed++;
      const srcPath = path.join(srcDir, file);
      const stem = path.basename(file, path.extname(file));
      const dstPath = path.join(dstDir, `${stem}_face.png`);

      try {
        const fileBuf = fs.readFileSync(srcPath);
        const rotated = await sharp(fileBuf).rotate().toBuffer();
        const meta = await sharp(rotated).metadata();
        const W = meta.width ?? 0;
        const H = meta.height ?? 0;

        const faces = await detectFaces(rotated);
        if (faces.length === 0) {
          console.warn(`  [SKIP] Face not detected: ${file}`);
          totalSkipped++;
          folderStats[sub].skipped++;
          continue;
        }

        const face = faces[0];
        const crop = resolveCrop(face, W, H);
        const box = toExtractArea(crop, W, H);

        await sharp(rotated)
          .extract({ left: box.left, top: box.top, width: box.size, height: box.size })
          .resize(SIZE, SIZE, { fit: 'cover' })
          .png()
          .toFile(dstPath);

        totalSuccess++;
        folderStats[sub].success++;
        console.log(`  ✓ ${stem}_face.png (score=${face.score.toFixed(3)}, basis=${crop.basis})`);
      } catch (err) {
        console.error(`  ✗ Error on ${file}:`, err);
        totalSkipped++;
        folderStats[sub].skipped++;
      }
    }
  }

  console.log('\n========================================');
  console.log('          CROP SUMMARY REPORT           ');
  console.log('========================================');
  console.log(`Total images processed: ${totalProcessed}`);
  console.log(`Success (cropped):     ${totalSuccess}`);
  console.log(`Skipped (no face):     ${totalSkipped}`);
  console.log('\nBreakdown by folder:');
  for (const [sub, stat] of Object.entries(folderStats)) {
    console.log(`  ${sub.padEnd(16)}: ${stat.success}/${stat.total} cropped (skipped: ${stat.skipped})`);
  }
  console.log(`\nOutput directory: ${DST_ROOT}`);
}

processAll().catch(console.error);
