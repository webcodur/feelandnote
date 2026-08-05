/**
 * 인물 대표 사진 생성 → 검증 → 등록 → 로컬 정리 (한 건씩 완결)
 *
 * 각 건: 얼굴 REF 내려받기 → codex image_gen 발주 → 산출물 회수 → 진위검사
 *        → 공용 비율 중앙 크롭 webp 변환 → R2 celebs/{id}/photo.webp → profiles.portrait_url → 로컬 삭제
 *
 * 진위검사가 핵심이다. codex는 생성에 실패해도 세션 로그에 남은 "입력 REF"를 그대로
 * 돌려주는 일이 있어(26.07.28: 1,141건 중 292건만 진짜), 크기만 보면 실패가 성공으로 잡힌다.
 *
 * 입력 JSON: [{slug, celeb_id, nickname, avatar_url, brief}]
 *   brief = 인물별 연출 본문(SHOT MODE/WARDROBE/ACTION/SETTING/CAMERA). 공통부는 이 파일이 붙인다.
 *   SHOT MODE 는 POSED / ABSORBED 둘 중 하나를 반드시 첫 줄에 적는다. ABSORBED 면 시선이
 *   향할 대상을 이름으로 지목한다(`gaze target: the line he is writing`). 이 표기가 없으면
 *   본업 중인데 카메라를 보는 컷이 나온다(26.07.22 올림포스 25장 전량 폐기의 원인).
 *
 * 사용법 (sw/web-bo 에서): node scripts/generate-celeb-hero-photos.mjs <배치.json> [--limit N] [--concurrency 3]
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo'
import sharp from 'sharp'
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir, tmpdir } from 'os'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORK = join(tmpdir(), 'celeb-hero-photo')
const SIZE = 1024          // 생성 작업 원본 규격 (16의 배수, 픽셀 하한 655,360 충족)
const STORE_WIDTH = CELEB_HERO_PHOTO_SPEC.storageWidthPx
const STORE_HEIGHT = CELEB_HERO_PHOTO_SPEC.storageHeightPx
const FINAL_ASPECT_LABEL = CELEB_HERO_PHOTO_SPEC.aspectLabel
const SAFE_WIDTH_PERCENT = Math.round(CELEB_HERO_PHOTO_SPEC.aspectRatio * 100)

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

// 링컨 시험(26.07.31)에서 확정한 공통부. 이 문구를 빼면 회화체로 나온다.
const RENDERING = `RENDERING — THIS IS A PHOTOGRAPH, NOT A PAINTING
Ultra-photorealistic photograph. Real human skin texture with visible pores and micro wrinkles. No skin smoothing, no blur, no beauty filter. Individual hair strands resolved. Fabric weave visible in the cloth.
85mm lens, full-frame DSLR look. Tack sharp focus on the eyes. Natural color grading, RAW photo quality. High dynamic range, realistic shadow falloff and highlight roll-off.
Extremely high detail, high-frequency texture preserved. Crisp edges, no softness, no painterly brushwork, no illustration, no digital painting, no CGI render.
Full color. Rich, natural, lifelike color — never black and white, never sepia, never monochrome or desaturated.
No legible text, lettering or signage anywhere in the frame.`

const IDENTITY = `IDENTITY — READ FIRST
The face, age, build and features come ENTIRELY from the attached reference image. Do NOT invent, describe or alter any facial feature. Re-pose the person into the stance described below; take ONLY the face from the reference. Do NOT copy the reference photo's pose, crop, framing, background or lighting — those are all replaced by the directions below.`

// 화보형(정면 응시)과 본업 몰입형(일감 응시)은 섞이면 둘 다 죽는다.
// 책을 읽으면서 카메라를 보는 컷, 빈손으로 포즈만 잡았는데 작업 중이라는 컷이 그 실패다.
const GAZE = `GAZE — IT MUST MATCH THE SHOT MODE DECLARED ABOVE
This portrait is exactly one of two modes. They never mix.

POSED — a magazine cover portrait. The person has stopped whatever they do and now holds the camera's eye. Head and torso squared to the lens, gaze straight down the barrel. Hands are at rest. Nothing is being read, written, examined, played or operated in this mode.

ABSORBED — caught mid-work, unaware of the camera. The eyes are locked on the exact object named above as the gaze target, and the head and upper body turn toward that object. The person never looks at the lens and never acknowledges it.

A person reading, writing, operating a tool or studying an object while facing the lens is a failure. A person standing empty-handed and posed when the direction calls for work in progress is equally a failure.

In ABSORBED mode the gaze target is always a solid object inside the frame that the viewer can see — a page, a blade, an instrument, a face, a map. Never the sky, the horizon, the middle distance or empty air.`

// 물건이 허공에 뜨거나 팔다리가 가구를 뚫는 컷을 막는다.
const PHYSICALITY = `PHYSICALITY — GRAVITY AND ANATOMY HOLD
Every object in the frame is supported by something the viewer can see: gripped by a hand whose fingers actually close around it, resting on a surface, hanging from a fixture, or strapped to the body. Nothing hovers unsupported in the air.
The person's weight rests on something — feet planted on the floor, hips on the seat, a forearm on the table — and a contact shadow sits exactly where body meets surface.
Anatomy holds: five fingers on each hand with natural joints and believable grip, limbs bending only where real joints bend, both arms belonging to the same body at the same scale, neck and spine consistent with where the head turns. Clothing drapes over the body underneath and follows gravity.
Where the person meets furniture, the two touch at the surface — no arm, leg or hand passing through wood, stone or cloth.

A vehicle or machine in the frame must be a whole working object, not a few of its parts. If a chariot, cart, boat, carriage or engine appears at all, the parts that make it work are visible and joined: the floor the person stands on, the body that floor belongs to, the wheels or hull under that body, the pole or shaft that reaches the animals, and the harness that ties the animals to that pole. Draught animals stand AHEAD of the vehicle in line with its pole, never alongside the driver. A rail, wheel or yoke that connects to nothing, or a person standing on nothing, is a failure.

Weapons and tools obey the same law. A blade is held by its grip with the whole hand closed around it, and its weight pulls the wrist and shoulder the way that weight really would. A sheathed weapon hangs from a belt or baldric that visibly carries it. A spear, staff or standard either rests its butt on the ground or is carried at a balance point the arm could actually hold. Straps, buckles and scabbards connect to something. A weapon never floats beside the body, and the hand never grips air.`

// 이 지시가 없으면 인물이 원경으로 작게 박힌다(다리우스 1세 실측, 26.07.31).
// 표시 비율과 폭은 공용 상수가 쥔다. 얼굴과 핵심 소품은 최종 중앙 세로 영역에 들어와야 한다.
const FRAMING = `FRAMING — FIXED CROP, NON-NEGOTIABLE
This is a portrait of a person, not a landscape that happens to contain a person.

The final service image is a centered vertical ${FINAL_ASPECT_LABEL} crop of this working canvas. Keep the face, torso, both hands and every essential prop inside the CENTRAL ${SAFE_WIDTH_PERCENT} PERCENT of the canvas width. The outer left and right edges are expendable background and will be removed.

The crop is exactly this and nothing else:
- BOTTOM EDGE of the frame cuts the person just ABOVE THE KNEES.
- TOP EDGE of the frame sits just above the top of the head, with only a small margin of headroom.
- The person therefore spans almost the entire height of the final vertical frame, from top to bottom.

Do not crop tighter than this (no waist-up, no chest-up, no head-and-shoulders close-up). Do not crop wider than this (no full body with feet, no distant figure).

If the person is seated, kneeling or crouching so that the knees are hidden behind a desk, table or railing, keep the SAME apparent size: the bottom edge still falls at desk height or lower, and the head still nearly touches the top of the frame. Do NOT pull the camera back to reveal the knees — filling the height matters more than seeing the knees.
Measure the headroom: the crown of the head sits within the TOP 5 PERCENT of the frame height. A seated figure leaning over a desk still reaches that high — bring the camera closer instead of leaving empty wall above them.
If the setting described below is a wide place, move the camera IN CLOSE to the person and let the setting fall away behind them, out of focus. The setting is context behind the person, never the subject.`

function buildPrompt(row, outPath) {
  return `TASK-ID: HEROPHOTO-${row.slug}

Create a NEW environmental portrait photograph of the person in the attached reference image.

${IDENTITY}

${row.brief.trim()}

${GAZE}

${PHYSICALITY}

${FRAMING}

${RENDERING}

Output a ${SIZE} x ${SIZE} working image. Compose its central ${FINAL_ASPECT_LABEL} safe area as the finished portrait; the pipeline crops away both sides.

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

async function toPortraitWebp(src) {
  const oriented = await sharp(src).rotate().toBuffer({ resolveWithObject: true })
  const sourceWidth = oriented.info.width
  const sourceHeight = oriented.info.height
  const targetRatio = STORE_WIDTH / STORE_HEIGHT
  const sourceRatio = sourceWidth / sourceHeight
  const cropWidth = sourceRatio > targetRatio ? Math.round(sourceHeight * targetRatio) : sourceWidth
  const cropHeight = sourceRatio > targetRatio ? sourceHeight : Math.round(sourceWidth / targetRatio)
  const left = Math.max(0, Math.floor((sourceWidth - cropWidth) / 2))
  const top = Math.max(0, Math.floor((sourceHeight - cropHeight) / 2))

  return sharp(oriented.data)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(STORE_WIDTH, STORE_HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true })
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

async function processOne(ctx, row) {
  const { s3, sb, bucket, publicUrl } = ctx
  const dir = join(WORK, row.slug.replace(/[^a-z0-9-]/gi, '_'))
  mkdirSync(dir, { recursive: true })
  const refPath = join(dir, 'ref.png')
  const outPath = join(dir, 'out.png')
  const promptPath = join(dir, 'prompt.txt')
  const msgPath = join(dir, 'msg.txt')

  try {
    // 0. 이미 채워진 인물은 건너뛴다(중단 후 재실행해도 다시 뽑지 않도록)
    const { data: cur } = await sb.from('profiles').select('portrait_url').eq('id', row.celeb_id).maybeSingle()
    if (cur?.portrait_url) return { skipped: true, slug: row.slug, nickname: row.nickname }

    // 1. 얼굴 REF 확보 (투명 배경이면 검정으로 깔아 codex가 읽기 좋게)
    const refRes = await fetch(row.avatar_url)
    if (!refRes.ok) throw new Error(`REF 내려받기 실패 ${refRes.status}`)
    const refBuf = Buffer.from(await refRes.arrayBuffer())
    await sharp(refBuf).flatten({ background: '#000' }).png().toFile(refPath)
    const refPrint = await fingerprint(refBuf)

    // 2. 발주
    writeFileSync(promptPath, buildPrompt(row, outPath), 'utf-8')
    writeFileSync(msgPath, '')
    const startedAt = Date.now() - 5000
    // codex 프로세스가 시간 초과로 죽어도 그림은 이미 나와 있을 수 있다 —
    // 실패를 바로 던지지 말고 회수를 먼저 시도한다.
    let runErr = null
    try { await runCodex(promptPath, refPath, msgPath) } catch (e) { runErr = e }

    // 3. 회수 — 파일이 없으면 세션 로그에서
    let outBuf = existsSync(outPath) ? readFileSync(outPath) : null
    if (!outBuf) outBuf = recoverFromSessions(`HEROPHOTO-${row.slug}`, startedAt)
    if (!outBuf) throw runErr || new Error('산출물 없음(파일·세션로그 모두)')

    // 4. 진위검사 — REF 에코와 저해상 산출을 거른다
    const meta = await sharp(outBuf).metadata()
    if (!meta.width || meta.width < SIZE * 0.9) throw new Error(`해상도 미달 ${meta.width}x${meta.height}`)
    if (await fingerprint(outBuf) === refPrint) throw new Error('REF 원본이 그대로 돌아옴')

    // 5. 등록
    const portrait = await toPortraitWebp(outBuf)
    const webp = portrait.data
    const key = `celebs/${row.celeb_id}/photo.webp`
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: webp,
      ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
    }))
    const url = `${publicUrl}/${key}?v=${Date.now()}`
    const { error } = await sb.from('profiles').update({ portrait_url: url }).eq('id', row.celeb_id)
    if (error) throw new Error(`DB 갱신 실패 ${error.message}`)

    return { ok: true, slug: row.slug, nickname: row.nickname, kb: Math.round(webp.length / 1024), size: `${portrait.info.width}x${portrait.info.height}` }
  } finally {
    // 6. 로컬은 성공·실패 무관하게 즉시 비운다
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

  loadEnv(resolve(__dirname, '..', '.env'))
  const {
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
    R2_PUBLIC_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  } = process.env
  for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
    if (!v) throw new Error(`.env에 ${k} 누락`)
  }

  const ctx = {
    s3: new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
    sb: createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
    bucket: R2_BUCKET_NAME,
    publicUrl: R2_PUBLIC_URL,
  }

  const all = JSON.parse(readFileSync(batchPath, 'utf-8'))
  const rows = all.slice(0, limit === Infinity ? all.length : limit)

  // 연출문에 갈래 표기가 없으면 한 건도 뽑지 않는다 — 생성 뒤에 알면 한도만 태운다
  const badMode = rows.filter(r => !/^\s*SHOT MODE:\s*(POSED|ABSORBED)\b/im.test(r.brief || ''))
  if (badMode.length) throw new Error(`SHOT MODE 누락 ${badMode.length}건: ${badMode.slice(0, 5).map(r => r.slug).join(', ')}`)
  const noTarget = rows.filter(r => /^\s*SHOT MODE:\s*ABSORBED\b/im.test(r.brief) && !/gaze target:\s*\S/i.test(r.brief))
  if (noTarget.length) throw new Error(`ABSORBED 인데 시선 대상 미지정 ${noTarget.length}건: ${noTarget.slice(0, 5).map(r => r.slug).join(', ')}`)
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

  console.log(`\n=== 완료 ${stats.ok} · 실패 ${stats.fail} · 건너뜀 ${stats.skip}${stats.rate ? ' · 한도중단' : ''} (대상 ${rows.length}) ===`)
  if (failures.length) {
    const fp = join(dirname(batchPath), 'hero-failures.json')
    writeFileSync(fp, JSON.stringify(failures, null, 2), 'utf-8')
    console.log(`실패 목록: ${fp}`)
  }
  try { rmSync(WORK, { recursive: true, force: true }) } catch { /* 무시 */ }
}

main().catch(e => { console.error(e); process.exit(1) })
