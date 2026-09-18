/**
 * 아바타 빛 방향 통일 — 반대쪽에서 빛을 받는 이미지를 좌우 반전한다
 *
 * 코끝 기준 좌·우 뺨의 평균 밝기를 재 키라이트 방향을 판정하고, AVATAR_LIGHT_SPEC.targetSide와
 * 반대면 뒤집어 출력폴더에 쓴다. 정면광과 같은 방향은 그대로 복사한다. 그래서 출력폴더는 입력과
 * 같은 파일 구성이고 reframe.ts의 입력으로 바로 쓴다. 판정·임계는 src/lib/avatar-geometry.ts가 쥔다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/light-unify.ts <입력폴더> <출력폴더> [--skip-real] [--exclude a,b]
 *
 *   --skip-real     실존 인물(celebs.celeb_reality = REAL·BOTH)은 뒤집지 않는다. 기본은 실존·허구 구분 없이 뒤집는다 —
 *                   서비스 전체를 한 방향으로 맞추는 것이 원칙이다(2026-09 결정). slug는 파일명 <번호>-<slug>에서 읽는다.
 *                   --include-real 은 옛 표기이며 기본 동작과 같다.
 *   --exclude       안대·외눈·글자처럼 좌우가 의미 있는 인물을 뺀다.
 *
 * 출력폴더/_light-report.json 에 인물별 판정·반전 여부를 남긴다. R2·DB에는 손대지 않는다.
 */
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join, parse as parsePath } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { AVATAR_LIGHT_SPEC, judgeLight } from '../../src/lib/avatar-geometry'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api')

const args = process.argv.slice(2)
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--exclude')
const inDir = positional[0]
const outDir = positional[1]
const skipReal = args.includes('--skip-real')
const exIdx = args.indexOf('--exclude')
const exclude = new Set(exIdx >= 0 ? args[exIdx + 1].split(',').map((s) => s.trim()) : [])
if (!inDir || !outDir) {
  console.error('사용법: npx tsx scripts/avatar/light-unify.ts <입력폴더> <출력폴더> [--skip-real] [--exclude a,b]')
  process.exit(1)
}
const IN = inDir as string
const OUT = outDir as string

function loadEnv() {
  const p = join(BO_ROOT, '.env')
  if (!existsSync(p)) return
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
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

/** 실존 인물 slug 집합. DB에 못 붙으면 빈 집합을 돌려주고 경고한다 */
async function realSlugs(slugs: string[]): Promise<Set<string>> {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) {
    console.warn('  ! DB 접속 정보가 없어 실존 인물 판별을 건너뛴다')
    return new Set()
  }
  const db = createClient(url, key)
  const { data, error } = await db.from('celebs').select('slug, celeb_reality').in('slug', slugs)
  if (error) {
    console.warn(`  ! 실존 인물 조회 실패: ${error.message}`)
    return new Set()
  }
  // BOTH(실존이면서 허구화된 인물)도 실존 흐름이다
  return new Set((data ?? []).filter((c) => c.celeb_reality === 'REAL' || c.celeb_reality === 'BOTH').map((c) => c.slug))
}

interface Face {
  eyeY: number
  chinY: number
  noseX: number
  jawLeftX: number
  jawRightX: number
}

