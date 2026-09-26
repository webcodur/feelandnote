/**
 * 배경 지운 아바타 재배치 — 정수리·쇄골 실루엣 기준으로 다시 자른다
 *
 * 눈·턱 규격(AVATAR_SPEC)에 합격해도 정수리 여백과 상반신 유입이 제각각이면 나란히 놓았을 때 흐트러진다.
 * 알파 채널에서 정수리를, 랜드마크에서 눈·턱을 재 AVATAR_SILHOUETTE_SPEC으로 정사각을 다시 구한다.
 * 계산은 src/lib/avatar-geometry.ts 한 곳이 맡는다. 여기서 수치를 만들지 않는다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/reframe.ts <입력폴더> <출력폴더> [--sheet]
 *
 *   입력폴더의 *.webp|png 를 읽어 출력폴더에 같은 이름의 .webp(공유 원본 규격 크기·품질)로 쓴다.
 *   --sheet 를 주면 출력폴더/_sheet-NNN.png 에 전·후 대조 격자를 만든다.
 *   출력폴더/_report.json 에 인물별 좌표·결정 요인·경고·확대 배율을 남긴다.
 *
 * 얼굴 미검출은 건너뛰고 보고한다. 투명 배경이 아닌 입력은 실루엣을 잴 수 없어 건너뛴다.
 * R2·DB에는 손대지 않는다. 등록은 upload-local.ts 경로를 쓴다.
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
if (!inDir || !outDir) {
  console.error('사용법: npx tsx scripts/avatar/reframe.ts <입력폴더> <출력폴더> [--sheet]')
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

/** 투명 영역을 중간 회색으로 깔아 검출기가 검은 배경에 흔들리지 않게 한다 */
async function anchorsOf(buf: Buffer): Promise<(SilhouetteAnchors & { emphasis: number }) | null> {
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
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
      .withFaceLandmarks()
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
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

/** 알파 채널에서 정수리 행을 찾는다. 투명 배경이 아니면 null */
async function silhouetteOf(buf: Buffer): Promise<(SilhouetteInfo & { W: number; H: number }) | null> {
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

interface Row {
  name: string
  error?: string
  crop?: { left: number; top: number; size: number }
  spanRatio?: number
  eyeLine?: number
  headroom?: number
  /** 부각량. 양수면 왼쪽 부각 → 왼쪽 눈 기준 */
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
      const before = await sharp(join(srcDir, r.name + '.webp')).resize(cell, cell).png().toBuffer()
      const after = await sharp(join(dstDir, r.name + '.webp')).resize(cell, cell).png().toBuffer()
      composites.push({ input: before, left: x0, top: y0 }, { input: after, left: x0 + cell + gap, top: y0 })
      const tag = `${r.name}  ${((r.spanRatio ?? 0) * 100).toFixed(0)}% ${r.decidedBy}${r.warnings?.length ? ' !' : ''}`
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      svgLabels.push(`<text x="${x0}" y="${y0 - 6}" font-size="13" fill="#fff" font-family="sans-serif">${tag}</text>`)
    }
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgLabels.join('')}</svg>`
    await sharp({ create: { width, height, channels: 4, background: '#5a6270' } })
      .composite([...composites, { input: Buffer.from(svg), left: 0, top: 0 }])
      .png()
      .toFile(join(dstDir, `_sheet-${String(s + 1).padStart(3, '0')}.png`))
  }
  console.log(`대조 격자 ${Math.ceil(done.length / perSheet)}장 → ${dstDir}/_sheet-*.png (왼쪽 전 · 오른쪽 후)`)
}

async function main() {
  await loadModels()
  mkdirSync(outDir, { recursive: true })
  const files = readdirSync(inDir).filter((f) => /\.(webp|png)$/i.test(f) && !f.startsWith('_')).sort()
  console.log(`재배치 대상 ${files.length}장`)
  const rows: Row[] = []
  for (const file of files) {
    const name = parsePath(file).name
    const buf = readFileSync(join(inDir, file))
    try {
      const sil = await silhouetteOf(buf)
      if (!sil) {
        rows.push({ name, error: '투명 배경이 아니거나 실루엣 없음' })
        console.log(`  ${name} — 실루엣 없음, 건너뜀`)
        continue
      }
      const anchors = await anchorsOf(buf)
      if (!anchors) {
        rows.push({ name, error: '얼굴 미검출' })
        console.log(`  ${name} — 얼굴 미검출, 건너뜀`)
        continue
      }
      const crop = computeCropFromSilhouette(anchors, sil, sil.W, sil.H)
      // 좌우로 원본 밖으로 나간 만큼 투명으로 넓힌 뒤 자른다.
      // sharp는 한 파이프라인 안에서 extend를 extract 뒤에 적용하므로 넓히기를 별도 단계로 끝내고 자른다.
      const padL = Math.max(0, -crop.left)
      const padR = Math.max(0, crop.left + crop.size - sil.W)
      const canvas =
        padL || padR
          ? await sharp(buf)
              .ensureAlpha()
              .extend({ left: padL, right: padR, top: 0, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer()
          : buf
      await sharp(canvas)
        .extract({ left: crop.left + padL, top: crop.top, width: crop.size, height: crop.size })
        .resize(CELEB_AVATAR_ORIGINAL.sizePx, CELEB_AVATAR_ORIGINAL.sizePx, { kernel: 'lanczos3' })
        .webp({ quality: CELEB_AVATAR_ORIGINAL.webpQuality })
        .toFile(join(outDir, name + '.webp'))
      const row: Row = {
        name,
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
