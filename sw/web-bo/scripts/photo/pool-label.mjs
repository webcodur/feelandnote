/**
 * 얼굴 재료에 딱지를 붙인다 — 나이대·체구·AI형 여부.
 *
 * 컨택트 시트를 통째로 넣어 한 번에 스무 장씩 판정한다. 낱장으로 물으면 674콜인데
 * 시트로 물으면 34콜이다.
 *
 * 왜 필요한가
 *   나이 — 발주서의 나이 지시가 REF에 눌린다(26.09.05 실측). 배정 단계에서 맞춰야 한다.
 *   AI형 — 「극한의 AI 이미지는 피한다」. 어느 정도는 허용하되 밀랍·플라스틱은 걸러낸다.
 *
 * 사용법 (sw/web-bo 에서): node scripts/photo/pool-label.mjs <시트폴더> <출력.json>
 *   시트폴더에 <태그>-sheetN.png 와 <태그>-index.json 이 함께 있어야 한다.
 */
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'

const WORK = join(tmpdir(), 'celeb-poollabel')
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

function runCodex(promptPath, imgPath, msgPath, timeoutMs = 1500000) {
  const bin = resolveCodex()
  const cmd = /\s/.test(bin) ? `"${bin}"` : bin
  return new Promise((res, rej) => {
    const args = ['exec', '-', '-m', 'gpt-6-astra', '-c', 'model_reasoning_effort="xhigh"', '--skip-git-repo-check', '-s', 'read-only',
      '-i', imgPath, '--output-last-message', msgPath, '--color', 'never']
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

const RUN = Date.now().toString(36)

function buildPrompt(ids, tag) {
  return `TASK-ID: POOLLABEL-${RUN}-${tag}

The attached image is a contact sheet of face photographs. Each cell has a black caption bar under it carrying its ID.

Judge every cell and report three things about the FACE in it.

1. age — how old this person looks. Exactly one of: child, 20s, 30s, 40s, 50s, 60s, 70s, 80s
   child = anyone who has not finished growing: a baby, a boy, a girl, a teenager. Say child whenever you are unsure whether the person has reached adulthood.
   80s = very old: sunken cheeks, clouded eyes, thin white hair, skin fallen into deep folds.
2. build — the weight of the face and neck. Exactly one of: slight, average, heavy
   slight = drawn cheeks, visible cheekbone and jaw edge, thin neck
   heavy = full cheeks, soft jawline, thick neck
3. synthetic — photographed, or made by an image generator? Exactly one of: no, some, extreme

   Zoom into the skin and hair of each face and look for the accidents a camera records and a generator does not:
   individual pores and blackheads, stray hairs breaking the outline, a blemish or scar that belongs to no pattern,
   one eye slightly unlike the other, teeth that are not uniform, cloth that creases where a body pushed it,
   a background with real objects at real distances, uneven light on the two sides of the nose.

   extreme = you cannot find those accidents. The skin is smooth or evenly speckled with no true pores, the hair
   moves in soft clumps rather than separate strands, the two irises carry the same highlight in the same place,
   the face is close to mirror-symmetric, ornament or fabric pattern repeats with machine regularity, or the
   background is a gradient or a soft blur containing nothing identifiable. A face lit like a film poster, with
   flawless skin and a dark vignetted background, is extreme however handsome it is.
   some = a real photograph that has been retouched or heavily graded — pores softened but still present,
   background real but blurred.
   no = an ordinary photograph, whatever its quality: snapshots, documentary frames, stock headshots with visible skin texture.

Do not give a face the benefit of the doubt because it is well made. Generated faces are usually the most attractive and best lit ones on the sheet.

OUTPUT — one line per cell, nothing else, no header, no markdown:
<ID>\t<age>\t<build>\t<synthetic>

The IDs on this sheet are: ${ids.join(', ')}
Emit exactly ${ids.length} lines. Do not run any shell command.
`
}

async function main() {
  const [sheetDir, outPath] = process.argv.slice(2)
  if (!sheetDir || !outPath) throw new Error('사용법: node pool-label.mjs <시트폴더> <출력.json>')

  const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf-8')) : {}
  const AGE = new Set(['child', '20s', '30s', '40s', '50s', '60s', '70s', '80s'])
  const BUILD = new Set(['slight', 'average', 'heavy'])
  const SYN = new Set(['no', 'some', 'extreme'])

  const indexes = readdirSync(sheetDir).filter(f => f.endsWith('-index.json'))
  const sheets = []
  for (const f of indexes) {
    const rows = JSON.parse(readFileSync(join(sheetDir, f), 'utf-8'))
    const bySheet = {}
    for (const r of rows) (bySheet[r.sheet] = bySheet[r.sheet] || []).push(r)
    for (const [sheet, cells] of Object.entries(bySheet)) sheets.push({ sheet, cells })
  }
  const todo = sheets.filter(s => !s.cells.every(c => out[c.id]))
  console.log(`시트 ${sheets.length}장 중 ${todo.length}장 남음 (딱지 ${Object.keys(out).length}개)`)

  for (const { sheet, cells } of todo) {
    const img = resolve(join(sheetDir, sheet))
    if (!existsSync(img)) { console.error(`  [없음] ${sheet}`); continue }
    const ids = cells.map(c => c.id)
    const pp = join(WORK, `${sheet}.txt`)
    const mp = join(WORK, `${sheet}.out.txt`)
    writeFileSync(pp, buildPrompt(ids, sheet), 'utf-8')
    writeFileSync(mp, '')
    try {
      await runCodex(pp, img, mp)
      const text = readFileSync(mp, 'utf-8').trim()
      if (!text) throw new Error('빈 응답(한도 소진 의심)')
      const want = new Map(cells.map(c => [c.id, c.file]))
      let got = 0
      for (const line of text.split('\n')) {
        const [id, age, build, syn] = line.trim().split(/\t+|\s{2,}/).map(s => (s || '').trim())
        if (!want.has(id) || !AGE.has(age) || !BUILD.has(build) || !SYN.has(syn)) continue
        out[id] = { file: want.get(id), age, build, synthetic: syn }
        got++
      }
      writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf-8')
      console.log(`  ${sheet}: ${got}/${ids.length}`)
      if (got === 0) throw new Error('형식 파손 — 한 건도 못 읽었다')
    } catch (e) {
      const m = (e.message || e).toString()
      console.error(`  [실패] ${sheet}: ${m.slice(0, 160)}`)
      if (/rate.?limit|quota|429|빈 응답/i.test(m)) { console.error('  중단한다. 회복 뒤 같은 명령으로 이어붙인다'); break }
    }
  }

  const vals = Object.values(out)
  const ext = vals.filter(v => v.synthetic === 'extreme').length
  console.log(`\n=== 딱지 ${vals.length}개 · 극단 AI형 ${ext}개(배정에서 제외) → ${outPath} ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
