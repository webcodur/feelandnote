/**
 * 인물 대표 사진 생성 → 검증 → (선택) 등록 (한 건씩 완결)
 *
 * 각 건: 얼굴 REF 확보 → codex image_gen 발주 → 산출물 회수 → 진위검사
 *        → 공용 비율 변환 → R2 celebs/{id}/photo.webp → celebs.portrait_url
 *
 * REF는 두 갈래다.
 *   facePath — 로컬 얼굴 파일(`D:/image/_재료/지정/<인물>.png`). 아바타가 없는 인물의 경로다.
 *   avatar_url — 이미 아바타가 있는 인물의 원격 경로.
 *
 * 진위검사가 핵심이다. codex는 생성에 실패해도 입력 REF를 그대로 돌려주는 일이 있어
 * (26.07.28: 1,141건 중 292건만 진짜) 크기만 보면 실패가 성공으로 잡힌다.
 *
 * 발주서 본문은 hero-prompt.mjs가 쥔다. 여기서는 실행과 회수와 등록만 한다.
 *
 * 입력 JSON: [{slug, celeb_id, nickname, brief, facePath?, avatar_url?}]
 * 사용법 (sw/web-bo 에서):
 *   node scripts/photo/hero-generate.mjs <배치.json> [--limit N] [--concurrency 3] [--local]
 *   --local 이면 R2·DB에 올리지 않고 .tmp/hero-out/ 에만 떨군다. 눈으로 볼 때 쓴다.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo'
import { buildHeroPrompt } from './hero-prompt.mjs'
import sharp from 'sharp'
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir, tmpdir } from 'os'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORK = join(tmpdir(), 'celeb-hero-photo')
const LOCAL_OUT = resolve(__dirname, '..', '..', '.tmp', 'hero-out')
const STORE_WIDTH = CELEB_HERO_PHOTO_SPEC.storageWidthPx
const STORE_HEIGHT = CELEB_HERO_PHOTO_SPEC.storageHeightPx

function loadEnv(p) {
  const t = readFileSync(p, 'utf-8')
  for (const raw of t.split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

let CODEX = null
function resolveCodex() {
  if (CODEX) return CODEX
  try {
    const found = execSync('where codex', { encoding: 'utf-8' }).split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    CODEX = found.find(p => p.toLowerCase().endsWith('.cmd')) || found[0] || 'codex'
  } catch { CODEX = 'codex' }
  return CODEX
}

/** 축소 지문 — REF 에코를 잡는다 */
async function fingerprint(buf) {
  const raw = await sharp(buf).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  return crypto.createHash('md5').update(raw).digest('hex')
}

async function toPortraitWebp(src) {
  const o = await sharp(src).rotate().toBuffer({ resolveWithObject: true })
  const target = STORE_WIDTH / STORE_HEIGHT
  const ratio = o.info.width / o.info.height
  const w = ratio > target ? Math.round(o.info.height * target) : o.info.width
  const h = ratio > target ? o.info.height : Math.round(o.info.width / target)
  return sharp(o.data)
    .extract({ left: Math.max(0, Math.floor((o.info.width - w) / 2)), top: Math.max(0, Math.floor((o.info.height - h) / 2)), width: w, height: h })
    .resize(STORE_WIDTH, STORE_HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true })
}

/**
 * 회수 — codex-gpt 스킬이 정한 정본 경로가 먼저다.
 * 세션 로그의 base64는 입력 REF가 딸려 나오는 사고가 있어 폴백으로만 쓴다.
 */
function recover(taskId, sinceMs) {
  const now = new Date()
  const day = join(homedir(), '.codex', 'sessions',
    String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0'))
  const dirs = [day, join(homedir(), '.codex', 'sessions')]
  for (const root of dirs) {
    if (!existsSync(root)) continue
    const stack = [root]
    const files = []
    while (stack.length) {
      const d = stack.pop()
      let entries = []
      try { entries = readdirSync(d, { withFileTypes: true }) } catch { continue }
      for (const e of entries) {
        const p = join(d, e.name)
        if (e.isDirectory()) { if (root !== day) stack.push(p) }
        else if (e.name.startsWith('rollout-') && e.name.endsWith('.jsonl')) {
          try { if (statSync(p).mtimeMs >= sinceMs) files.push(p) } catch { /* 무시 */ }
        }
      }
    }
    for (const f of files) {
      let text
      try { text = readFileSync(f, 'utf-8') } catch { continue }
      if (!text.includes(taskId)) continue
      const sid = f.match(/rollout-.*?-([0-9a-f-]{36})\.jsonl$/i)?.[1]
      if (sid) {
        const gen = join(homedir(), '.codex', 'generated_images', sid)
        if (existsSync(gen)) {
          const pngs = readdirSync(gen).filter(n => n.endsWith('.png'))
            .map(n => ({ p: join(gen, n), m: statSync(join(gen, n)).mtimeMs }))
            .sort((a, b) => b.m - a.m)
          if (pngs.length) return readFileSync(pngs[0].p)
        }
      }
      const hits = text.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)
      if (hits?.length) return Buffer.from(hits.sort((a, b) => b.length - a.length)[0].split('base64,')[1], 'base64')
    }
    if (root === day && files.length) break
  }
  return null
}

