/**
 * 셀럽 아바타 재생성 (생성 단계만) — codex image_gen
 *
 * 각 건: REF 확보(기존 아바타 URL 또는 로컬 파일) → codex 발주 → 산출물 회수
 *        → 진위검사(REF 에코·해상도) → .tmp/avatar-regen/<slug>.png 저장
 *
 * 누끼·업로드는 여기서 하지 않는다. 생성물은 반드시 육안 검수를 거친 뒤
 * nobg-cutout → upload-celeb-image-from-wikimedia.ts 로 이어간다.
 *
 * 진위검사가 핵심이다. codex는 생성에 실패해도 세션 로그에 남은 "입력 REF"를 그대로
 * 돌려준다(26.07.28: 1,141건 중 292건만 진짜). 크기만 보면 실패가 성공으로 잡힌다.
 *
 * 입력 JSON: [{slug, celeb_id, nickname, gender, ref?, note?}]
 *   gender  = true 남 / false 여
 *   ref     = 생략하면 DB의 avatar_url. 로컬 파일 경로도 가능
 *   note    = 인물별 연출 변주 한 줄(조명·표정 온도 등). 골격 고정을 피하는 용도
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/regenerate-celeb-avatars.mjs <배치.json> [--limit N] [--concurrency 3] [--force]
 */
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir, tmpdir } from 'os'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..', '..', '..')
const OUT_DIR = join(REPO, '.tmp', 'avatar-regen')
const WORK = join(tmpdir(), 'celeb-avatar-regen')
const SIZE = 1024   // 800 규격의 1.28배. 더 키워도 얻는 게 없다(codex-gpt 스킬 실측)

