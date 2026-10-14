import sharp from 'sharp'
import { resolve } from 'node:path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'node:module'
import { AVATAR_SILHOUETTE_SPEC, horizontalAnchor, type SilhouetteAnchors, type SilhouetteInfo } from '../../src/lib/avatar-geometry'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

export async function loadModels() {
  await setWasmPaths(resolve(BO_ROOT, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO_ROOT, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
}

/** 투명 영역을 중간 회색으로 깔아 검출기가 검은 배경에 흔들리지 않게 한다 */
export async function anchorsOf(buf: Buffer, groupSize: number): Promise<(SilhouetteAnchors & { emphasis: number; faceCount: number }) | null> {
  const { data, info } = await sharp(buf)
    .flatten({ background: '#808080' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32') as unknown as Parameters<
    typeof faceapi.detectAllFaces
  >[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: Math.max(10, groupSize + 1) }))
      .withFaceLandmarks()
    if (groupSize && dets.length !== groupSize) {
      throw new Error(`그룹 얼굴 수 불일치: 기대 ${groupSize}명, 검출 ${dets.length}명`)
    }
    if (!groupSize && dets.length > 1) {
      throw new Error(`여러 얼굴 검출 (${dets.length}명): 한 명만 자동 선택하지 않는다. 그룹 정사각은 --group-size 로 인원을 지정하라`)
    }
    if (!dets.length) return null
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const lm = dets[0].landmarks
    const center = (pts: { x: number; y: number }[]) => ({
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    })
    const L = center(lm.getLeftEye()) // 화면 왼쪽 눈
    const R = center(lm.getRightEye()) // 화면 오른쪽 눈
    const nose = lm.getNose()[3] // 코끝
    const jaw = lm.getJawOutline()
    // 가로 기준은 턱선 양끝의 중점 — 부각량은 진단 표시용
    const h = horizontalAnchor({ leftEyeX: L.x, rightEyeX: R.x, noseX: nose.x, jawLeftX: jaw[0].x, jawRightX: jaw[jaw.length - 1].x })
    return {
      eyeX: (L.x + R.x) / 2,
      eyeY: (L.y + R.y) / 2,
      chinY: jaw[Math.floor(jaw.length / 2)].y,
      centerX: h.centerX,
      emphasis: h.emphasis,
      faceCount: dets.length,
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

/** 알파 채널에서 정수리 행을 찾는다. 투명 배경이 아니면 null */
export async function silhouetteOf(buf: Buffer): Promise<(SilhouetteInfo & { W: number; H: number }) | null> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const minRun = Math.max(1, Math.round(W * AVATAR_SILHOUETTE_SPEC.minOpaqueRun))
  let transparent = 0
  let headTop = -1
  const rowLeft: number[] = new Array(H).fill(-1)
  const rowRight: number[] = new Array(H).fill(-1)
  for (let y = 0; y < H; y++) {
    let run = 0
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > AVATAR_SILHOUETTE_SPEC.alphaThreshold) {
        run++
        if (rowLeft[y] < 0) rowLeft[y] = x
        rowRight[y] = x
      } else transparent++
    }
    if (headTop < 0 && run >= minRun) headTop = y
  }
  if (transparent < W * H * 0.05) return null
  if (headTop < 0) return null
  return { W, H, headTop, touchesTop: headTop <= 1, rowLeft, rowRight }
}
