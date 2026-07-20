/**
 * 셀럽 아바타 품질 감사 — 등록된 avatar_url을 전수 내려받아 기계적 결함을 골라낸다.
 *
 * 읽기 전용. DB·R2를 일절 수정하지 않는다. 산출물은 JSON 리포트 하나뿐이다.
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   npx tsx scripts/audit-celeb-avatars.ts --out <경로.json> [--limit 50] [--concurrency 6]
 *
 * 판정 플래그:
 *   no_face        얼굴 미검출 — 유물·풍경·문양·심한 회화체 의심
 *   multi_face     얼굴 2개 이상 — 단체 사진에서 엉뚱한 인물을 골랐을 의심
 *   tiny_face      얼굴이 이미지 면적의 4% 미만 — 원거리 전신컷
 *   low_score      최대 얼굴 신뢰도 0.7 미만 — 얼굴 유사 패턴 오검출 의심
 *   small_file     파일 5KB 미만
 *   low_res        한 변 200px 미만
 *   grayscale      채도 거의 0 — 흑백. 현대 인물이면 확인 대상
 *   fetch_error    다운로드/디코드 실패 — 죽은 링크
 *
 * 플래그는 "의심"이지 확정이 아니다. 최종 판정은 사람이 본다.
 */

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const faceapi = _require(
  '@vladmandic/face-api/dist/face-api.node-wasm.js'
) as typeof import('@vladmandic/face-api')

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── 인자 ────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const get = (k: string): string | undefined => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : undefined
}
const OUT = get('--out') ?? resolve(__dirname, 'avatar-audit.json')
const LIMIT = Number(get('--limit') ?? 0)
const CONCURRENCY = Number(get('--concurrency') ?? 6)

// ─── env ─────────────────────────────────────────────────────
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const f of ['.env.local', '.env']) {
    const p = resolve(__dirname, '..', f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return { ...env, ...process.env } as Record<string, string>
}

// ─── face-api 준비 ───────────────────────────────────────────
async function ensureFace() {
  const wasmDir =
    resolve(__dirname, '..', 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + '/'
  setWasmPaths(wasmDir)
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = resolve(__dirname, '..', 'node_modules', '@vladmandic', 'face-api', 'model')
  if (!existsSync(modelDir)) throw new Error(`face-api 모델 없음: ${modelDir}`)
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
}

interface FaceBox {
  width: number
  height: number
  score: number
}

async function detectFaces(buf: Buffer): Promise<FaceBox[]> {
  const meta = await sharp(buf).rotate().metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const long = Math.max(w, h)
  const scale = long > 1024 ? 1024 / long : 1
  const { data, info } = await sharp(buf)
    .rotate()
    .resize(Math.round(w * scale), Math.round(h * scale), { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
  try {
    const dets = await faceapi.detectAllFaces(
      tensor,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 })
    )
    return dets.map((d) => ({
      width: d.box.width / scale,
      height: d.box.height / scale,
      score: d.score,
    }))
  } finally {
    ;(tensor as unknown as tf.Tensor).dispose()
  }
}

/** 채도 평균으로 흑백 여부 판정 */
async function isGrayscale(buf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buf)
    .resize(64, 64, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let satSum = 0
  const px = info.width * info.height
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    satSum += mx === 0 ? 0 : (mx - mn) / mx
  }
  return satSum / px < 0.08
}

interface Row {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string
  celeb_tier: string | null
  death_date: string | null
  birth_date: string | null
}

interface Result {
  slug: string | null
  nickname: string | null
  id: string
  flags: string[]
  faces: number
  topScore: number | null
  faceAreaPct: number | null
  bytes: number | null
  dims: string | null
  tier: string | null
  born: string | null
  died: string | null
}

async function main() {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase 환경변수 없음')
  const sb = createClient(url, key)

  // PostgREST 1,000행 상한 회피 — id 정렬 + offset 페이징. 에러는 던진다.
  const rows: Row[] = []
  const PAGE = 500
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('profiles')
      .select('id, slug, nickname, avatar_url, celeb_tier, birth_date, death_date')
      .eq('profile_type', 'CELEB')
      .not('avatar_url', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`profiles 조회 실패: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...(data as Row[]))
    if (data.length < PAGE) break
  }
  const targets = rows.filter((r) => r.avatar_url && r.avatar_url.trim() !== '')
  const list = LIMIT > 0 ? targets.slice(0, LIMIT) : targets
  console.log(`대상 ${list.length}명 (전체 CELEB 아바타 보유 ${targets.length})`)

  await ensureFace()
  console.log('face-api 준비 완료')

  const results: Result[] = []
  let done = 0

  async function work(r: Row): Promise<void> {
    const base: Result = {
      slug: r.slug,
      nickname: r.nickname,
      id: r.id,
      flags: [],
      faces: 0,
      topScore: null,
      faceAreaPct: null,
      bytes: null,
      dims: null,
      tier: r.celeb_tier,
      born: r.birth_date,
      died: r.death_date,
    }
    try {
      const res = await fetch(r.avatar_url)
      if (!res.ok) {
        base.flags.push('fetch_error')
        results.push(base)
        return
      }
      const buf = Buffer.from(await res.arrayBuffer())
      base.bytes = buf.length
      const meta = await sharp(buf).metadata()
      const w = meta.width ?? 0
      const h = meta.height ?? 0
      base.dims = `${w}x${h}`
      if (buf.length < 5 * 1024) base.flags.push('small_file')
      if (Math.min(w, h) < 200) base.flags.push('low_res')
      if (await isGrayscale(buf)) base.flags.push('grayscale')

      const faces = await detectFaces(buf)
      base.faces = faces.length
      if (faces.length === 0) {
        base.flags.push('no_face')
      } else {
        const top = faces.reduce((a, b) => (a.score > b.score ? a : b))
        base.topScore = Number(top.score.toFixed(3))
        const pct = ((top.width * top.height) / (w * h)) * 100
        base.faceAreaPct = Number(pct.toFixed(1))
        if (faces.length >= 2) base.flags.push('multi_face')
        if (pct < 4) base.flags.push('tiny_face')
        if (top.score < 0.7) base.flags.push('low_score')
      }
    } catch (e) {
      base.flags.push('fetch_error')
      base.nickname = base.nickname ?? null
      console.error(`  ! ${r.slug}: ${(e as Error).message}`)
    }
    results.push(base)
    done++
    if (done % 50 === 0) console.log(`  ${done}/${list.length}`)
  }

  // 동시 실행 제한
  const queue = [...list]
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const r = queue.shift()
      if (!r) return
      await work(r)
    }
  })
  await Promise.all(workers)

  const flagged = results.filter((r) => r.flags.length > 0)
  const summary: Record<string, number> = {}
  for (const r of flagged) for (const f of r.flags) summary[f] = (summary[f] ?? 0) + 1

  writeFileSync(
    OUT,
    JSON.stringify(
      { checkedAt: new Date().toISOString(), total: results.length, summary, flagged },
      null,
      2
    ),
    'utf8'
  )
  console.log('\n=== 요약 ===')
  console.log(`검사 ${results.length}명 · 플래그 ${flagged.length}명`)
  for (const [k, v] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`)
  }
  console.log(`\n리포트: ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