function loadEnv(p) {
  const t = readFileSync(p, 'utf-8')
  for (const raw of t.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
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

// 아바타 구도 규격 (docs/project/db-celeb.md + todo_celeb_avatar_overhaul.md §4).
// REF 자체가 옆모습·과확대·과축소·잘림인 경우가 많으므로 구도 복제를 명시적으로 끊는다.
const FRAMING = `FRAMING — TIGHT HEAD-AND-SHOULDERS PORTRAIT
Do NOT copy the reference image's crop, framing, camera angle, gaze direction or background. Those are replaced by the directions here. Take only the person's identity from the reference.
Head-on frontal view, or at most a very slight three-quarter turn. The person looks directly into the camera.
The entire head is inside the frame with clear margin above the hair. Both ears and both upper shoulders are visible. The frame ends at the shoulder line.
Collarbone, chest and long torso are not visible. The garment has a high closed neckline covering the base of the neck.
The head spans roughly 55 to 65 percent of the image height and sits centered horizontally. Not a distant small figure, not an extreme face close-up, nothing cropped off at the top or chin.
Exactly one person. No hands, no microphone, no headset, no book, no ball, no weapon, no props of any kind. No legible text, lettering or signage anywhere in the frame.`

const PHOTO = `RENDERING — THIS IS A PHOTOGRAPH, NOT A PAINTING, NOT A DRAWING, NOT A SCULPTURE
Ultra-photorealistic photograph shot on a modern 21st century full-frame camera. Even if the reference is a painting, an ink drawing, a statue, a coin or an old low-resolution photo, the result is a real photograph of a living person.
No painterly brushwork, no ink lines, no illustration, no digital painting, no CGI render, no wax-figure look.
Full color photograph. Rich, natural, lifelike color — never black and white, never sepia, never monochrome or desaturated.`

const STYLE_M = `Real human skin texture with visible pores, micro wrinkles, and fine details
No skin smoothing, no blur, no beauty filter

Strong directional natural light from a window (side lighting)
Clear shadow contrast on face (Rembrandt lighting)
High dynamic range, realistic shadows and highlights

85mm lens, full-frame DSLR look
Shallow depth of field, sharp focus on eyes
Natural color grading, RAW photo quality

Extremely high detail, high-frequency texture preserved
Crisp edges, no softness

Clean background, slightly blurred, neutral tones
Professional studio-quality photograph`

const STYLE_F = `Natural and refined human skin texture
Visible skin detail with subtle pores and soft micro-texture
Healthy and clean complexion
No plastic skin, no excessive smoothing, no beauty filter, no blur

Soft directional natural window light
Gentle Rembrandt lighting with smooth shadow transitions
High dynamic range with realistic highlight roll-off

85mm lens, full-frame DSLR look
Shallow depth of field, tack sharp focus on eyes
Natural facial proportions and subtle asymmetry

Balanced color grading
Clean skin tones with realistic translucency
RAW photo quality

Fine eyelashes, natural eyebrows, soft baby hairs
Smooth texture transitions without over-sharpening
Crisp eyes and hair detail
No harsh skin contrast, no exaggerated pores

Clean minimal background
Slightly blurred neutral tones
Professional editorial portrait photography`

function buildPrompt(row, outPath) {
  const style = row.gender === false ? STYLE_F : STYLE_M
  const variation = row.note?.trim() ? `\nDIRECTION FOR THIS PERSON\n${row.note.trim()}\n` : ''
  return `TASK-ID: AVATARHD-${row.slug}

Regenerate the person in the attached reference image as a high-resolution service profile portrait.

${FRAMING}

${PHOTO}

${style}
${variation}
Output size: exactly ${SIZE} x ${SIZE} pixels, square 1:1.

Generate the image with the image_gen tool, then save the resulting PNG to this exact path using python:
${outPath.replace(/\\/g, '/')}
Report only the saved path as your final message.
`
}

/** 축소 지문 — REF 에코를 잡는다 */
async function fingerprint(buf) {
  const raw = await sharp(buf).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  return crypto.createHash('md5').update(raw).digest('hex')
}

/** codex가 파일을 안 떨군 경우 세션 로그에서 회수 (TASK-ID 로 세션 특정) */
function recoverFromSessions(taskId, sinceMs) {
  const root = join(homedir(), '.codex', 'sessions')
  if (!existsSync(root)) return null
  const stack = [root]
  const files = []
  while (stack.length) {
    const dir = stack.pop()
    let entries = []
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) stack.push(p)
      else if (e.name.startsWith('rollout-') && e.name.endsWith('.jsonl')) {
        try { if (statSync(p).mtimeMs >= sinceMs) files.push(p) } catch { /* 무시 */ }
      }
    }
  }
  for (const f of files) {
    let text
    try { text = readFileSync(f, 'utf-8') } catch { continue }
    if (!text.includes(taskId)) continue
    const hits = text.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)
    if (!hits?.length) continue
    const longest = hits.sort((a, b) => b.length - a.length)[0]
    return Buffer.from(longest.split('base64,')[1], 'base64')
  }
  return null
}

