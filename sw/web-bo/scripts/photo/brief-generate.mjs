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

/**
 * 구도 축은 말로 권하지 않고 번호표로 돌린다. 「다양하게 써라」는 지켜지지 않았다 —
 * 468건이 「서서 두 손으로 가슴께 물건」 한 자세로 수렴했다(26.09.06 전수).
 * 길이가 서로소인 축 목록을 혼합진법으로 뽑으면 180장 주기로 전 조합을 돌린다.
 * 배정값은 COMPOSITION 줄에 그대로 적게 하고 validate가 대조한다.
 * sceneHint로 자세·손이 이미 정해진 인물은 camera·light만 배정한다.
 *
 * 2차 개편 — light 축을 시간대에서 「빛의 세기와 방향」으로 갈았다.
 * 시간대 값(정오·낮은 해·흐린 날)은 결과를 전부 평탄하게 밝게 만들었다.
 * 다섯 값 중 넷이 명암이 뚜렷한 방향광이고 soft 하나만 부드럽다.
 * ABSORBED의 빛은 모드 문법이 정한다(화면 안 광원) — 그 경우 light는 in-frame으로 적는다.
 */
const AXES = {
  posture: ['stand-still', 'stand-motion', 'seated', 'leaning'],
  hands: ['both', 'one', 'empty'],
  camera: ['below', 'eye-level', 'above'],
  light: ['shaft', 'top', 'in-frame', 'rim', 'soft'],
}
const AXIS_GLOSS = {
  posture: {
    'stand-still': 'standing still, settled',
    'stand-motion': 'standing mid-motion — caught between steps or gestures',
    seated: 'seated — on a stool, a dais edge, a stone, a chair of his world',
    leaning: 'leaning on something solid — a post, a wall, a staff, a table edge',
  },
  hands: {
    both: 'both hands occupied',
    one: 'one hand occupied, the other at rest',
    empty: 'empty hands, at rest',
  },
  camera: {
    below: 'slightly below eye level — the lens looks up at him',
    'eye-level': 'at eye level — the lens meets his gaze dead-on',
    above: 'slightly above eye level — the lens looks down at him',
  },
  light: {
    shaft: 'a single shaft of side light cutting through darkness — the figure lit, the room near-black',
    top: 'light falling from above — brow, shoulders and hands catch it, the rest drops away',
    'in-frame': 'a light source inside the frame — forge fire, a torch, molten metal glowing upward',
    rim: 'a rim of backlight tracing him out of darkness — the front in shadow, the edge bright',
    soft: 'soft overcast light — even and diffused, the one gentle option',
  },
}

export function assignAxes(row, i) {
  const all = {
    posture: AXES.posture[i % AXES.posture.length],
    hands: AXES.hands[Math.floor(i / 4) % AXES.hands.length],
    camera: AXES.camera[Math.floor(i / 12) % AXES.camera.length],
    light: AXES.light[Math.floor(i / 36) % AXES.light.length],
  }
  return row.sceneHint ? { camera: all.camera, light: all.light } : all
}

/**
 * 규격은 docs/project/celeb/celeb-08-02-hero-photo.md 와
 * data/celeb/hero-photo/scene-manifest.md 「시선은 일감에 붙는다」가 쥔다.
 * 여기에는 GPT가 어겨서 실패한 항목만 명령형으로 적는다.
 */
