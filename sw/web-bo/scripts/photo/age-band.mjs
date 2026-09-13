/**
 * 얼굴 나이대를 bio의 서사 시점에서 뽑는다. 25명씩 묶어 물어 호출 수를 줄인다.
 *
 * 왜 birth_date를 안 쓰나: 건국신화 인물의 birth_date는 생년이 아니라 전승이 놓인 배경
 * 연도다. 자하크가 1500년을 살았다고 적힌 값이라 나이로 읽으면 사고가 난다
 * (docs/todo/founding-myth.md 「발주 전에 반드시 볼 것」).
 *
 * 왜 나이가 중요한가: 26.09.05 실측으로 발주서의 나이 지시가 REF에 눌린다. REF가 나이를
 * 지배하므로 배정 단계에서 나이 맞는 얼굴을 골라야 한다.
 *
 * 사용법 (sw/web-bo 에서): node scripts/photo/age-band.mjs <대상.json> <출력.json>
 */
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const WORK = join(tmpdir(), 'celeb-age')
mkdirSync(WORK, { recursive: true })
const CHUNK = 25

let CODEX = null
function resolveCodex() {
  if (CODEX) return CODEX
  try {
    const found = execSync('where codex', { encoding: 'utf-8' }).split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    CODEX = found.find(p => p.toLowerCase().endsWith('.cmd')) || found[0] || 'codex'
  } catch { CODEX = 'codex' }
  return CODEX
}

function runCodex(promptPath, msgPath, timeoutMs = 1500000) {
  const bin = resolveCodex()
  const cmd = /\s/.test(bin) ? `"${bin}"` : bin
  return new Promise((res, rej) => {
    const args = ['exec', '-', '-m', 'gpt-6-astra', '-c', 'model_reasoning_effort="xhigh"', '--skip-git-repo-check', '-s', 'read-only',
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

function buildPrompt(rows, tag) {
  const body = rows.map(r =>
    `${r.slug}\t${r.nickname}${r.title ? ` — ${r.title}` : ''}\t${(r.headline || '').slice(0, 90)}\t${(r.bio || '').replace(/\s+/g, ' ').slice(0, 320)}`
  ).join('\n')

  return `TASK-ID: AGEBAND-${tag}

For each figure below, decide how old he or she should LOOK in a single portrait photograph, and how heavy the build should be.

Judge from the story: the moment the account dwells on. A founder photographed at the founding is not old. A patriarch remembered for the sons he fathered and outlived is. If the account gives no moment, choose the age at which this person is normally pictured doing the thing they are known for.

Do NOT use any year you may know for this figure. Legendary chronologies give lifespans of centuries; they are not ages.

INPUT — one per line: slug, name, one-line, background
${body}

OUTPUT — one line per figure, nothing else, no header, no markdown:
<slug>\t<age band>\t<build>

age band is exactly one of: 20s, 30s, 40s, 50s, 60s, 70s
build is exactly one of: slight, average, heavy

Emit exactly ${rows.length} lines, in the input order, one for every slug. Do not run any shell command.
`
}

async function main() {
  const [targetPath, outPath] = process.argv.slice(2)
  if (!targetPath || !outPath) throw new Error('사용법: node age-band.mjs <대상.json> <출력.json>')

  const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf-8')) : {}
  const all = JSON.parse(readFileSync(targetPath, 'utf-8')).filter(r => !out[r.slug])
  console.log(`대상 ${all.length}명 (이미 끝난 ${Object.keys(out).length}명 건너뜀)`)

  const VALID_AGE = new Set(['20s', '30s', '40s', '50s', '60s', '70s'])
  const VALID_BUILD = new Set(['slight', 'average', 'heavy'])

  for (let i = 0; i < all.length; i += CHUNK) {
    const rows = all.slice(i, i + CHUNK)
    const tag = String(i / CHUNK + 1).padStart(3, '0')
    const pp = join(WORK, `${tag}.txt`)
    const mp = join(WORK, `${tag}.out.txt`)
    writeFileSync(pp, buildPrompt(rows, tag), 'utf-8')
    writeFileSync(mp, '')
    try {
      await runCodex(pp, mp)
      const text = readFileSync(mp, 'utf-8').trim()
      if (!text) throw new Error('빈 응답(한도 소진 의심)')
      const wanted = new Set(rows.map(r => r.slug))
      let got = 0
      for (const line of text.split('\n')) {
        const [slug, age, build] = line.trim().split(/\t+|\s{2,}/).map(s => (s || '').trim())
        if (!wanted.has(slug) || !VALID_AGE.has(age) || !VALID_BUILD.has(build)) continue
        out[slug] = { age, build }
        got++
      }
      writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf-8')
      console.log(`  묶음 ${tag}: ${got}/${rows.length}명`)
      if (got === 0) throw new Error('형식 파손 — 한 건도 못 읽었다')
    } catch (e) {
      console.error(`  [실패] 묶음 ${tag}: ${(e.message || e).toString().slice(0, 160)}`)
      if (/한도|rate.?limit|quota|429|빈 응답/i.test(e.message || '')) { console.error('  중단한다. 회복 뒤 같은 명령으로 이어붙인다'); break }
    }
  }
  console.log(`\n=== 채운 ${Object.keys(out).length}명 → ${outPath} ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
