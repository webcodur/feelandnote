/**
 * 후보 사진 무리에서 「그 사람」의 최적 한 장을 고른다
 *
 * 검색으로 긁어온 사진 뭉치에는 남의 얼굴이 섞인다(실측: 잡지 표지 12장 중 여러 장이 다른 모델).
 * 그래서 얼굴 임베딩을 뽑아 서로 대조하고, **가장 큰 무리 = 진짜 그 사람**으로 본다.
 * 그 무리 안에서 크롭 가능 해상도가 가장 큰 사진을 고른다.
 *
 * `--anchor` 로 신원이 보장된 사진 한 장을 주면 그것과 대조한다. 화질이 나빠도 상관없다 —
 * 위키미디어 P18이 여기에 맞다. **사진 창고로는 쓰지 않되 신원 대조 기준으로는 쓴다**
 * (`docs/project/celeb/celeb-08-01-avatar.md`의 「원본과 제작」). anchor 가 없으면 최대 무리를 본인으로 보는데,
 * 남의 사진이 더 많이 섞이면 뒤집힌다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/pick-face.ts <후보폴더> [--anchor <기준사진>] [--out <저장경로>]
 *                                       [--threshold 0.5] [--min-crop 800]
 *
 * 사람이 눈으로 고르지 않아도 되도록 만든 도구다. 판정 근거는 stdout 과 <후보폴더>/_pick.json 에 남는다.
 */
import sharp from 'sharp'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join, parse as parsePath } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { CELEB_AVATAR_ORIGINAL } from '@feelandnote/shared/constants/celeb-avatar-small'
import { AVATAR_SPEC } from '../../src/lib/avatar-geometry'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require(
  '@vladmandic/face-api/dist/face-api.node-wasm.js'
) as typeof import('@vladmandic/face-api')

const BO = BO_ROOT
const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : null
}
const dir = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'))
const outPath = flag('out')
/** 얼굴 임베딩 거리. 0.5 안쪽이면 같은 사람으로 본다(face-api 권장값 0.6보다 죄어 잡는다). */
const threshold = Number(flag('threshold') ?? 0.5)
const minCrop = Number(flag('min-crop') ?? CELEB_AVATAR_ORIGINAL.sizePx)

if (!dir) {
  console.error('사용법: npx tsx scripts/avatar/pick-face.ts <후보폴더> [--out <경로>]')
  process.exit(1)
}

