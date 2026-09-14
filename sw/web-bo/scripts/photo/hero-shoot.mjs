/**
 * 인물 개인 화보를 agy(Gemini)로 찍는다. 규칙은 data/celeb/hero-photo/brief-rules.md 하나다.
 *
 * 발주서·얼굴 씨앗·구도 축 배정 없이 DB 인물 정보를 그대로 넘긴다 —
 * 그 편이 468건 발주서를 네 번 다시 만든 것보다 나았다(26.09.13).
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/photo/hero-shoot.mjs <slug> [slug ...]
 * 산출: .tmp/hero-out/_agy-test/<slug>.png
 */
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const AGY = 'C:/Users/webco/AppData/Local/agy/bin/agy.exe'
const T = 'C:/project/feelandnote/sw/web-bo/.tmp/'
const OUT = 'C:/project/feelandnote/sw/web-bo/.tmp/hero-out/_agy-test'
const TMP = 'C:/Users/webco/AppData/Local/Temp/claude/C--project-feelandnote/b37d0bd4-769c-4920-83dd-cd668e31f2b4/scratchpad/agy-prompts'
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

const targets = JSON.parse(readFileSync(T + 'brief-targets.json', 'utf-8'))
const batch = new Map(JSON.parse(readFileSync(T + 'hero-batch.json', 'utf-8')).map((r) => [r.slug, r]))

const SLUGS = process.argv.slice(2)
const DECADE = { '20s': 'in his/her twenties', '30s': 'in his/her thirties', '40s': 'in his/her forties', '50s': 'in his/her fifties', '60s': 'in his/her sixties', '70s': 'in his/her seventies', '80s': 'in his/her eighties' }
const BUILD = { slight: 'lean and wiry', average: 'fit and solidly built', heavy: 'powerfully built and imposing' }

function promptFor(row) {
  const b = batch.get(row.slug) ?? {}
  const who = b.sex === 'f' ? 'woman' : 'man'
  const age = (DECADE[b.age] ?? 'in middle age').replace('his/her', b.sex === 'f' ? 'her' : 'his')
  const build = BUILD[b.build] ?? 'fit and solidly built'
  const png = `${OUT}/${row.slug}.png`
  return `Generate an image and save it as a PNG to this exact absolute path: ${png}

A photographic portrait of ${row.nickname}${row.title ? `, ${row.title}` : ''}${row.headline ? ` — ${row.headline}` : ''}.
${row.bio ? `Background: ${row.bio.slice(0, 420)}\n` : ''}
A ${who} ${age}, ${build}.
Shoot it the way a magazine shoots the person on its cover. Vertical 4:5 frame. Framing, exactly: the bottom edge of the picture cuts the figure between mid-thigh and the knee, and above the crown of the head there is headroom about one head high. The figure therefore stands large and centred with air above them, and the face is clearly readable.
Give ${b.sex === 'f' ? 'her' : 'him'} the natural posture and expression of someone standing where they actually stood, in the dress, grooming and setting of their own time, people and rank.`
}

function run(row) {
  return new Promise((resolve) => {
    const pf = join(TMP, `${row.slug}.txt`)
    writeFileSync(pf, promptFor(row), 'utf-8')
    const t0 = Date.now()
    const p = spawn(AGY, ['-p', promptFor(row), '--dangerously-skip-permissions', '--model', 'gemini-3.8-flash-high', '--print-timeout', '6m'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    p.stdout.on('data', (d) => { out += d })
    p.stderr.on('data', (d) => { out += d })
    const kill = setTimeout(() => p.kill(), 7 * 60_000)
    p.on('close', () => {
      clearTimeout(kill)
      const secs = Math.round((Date.now() - t0) / 1000)
      const ok = existsSync(`${OUT}/${row.slug}.png`)
      console.log(`${ok ? '  OK  ' : ' 실패 '} ${row.nickname.padEnd(12)} ${secs}초${ok ? '' : ' — ' + out.slice(-140).replace(/\s+/g, ' ')}`)
      resolve(ok)
    })
  })
}

const rows = SLUGS.map((s) => targets.find((r) => r.slug === s)).filter(Boolean)
console.log(`agy 직접 발주 ${rows.length}명 (동시 2)\n`)
const queue = [...rows]
let ok = 0
async function worker() {
  while (queue.length) { if (await run(queue.shift())) ok++ }
}
await Promise.all([worker(), worker()])
console.log(`\n성공 ${ok} / ${rows.length} → ${OUT}`)