function runCodex(promptPath, refPath, outMsgPath, timeoutMs = 1500000) {
  const bin = resolveCodex()
  const cmd = /\s/.test(bin) ? `"${bin}"` : bin
  return new Promise((res, rej) => {
    const args = ['exec', '-', '-m', 'gpt-6-astra', '-c', 'model_reasoning_effort="xhigh"', '--skip-git-repo-check', '-s', 'read-only',
      '-i', refPath, '--output-last-message', outMsgPath, '--color', 'never']
    const ch = spawn(cmd, args, { shell: true, timeout: timeoutMs })
    let err = ''
    ch.stderr.on('data', d => { err += d.toString() })
    ch.stdout.on('data', () => {})
    ch.on('error', rej)
    ch.on('close', code => code === 0 ? res() : rej(new Error(`codex exit ${code}: ${err.slice(-300)}`)))
    ch.stdin.write(readFileSync(promptPath, 'utf-8'))
    ch.stdin.end()
  })
}

const looksRateLimited = (m = '') => /rate.?limit|quota|429|usage limit/i.test(m)

async function processOne(ctx, row) {
  const { s3, db, bucket, publicUrl, local } = ctx
  const dir = join(WORK, row.slug.replace(/[^a-z0-9-]/gi, '_'))
  mkdirSync(dir, { recursive: true })
  const refPath = join(dir, 'ref.png')
  const promptPath = join(dir, 'prompt.txt')
  const msgPath = join(dir, 'msg.txt')

  try {
    if (!local) {
      const { data: cur } = await db.from('celebs').select('portrait_url').eq('id', row.celeb_id).maybeSingle()
      if (cur?.portrait_url) return { skipped: true, slug: row.slug, nickname: row.nickname }
    } else if (existsSync(join(LOCAL_OUT, `${row.slug}.png`))) {
      return { skipped: true, slug: row.slug, nickname: row.nickname }
    }

    // 1. 얼굴 REF — 로컬 파일이 먼저다. 투명 배경이면 검정을 깔아 codex가 읽기 좋게
    let refBuf
    if (row.facePath && existsSync(row.facePath)) refBuf = readFileSync(row.facePath)
    else if (row.avatar_url) {
      const r = await fetch(row.avatar_url)
      if (!r.ok) throw new Error(`REF 내려받기 실패 ${r.status}`)
      refBuf = Buffer.from(await r.arrayBuffer())
    } else throw new Error('얼굴 REF 없음')
    await sharp(refBuf).flatten({ background: '#000' }).png().toFile(refPath)
    const refPrint = await fingerprint(refBuf)

    // 2. 발주 — 세로 4:5로 직접 뽑는다(정사각 캔버스는 프레이밍을 망친다)
    writeFileSync(promptPath, buildHeroPrompt(row, null, { identity: 'photo', vertical: true }), 'utf-8')
    writeFileSync(msgPath, '')
    const startedAt = Date.now() - 5000
    let runErr = null
    try { await runCodex(promptPath, refPath, msgPath) } catch (e) { runErr = e }

    // 3. 회수
    const outBuf = recover(`HEROPHOTO-${row.slug}`, startedAt)
    if (!outBuf) throw runErr || new Error('산출물 없음')

    // 4. 진위검사 — REF 에코와 저해상 산출을 거른다
    const meta = await sharp(outBuf).metadata()
    // 이 두 줄은 해상도 검사가 아니라 REF 에코 방어다 — 씨앗이 전부 800x800 정사각이라,
    // codex가 생성을 거부하고 입력을 그대로 돌려주면 여기서 걸린다. 끄지 말 것(26.09.13 실측).
    if (!meta.width || meta.width < 900) throw new Error(`해상도 미달 ${meta.width}x${meta.height}`)
    if (meta.height <= meta.width) throw new Error(`세로가 아니다 ${meta.width}x${meta.height}`)
    if (await fingerprint(outBuf) === refPrint) throw new Error('REF 원본이 그대로 돌아옴')

    if (local) {
      mkdirSync(LOCAL_OUT, { recursive: true })
      writeFileSync(join(LOCAL_OUT, `${row.slug}.png`), outBuf)
      return { ok: true, slug: row.slug, nickname: row.nickname, kb: Math.round(outBuf.length / 1024), size: `${meta.width}x${meta.height}` }
    }

    // 5. 등록
    const portrait = await toPortraitWebp(outBuf)
    const key = `celebs/${row.celeb_id}/photo.webp`
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: portrait.data,
      ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
    }))
    const url = `${publicUrl}/${key}?v=${Date.now()}`
    const { error } = await db.from('celebs').update({ portrait_url: url }).eq('id', row.celeb_id)
    if (error) throw new Error(`DB 갱신 실패 ${error.message}`)
    return { ok: true, slug: row.slug, nickname: row.nickname, kb: Math.round(portrait.data.length / 1024), size: `${portrait.info.width}x${portrait.info.height}` }
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* 무시 */ }
  }
}