async function loadModels() {
  await setWasmPaths(resolve(BO, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelDir)
}

interface Candidate {
  file: string
  descriptor: Float32Array
  cropPx: number
  score: number
  centerX: number
  /** 하관 너비 ÷ 눈-턱 거리. 클수록 각지고 넓은 얼굴이다. */
  jawRatio: number
  /** 광대 너비 ÷ 눈-턱 거리. 얼굴이 옆으로 넓은 정도. */
  cheekRatio: number
  /** 0에 가까우면 흑백. 흑백을 REF 로 쓰면 산출물이 흑백으로 고착된다. */
  saturation: number
}

async function analyse(file: string): Promise<Candidate | null> {
  const buf = readFileSync(file)
  const { data, info } = await sharp(buf).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
      .withFaceLandmarks()
      .withFaceDescriptors()
    if (!dets.length) return null
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const d = dets[0]
    const lm = d.landmarks
    const eyePts = [...lm.getLeftEye(), ...lm.getRightEye()]
    const jaw = lm.getJawOutline()
    const eyeX = eyePts.reduce((s, p) => s + p.x, 0) / eyePts.length
    const eyeY = eyePts.reduce((s, p) => s + p.y, 0) / eyePts.length
    const chinY = jaw[Math.floor(jaw.length / 2)].y
    // crop-local 과 같은 계산. 원본을 넘지 않는 최대 정사각이 실질 해상도다.
    const { eyeLine, centerX } = AVATAR_SPEC
    const fits = Math.min(
      eyeY / eyeLine,
      (info.height - eyeY) / (1 - eyeLine),
      eyeX / centerX,
      (info.width - eyeX) / (1 - centerX)
    )
    const wanted = (chinY - eyeY) / AVATAR_SPEC.eyeChinSpan
    // 68점 턱선에서 골격을 잰다. 사람이나 모델의 인상 평가와 달리 이 값은 흔들리지 않는다.
    // jaw[0]~jaw[16]이 왼쪽 귀앞 → 턱끝 → 오른쪽 귀앞 순서다.
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
    const eyeToChin = chinY - eyeY

    // 채널 평균이 서로 붙어 있으면 흑백이다. 흑백 REF 는 산출물까지 흑백으로 만든다
    // (26.07.28 실측: 흑백 원본 40명 중 30명이 흑백으로 나왔다).
    const stats = await sharp(buf).stats()
    const means = stats.channels.slice(0, 3).map((c) => c.mean)
    const saturation = means.length === 3
      ? +(Math.max(...means) - Math.min(...means)).toFixed(1)
      : 0
    return {
      file,
      descriptor: d.descriptor,
      cropPx: Math.round(Math.min(wanted, fits)),
      score: +d.detection.score.toFixed(3),
      centerX: +((eyeX / info.width) * 100).toFixed(1),
      jawRatio: +(dist(jaw[4], jaw[12]) / eyeToChin).toFixed(3),
      cheekRatio: +(dist(jaw[1], jaw[15]) / eyeToChin).toFixed(3),
      saturation,
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

const distance = (a: Float32Array, b: Float32Array) => {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}

async function main() {
  await loadModels()
  const files = readdirSync(dir!).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  console.log(`후보 ${files.length}장`)

  const cands: Candidate[] = []
  for (const f of files) {
    const c = await analyse(join(dir!, f)).catch(() => null)
    if (!c) { console.log(`  ${f} — 얼굴 미검출`); continue }
    cands.push(c)
  }
  if (!cands.length) { console.error('쓸 수 있는 얼굴이 없다'); process.exit(1) }

  // 신원 기준이 있으면 그것과 대조한다. 없으면 가장 큰 무리를 본인으로 본다.
  const anchorPath = flag('anchor')
  let main: Candidate[]
  const groups: Candidate[][] = []

  if (anchorPath) {
    if (!existsSync(anchorPath)) { console.error(`기준 사진이 없다: ${anchorPath}`); process.exit(1) }
    const anchor = await analyse(anchorPath)
    if (!anchor) { console.error('기준 사진에서 얼굴을 못 찾았다'); process.exit(1) }
    const scored = cands.map((c) => ({ c, d: distance(anchor.descriptor, c.descriptor) }))
    main = scored.filter((s) => s.d < threshold).map((s) => s.c)
    console.log(`\n기준 대조 — ${main.length}/${cands.length}장이 같은 인물`)
    for (const s of scored.sort((a, b) => a.d - b.d)) {
      console.log(`  ${s.d < threshold ? '[본인]' : '[타인]'} ${parsePath(s.c.file).name} 거리 ${s.d.toFixed(3)}`)
    }
    if (!main.length) { console.error('기준과 일치하는 사진이 없다'); process.exit(1) }
  } else {
    for (const c of cands) {
      const hit = groups.find((g) => distance(g[0].descriptor, c.descriptor) < threshold)
      if (hit) hit.push(c)
      else groups.push([c])
    }
    groups.sort((a, b) => b.length - a.length)
    main = groups[0]
    console.log(`\n얼굴 무리 ${groups.length}개 — 최대 무리 ${main.length}장을 본인으로 본다 (기준 사진 없음)`)
    for (const [i, g] of groups.entries()) {
      console.log(`  ${i === 0 ? '[본인]' : '[타인]'} ${g.length}장: ${g.map((c) => parsePath(c.file).name).join(' ')}`)
    }
  }

  // 흑백은 REF 로 못 쓴다. 컬러가 하나라도 있으면 흑백은 버린다.
  const colour = main.filter((c) => c.saturation >= 3)
  const pool = colour.length ? colour : main
  if (!colour.length && main.length) console.log(`  ⚠ 전부 흑백이다 — REF 로 쓰면 결과도 흑백이 된다`)

  const usable = pool.filter((c) => c.cropPx >= minCrop)
  const ranked = (usable.length ? usable : pool).sort((a, b) => b.cropPx - a.cropPx)
  const best = ranked[0]

  const avg = (key: 'jawRatio' | 'cheekRatio') =>
    +(main.reduce((s, c) => s + c[key], 0) / main.length).toFixed(3)
  console.log(`\n골격 (본인 ${main.length}장 평균) — 하관 ${avg('jawRatio')} · 광대 ${avg('cheekRatio')}`)
  console.log(`  하관 1.2 이상이면 각지고 넓은 얼굴, 1.0 이하면 갸름하다.`)

  console.log(`\n선택: ${parsePath(best.file).name} · crop ${best.cropPx}px · 검출 ${best.score}`)
  console.log(`  하관 ${best.jawRatio} · 광대 ${best.cheekRatio} · 채도 ${best.saturation}${best.saturation < 3 ? ' (흑백)' : ''}`)
  if (!usable.length) console.log(`  ⚠ 무리 안에 ${minCrop}px 이상이 없다 — 확대가 필요하다`)

  writeFileSync(join(dir!, '_pick.json'), JSON.stringify({
    picked: parsePath(best.file).base,
    cropPx: best.cropPx,
    groupSize: main.length,
    totalGroups: groups.length || null,
    anchored: Boolean(flag('anchor')),
    upscaleNeeded: !usable.length,
    jawRatio: avg('jawRatio'),
    cheekRatio: avg('cheekRatio'),
    all: cands.map((c) => ({
      file: parsePath(c.file).base,
      cropPx: c.cropPx,
      score: c.score,
      jawRatio: c.jawRatio,
      cheekRatio: c.cheekRatio,
      sameAsPicked: distance(c.descriptor, best.descriptor) < threshold,
    })),
  }, null, 2))

  if (outPath) {
    await sharp(best.file).toFile(outPath)
    console.log(`저장: ${outPath}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
