/**
 * 무기명 대결용 후보 목록을 만든다.
 *
 * 심사자는 어느 안이 현재 서비스값인지 몰라야 한다(SKILL.md 「10안 무기명 경쟁전」 6항).
 * 부모가 신규 10안·현재값·직전 개편안을 한데 섞어 출처를 지운 번호 목록을 만들고,
 * 번호와 출처의 대응표는 여기에만 남긴다.
 *
 * 실행 (sw/web-bo 에서): node scripts/celeb/headline-rewrite/shuffle.mjs <slug> [<slug> ...]
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = path.resolve(process.cwd(), '../../data/celeb/headline-rewrite')
const GEN = path.join(ROOT, '.tmp/relay/gen')
const KEY_DIR = path.join(ROOT, '.tmp/relay/key')
fs.mkdirSync(KEY_DIR, { recursive: true })

/** slug 로 시드를 고정해 재실행해도 같은 순서가 나오게 한다 */
function shuffle(items, seed) {
  const arr = items.map((v, i) => ({ v, h: crypto.createHash('md5').update(`${seed}:${i}`).digest('hex') }))
  arr.sort((a, b) => a.h.localeCompare(b.h))
  return arr.map((x) => x.v)
}

for (const slug of process.argv.slice(2)) {
  const file = fs.readdirSync(GEN).find((f) => f.endsWith(`-${slug}.json`))
  if (!file) { console.log(`SKIP ${slug} — 생성 relay 없음`); continue }
  const gen = JSON.parse(fs.readFileSync(path.join(GEN, file), 'utf8'))
  const lane = String(gen.lane).padStart(2, '0')
  const review = JSON.parse(fs.readFileSync(path.join(ROOT, `reviews/lane-${lane}.json`), 'utf8'))
  const person = review.people.find((p) => p.slug === slug)
  if (!person) { console.log(`SKIP ${slug} — 검수 팩에 없음`); continue }

  const ko = [
    ...gen.ideaPool.map((text) => ({ text, from: 'blind' })),
    ...(person.current?.headline ? [{ text: person.current.headline, from: 'current' }] : []),
    ...(person.previous?.headline ? [{ text: person.previous.headline, from: 'previous' }] : []),
  ]
  const en = [
    ...gen.englishPool.map((text) => ({ text, from: 'blind' })),
    ...(person.current?.headline_en ? [{ text: person.current.headline_en, from: 'current' }] : []),
    ...(person.previous?.headline_en ? [{ text: person.previous.headline_en, from: 'previous' }] : []),
  ]
  const koMix = shuffle(ko, `${slug}-ko`)
  const enMix = shuffle(en, `${slug}-en`)

  fs.writeFileSync(path.join(KEY_DIR, `${slug}.json`), JSON.stringify({
    id: gen.id, slug, lane: gen.lane, nickname: gen.nickname, ko: koMix, en: enMix,
  }, null, 2) + '\n', 'utf8')

  console.log(`\n===== ${slug} (${gen.nickname}) =====`)
  console.log('[한국어 후보]')
  koMix.forEach((c, i) => console.log(`${i + 1}. ${c.text}`))
  console.log('[영어 후보]')
  enMix.forEach((c, i) => console.log(`${i + 1}. ${c.text}`))
}