export function buildPrompt(row, axes) {
  const axisLines = Object.entries(axes).map(([k, v]) => `  ${k}: ${v} — ${AXIS_GLOSS[k][v]}`).join('\n')
  const axisNote = row.sceneHint
    ? 'The pinned scene already decides posture and hands. The camera axis holds as assigned; the light axis holds for POSED, but if the pinned mode is ABSORBED write light=in-frame — the work light inside the frame is that mode\'s light.'
    : 'Echo them in the COMPOSITION line exactly as key=code, then build the scene so they hold. One exception: an ABSORBED sheet always writes light=in-frame, whatever the assigned light code.'
  const compSpec = Object.keys(axes).map(k => `${k}=<assigned code>`).join('; ')

  return `TASK-ID: BRIEF-${row.slug}

WHAT YOU ARE MAKING
A personal cover shoot for one historical or legendary figure — a single photograph, the way a magazine shoots the person on its cover. It runs on the service as a small card, 100 to 240 pixels wide. At that size it works when one lit figure fills the frame and the eye lands on the face. Everything below serves that.

Your sheet reaches an image generator as instructions. It draws what your words describe, so describe the picture you want it to make.

THE PERSON
name: ${row.nickname}
${row.title ? `role: ${row.title}\n` : ''}${row.nationality ? `culture: ${row.nationality}\n` : ''}${row.gender === null || row.gender === undefined ? '' : `sex: ${row.gender ? 'male' : 'female'}\n`}${row.headline ? `one line: ${row.headline}\n` : ''}${row.bio ? `background: ${row.bio.slice(0, 700)}\n` : ''}
ASSIGNED COMPOSITION AXES
${axisLines}
${axisNote}

HOW THE PICTURE IS BUILT

1. ONE PERSON FILLS THE FRAME. The photograph holds him and the things that are his. The crop cuts him between the waist and mid-thigh, his head near the top edge, so the face reads at card size.

2. THE BACKGROUND STAYS QUIET. Behind him, darkness takes the room, or a wide-open lens melts wall, tent and column into soft shapes and colour. SETTING places him in a phrase or two — "inside the forge", "on the river terrace at dusk" — and the rest of your words go to his body, his cloth, his gear and his light.

3. LIGHT PICKS HIM OUT. Follow the assigned light axis. A shaft cuts the dark and rakes his collar and cheekbone; light drops from above onto brow, shoulders and hands; a forge or torch inside the frame throws upward on his face; a rim of backlight traces him out of black; soft overcast light settles evenly on him. The light finds him and lets the rest go.

4. THE MATERIALS ARE THE BEST HIS WORLD COULD MAKE. Give WARDROBE and PROPS the top grade his culture and century actually produced — dyed cloth, tight weave, gold and bronze fittings, jade and gems, fine leather, polished metal, worked bone. The best is local: a steppe chief's best is horn, felt, silver and fur; a Bronze Age king's best is bronze, lapis and linen; a lawgiver's best is a tablet of the finest wood; an artisan's best is the masterwork of his own craft.

5. HAIR AND BEARD ARE CUT FOR THIS CENTURY. Write them first in WARDROBE, as part of the same costume as the clothes: the parting, the braid, the knot, the topknot, the shaved crown, the oiled curls, the veil or headcloth this people wore, and the beard that went with that dress — full, forked, plaited, clipped, or a clean-shaven face.

6. THE BODY READS THROUGH THE CLOTH. Sleeves are rolled or cut short, forearm and neck bare where his century's dress allows, so shoulder, arm and tendon show the build.

7. TWO OR THREE COLOURS HOLD THE FRAME. Gold and lamp black; crimson, bronze and shadow; ember orange and soot; sand and verdigris. PALETTE names them by their materials.

8. SURFACES CATCH THE LIGHT. Metal reflects and carries scratches, hammer marks and oxidation; leather shows its grain; cloth shows its weave; stone shows its tooling. Sparks, ash and dust hang in the air where the moment makes them.

9. HE HOLDS THE ONE THING THAT NAMES HIM. Take it from what this person made, carried, wore, measured, hunted with or built with — Hiawatha's wampum belt, Alan Gua's five arrows, a smith's crucible. Something with mass, that a hand closes around. It belongs to him and to no one else of his rank.

10. THE FACE CARRIES AN EXPRESSION. EXPRESSION says in plain terms what the eyes, the brow and the jaw are doing — eyes that measure the stranger behind the lens, a brow drawn into the work, a jaw set even. Cast him handsome: fine bone, clean symmetry, clear skin, a strong jaw, the face a film would put on its poster.

THE TWO MODES — THE PORTRAIT IS THE DEFAULT

POSED is what you write unless the person has one act that names them on sight. He has turned at the sound of his name and HOLDS THE LENS: eyes straight down the barrel, chin level, head and torso three-quarter to the camera, a forearm on a knee or table edge, a helmet or tool under the arm, hands at rest. The eyes carry the picture — they measure the stranger behind the glass. Write "gaze target: the camera".

ABSORBED is the exception, for the figure whose own act identifies him the moment you see it — the smith at the pour, the scribe cutting glyphs, the surveyor drawing the boundary line. Catch the peak of that motion. The work's own light sits inside the frame and throws upward on him. His eyes go to the object you name, his brow tightens, his head and shoulders turn to it. Keep the work out at arm's length or up on an anvil, bench, rail or wall, held out to the light or raised overhead, so his head stays level with it and his face stays open to the camera.

Ask it this way: if you showed a stranger only this action, would they say "that is a smith" or "that is a king"? When the answer is yes, write ABSORBED. When the answer is "that is a person holding something", write POSED and let the face and the dress do the work.

WHAT REACHES THE CAMERA
INTENT holds everything you know — why this moment, what the sources say, what it meant. It is stored apart and stays with you. Below INTENT, write the surfaces a stranger would see: cloth, metal, skin, light, the shapes of things. Proper names earn their place when they change a pixel — "Dong Son bronze" has a look, "the Red River plain" looks like any wide river plain, so write brown water running shallow, reed beds, flooded paddies cut into squares.
Every surface in the frame carries pattern, grain, weave or plain worked material. Everything in the frame was made in his century by his people.

OUTPUT EXACTLY THESE BLOCKS, in this order:

INTENT: <why this moment and not another. As long as it needs to be — reasoning only. Kept in the file, never sent to the camera.>

SHOT MODE: POSED
gaze target: the camera
or
SHOT MODE: ABSORBED
gaze target: <the solid object his eyes are on, out from the body at chest height or above>

EXPRESSION: <what the eyes, the brow and the jaw are doing, in plain positive terms.>

COMPOSITION: ${compSpec}

WARDROBE: <hair and beard first — the cut, length, braid, knot, crown, veil or headcloth of this people and rank, and the beard that goes with it. Then the garments as they hang: cut, layers, fastenings, the cloth and its dye, the metal and stone, what is on the head, what is on the feet. The best his century and place could make. Sleeves rolled or arms bare where that dress allows.>

PROPS: <what the hands hold and what hangs on the body — his own gear at his own rank. What each is made of and how big it is.>

SETTING: <where he stands, in a phrase or two. The background is darkness or blur; what shares the frame is his own gear and the things he made.>

LIGHT: <the assigned light axis — where it comes from, how hard it falls, what it catches. For ABSORBED the work light sits inside the frame, throwing upward, the rest of the room dark.>

PALETTE: <the two or three colour families the whole frame stays inside, named by their materials — polished gold and lamp black; deep crimson, bronze and shadow.>

HOW TO WRITE IT
Plain English, the language of a shot list. Write the state you want drawn — "taut cheeks and a clean jawline", "a brow drawn into the work", "shoulders wide enough to crowd the frame". The generator draws whatever concept your words raise, so name the thing you want in the picture and let the rest go unmentioned.
Echo the assigned axis codes in the COMPOSITION line exactly as key=code.

Return the sheet.
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
  if (!/^\s*SHOT MODE:\s*(POSED|ABSORBED)/im.test(brief)) problems.push('SHOT MODE 없음')
  if (!/^\s*gaze target:/im.test(brief)) problems.push('시선 대상 없음')
  for (const block of ['EXPRESSION', 'COMPOSITION', 'WARDROBE', 'PROPS', 'SETTING', 'LIGHT', 'PALETTE']) {
    if (!new RegExp(String.raw`^\s*${block}:`, 'im').test(brief)) problems.push(`${block} 없음`)
  }

  // 구도 축은 러너가 배정해 돌리는 값이라 대조한다 — 이것만 지켜지면 468장이 한 자세로 몰리지 않는다.
  const comp = brief.match(/^\s*COMPOSITION:([^\n]*)/im)?.[1] ?? ''
  const absorbed = /^\s*SHOT MODE:\s*ABSORBED/im.test(brief)
  for (const [k, v] of Object.entries(axes)) {
    const got = comp.match(new RegExp(String.raw`${k}\s*=\s*([\w-]+)`, 'i'))?.[1]
    if (got === v) continue
    if (k === 'light' && absorbed && got === 'in-frame') continue
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
        const cut = brief.search(/^\s*SHOT MODE:/im)
        const intent = (brief.match(/^\s*INTENT:([\s\S]*?)(?=^\s*SHOT MODE:)/im)?.[1] ?? '').trim()
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
