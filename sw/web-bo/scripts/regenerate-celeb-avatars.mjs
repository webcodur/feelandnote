/**
 * 셀럽 아바타 재생성 (생성 단계만) — codex image_gen
 *
 * 각 건: REF 확보(기존 아바타 URL 또는 로컬 파일) → codex 발주 → 산출물 회수
 *        → 진위검사(REF 에코·해상도) → .tmp/avatar-regen/<slug>.png 저장
 *
 * 누끼·업로드는 여기서 하지 않는다. 생성물은 반드시 육안 검수를 거친 뒤
 * nobg-cutout → upload-celeb-avatar.ts 로 이어간다.
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

// 아바타 구도 규격 SSoT = docs/project/celeb/celeb-avatar-spec.md §4.1.
// 이 상수는 그 문서의 확정본 사본이다. 고칠 일이 생기면 문서를 먼저 고치고 여기로 옮긴다.
// REF 자체가 옆모습·과확대·과축소·잘림인 경우가 많으므로 구도 복제를 명시적으로 끊는다.
const FRAMING = `FRAMING — TIGHT HEAD-AND-SHOULDERS PORTRAIT, FIXED GEOMETRY
Do NOT copy the reference image's crop, framing, camera angle, gaze direction or background. Take only the person's identity from the reference. Everything below overrides the reference.

Square 1:1 frame. Read the frame as 100 units wide and 100 units tall, measured from the top-left corner.
- The eye line, an imaginary line through both pupils, sits 46 units below the top edge, slightly above the middle of the frame.
- The chin sits 81 units below the top edge. The distance from the eye line to the chin is therefore 35 units. This is what sets the size of the face, and it makes the face fill most of the frame. This is deliberate.
- The vertical centre line of the face, the bridge of the nose, sits at 50 units across, dead centre. The head is never pushed to one side.
- Hair, a hat, a helmet, a crown or any headdress MAY touch or run past the top edge. Do not pull the camera back to fit them in, and do not shrink the face to leave room above the head. Losing the top of the hair is fine.
- The face itself is never cut. The forehead, both eyebrows and both ears stay inside the frame.
- Below the chin, whatever is there is fine: a little bare neck, a high collar, a ruff, a robe, the neck guard of a helmet, pauldrons, or long hair falling over the shoulders. The shoulders do not need to be visible at all. Do NOT pull the camera back to fit the shoulders in.
- The collarbone and the chest are NOT visible, and the torso is never long. The garment closes high around the neck.

This image is displayed inside a circular mask that removes the four corners, and is sometimes cropped to a narrow vertical rectangle that removes the outer 12 percent of each side. Keep the face and both ears well inside those limits. The top corners are cut away, so anything above the head is expendable.

Head-on frontal view, or at most a fifteen degree three-quarter turn. The person looks directly into the camera. Not a profile, not a high angle, not a low angle.
Exactly one person. No hands, no microphone, no headset, no book, no ball, no weapon, no props of any kind. No legible text, lettering or signage anywhere.`

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

function buildPrompt(row) {
  const style = row.gender === false ? STYLE_F : STYLE_M
  const variation = row.note?.trim() ? `\nDIRECTION FOR THIS PERSON\n${row.note.trim()}\n` : ''
  // 저장을 시키지 않는다. codex의 셸 도구가 이 환경에서 즉시 죽어(DLL 초기화 실패),
  // 저장을 시도하면 다른 방법을 찾아 재시도하느라 시간을 태운다.
  // 그림은 ~/.codex/generated_images/<세션id>/ 에 남으므로 우리가 회수한다.
  return `TASK-ID: AVATARHD-${row.slug}

Regenerate the person in the attached reference image as a high-resolution service profile portrait.

${FRAMING}

${PHOTO}

${style}
${variation}
Output size: exactly ${SIZE} x ${SIZE} pixels, square 1:1.

Generate the image with the image_gen tool. Return the image. Do not run any shell command.
`
}

/** 축소 지문 — REF 에코를 잡는다 */
async function fingerprint(buf) {
  const raw = await sharp(buf).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  return crypto.createHash('md5').update(raw).digest('hex')
}

