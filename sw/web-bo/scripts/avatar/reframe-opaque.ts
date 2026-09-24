/**
 * 배경을 지우지 않은 생성 초상 재배치 — 균일 배경색 차이로 실루엣을 재서 정사각을 구한다
 *
 * reframe.ts는 알파 실루엣을 요구해 누끼 입력만 받는다. 이 스크립트는 누끼를 돌리지 않고
 * 생성 원본(Gemini의 균일 스튜디오 배경)에서 배경색과 다른 픽셀을 인물로 보고 같은
 * computeCropFromSilhouette로 자른다 — 누끼를 산출물로 쓰지 않는 파이프라인용이다.
 * 좌우로 원본 밖이 필요하면 투명이 아니라 가장자리 복제로 넓힌다(불투명 출력).
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/reframe-opaque.ts <입력폴더> <출력폴더> [--sheet]
 *   입력폴더의 *.jpg|webp|png (불투명 생성 초상) → 출력폴더에 같은 이름 .webp
 */
import sharp from 'sharp'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join, parse as parsePath } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { CELEB_AVATAR_ORIGINAL } from '@feelandnote/shared/constants/celeb-avatar-small'
import {
  AVATAR_SILHOUETTE_SPEC,
  computeCropFromSilhouette,
  horizontalAnchor,
  type SilhouetteAnchors,
  type SilhouetteInfo,
} from '../../src/lib/avatar-geometry'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
const inDir = positional[0]
const outDir = positional[1]
const wantSheet = args.includes('--sheet')
// --loose a,b,c[:eyeMax:minSpan] : 머리 장식·부피 큰 머리가 정수리 규격보다 중요한 인물 — 눈높이 상한을 풀어 머리를 살린다
const looseIdx = args.indexOf('--loose')
const looseMap = new Map<string, { eyeLineMax: number; eyeChinSpanRange?: [number, number] }>()
if (looseIdx >= 0) {
  for (const tok of args[looseIdx + 1].split(',')) {
    const [slug, eye, min] = tok.trim().split(':')
    looseMap.set(slug, {
      eyeLineMax: eye ? Number(eye) : 0.58,
      eyeChinSpanRange: min ? [Number(min), AVATAR_SILHOUETTE_SPEC.eyeChinSpanRange[1]] : undefined,
    })
  }
}
if (!inDir || !outDir) {
  console.error('사용법: npx tsx scripts/avatar/reframe-opaque.ts <입력폴더> <출력폴더> [--sheet]')
  process.exit(1)
}

