/**
 * 아바타 기하 측정·판정 도구
 *
 * 이미지 폴더를 훑어 인물의 눈높이·턱끝·얼굴 중심축을 재고, 규격에 드는지 판정한다.
 * 규격 의미: docs/project/celeb/celeb-08-01-avatar.md의 「구도」·「크롭」
 * 판정 기준은 src/lib/avatar-geometry.ts 의 AVATAR_SPEC 하나만 쓴다 — 이 파일에 수치를 따로 적지 않는다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/measure.ts <이미지폴더> [--json <출력경로>]
 *   npx tsx scripts/avatar/measure.ts --from-db [--offset 0] [--limit 200] [--json <출력경로>]
 *
 *   --from-db 는 등록된 아바타를 직접 받아 판정한다. 전수 검수용이다.
 *   1,500명 규모라 한 번에 돌리지 말고 --offset/--limit 로 나눠 돈다(200명 단위 권장).
 *
 * 출력:
 *   - 화면에 인물별 판정과 요약
 *   - <이미지폴더>/../measure.json 에 상세 (--json 으로 경로 지정 가능)
 *
 * 쓰는 곳:
 *   - 등록된 아바타가 규격에 드는지 전수 판정 (재생성 대상 고르기)
 *   - 새로 만든 이미지가 규격에 맞는지 납품 전 확인
 *   - 폴백 상수(AVATAR_SPEC.fallback) 재보정용 분포 산출
 */
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, writeFileSync, statSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
import { AVATAR_SPEC, judgeGeometry, type FaceAnchors } from '../../src/lib/avatar-geometry'
import { BO_ROOT } from '../lib/paths'

const _require = createRequire(import.meta.url)
const faceapi = _require(
  '@vladmandic/face-api/dist/face-api.node-wasm.js'
) as typeof import('@vladmandic/face-api')

const BO = BO_ROOT

interface Row {
  file: string
  nickname?: string
  tier?: string
  error?: string
  width?: number
  height?: number
  score?: number
  /** 프레임을 100으로 볼 때의 위치 */
  eyeLine?: number
  chinLine?: number
  centerX?: number
  pass?: boolean
  faults?: string[]
  /** 폴백 상수 재보정용 — 검출 상자와 실제 얼굴의 관계 */
  boxRatioObserved?: number
  boxAnchorObserved?: number
}

function parseArgs() {
  const a = process.argv.slice(2)
  const fromDb = a.includes('--from-db')
  const dir = a.find((x) => !x.startsWith('--') && !/^\d+$/.test(x))
  if (!fromDb && !dir) {
    console.error('사용법: npx tsx scripts/avatar/measure.ts <이미지폴더> [--json <출력경로>]')
    console.error('       npx tsx scripts/avatar/measure.ts --from-db [--offset 0] [--limit 200]')
    process.exit(1)
  }
  const argOf = (n: string) => {
    const i = a.indexOf(`--${n}`)
    return i >= 0 ? a[i + 1] : undefined
  }
  const jsonPath =
    argOf('json') ?? (fromDb ? join(BO, '.tmp', 'avatar-geometry-audit.json') : join(dir!, '..', 'measure.json'))
  return {
    fromDb,
    dir,
    jsonPath,
    offset: Number(argOf('offset') ?? 0),
    limit: Number(argOf('limit') ?? 200),
  }
}

