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
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, basename } from 'path'

const T = '.tmp/'
// 씨앗은 hero-batch.json의 원본 얼굴 재료(facePath)를 그대로 가리킨다.
// 브라우저 도구가 file input에 그 경로를 넣는다 — 세션 폴더 복사는 특정 도구 전용 우회였고 폐기했다.
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
    `The reference photo's hairstyle, facial hair grooming and clothing are a MODERN photo studio look and do not belong in this picture — discard all of them completely. Design the hair first. Research how ${her ? 'a woman' : 'a man'} of ${her ? 'her' : 'his'} own people, century and rank actually wore the hair${her ? '' : ' and beard'}, and build exactly that: the length, parting and texture, any braids, knots, curls, oil or pins worked into the hair itself — clearly different from the reference, with no modern product shine and nothing that reads as a modern salon or barbershop cut. The hair alone should tell which world ${her ? 'she' : 'he'} belongs to. Whether anything is worn on the head, and what, depends on this person's culture, rank and moment: some people of the ancient world went bareheaded, others would never be seen with the head uncovered. Decide for this person. If something is worn, make it that culture's own form, not a thin band tied or clasped around the forehead. Dress ${her ? 'her' : 'him'} in the clothing that person would really wear, and add jewelry only where that culture and rank called for it.`,
    framing(her),
    `${sheHe} looks straight into the lens. Photorealistic, editorial cover lighting.`,
  ].filter(Boolean).join(' ')
}

let slugs = process.argv.slice(2)
if (slugs[0] === '--next') {
  const n = Number(slugs[1] ?? 5)
  const done = new Set(readdirSync(DONE).filter((f) => /\.(jpg|png|webp)$/i.test(f)).map((f) => basename(f, '.' + f.split('.').pop())))
  slugs = targets.filter((r) => !done.has(r.nickname) && !done.has(r.slug)).slice(0, n).map((r) => r.slug)
}

const made = []
for (const slug of slugs) {
  const row = targets.find((r) => r.slug === slug)
  if (!row) { console.log(`${slug}: 대상에 없음`); continue }
  const b = batch.get(slug)
  const seedSrc = b?.facePath
  const seed = seedSrc && existsSync(seedSrc) ? seedSrc.replace(/\\/g, '/') : null
  const out = { slug, nickname: row.nickname, seed, prompt: buildPrompt(row) }
  writeFileSync(join(QUEUE, `${slug}.json`), JSON.stringify(out, null, 1), 'utf-8')
  made.push(out)
  console.log(`${row.nickname.padEnd(14)} 씨앗 ${seed ? 'O' : 'X'} · 프롬프트 ${out.prompt.length}자`)
}
console.log(`\n${made.length}건 → ${QUEUE}`)
