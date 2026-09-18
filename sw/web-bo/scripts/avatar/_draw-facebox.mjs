// 얼굴 박스 검수판 — 이미지에 검출 얼굴 박스·턱선 양끝·눈 위치·중심선을 그린다.
// 사용법: node scripts/avatar/_draw-facebox.mjs <출력png> <이미지1> <이미지2> ...
import sharp from 'sharp'
import { resolve } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'

const BO = 'C:/project/feelandnote/sw/web-bo'
const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js')

const [out, ...files] = process.argv.slice(2)
await setWasmPaths(resolve(BO, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
await import('@tensorflow/tfjs-backend-wasm')
await tf.setBackend('wasm')
await tf.ready()
const modelDir = resolve(BO, 'node_modules/@vladmandic/face-api/model')
await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)

const CELL = 300
const imgs = []
for (const f of files) {
  const buf = await sharp(f).resize(CELL, CELL).toBuffer()
  const { data, info } = await sharp(buf).flatten({ background: '#808080' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32')
  const dets = await faceapi.detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 })).withFaceLandmarks()
  tensor.dispose()
  let svg = ''
  if (dets.length) {
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const d = dets[0], lm = d.landmarks, jaw = lm.getJawOutline()
    const b = d.detection.box
    const mid = (jaw[0].x + jaw[jaw.length - 1].x) / 2
    const L = lm.getLeftEye(), R = lm.getRightEye()
    const lc = { x: L.reduce((s, p) => s + p.x, 0) / L.length, y: L.reduce((s, p) => s + p.y, 0) / L.length }
    const rc = { x: R.reduce((s, p) => s + p.x, 0) / R.length, y: R.reduce((s, p) => s + p.y, 0) / R.length }
    svg = `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="none" stroke="#00e0ff" stroke-width="3"/>` +
      `<line x1="${jaw[0].x}" y1="0" x2="${jaw[0].x}" y2="${CELL}" stroke="#ff40ff" stroke-width="2"/>` +
      `<line x1="${jaw[jaw.length - 1].x}" y1="0" x2="${jaw[jaw.length - 1].x}" y2="${CELL}" stroke="#ff40ff" stroke-width="2"/>` +
      `<line x1="${mid}" y1="0" x2="${mid}" y2="${CELL}" stroke="#ff40ff" stroke-width="3" stroke-dasharray="8 4"/>` +
      `<circle cx="${lc.x}" cy="${lc.y}" r="6" fill="#00ff80"/><circle cx="${rc.x}" cy="${rc.y}" r="6" fill="#00ff80"/>`
  }
  const frame = `<line x1="${CELL / 2}" y1="0" x2="${CELL / 2}" y2="${CELL}" stroke="#ffe600" stroke-width="2"/>` +
    `<line x1="0" y1="${CELL / 2}" x2="${CELL}" y2="${CELL / 2}" stroke="#ffe600" stroke-width="1"/>`
  imgs.push(await sharp(buf).composite([{ input: Buffer.from(`<svg width="${CELL}" height="${CELL}">${frame}${svg}</svg>`), top: 0, left: 0 }]).png().toBuffer())
}
const W = CELL * imgs.length + 8 * (imgs.length + 1)
const comps = imgs.map((buf, i) => ({ input: buf, left: 8 + i * (CELL + 8), top: 8 }))
await sharp({ create: { width: W, height: CELL + 16, channels: 4, background: '#3a3f4a' } }).composite(comps).png().toFile(out)
console.log('→', out)
