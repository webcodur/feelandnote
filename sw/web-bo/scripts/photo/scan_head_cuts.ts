import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import { createRequire } from 'module';
import { boPath } from '../lib/paths.js';

const _require = createRequire(import.meta.url);
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js');

const BASE_DIR = 'D:/image/_재료/얼굴형';

interface FaceCheckResult {
  filePath: string;
  relPath: string;
  filename: string;
  gender: string;
  race: string;
  eyeY: number;
  eyebrowY: number;
  eyebrowToTop: number;
  isHeadCut: boolean;
  score: number;
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
  console.log('FaceAPI initialized.');
}

async function checkHeadCut(filePath: string): Promise<FaceCheckResult | null> {
  try {
    const buf = fs.readFileSync(filePath);
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 800;
    const h = meta.height ?? 800;

    const { data } = await sharp(buf)
      .resize(400, 400, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tensor = tf.tensor3d(new Uint8Array(data), [400, 400, 3], 'int32');

    let results: any[] = [];
    try {
      results = await faceapi
        .detectAllFaces(tensor as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 }))
        .withFaceLandmarks();
    } finally {
      tensor.dispose();
    }

    if (!results || results.length === 0) return null;

    const r = results[0];
    const landmarks = r.landmarks;
    const scale = 400 / h;

    const eyePts = [...landmarks.getLeftEye(), ...landmarks.getRightEye()];
    const eyebrowPts = [...landmarks.getLeftEyeBrow(), ...landmarks.getRightEyeBrow()];

    const eyeY = (eyePts.reduce((acc: number, p: any) => acc + p.y, 0) / eyePts.length) / scale;
    const eyebrowY = Math.min(...eyebrowPts.map((p: any) => p.y)) / scale;
    const eyebrowToTop = eyebrowY;

    // Head is cut if eyebrow is within 140px from top (for 800px image, 17.5%)
    // or eye is within 290px from top (36.2%)
    const isHeadCut = eyebrowToTop < 145 || eyeY < 290;

    const relPath = path.relative(BASE_DIR, filePath);
    const parts = relPath.split(path.sep);
    const gender = parts[0];
    const race = parts[1];

    return {
      filePath,
      relPath,
      filename: path.basename(filePath),
      gender,
      race,
      eyeY: Math.round(eyeY),
      eyebrowY: Math.round(eyebrowY),
      eyebrowToTop: Math.round(eyebrowToTop),
      isHeadCut,
      score: eyebrowToTop,
    };
  } catch (err) {
    console.error(`Error checking ${filePath}:`, err);
    return null;
  }
}

async function main() {
  await initModels();

  const allFiles: string[] = [];
  function scan(dir: string) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) scan(full);
      else if (item.name.toLowerCase().endsWith('.png')) allFiles.push(full);
    }
  }
  scan(BASE_DIR);

  console.log(`Scanning ${allFiles.length} avatar images for cropped/cut head tops...`);

  const results: FaceCheckResult[] = [];
  for (let i = 0; i < allFiles.length; i++) {
    const res = await checkHeadCut(allFiles[i]);
    if (res) results.push(res);
  }

  const headCutItems = results.filter(r => r.isHeadCut).sort((a, b) => a.score - b.score);
  console.log(`\nFound ${headCutItems.length} images with head top cut/too close to edge out of ${results.length} total.`);

  fs.writeFileSync(
    'C:/Users/webco/.gemini/antigravity-ide/brain/c1445db3-094e-4270-b3d1-2e31ad3d531b/scratch/head_cut_items.json',
    JSON.stringify(headCutItems, null, 2)
  );

  console.log('Saved head_cut_items.json');
}

main().catch(console.error);
