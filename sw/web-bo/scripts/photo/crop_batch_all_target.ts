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

const BASE_OUT_DIR = 'D:/image/_재료/얼굴형';
const SIZE = 800;

interface RawItem {
  index: number;
  relPath: string;
  fullPath: string;
  filename: string;
  ext: string;
}

interface Decision {
  action: 'ACCEPT' | 'REJECT';
  gender?: 'female' | 'male';
  race?: 'EastAsian' | 'Indian' | 'MiddleEastern' | 'White' | 'Black' | 'Latino';
  reason?: string;
}

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

async function detectFaces(normBuf: Buffer, origW: number, origH: number): Promise<DetectedFace[]> {
  const longSide = Math.max(origW, origH);
  const scale = longSide > 1024 ? 1024 / longSide : 1;

  const { data, info } = await sharp(normBuf)
    .resize(Math.round(origW * scale), Math.round(origH * scale), { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  );

  const realScaleX = info.width / origW;
  const realScaleY = info.height / origH;

  try {
    const results = await faceapi
      .detectAllFaces(
        tensor as any,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2, maxResults: 10 })
      )
      .withFaceLandmarks();

    if (!results || !results.length) return [];

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
          eyeX: eyeX_scaled / realScaleX,
          eyeY: eyeY_scaled / realScaleY,
          chinY: chinY_scaled / realScaleY,
        };

        return {
          x: box.x / realScaleX,
          y: box.y / realScaleY,
          width: box.width / realScaleX,
          height: box.height / realScaleY,
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
    return crop;
  } catch (e) {
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

async function cropFace(filePath: string): Promise<Buffer | null> {
  try {
    const rawBuf = fs.readFileSync(filePath);
    const normBuf = await sharp(rawBuf).rotate().png().toBuffer();
    const meta = await sharp(normBuf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w === 0 || h === 0) return null;

    const faces = await detectFaces(normBuf, w, h);
    if (faces.length === 0) return null;

    const primary = faces[0];
    const crop = resolveCrop(primary, w, h);
    const area = toExtractArea(crop, w, h);

    const croppedBuffer = await sharp(normBuf)
      .extract({ left: area.left, top: area.top, width: area.size, height: area.size })
      .resize(SIZE, SIZE, { fit: 'cover' })
      .png({ quality: 95 })
      .toBuffer();

    return croppedBuffer;
  } catch (err) {
    console.error(`Crop error on ${filePath}:`, err);
    return null;
  }
}

async function main() {
  await initModels();

  const manifestPath = 'C:/Users/webco/.gemini/antigravity-ide/brain/c1445db3-094e-4270-b3d1-2e31ad3d531b/scratch/raw_manifest.json';
  const decisionsPath = 'C:/Users/webco/.gemini/antigravity-ide/brain/c1445db3-094e-4270-b3d1-2e31ad3d531b/scratch/decisions_manifest.json';

  const manifest: RawItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const decisions: Record<number, Decision> = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));

  let acceptedCount = 0;
  let rejectedCount = 0;
  let cropSuccessCount = 0;
  let cropFailCount = 0;

  const summaryByFolder: Record<string, number> = {};

  for (const item of manifest) {
    const decision = decisions[item.index];
    if (!decision || decision.action === 'REJECT') {
      rejectedCount++;
      continue;
    }

    acceptedCount++;
    const { gender, race } = decision;
    if (!gender || !race) {
      console.warn(`Missing gender or race for item #${item.index}`);
      continue;
    }

    const outDir = path.join(BASE_OUT_DIR, gender, race);
    fs.mkdirSync(outDir, { recursive: true });

    const baseStem = path.parse(item.filename).name.replace(/[^a-zA-Z0-9_\-\uac00-\ud7a3]/g, '_');
    const outFilename = `${baseStem}_face.png`;
    const outPath = path.join(outDir, outFilename);

    const croppedBuffer = await cropFace(item.fullPath);
    if (croppedBuffer) {
      fs.writeFileSync(outPath, croppedBuffer);
      cropSuccessCount++;
      const folderKey = `${gender}/${race}`;
      summaryByFolder[folderKey] = (summaryByFolder[folderKey] || 0) + 1;
      console.log(`✓ [#${item.index}] -> ${gender}/${race}/${outFilename}`);
    } else {
      cropFailCount++;
      console.warn(`✗ [#${item.index}] Face detection failed: ${item.relPath}`);
    }
  }

  console.log('\n========================================');
  console.log('       BATCH PROCESSING SUMMARY        ');
  console.log('========================================');
  console.log(`Total images scanned: ${manifest.length}`);
  console.log(`Filtered out (Rejected): ${rejectedCount}`);
  console.log(`Accepted for crop: ${acceptedCount}`);
  console.log(`Cropped successfully: ${cropSuccessCount}`);
  console.log(`Crop failed: ${cropFailCount}`);
  console.log('\nBreakdown by Category:');
  for (const [folder, count] of Object.entries(summaryByFolder).sort()) {
    console.log(`  ${folder.padEnd(25)}: ${count} images`);
  }
}

main().catch(console.error);