async function detect(rgb: Buffer, W: number, H: number): Promise<Face | null> {
  const tensor = tf.tensor3d(new Uint8Array(rgb), [H, W, 3], 'int32') as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
      .withFaceLandmarks()
    if (!dets.length) return null
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const lm = dets[0].landmarks
    const eyes = [...lm.getLeftEye(), ...lm.getRightEye()]
    const jaw = lm.getJawOutline()
    return {
      eyeY: eyes.reduce((s, p) => s + p.y, 0) / eyes.length,
      chinY: jaw[8].y,
      noseX: lm.getNose()[3].x,
      jawLeftX: jaw[0].x,
      jawRightX: jaw[jaw.length - 1].x,
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

/** 코끝 기준 좌·우 뺨의 평균 밝기 */
function cheekLuminance(rgba: Buffer, W: number, f: Face): { left: number; right: number } {
  const S = AVATAR_LIGHT_SPEC.sample
  const span = f.chinY - f.eyeY
  const y0 = Math.round(f.eyeY + span * S.vertical)
  const y1 = Math.round(f.chinY - span * S.vertical)
  const mean = (x0: number, x1: number) => {
    let sum = 0
    let n = 0
    for (let y = y0; y < y1; y++) {
      for (let x = Math.round(x0); x < Math.round(x1); x++) {
        const i = (y * W + x) * 4
        if (rgba[i + 3] < AVATAR_LIGHT_SPEC.minAlpha) continue
        sum += 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]
        n++
      }
    }
    return n ? sum / n : NaN
  }
  const lw = f.noseX - f.jawLeftX
  const rw = f.jawRightX - f.noseX
  return {
    left: mean(f.jawLeftX + lw * S.outer, f.noseX - lw * S.inner),
    right: mean(f.noseX + rw * S.inner, f.jawRightX - rw * S.outer),
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const files = readdirSync(IN).filter((f) => /\.(webp|png)$/i.test(f) && !f.startsWith('_')).sort()
  const slugOf = (f: string) => parsePath(f).name.replace(/^\d+-/, '')
  const real = skipReal ? await realSlugs(files.map(slugOf)) : new Set<string>()
  await loadModels()
  console.log(`빛 방향 통일 → ${AVATAR_LIGHT_SPEC.targetSide === 'left' ? '좌측광' : '우측광'} · 대상 ${files.length}장`)

  const report: Record<string, unknown>[] = []
  const counts = { flipped: 0, kept: 0, frontal: 0, skipped: 0, undetected: 0 }
  for (const f of files) {
    const slug = slugOf(f)
    const buf = readFileSync(join(IN, f))
    const { data: rgba, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const rgb = await sharp(buf).flatten({ background: '#808080' }).removeAlpha().raw().toBuffer()
    const face = await detect(rgb, info.width, info.height)
    const outName = parsePath(f).name + '.webp'
    if (!face) {
      counts.undetected++
      writeFileSync(join(OUT, outName), await sharp(buf).webp({ lossless: true }).toBuffer())
      report.push({ name: f, status: 'undetected' })
      console.log(`  ${slug.padEnd(20)} 얼굴 미검출 — 그대로 복사`)
      continue
    }
    const lum = cheekLuminance(rgba, info.width, face)
    const j = judgeLight(lum.left, lum.right)
    const reason = exclude.has(slug) ? 'exclude' : real.has(slug) ? 'real' : null
    const flip = j.flip && !reason
    if (flip) counts.flipped++
    else if (reason && j.flip) counts.skipped++
    else if (j.side === 'frontal') counts.frontal++
    else counts.kept++
    // 무손실로 써서 반전·복사 단계에서 화질을 깎지 않는다. 최종 인코딩은 reframe이 한다
    const img = flip ? sharp(buf).flop() : sharp(buf)
    writeFileSync(join(OUT, outName), await img.webp({ lossless: true }).toBuffer())
    report.push({ name: f, side: j.side, ratio: +j.ratio.toFixed(2), left: Math.round(lum.left), right: Math.round(lum.right), flipped: flip, skippedBecause: reason && j.flip ? reason : undefined })
    const label = j.side === 'left' ? '좌측광' : j.side === 'right' ? '우측광' : '정면광'
    console.log(`  ${slug.padEnd(20)} ${label} ${j.ratio.toFixed(2).padStart(6)}  ${flip ? '→ 반전' : reason && j.flip ? `건너뜀(${reason})` : '유지'}`)
  }
  writeFileSync(join(OUT, '_light-report.json'), JSON.stringify(report, null, 2))
  console.log(`\n반전 ${counts.flipped} · 유지 ${counts.kept} · 정면 ${counts.frontal} · 건너뜀 ${counts.skipped} · 미검출 ${counts.undetected}`)
  console.log(`출력: ${OUT} (reframe.ts 입력으로 쓴다)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
