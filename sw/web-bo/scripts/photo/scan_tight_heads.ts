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
}

async function checkHeadCut(filePath: string): Promise<FaceCheckResult | null> {
  try {
    const buf = fs.readFileSync(filePath);
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
    const scale = 400 / 800;

    const eyePts = [...landmarks.getLeftEye(), ...landmarks.getRightEye()];
    const eyebrowPts = [...landmarks.getLeftEyeBrow(), ...landmarks.getRightEyeBrow()];

    const eyeY = (eyePts.reduce((acc: number, p: any) => acc + p.y, 0) / eyePts.length) / scale;
    const eyebrowY = Math.min(...eyebrowPts.map((p: any) => p.y)) / scale;
    const eyebrowToTop = eyebrowY;

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
      score: eyebrowToTop,
    };
  } catch (err) {
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

  const results: FaceCheckResult[] = [];
  for (let i = 0; i < allFiles.length; i++) {
    const res = await checkHeadCut(allFiles[i]);
    if (res && (res.eyebrowToTop < 200 || res.eyeY < 320)) {
      results.push(res);
    }
  }

  results.sort((a, b) => a.score - b.score);
  console.log(`Found ${results.length} tight head candidates.`);

  fs.writeFileSync(
    'C:/Users/webco/.gemini/antigravity-ide/brain/c1445db3-094e-4270-b3d1-2e31ad3d531b/scratch/tight_head_candidates.json',
    JSON.stringify(results, null, 2)
  );

  // Render sheet
  const cell = 200;
  const labelH = 28;
  const cols = 5;
  const rows = Math.ceil(results.length / cols);

  function labelSvg(cellWidth: number, labelH: number, text: string): Buffer {
    return Buffer.from(
      `<svg width="${cellWidth}" height="${labelH}">` +
        `<rect x="0" y="0" width="${cellWidth}" height="${labelH}" fill="#11111b"/>` +
        `<text x="4" y="${labelH - 7}" font-size="11" font-weight="bold" font-family="monospace" fill="#fab387">${text}</text>` +
      `</svg>`
    );
  }

  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cell;
    const y = row * (cell + labelH);

    const imgBuf = await sharp(item.filePath).resize(cell, cell).jpeg({ quality: 90 }).toBuffer();
    composites.push({ input: imgBuf, left: x, top: y + labelH });
    composites.push({
      input: labelSvg(cell, labelH, `[#${i + 1}] top:${item.eyebrowToTop}`),
      left: x,
      top: y,
    });
  }

  await sharp({
    create: {
      width: cell * cols,
      height: (cell + labelH) * rows,
      channels: 3,
      background: '#181825',
    },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile('C:/Users/webco/.gemini/antigravity-ide/brain/c1445db3-094e-4270-b3d1-2e31ad3d531b/scratch/tight_heads_sheet.jpg');

  console.log('Saved tight_heads_sheet.jpg');
}

main().catch(console.error);
