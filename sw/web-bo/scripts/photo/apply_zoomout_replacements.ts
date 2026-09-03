import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import { createRequire } from 'module';
import {
  computeCropFromBox,
  computeCropFromLandmarks,
  type CropResult,
  type FaceAnchors,
} from '../../src/lib/avatar-geometry.js';
import { boPath } from '../lib/paths.js';

const _require = createRequire(import.meta.url);
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js');

const SIZE = 800;

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

async function detectFaces(normBuf: Buffer, origW: number, origH: number) {
  const longSide = Math.max(origW, origH);
  const scale = longSide > 1024 ? 1024 / longSide : 1;

  const { data, info } = await sharp(normBuf)
    .resize(Math.round(origW * scale), Math.round(origH * scale), { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32');

  const realScaleX = info.width / origW;
  const realScaleY = info.height / origH;

  try {
    const results = await faceapi
      .detectAllFaces(tensor as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
      .withFaceLandmarks();

    if (!results || !results.length) return [];

    return results.map((r: any) => {
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
    });
  } finally {
    tensor.dispose();
  }
}

async function cropAndOverwrite(genImagePath: string, targetPath: string) {
  const rawBuf = fs.readFileSync(genImagePath);
  const normBuf = await sharp(rawBuf).rotate().png().toBuffer();
  const meta = await sharp(normBuf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const faces = await detectFaces(normBuf, w, h);
  if (faces.length === 0) {
    console.error(`No face detected in ${genImagePath}`);
    return;
  }

  const primary = faces[0];
  let crop: CropResult;
  if (primary.anchors) {
    try {
      crop = computeCropFromLandmarks(primary.anchors, w, h);
    } catch {
      crop = computeCropFromBox({ x: primary.x, y: primary.y, width: primary.width, height: primary.height }, w, h);
    }
  } else {
    crop = computeCropFromBox({ x: primary.x, y: primary.y, width: primary.width, height: primary.height }, w, h);
  }

  const size = Math.min(crop.size, w, h);
  const left = Math.max(0, Math.min(w - size, crop.left));
  const top = Math.max(0, Math.min(h - size, crop.top));

  const cropped = await sharp(normBuf)
    .extract({ left, top, width: size, height: size })
    .resize(SIZE, SIZE)
    .png({ quality: 95 })
    .toBuffer();

  fs.writeFileSync(targetPath, cropped);
  console.log(`✓ Overwritten: ${targetPath}`);
}

async function main() {
  await initModels();

  const replacements = [
    {
      gen: 'C:/Users/webco/.gemini/antigravity-ide/brain/c1445db3-094e-4270-b3d1-2e31ad3d531b/fix_head_01_1788288545377.jpg',
      target: 'D:/image/_재료/얼굴형/female/EastAsian/chrome_7vhcIyCE0I_face.png',
    },
    {
      gen: 'C:/Users/webco/.gemini/antigravity-ide/brain/c1445db3-094e-4270-b3d1-2e31ad3d531b/fix_head_02_1788288563105.jpg',
      target: 'D:/image/_재료/얼굴형/male/EastAsian/chrome_EznCG7CBzH_face.png',
    },
    {
      gen: 'C:/Users/webco/.gemini/antigravity-ide/brain/c1445db3-094e-4270-b3d1-2e31ad3d531b/fix_head_03_1788288577901.jpg',
      target: 'D:/image/_재료/얼굴형/male/Indian/images_face.png',
    },
  ];

  for (const item of replacements) {
    await cropAndOverwrite(item.gen, item.target);
  }
}

main().catch(console.error);
