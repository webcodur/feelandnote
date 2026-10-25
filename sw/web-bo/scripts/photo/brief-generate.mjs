/**
 * 대표 사진 연출문(brief)을 codex(GPT)로 대량 생성한다. 이미지 생성이 아니라 글만 만든다.
 *
 * 왜 GPT인가: 427명분 장면 설계는 사람이 쓰기엔 너무 많고 Claude 토큰으로 돌리기엔 비싸다.
 * 규격 검사는 이 스크립트가 하므로 GPT가 형식을 어기면 그 건만 실패로 떨어진다.
 *
 * 산출: <출력>.jsonl 에 {slug, brief} 한 줄씩. 재실행하면 이미 있는 slug는 건너뛴다.
 * 사용법 (sw/web-bo 에서):
 *   node scripts/photo/brief-generate.mjs <대상.json> <출력.jsonl> [--limit N] [--concurrency 3]
 *
 * 대상.json = [{slug, nickname, gender, nationality, profession, title, headline, bio}]
 */
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'

const WORK = join(tmpdir(), 'celeb-brief')
mkdirSync(WORK, { recursive: true })

let CODEX = null
function resolveCodex() {
  if (CODEX) return CODEX
  try {
    const found = execSync('where codex', { encoding: 'utf-8' }).split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    CODEX = found.find(p => p.toLowerCase().endsWith('.cmd')) || found[0] || 'codex'
  } catch { CODEX = 'codex' }
  return CODEX
}

/** 참조의 자세와 복식을 유지하고 기본 촬영 조건만 전달한다. */
export function assignAxes() {
  return { camera: 'eye-level', light: 'left-natural' }
}

/** 규격은 docs/project/celeb/celeb-08-02-hero-photo.md를 따른다. */
export function buildPrompt(row, axes) {
  const compSpec = Object.entries(axes).map(([key, value]) => `${key}=${value}`).join('; ')
  return `TASK-ID: BRIEF-${row.slug}

Write a concise image-generation direction sheet for this person's representative portrait. Follow docs/project/celeb/celeb-08-02-hero-photo.md.

PERSON
name: ${row.nickname}
${row.title ? `role: ${row.title}\n` : ''}${row.nationality ? `culture: ${row.nationality}\n` : ''}${row.gender === null || row.gender === undefined ? '' : `sex: ${row.gender ? 'male' : 'female'}\n`}${row.headline ? `one line: ${row.headline}\n` : ''}${row.bio ? `background: ${row.bio.slice(0, 700)}\n` : ''}${row.sceneHint ? `reference pose or direction: ${row.sceneHint}\n` : ''}

Use the best-looking image of this person as reference, chosen for identity, representative age, vitality, hair, clothing, body proportions and overall quality. Fashion shoots are one possible source among portraits, interviews and archives. Watermarked or captioned images can supply reference material; the finished image has a clean surface. Preserve verified uniform numbers and team markings.

Make a high-resolution full-colour studio portrait. Frame the complete head with a little headroom through just below the waist at the upper hips. Choose a natural direction and angle for this person and the selected reference, including front-facing or left and right oblique poses. Connect torso, neck and face comfortably, with both pupils meeting the lens, and vary body orientations across the portraits. Preserve natural shoulder heights, weight shift and the reference's good pose. A dancer may use a reference-supported dance pose within this same portrait.

Choose a representative active age and the person's own build. Use a gentle closed-mouth smile by default; preserve firm eyes and mouth when charisma or authority defines this person. Natural light from the left gives the face shape.

Select clothing from this person's best reference. For Indian women, favour modern clothing. Build the pose through the body, arms and hands, with hands outside pockets. Choose colours and freely visible textures that suit the person and clothing. Keep the person visually clear.

OUTPUT THESE BLOCKS IN ORDER
INTENT: <brief reason for the selected reference and direction; stored separately>
gaze target: the camera
EXPRESSION: <the actual desired eyes, brow and mouth>
COMPOSITION: ${compSpec}; <reference pose, natural body flow and waist-shot crop>
WARDROBE: <this person's reference clothing and grooming>
PROPS: <for an ordinary studio portrait, the person's body, arms and hands form the pose>
SETTING: <background colours and textures suitable for this person>
LIGHT: <natural left light with realistic facial shading>
PALETTE: <colours suited to the person and clothing>

Use plain English and positive descriptions of the desired picture. Keep the sheet short and specific.
`
}

