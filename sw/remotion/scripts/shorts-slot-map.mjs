#!/usr/bin/env node
// 쇼츠 슬롯 매핑 진단: 책 폴더 → shortsIndex → voice/out/youtube 슬롯 대조
// 사용법: node scripts/shorts-slot-map.mjs <episode> [locale=ko]
import fs from 'node:fs'
import path from 'node:path'

const ep = process.argv[2]
const locale = process.argv[3] || 'ko'
if (!ep) { console.error('사용법: node scripts/shorts-slot-map.mjs <episode> [locale]'); process.exit(1) }

const epDir = path.join('public/episodes', ep)
const booksDir = path.join(epDir, 'books')
const pascal = ep.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('')
const LANG = locale.toUpperCase()

const lineupPath = 'scripts/youtube/youtube-lineup.json'
const lineup = fs.existsSync(lineupPath) ? (JSON.parse(fs.readFileSync(lineupPath, 'utf8'))[ep] || {}) : {}
const uploads = lineup.uploads || {}

const books = fs.readdirSync(booksDir, { withFileTypes: true })
  .filter(e => e.isDirectory() && /^\d+-/.test(e.name))
  .map(e => e.name).sort()

// voice/gemini/shorts-N 의 celeb 세그먼트 id로 "실제 음성이 어느 쇼츠인지" 역추적용 힌트
function voiceFingerprint(idx) {
  const dir = path.join(epDir, 'voice', locale, 'gemini', `shorts-${idx}`)
  if (!fs.existsSync(dir)) return null
  const segs = fs.readdirSync(dir).filter(f => f.endsWith('.wav') && !f.startsWith('.'))
    .map(f => f.replace(/\.wav$/, '').replace(/^S\d+-/, ''))
  return [...new Set(segs)].join(',')
}

// 각 책 shorts.ko.json 의 식별 지문(celeb id 또는 hook 앞부분)
function bookFingerprint(book) {
  const sc = path.join(booksDir, book, `shorts.${locale}.json`)
  if (!fs.existsSync(sc)) return null
  const d = JSON.parse(fs.readFileSync(sc, 'utf8'))
  const segs = (d.segments || [])
  const celebs = segs.filter(s => s.role === 'celeb').map(s => s.id).join(',')
  const hook = (segs.find(s => s.id === 'hook') || segs[0] || {}).text || ''
  return { celebs, hook: hook.slice(0, 24), segIds: segs.map(s => s.id).join(',') }
}

console.log(`\n=== 쇼츠 슬롯 매핑: ${ep} (${locale}) ===`)
console.log(`출력 PascalCase: ${pascal} / out 경로: out/${pascal}/${LANG}/SN-VID.mp4\n`)

let idx = 0
const rows = []
for (const b of books) {
  const sc = path.join(booksDir, b, `shorts.${locale}.json`)
  const hasShorts = fs.existsSync(sc)
  if (!hasShorts) { rows.push({ book: b, slot: '-', note: 'shorts 없음(슬롯 미부여)' }); continue }
  idx++
  const slot = idx
  const gem = fs.existsSync(path.join(epDir, 'voice', locale, 'gemini', `shorts-${slot}`))
  const ele = fs.existsSync(path.join(epDir, 'voice', locale, 'elevenlabs', `shorts-${slot}`))
  const out = fs.existsSync(path.join('out', pascal, LANG, `S${slot}-VID.mp4`))
  const up = uploads[`${locale}-shorts-${slot}`]
  rows.push({
    book: b, slot: `S${slot}`,
    voice: `${gem ? 'gem' : '·'}/${ele ? 'ele' : '·'}`,
    out: out ? 'O' : '·',
    youtube: up ? `${up.videoId} (${up.uploadedAt.slice(0, 10)})` : '·',
    voiceFp: voiceFingerprint(slot),
    bookFp: bookFingerprint(b),
  })
}

for (const r of rows) {
  if (r.note) { console.log(`[ ${r.book} ]  → ${r.note}`); continue }
  console.log(`[${r.slot}] ${r.book}`)
  console.log(`     voice:${r.voice}  out:${r.out}  youtube:${r.youtube}`)
  if (r.bookFp) console.log(`     책 celeb:[${r.bookFp.celebs}]  hook:"${r.bookFp.hook}…"`)
  if (r.voiceFp) console.log(`     voice/shorts-${r.slot.slice(1)} 음성지문:[${r.voiceFp}]`)
  console.log('')
}

// 위험 경고: youtube 업로드된 슬롯 수보다 앞쪽 책 구성이 바뀌면 매핑 어긋남
const uploadedSlots = Object.keys(uploads).filter(k => k.startsWith(`${locale}-shorts-`)).length
console.log(`── 업로드된 쇼츠: ${uploadedSlots}편, 현재 슬롯 배정: ${idx}편 ──`)
console.log(`※ 책 폴더 사이에 shorts 보유 책이 새로 끼면 그 뒤 슬롯 번호가 전부 +1 밀려,`)
console.log(`   이미 업로드된 youtube ko-shorts-N 기록과 책이 어긋난다. voice 음성지문 ↔ 책 celeb 가 일치하는지 대조하라.`)