async function main() {
  const batchPath = process.argv[2]
  if (!batchPath) throw new Error('배치 JSON 경로를 인자로 넘겨라')
  const local = process.argv.includes('--local')
  const limArg = process.argv.indexOf('--limit')
  const conArg = process.argv.indexOf('--concurrency')
  const limit = limArg > 0 ? Number(process.argv[limArg + 1]) : Infinity
  const concurrency = conArg > 0 ? Number(process.argv[conArg + 1]) : 3

  const ctx = { local }
  if (!local) {
    loadEnv(resolve(__dirname, '..', '..', '.env'))
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL, NEXT_PUBLIC_DB_API_URL, DB_SECRET_KEY } = process.env
    for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL, NEXT_PUBLIC_DB_API_URL, DB_SECRET_KEY })) {
      if (!v) throw new Error(`.env에 ${k} 누락`)
    }
    ctx.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    })
    ctx.db = createClient(NEXT_PUBLIC_DB_API_URL, DB_SECRET_KEY)
    ctx.bucket = R2_BUCKET_NAME
    ctx.publicUrl = R2_PUBLIC_URL
  }

  const all = JSON.parse(readFileSync(batchPath, 'utf-8'))
  const rows = all.slice(0, limit === Infinity ? all.length : limit)

  // 연출문에 갈래 표기가 없으면 한 건도 뽑지 않는다 — 생성 뒤에 알면 한도만 태운다
  const badMode = rows.filter(r => !/^\s*SHOT MODE:\s*(POSED|ABSORBED)\b/im.test(r.brief || ''))
  if (badMode.length) throw new Error(`SHOT MODE 누락 ${badMode.length}건: ${badMode.slice(0, 5).map(r => r.slug).join(', ')}`)
  const noTarget = rows.filter(r => /^\s*SHOT MODE:\s*ABSORBED\b/im.test(r.brief) && !/gaze target:\s*\S/i.test(r.brief))
  if (noTarget.length) throw new Error(`ABSORBED 인데 시선 대상 미지정 ${noTarget.length}건: ${noTarget.slice(0, 5).map(r => r.slug).join(', ')}`)
  const noRef = rows.filter(r => !(r.facePath && existsSync(r.facePath)) && !r.avatar_url)
  if (noRef.length) throw new Error(`얼굴 REF 없음 ${noRef.length}건: ${noRef.slice(0, 5).map(r => r.slug).join(', ')}`)
  mkdirSync(WORK, { recursive: true })

  const stats = { ok: 0, fail: 0, rate: 0, skip: 0 }
  const failures = []
  let cursor = 0
  let halted = false

  async function worker() {
    while (!halted) {
      const i = cursor++
      if (i >= rows.length) return
      const row = rows[i]
      try {
        const r = await processOne(ctx, row)
        if (r.skipped) { stats.skip++; continue }
        stats.ok++
        console.log(`  [${stats.ok + stats.fail}/${rows.length}] ${r.nickname} (${r.slug}) ${r.size} ${r.kb}KB`)
      } catch (e) {
        const msg = e.message || String(e)
        if (looksRateLimited(msg)) {
          stats.rate++
          halted = true
          console.error(`  한도 도달 추정 — ${row.slug} 에서 중단: ${msg.slice(0, 160)}`)
          return
        }
        stats.fail++
        failures.push({ slug: row.slug, nickname: row.nickname, reason: msg.slice(0, 200) })
        console.error(`  [실패] ${row.nickname} (${row.slug}): ${msg.slice(0, 160)}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker))

  console.log(`\n=== 완료 ${stats.ok} · 실패 ${stats.fail} · 건너뜀 ${stats.skip}${stats.rate ? ' · 한도중단' : ''} (대상 ${rows.length})${local ? ' · 로컬만' : ''} ===`)
  if (failures.length) {
    const fp = join(dirname(batchPath), 'hero-failures.json')
    writeFileSync(fp, JSON.stringify(failures, null, 2), 'utf-8')
    console.log(`실패 목록: ${fp}`)
  }
  try { rmSync(WORK, { recursive: true, force: true }) } catch { /* 무시 */ }
}

main().catch(e => { console.error(e); process.exit(1) })