function runCodex(promptPath, refPath, outMsgPath, timeoutMs = 900000) {
  const bin = resolveCodex()
  const cmd = /\s/.test(bin) ? `"${bin}"` : bin
  return new Promise((res, rej) => {
    const args = ['exec', '-', '-m', 'gpt-5.6-sol', '--skip-git-repo-check',
      '-s', 'workspace-write', '--dangerously-bypass-approvals-and-sandbox',
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

async function loadRef(row, sb) {
  if (row.ref && !/^https?:\/\//.test(row.ref)) {
    if (!existsSync(row.ref)) throw new Error(`REF 파일 없음: ${row.ref}`)
    return readFileSync(row.ref)
  }
  let url = row.ref
  if (!url) {
    const { data } = await sb.from('profiles').select('avatar_url').eq('id', row.celeb_id).maybeSingle()
    url = data?.avatar_url
  }
  if (!url) throw new Error('REF 없음(로컬 경로도 avatar_url도 비어 있음)')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`REF 내려받기 실패 ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function processOne(ctx, row) {
  const finalPath = join(OUT_DIR, `${row.slug}.png`)
  if (!ctx.force && existsSync(finalPath)) return { skipped: true, slug: row.slug, nickname: row.nickname }

  const dir = join(WORK, row.slug.replace(/[^a-z0-9-]/gi, '_'))
  mkdirSync(dir, { recursive: true })
  const refPath = join(dir, 'ref.png')
  const outPath = join(dir, 'out.png')
  const promptPath = join(dir, 'prompt.txt')
  const msgPath = join(dir, 'msg.txt')

  try {
    // 1. REF 확보. 투명 배경이면 검정을 깔아 codex가 읽기 좋게 한다
    const refBuf = await loadRef(row, ctx.sb)
    await sharp(refBuf).flatten({ background: '#000' }).png().toFile(refPath)
    const refPrint = await fingerprint(refBuf)

    // 2. 발주
    writeFileSync(promptPath, buildPrompt(row, outPath), 'utf-8')
    writeFileSync(msgPath, '')
    const startedAt = Date.now() - 5000
    // 프로세스가 시간 초과로 죽어도 그림은 이미 나와 있을 수 있다 — 회수를 먼저 시도한다
    let runErr = null
    try { await runCodex(promptPath, refPath, msgPath) } catch (e) { runErr = e }

    // 3. 회수
    let outBuf = existsSync(outPath) ? readFileSync(outPath) : null
    if (!outBuf) outBuf = recoverFromSessions(`AVATARHD-${row.slug}`, startedAt)
    if (!outBuf) throw runErr || new Error('산출물 없음(파일·세션로그 모두)')

    // 4. 진위검사 — REF 에코와 저해상 산출을 거른다
    const meta = await sharp(outBuf).metadata()
    if (!meta.width || meta.width < SIZE * 0.9) throw new Error(`해상도 미달 ${meta.width}x${meta.height}`)
    if (await fingerprint(outBuf) === refPrint) throw new Error('REF 원본이 그대로 돌아옴')

    // 5. 저장. 여기까지가 이 러너의 책임이다 — 누끼·업로드는 육안 검수 뒤에 따로 한다
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(finalPath, outBuf)
    return { ok: true, slug: row.slug, nickname: row.nickname, size: `${meta.width}x${meta.height}`, kb: Math.round(outBuf.length / 1024) }
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* 무시 */ }
  }
}

async function main() {
  const batchPath = process.argv[2]
  if (!batchPath) throw new Error('배치 JSON 경로를 인자로 넘겨라')
  const limitArg = process.argv.indexOf('--limit')
  const concArg = process.argv.indexOf('--concurrency')
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity
  const concurrency = concArg > 0 ? Number(process.argv[concArg + 1]) : 3
  const force = process.argv.includes('--force')

  loadEnv(resolve(__dirname, '..', '.env'))
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('.env에 Supabase 키 누락')

  const ctx = { sb: createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), force }

  const all = JSON.parse(readFileSync(batchPath, 'utf-8'))
  const rows = all.slice(0, limit === Infinity ? all.length : limit)
  mkdirSync(WORK, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })

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
        if (r.skipped) { stats.skip++; console.log(`  [건너뜀] ${r.nickname} (${r.slug}) — 산출물 있음`); continue }
        stats.ok++
        console.log(`  [${stats.ok + stats.fail}/${rows.length}] ${r.nickname} (${r.slug}) ${r.size} ${r.kb}KB`)
      } catch (e) {
        const msg = e.message || String(e)
        if (looksRateLimited(msg)) {
          stats.rate++
          halted = true
          console.error(`  한도 도달 추정 — ${row.slug} 에서 중단: ${msg.slice(0, 200)}`)
          return
        }
        stats.fail++
        failures.push({ slug: row.slug, nickname: row.nickname, reason: msg.slice(0, 200) })
        console.error(`  [실패] ${row.nickname} (${row.slug}): ${msg.slice(0, 200)}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker))

  console.log(`\n=== 생성 ${stats.ok} · 실패 ${stats.fail} · 건너뜀 ${stats.skip}${stats.rate ? ' · 한도중단' : ''} (대상 ${rows.length}) ===`)
  console.log(`산출물: ${OUT_DIR}`)
  if (failures.length) {
    const fp = join(dirname(batchPath), 'avatar-regen-failures.json')
    writeFileSync(fp, JSON.stringify(failures, null, 2), 'utf-8')
    console.log(`실패 목록: ${fp}`)
  }
  try { rmSync(WORK, { recursive: true, force: true }) } catch { /* 무시 */ }
}

main().catch(e => { console.error(e); process.exit(1) })