async function loadModels() {
  await setWasmPaths(resolve(BO_ROOT, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO_ROOT, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
}

async function anchorsOf(buf: Buffer): Promise<(SilhouetteAnchors & { emphasis: number }) | null> {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32') as unknown as Parameters<
    typeof faceapi.detectAllFaces
  >[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
      .withFaceLandmarks()
    if (!dets.length) return null
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const lm = dets[0].landmarks
    const center = (pts: { x: number; y: number }[]) => ({
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    })
    const L = center(lm.getLeftEye())
    const R = center(lm.getRightEye())
    const nose = lm.getNose()[3]
    const jaw = lm.getJawOutline()
    const h = horizontalAnchor({ leftEyeX: L.x, rightEyeX: R.x, noseX: nose.x, jawLeftX: jaw[0].x, jawRightX: jaw[jaw.length - 1].x })
    return {
      eyeX: (L.x + R.x) / 2,
      eyeY: (L.y + R.y) / 2,
      chinY: jaw[Math.floor(jaw.length / 2)].y,
      centerX: h.centerX,
      emphasis: h.emphasis,
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

/** 균일 배경의 생성 초상에서 인물 실루엣을 잰다. 배경이 불균일하면 null */
async function silhouetteOfOpaque(buf: Buffer): Promise<(SilhouetteInfo & { W: number; H: number }) | null> {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const px = (x: number, y: number) => {
    const o = (y * W + x) * 3
    return [data[o], data[o + 1], data[o + 2]] as const
  }
  // 배경색: 상단 3줄 중앙값
  const bgSamples: number[][] = []
  for (let y = 0; y < Math.min(3, H); y++) for (let x = 0; x < W; x += 4) bgSamples.push([...px(x, y)])
  bgSamples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
  const bg = bgSamples[Math.floor(bgSamples.length / 2)]
  const TOL = 34 // 채널 합이 이 값을 넘으면 인물로 본다
  const minRun = Math.max(1, Math.round(W * AVATAR_SILHOUETTE_SPEC.minOpaqueRun))
  let headTop = -1
  const rowLeft: number[] = new Array(H).fill(-1)
  const rowRight: number[] = new Array(H).fill(-1)
  let bgish = 0
  for (let y = 0; y < H; y++) {
    let run = 0
    for (let x = 0; x < W; x++) {
      const [r, g, b] = px(x, y)
      const diff = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2])
      if (diff > TOL) {
        run++
        if (rowLeft[y] < 0) rowLeft[y] = x
        rowRight[y] = x
      } else bgish++
    }
    if (headTop < 0 && run >= minRun) headTop = y
  }
  // 배경이 5%도 안 되면 균일 배경이 아니다
  if (bgish < W * H * 0.05) return null
  if (headTop < 0) return null
  return { W, H, headTop, touchesTop: headTop <= 1, rowLeft, rowRight }
}

interface Row {
  name: string
  srcFile?: string
  error?: string
  crop?: { left: number; top: number; size: number }
  spanRatio?: number
  eyeLine?: number
  headroom?: number
  emphasis?: number
  decidedBy?: string
  upscale?: number
  warnings?: string[]
}

async function makeSheet(rows: Row[], srcDir: string, dstDir: string) {
  const cell = 200
  const gap = 6
  const pairsPerRow = 5
  const perSheet = 30
  const label = 22
  const done = rows.filter((r) => r.crop)
  for (let s = 0; s * perSheet < done.length; s++) {
    const chunk = done.slice(s * perSheet, (s + 1) * perSheet)
    const nRows = Math.ceil(chunk.length / pairsPerRow)
    const width = pairsPerRow * (cell * 2 + gap * 3)
    const height = nRows * (cell + label + gap)
    const composites: sharp.OverlayOptions[] = []
    const svgLabels: string[] = []
    for (let i = 0; i < chunk.length; i++) {
      const r = chunk[i]
      const col = i % pairsPerRow
      const rowI = Math.floor(i / pairsPerRow)
      const x0 = col * (cell * 2 + gap * 3) + gap
      const y0 = rowI * (cell + label + gap) + label
      const before = await sharp(join(srcDir, r.srcFile ?? r.name + '.webp'))
        .resize(cell, cell)
        .png()
        .toBuffer()
      const after = await sharp(join(dstDir, r.name + '.webp')).resize(cell, cell).png().toBuffer()
      composites.push({ input: before, left: x0, top: y0 }, { input: after, left: x0 + cell + gap, top: y0 })
      const tag = `${r.name}  ${((r.spanRatio ?? 0) * 100).toFixed(0)}% ${r.decidedBy}${r.warnings?.length ? ' !' : ''}`
      svgLabels.push(`<text x="${x0}" y="${y0 - 6}" font-size="13" fill="#fff" font-family="sans-serif">${tag}</text>`)
    }
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgLabels.join('')}</svg>`
    await sharp({ create: { width, height, channels: 4, background: '#5a6270' } })
      .composite([...composites, { input: Buffer.from(svg), left: 0, top: 0 }])
      .png()
      .toFile(join(dstDir, `_sheet-${String(s + 1).padStart(3, '0')}.png`))
  }
  console.log(`대조 격자 ${Math.ceil(done.length / perSheet)}장 → ${dstDir}/_sheet-*.png`)
}

async function main() {
  await loadModels()
  mkdirSync(outDir, { recursive: true })
  const files = readdirSync(inDir).filter((f) => /\.(webp|png|jpe?g)$/i.test(f) && !f.startsWith('_') && !f.startsWith('.')).sort()
  console.log(`재배치 대상 ${files.length}장`)
  const rows: Row[] = []
  for (const file of files) {
    const name = parsePath(file).name.replace(/-gem$/, '')
    const buf = readFileSync(join(inDir, file))
    try {
      const sil = await silhouetteOfOpaque(buf)
      if (!sil) {
        rows.push({ name, error: '균일 배경 아님 — 실루엣 불가' })
        console.log(`  ${name} — 실루엣 없음, 건너뜀`)
        continue
      }
      const anchors = await anchorsOf(buf)
      if (!anchors) {
        rows.push({ name, error: '얼굴 미검출' })
        console.log(`  ${name} — 얼굴 미검출, 건너뜀`)
        continue
      }
      // loose 대상은 눈높이 상한을 풀어 면류관·모자·부피 머리가 잘리지 않게 한다
      const crop = computeCropFromSilhouette(anchors, sil, sil.W, sil.H, looseMap.get(name))
      // 불투명 출력: 원본 밖으로 나가는 만큼 가장자리 복제로 넓힌다
      const padL = Math.max(0, -crop.left)
      const padR = Math.max(0, crop.left + crop.size - sil.W)
      const padT = Math.max(0, -crop.top)
      const padB = Math.max(0, crop.top + crop.size - sil.H)
      const canvas =
        padL || padR || padT || padB
          ? await sharp(buf).extend({ left: padL, right: padR, top: padT, bottom: padB, extendWith: 'copy' }).toBuffer()
          : buf
      await sharp(canvas)
        .extract({ left: crop.left + padL, top: crop.top + padT, width: crop.size, height: crop.size })
        .resize(CELEB_AVATAR_ORIGINAL.sizePx, CELEB_AVATAR_ORIGINAL.sizePx, { kernel: 'lanczos3' })
        .webp({ quality: CELEB_AVATAR_ORIGINAL.webpQuality })
        .toFile(join(outDir, name + '.webp'))
      const row: Row = {
        name,
        srcFile: file,
        crop: { left: crop.left, top: crop.top, size: crop.size },
        spanRatio: +crop.spanRatio.toFixed(3),
        eyeLine: +crop.eyeLine.toFixed(3),
        emphasis: +anchors.emphasis.toFixed(2),
        headroom: +((sil.headTop - crop.top) / crop.size).toFixed(3),
        decidedBy: crop.decidedBy,
        upscale: +(CELEB_AVATAR_ORIGINAL.sizePx / crop.size).toFixed(2),
        warnings: crop.warnings,
      }
      rows.push(row)
      console.log(
        `  ${name.padEnd(24)} 눈~턱 ${(row.spanRatio! * 100).toFixed(1).padStart(5)}%  눈높이 ${(row.eyeLine! * 100).toFixed(1).padStart(5)}%  정수리여백 ${(row.headroom! * 100).toFixed(1).padStart(5)}%  x${row.upscale}  ${row.decidedBy}` +
          (Math.abs(anchors.emphasis) > AVATAR_SILHOUETTE_SPEC.emphasis.deadZone
            ? `  ${anchors.emphasis > 0 ? '왼쪽' : '오른쪽'} 부각 ${Math.abs(anchors.emphasis).toFixed(2)}`
            : '') +
          (crop.warnings.length ? `  ! ${crop.warnings.join(' / ')}` : '')
      )
    } catch (e) {
      rows.push({ name, error: e instanceof Error ? e.message : String(e) })
      console.log(`  ${name} — 실패: ${e instanceof Error ? e.message : e}`)
    }
  }
  writeFileSync(join(outDir, '_report.json'), JSON.stringify(rows, null, 2))
  const done = rows.filter((r) => r.crop)
  const warned = done.filter((r) => r.warnings?.length)
  console.log(`\n완료 ${done.length} / ${rows.length}  ·  경고 ${warned.length}  ·  건너뜀 ${rows.length - done.length}`)
  if (wantSheet) await makeSheet(rows, inDir, outDir)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
