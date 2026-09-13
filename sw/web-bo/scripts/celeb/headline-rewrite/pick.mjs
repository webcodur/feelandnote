/**
 * 무기명 대결의 선택 번호를 대결 relay 로 옮긴다.
 *
 * 심사자는 번호만 돌려준다. 번호와 출처의 대응은 shuffle.mjs 가 남긴 key 파일에만 있고,
 * 그 출처로 phase 가 정해진다 — 한영 모두 current 가 이기면 skip, 하나라도 신규안이나
 * 직전 개편안이 이기면 confirm (SKILL.md 「10안 무기명 경쟁전」 7항).
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/headline-rewrite/pick.mjs <slug> <ko번호> <en번호>
 * 여러 명을 한 레인에 모아 쓸 때도 slug 단위로 호출한다. 같은 레인이면 items 에 누적된다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), '../../data/celeb/headline-rewrite')
const KEY_DIR = path.join(ROOT, '.tmp/relay/key')
const REV_DIR = path.join(ROOT, '.tmp/relay/review')
fs.mkdirSync(REV_DIR, { recursive: true })

const [slug, koN, enN] = process.argv.slice(2)
if (!slug || !koN || !enN) throw new Error('사용법: pick.mjs <slug> <ko번호> <en번호>')

const key = JSON.parse(fs.readFileSync(path.join(KEY_DIR, `${slug}.json`), 'utf8'))
const ko = key.ko[Number(koN) - 1]
const en = key.en[Number(enN) - 1]
if (!ko || !en) throw new Error(`${slug}: 번호가 후보 범위를 벗어난다 (ko ${key.ko.length}개 / en ${key.en.length}개)`)

const phase = ko.from === 'current' && en.from === 'current' ? 'skip' : 'confirm'
const item = {
  id: key.id,
  slug,
  phase,
  headline: ko.text,
  headline_en: en.text,
  selection: { ko: ko.from, en: en.from },
}

const lane = String(key.lane).padStart(2, '0')
const file = path.join(REV_DIR, `lane-${lane}.json`)
const pack = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, 'utf8'))
  : { lane: key.lane, reviewVersion: 2, items: [] }
pack.items = pack.items.filter((x) => x.slug !== slug)
pack.items.push(item)
fs.writeFileSync(file, JSON.stringify(pack, null, 2) + '\n', 'utf8')

console.log(`${slug} (${key.nickname}) → ${phase}`)
console.log(`  ko(${ko.from}) ${ko.text}`)
console.log(`  en(${en.from}) ${en.text}`)
console.log(`  → ${file}`)