function runCodex(promptPath, msgPath, timeoutMs = 1200000) {
  const bin = resolveCodex()
  const cmd = /\s/.test(bin) ? `"${bin}"` : bin
  return new Promise((res, rej) => {
    const args = ['exec', '-', '-m', 'gpt-5.6-sol', '-c', 'model_reasoning_effort="xhigh"', '--skip-git-repo-check', '-s', 'read-only',
      '--output-last-message', msgPath, '--color', 'never']
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

/** 생성 뒤 규격 검사. 어긴 건은 저장하지 않는다 — 발주 때 걸리면 한도만 태운다 */
export function validate(brief, row, axes = {}) {
  // 26.09.13 개편 — 내용 검열을 전부 걷어냈다.
  // 「돌을 들지 마라」「고개를 숙이지 마라」식 금지 검사를 붙일수록 발주서는 금지를 피한 밋밋한 글이 됐고,
  // 파사석탑·눈높이로 든 화살촉·야자잎에 새기는 장면처럼 멀쩡한 것을 네 번 떨궜다.
  // 좋은 그림은 지시문이 만든다. 여기서는 파이프라인이 읽을 수 있는 형식만 본다.
  const problems = []

  if (!/^\s*INTENT:/im.test(brief)) problems.push('INTENT 없음')
  if (!/^\s*gaze target:/im.test(brief)) problems.push('시선 대상 없음')
  for (const block of ['EXPRESSION', 'COMPOSITION', 'WARDROBE', 'PROPS', 'SETTING', 'LIGHT', 'PALETTE']) {
    if (!new RegExp(String.raw`^\s*${block}:`, 'im').test(brief)) problems.push(`${block} 없음`)
  }

  // 공통 촬영 조건을 대조하고, 자세는 본인 참조에서 선택한다.
  const comp = brief.match(/^\s*COMPOSITION:([^\n]*)/im)?.[1] ?? ''
  for (const [k, v] of Object.entries(axes)) {
    const got = comp.match(new RegExp(String.raw`${k}\s*=\s*([\w-]+)`, 'i'))?.[1]
    if (got === v) continue
    problems.push(`COMPOSITION ${k} 불일치(배정 ${v}${got ? `, 적힌 값 ${got}` : ', 값 없음'})`)
  }

  return problems
}



const looksRateLimited = (m = '') => /rate.?limit|quota|429|usage limit/i.test(m)

async function main() {
  const [targetPath, outPath] = process.argv.slice(2)
  if (!targetPath || !outPath) throw new Error('사용법: node brief-generate.mjs <대상.json> <출력.jsonl>')
  const limArg = process.argv.indexOf('--limit')
  const conArg = process.argv.indexOf('--concurrency')
  const limit = limArg > 0 ? Number(process.argv[limArg + 1]) : Infinity
  const concurrency = conArg > 0 ? Number(process.argv[conArg + 1]) : 3

  const done = new Set()
  if (existsSync(outPath)) {
    for (const line of readFileSync(outPath, 'utf-8').split('\n')) {
      if (!line.trim()) continue
      try { done.add(JSON.parse(line).slug) } catch { /* 깨진 줄은 무시 */ }
    }
  }
  mkdirSync(dirname(outPath), { recursive: true })

  const all = JSON.parse(readFileSync(targetPath, 'utf-8')).filter(r => !done.has(r.slug))
  const rows = all.slice(0, limit === Infinity ? all.length : limit)
  console.log(`대상 ${rows.length}명 (이미 끝난 ${done.size}명 건너뜀)`)

  const stats = { ok: 0, bad: 0, fail: 0 }
  const rejected = []
  let cursor = 0
  let halted = false

  async function worker() {
    while (!halted) {
      const i = cursor++
      if (i >= rows.length) return
      const row = rows[i]
      const axes = assignAxes(row, i)
      const promptPath = join(WORK, `${row.slug}.txt`)
      const msgPath = join(WORK, `${row.slug}.out.txt`)
      try {
        writeFileSync(promptPath, buildPrompt(row, axes), 'utf-8')
        writeFileSync(msgPath, '')
        await runCodex(promptPath, msgPath)
        const brief = readFileSync(msgPath, 'utf-8').trim()
        if (!brief) throw new Error('빈 응답(한도 소진 의심)')
        const problems = validate(brief, row, axes)
        if (problems.length) {
          stats.bad++
          rejected.push({ slug: row.slug, nickname: row.nickname, problems, brief })
          console.error(`  [규격위반] ${row.nickname} (${row.slug}): ${problems.join(', ')}`)
          continue
        }
        // 의도와 발주서를 다른 칸에 담는다. 이미지에 보낼 때 brief 만 넘기면 의도가 새어 나가지 않는다.
        const cut = brief.search(/^\s*(?:SHOT MODE:|gaze target:)/im)
        const intent = (brief.match(/^\s*INTENT:([\s\S]*?)(?=^\s*(?:SHOT MODE:|gaze target:))/im)?.[1] ?? '').trim()
        appendFileSync(outPath, JSON.stringify({
          slug: row.slug, nickname: row.nickname, intent,
          brief: cut > 0 ? brief.slice(cut).trim() : brief,
        }) + '\n', 'utf-8')
        stats.ok++
        console.log(`  [${stats.ok}] ${row.nickname} (${row.slug})`)
      } catch (e) {
        const msg = e.message || String(e)
        if (looksRateLimited(msg) || /빈 응답/.test(msg)) {
          halted = true
          console.error(`  한도 도달 추정 — ${row.slug} 에서 중단: ${msg.slice(0, 160)}`)
          return
        }
        stats.fail++
        console.error(`  [실패] ${row.nickname} (${row.slug}): ${msg.slice(0, 140)}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker))

  console.log(`\n=== 통과 ${stats.ok} · 규격위반 ${stats.bad} · 실패 ${stats.fail}${halted ? ' · 한도중단' : ''} ===`)
  if (rejected.length) {
    const rp = outPath.replace(/\.jsonl$/, '') + '-rejected.json'
    writeFileSync(rp, JSON.stringify(rejected, null, 2), 'utf-8')
    console.log(`규격위반 목록: ${rp} — 고쳐 재실행하면 통과분은 건너뛴다`)
  }
}

import { pathToFileURL } from 'url'
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1) })
}