function loadEnv() {
  const p = join(BO, '.env')
  if (!existsSync(p)) throw new Error(`.env 없음: ${p}`)
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

/** 등록된 아바타를 DB에서 받아온다. slug 순으로 안정 정렬해 offset/limit이 재현되게 한다. */
async function fetchFromDb(offset: number, limit: number) {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY 없음')
  const db = createClient(url, key)
  const { data, error } = await db
    .from('celebs')
    .select('slug, nickname, avatar_url, celeb_tier')
    .eq('publication_status', 'active')
    .not('avatar_url', 'is', null)
    .order('slug')
    .range(offset, offset + limit - 1)
  if (error) throw new Error(`DB 조회 실패: ${error.message}`)
  return (data ?? []) as { slug: string; nickname: string; avatar_url: string; celeb_tier: string }[]
}

async function loadModels() {
  await setWasmPaths(resolve(BO, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(BO, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
}

async function measureOne(buf: Buffer, file: string): Promise<Row> {
  const meta = await sharp(buf).rotate().metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  const { data, info } = await sharp(buf)
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
  try {
    const dets = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 10 }))
      .withFaceLandmarks()
    if (!dets.length) return { file, error: '얼굴 미검출' }
    dets.sort((a, b) => b.detection.box.area - a.detection.box.area)
    const d = dets[0]
    const box = d.detection.box
    const lm = d.landmarks
    const eyePts = [...lm.getLeftEye(), ...lm.getRightEye()]
    const anchors: FaceAnchors = {
      eyeX: eyePts.reduce((s, p) => s + p.x, 0) / eyePts.length,
      eyeY: eyePts.reduce((s, p) => s + p.y, 0) / eyePts.length,
      chinY: lm.getJawOutline()[Math.floor(lm.getJawOutline().length / 2)].y,
    }
    // 이미 정사각으로 잘려 있는 이미지를 그대로 프레임으로 본다.
    const v = judgeGeometry(anchors, { left: 0, top: 0, size: H })
    const base = Math.max(box.width, box.height)
    return {
      file,
      width: W,
      height: H,
      score: +d.detection.score.toFixed(3),
      eyeLine: +(v.eyeLine * 100).toFixed(1),
      chinLine: +(v.chinLine * 100).toFixed(1),
      centerX: +((anchors.eyeX / W) * 100).toFixed(1),
      pass: v.pass,
      faults: v.faults,
      boxRatioObserved: +(AVATAR_SPEC.eyeChinSpan / ((anchors.chinY - anchors.eyeY) / base)).toFixed(4),
      boxAnchorObserved: +(
        (box.y + box.height / 2 - (anchors.eyeY - ((anchors.chinY - anchors.eyeY) / AVATAR_SPEC.eyeChinSpan) * AVATAR_SPEC.eyeLine)) /
        ((anchors.chinY - anchors.eyeY) / AVATAR_SPEC.eyeChinSpan)
      ).toFixed(4),
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

function quantiles(values: number[]) {
  if (!values.length) return null
  const v = [...values].sort((a, b) => a - b)
  const q = (p: number) => v[Math.min(v.length - 1, Math.floor(v.length * p))]
  return { n: v.length, p10: +q(0.1).toFixed(1), med: +q(0.5).toFixed(1), p90: +q(0.9).toFixed(1) }
}

async function main() {
  const { fromDb, dir, jsonPath, offset, limit } = parseArgs()
  const rows: Row[] = []

  if (fromDb) {
    const people = await fetchFromDb(offset, limit)
    if (!people.length) {
      console.error(`대상이 없다 (offset ${offset})`)
      process.exit(1)
    }
    console.log(`DB에서 ${people.length}명 (offset ${offset})`)
    await loadModels()
    for (const p of people) {
      try {
        const res = await fetch(p.avatar_url)
        if (!res.ok) {
          rows.push({ file: p.slug, error: `내려받기 실패 ${res.status}` })
          continue
        }
        const row = await measureOne(Buffer.from(await res.arrayBuffer()), p.slug)
        row.nickname = p.nickname
        row.tier = p.celeb_tier
        rows.push(row)
      } catch (e) {
        rows.push({ file: p.slug, error: e instanceof Error ? e.message : String(e) })
      }
    }
  } else {
    if (!statSync(dir!).isDirectory()) {
      console.error(`폴더가 아니다: ${dir}`)
      process.exit(1)
    }
    await loadModels()
    const files = readdirSync(dir!).filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).sort()
    if (!files.length) {
      console.error(`이미지가 없다: ${dir}`)
      process.exit(1)
    }
    for (const f of files) {
      try {
        rows.push(await measureOne(readFileSync(join(dir!, f)), f))
      } catch (e) {
        rows.push({ file: f, error: e instanceof Error ? e.message : String(e) })
      }
    }
  }

  const ok = rows.filter((r) => !r.error)
  const passed = ok.filter((r) => r.pass)

  console.log('')
  console.log('파일'.padEnd(28) + '눈높이'.padStart(8) + '턱끝'.padStart(9) + '중심축'.padStart(9) + '  판정')
  const t = AVATAR_SPEC.tolerance
  console.log(
    '(목표)'.padEnd(28) +
      String(AVATAR_SPEC.eyeLine * 100).padStart(8) +
      String(AVATAR_SPEC.chinLine * 100).padStart(9) +
      String(AVATAR_SPEC.centerX * 100).padStart(9)
  )
  console.log('-'.repeat(64))
  for (const r of rows) {
    if (r.error) {
      console.log(r.file.padEnd(28) + '  ' + r.error)
      continue
    }
    console.log(
      r.file.slice(0, 27).padEnd(28) +
        String(r.eyeLine).padStart(8) +
        String(r.chinLine).padStart(9) +
        String(r.centerX).padStart(9) +
        '  ' +
        (r.pass ? '합격' : '이탈: ' + (r.faults ?? []).join(' / '))
    )
  }

  const summary = {
    total: rows.length,
    measured: ok.length,
    failed: rows.length - ok.length,
    passed: passed.length,
    passRate: ok.length ? +((passed.length / ok.length) * 100).toFixed(1) : 0,
    eyeLine: quantiles(ok.map((r) => r.eyeLine!)),
    chinLine: quantiles(ok.map((r) => r.chinLine!)),
    centerX: quantiles(ok.map((r) => r.centerX!)),
    /** 폴백 상수 재보정용 관측치. AVATAR_SPEC.fallback 과 비교한다 */
    fallbackRecalibration: {
      boxRatio: quantiles(ok.map((r) => r.boxRatioObserved!)),
      boxAnchorY: quantiles(ok.map((r) => r.boxAnchorObserved!)),
      current: AVATAR_SPEC.fallback,
    },
    tolerance: t,
  }

  console.log('')
  console.log(`측정 ${ok.length} / ${rows.length}  ·  규격 합격 ${passed.length} (${summary.passRate}%)`)
  console.log(
    `눈높이 p10 ${summary.eyeLine?.p10} 중앙 ${summary.eyeLine?.med} p90 ${summary.eyeLine?.p90}` +
      `  ·  턱끝 p10 ${summary.chinLine?.p10} 중앙 ${summary.chinLine?.med} p90 ${summary.chinLine?.p90}`
  )
  writeFileSync(jsonPath, JSON.stringify({ summary, rows }, null, 2))
  console.log(`상세 저장: ${jsonPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
