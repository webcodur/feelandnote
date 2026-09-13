/**
 * Grok 아바타 발주 꾸러미를 만든다. 규칙은 data/celeb/hero-photo/brief-rules.md 하나다.
 *
 * 이미지 생성은 브라우저(Grok)가 하고, 이 스크립트는 인물마다
 *   ① 씨앗 파일을 세션 폴더로 복사하고
 *   ② 붙여넣을 영어 프롬프트를 만들어
 * .tmp/grok-queue/<slug>.json 에 쌓아 둔다. 브라우저 쪽은 그 파일만 읽어 쓴다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/photo/grok-avatar-prompt.mjs <slug> [slug ...]
 *   node scripts/photo/grok-avatar-prompt.mjs --next 5      아직 안 만든 인물 5명
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'

const T = '.tmp/'
const SEED_DIR = 'C:/Users/webco/AppData/Local/Temp/claude/C--project-feelandnote/b37d0bd4-769c-4920-83dd-cd668e31f2b4/scratchpad/ref'
const QUEUE = join(T, 'grok-queue')
const DONE = join(T, 'hero-out', '_avatars')
mkdirSync(QUEUE, { recursive: true })
mkdirSync(DONE, { recursive: true })

const targets = JSON.parse(readFileSync(T + 'brief-targets.json', 'utf-8'))
const batch = new Map(JSON.parse(readFileSync(T + 'hero-batch.json', 'utf-8')).map((r) => [r.slug, r]))

const DECADE = { '20s': 'twenties', '30s': 'thirties', '40s': 'forties', '50s': 'fifties', '60s': 'sixties', '70s': 'seventies', '80s': 'eighties' }
const BUILD = { slight: 'slender and light-framed', average: 'fit and solidly built', heavy: 'powerfully built' }

/**
 * 얼굴을 화면 가운데 3분의 1에 앉히는 규격. 인물마다 바뀌지 않는다.
 * 「3x3 격자」라는 말은 쓰지 않는다 — 실제로 격자선을 그려 넣거나 아홉 장을 만들어 버린다(26.09.13).
 * 비율로만 적는다.
 */
function framing(her) {
  const her2 = her ? 'her' : 'his'
  const sheHe = her ? 'she' : 'he'
  return `FRAMING, by where the picture cuts the body: the bottom edge of the square passes just ABOVE the collarbones, so ${her2} neck is visible and the shoulders barely enter the frame. Above the head there is empty space about ONE HEAD HIGH — if you set a second head on top of ${her2} own, it would fit inside the frame with a little room left over. ${sheHe === 'she' ? 'She' : 'He'} is centred left to right, with background showing at both sides of the head. That distance puts the face at roughly a third of the picture, which is what this needs. Any plain background above the head is welcome. One image only, in a square 1:1 frame.`
}

function buildPrompt(row) {
  const b = batch.get(row.slug) ?? {}
  const her = b.sex === 'f'
  const who = her ? 'woman' : 'man'
  const sheHe = her ? 'She' : 'He'
  const herHis = her ? 'her' : 'him'
  const age = DECADE[b.age] ?? 'middle age'
  const build = BUILD[b.build] ?? 'fit and solidly built'
  return [
    `A square (1:1) photographic portrait of ${row.nickname}${row.title ? `, ${row.title}` : ''}${row.headline ? ` — ${row.headline}` : ''}.`,
    row.bio ? `Background: ${row.bio.slice(0, 420)}` : '',
    `A ${who} in ${her ? 'her' : 'his'} ${age}, ${build}.`,
    `The attached photo is the face reference: keep ONLY its bone structure and lived-in individuality — the skull and jaw, the brow, the set of the eyes, the nose, the skin of one real particular person.`,
    `The reference photo's hairstyle, facial hair grooming and clothing are a MODERN photo studio look and do not belong in this picture — discard all of them completely. Redesign the hair and facial hair from scratch as ${her ? 'a woman' : 'a man'} of ${her ? 'her' : 'his'} own people and century actually wore it: a different cut, length and texture from the reference, styled with no modern product shine. Build the headdress or head covering, the collar and the ornament as one costume of that world, worn over that redesigned hair. If the background gives little material detail to go on, do not default to ANY kind of narrow band encircling the head — not leather, not cord, not metal, not fabric, whatever the material. That whole category (a thin strip tied or clasped straight around the forehead) has been overused regardless of what it is made of. Research what people of that specific culture, era and rank actually wore on the head and pick something structurally different from a headband: full hair worked into a shape, a cap or hood that covers the crown, a wreath of leaves, a wrapped cloth that covers most of the head, a hat with a brim or peak, feathers, or nothing at all with the hair itself styled distinctively.`,
    framing(her),
    `${sheHe} looks straight into the lens. Photorealistic, editorial cover lighting.`,
  ].filter(Boolean).join(' ')
}

let slugs = process.argv.slice(2)
if (slugs[0] === '--next') {
  const n = Number(slugs[1] ?? 5)
  const done = new Set(readdirSync(DONE).filter((f) => /\.(jpg|png|webp)$/i.test(f)).map((f) => basename(f, '.' + f.split('.').pop())))
  slugs = targets.filter((r) => !done.has(r.slug)).slice(0, n).map((r) => r.slug)
}

const made = []
for (const slug of slugs) {
  const row = targets.find((r) => r.slug === slug)
  if (!row) { console.log(`${slug}: 대상에 없음`); continue }
  const b = batch.get(slug)
  const seedSrc = b?.facePath
  let seed = null
  if (seedSrc && existsSync(seedSrc)) {
    seed = join(SEED_DIR, `seed-${slug}.png`).replace(/\\/g, '/')
    mkdirSync(SEED_DIR, { recursive: true })
    copyFileSync(seedSrc, seed)
  }
  const out = { slug, nickname: row.nickname, seed, prompt: buildPrompt(row) }
  writeFileSync(join(QUEUE, `${slug}.json`), JSON.stringify(out, null, 1), 'utf-8')
  made.push(out)
  console.log(`${row.nickname.padEnd(14)} 씨앗 ${seed ? 'O' : 'X'} · 프롬프트 ${out.prompt.length}자`)
}
console.log(`\n${made.length}건 → ${QUEUE}`)