/** TASK-ID 가 든 세션 파일을 찾아 세션 id 를 돌려준다. 날짜 폴더로 좁혀야 몇 초에 끝난다 */
function findSessionId(taskId, sinceMs) {
  const root = join(homedir(), '.codex', 'sessions')
  if (!existsSync(root)) return null
  // sessions/YYYY/MM/DD/rollout-*.jsonl — 오늘과 어제만 본다
  const dayDirs = []
  for (const offset of [0, 1]) {
    const d = new Date(Date.now() - offset * 86400000)
    dayDirs.push(
      join(root, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'))
    )
  }
  for (const dir of dayDirs) {
    if (!existsSync(dir)) continue
    let entries = []
    try { entries = readdirSync(dir) } catch { continue }
    for (const name of entries) {
      if (!name.startsWith('rollout-') || !name.endsWith('.jsonl')) continue
      const p = join(dir, name)
      try { if (statSync(p).mtimeMs < sinceMs) continue } catch { continue }
      let text
      try { text = readFileSync(p, 'utf-8') } catch { continue }
      if (!text.includes(taskId)) continue
      // rollout-<타임스탬프>-<세션UUID>.jsonl
      const m = name.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i)
      return { sessionId: m?.[1] ?? null, logPath: p }
    }
  }
  return null
}

/**
 * 회수 — 세션 폴더의 png 를 먼저 집는다.
 * 세션 로그의 base64 는 `-i` 로 넣은 REF 도 같은 형식으로 남아 있어, 생성이 실패하면
 * 원본이 그대로 돌아온다(codex-gpt 스킬 실측: 1,129장 폐기). 그래서 폴더가 먼저다.
 */
function recoverImage(taskId, sinceMs) {
  const found = findSessionId(taskId, sinceMs)
  if (!found) return null

  if (found.sessionId) {
    const imgDir = join(homedir(), '.codex', 'generated_images', found.sessionId)
    if (existsSync(imgDir)) {
      let best = null
      for (const name of readdirSync(imgDir)) {
        if (!name.endsWith('.png')) continue
        const p = join(imgDir, name)
        try {
          const st = statSync(p)
          // codex 가 스스로 다시 그리는 경우가 있어 최신이 최종본이다
          if (!best || st.mtimeMs > best.mtime) best = { path: p, mtime: st.mtimeMs }
        } catch { /* 무시 */ }
      }
      if (best) return { buf: readFileSync(best.path), via: 'generated_images' }
    }
  }

  // 폴더가 비었을 때만 로그 base64 로 후퇴한다. 진위검사가 REF 에코를 걸러 준다.
  let text
  try { text = readFileSync(found.logPath, 'utf-8') } catch { return null }
  const hits = text.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)
  if (!hits?.length) return null
  const longest = hits.sort((a, b) => b.length - a.length)[0]
  return { buf: Buffer.from(longest.split('base64,')[1], 'base64'), via: 'session_log' }
}

function runCodex(promptPath, refPath, outMsgPath, timeoutMs = 900000) {
  const bin = resolveCodex()
  const cmd = /\s/.test(bin) ? `"${bin}"` : bin
  return new Promise((res, rej) => {
    // read-only 로 묶으면 codex 가 셸·파일쓰기를 시도하는 것 자체가 줄어든다(codex-gpt 스킬).
    // 그림은 세션 폴더에서 회수하므로 쓰기 권한이 필요 없다.
    const args = ['exec', '-', '-m', 'gpt-5.6-sol', '--skip-git-repo-check',
      '-s', 'read-only', '--dangerously-bypass-approvals-and-sandbox',
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
    const { data } = await sb.from('celebs').select('avatar_url').eq('id', row.celeb_id).maybeSingle()
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
    writeFileSync(promptPath, buildPrompt(row), 'utf-8')
    writeFileSync(msgPath, '')
    const startedAt = Date.now() - 5000
    // 프로세스가 시간 초과로 죽어도 그림은 이미 나와 있을 수 있다 — 회수를 먼저 시도한다
    let runErr = null
    try { await runCodex(promptPath, refPath, msgPath) } catch (e) { runErr = e }

    // 3. 회수 — 저장을 시키지 않으므로 세션 폴더에서 집는다
    const rec = recoverImage(`AVATARHD-${row.slug}`, startedAt)
    const outBuf = rec?.buf ?? (existsSync(outPath) ? readFileSync(outPath) : null)
    if (!outBuf) throw runErr || new Error('산출물 없음(세션 폴더·로그 모두)')
    if (rec) console.log(`     회수: ${rec.via}`)

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
  // WORK 폴더는 통째로 지우지 않는다. 여러 작업자가 동시에 돌 때
  // 남의 인물 작업 폴더까지 날려 생성이 실패한다(실측). 개별 폴더는
  // processOne 의 finally 에서 이미 지운다.
}

main().catch(e => { console.error(e); process.exit(1) })
