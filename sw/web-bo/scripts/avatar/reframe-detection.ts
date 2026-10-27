import sharp from 'sharp'
import { resolve } from 'node:path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'node:module'
import { AVATAR_SILHOUETTE_SPEC, type SilhouetteAnchors, type SilhouetteInfo } from '../../src/lib/avatar-geometry'
import { detectWithAvatarPadding, reframeAnchorsOf, silhouetteFromRgba, unpadAvatarLandmarks } from '../../src/lib/avatar-reframe'
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
  const { width = 0, height = 0 } = await sharp(buf).metadata()
  const { detections: dets, padding } = await detectWithAvatarPadding(width, height, async (pad) => {
    let input = sharp(buf).flatten({ background: '#808080' }).removeAlpha()
    if (pad) input = input.extend({ left: pad, right: pad, top: pad, bottom: pad, background: '#808080' })
    const { data, info } = await input.raw().toBuffer({ resolveWithObject: true })
    const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32') as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
    try {
      return await faceapi
        .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({
          minConfidence: AVATAR_SILHOUETTE_SPEC.detection.minConfidence,
          maxResults: Math.max(AVATAR_SILHOUETTE_SPEC.detection.maxResults, groupSize + 1),
        }))
        .withFaceLandmarks()
    } finally {
      ;(tensor as unknown as { dispose?: () => void }).dispose?.()
    }
  })
  if (groupSize && dets.length !== groupSize) {
    throw new Error(`그룹 얼굴 수 불일치: 기대 ${groupSize}명, 검출 ${dets.length}명`)
  }
  if (!groupSize && dets.length > 1) {
    throw new Error(`여러 얼굴 검출 (${dets.length}명): 한 명만 자동 선택하지 않는다. 그룹 정사각은 --group-size 로 인원을 지정하라`)
  }
  if (!dets.length) return null
  dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
  const anchors = reframeAnchorsOf(unpadAvatarLandmarks(dets[0].landmarks, padding))
  return anchors ? { ...anchors, faceCount: dets.length } : null
}

/** 알파 채널에서 정수리 행을 찾는다. 투명 배경이 아니면 null */
export async function silhouetteOf(buf: Buffer): Promise<(SilhouetteInfo & { W: number; H: number }) | null> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const silhouette = silhouetteFromRgba(data, W, H)
  return silhouette ? { ...silhouette, W, H } : null
}
