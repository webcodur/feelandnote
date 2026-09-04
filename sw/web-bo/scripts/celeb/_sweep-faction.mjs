import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY)

const RENAME = [
  ['유피테르', '주피터'], ['유노', '주노'], ['넵투누스', '넵튠'],
  ['베누스', '비너스'], ['메르쿠리우스', '머큐리'],
]
const PARTICLE = [
  ['넵투누스가', '넵튠이'], ['넵투누스는', '넵튠은'], ['넵투누스를', '넵튠을'],
  ['넵투누스와', '넵튠과'], ['넵투누스로', '넵튠으로'],
]
const TAIL = new Set('은는이가을를와과의에도만로으라랑께서부까보든야여조마밖처한나며다입였답더'.split(''))
const isHangul = (ch) => ch >= '가' && ch <= '힣'

function replaceName(text, from, to) {
  let out = '', i = 0
  while (i < text.length) {
    if (text.startsWith(from, i)) {
      const next = text[i + from.length]
      if (next === undefined || !isHangul(next) || TAIL.has(next)) { out += to; i += from.length; continue }
    }
    out += text[i]; i++
  }
  return out
}
function convert(value) {
  if (typeof value === 'string') {
    let out = value
    for (const [a, b] of PARTICLE) out = replaceName(out, a, b)
    for (const [a, b] of RENAME) out = replaceName(out, a, b)
    return out
  }
  if (Array.isArray(value)) return value.map(convert)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convert(v)]))
  return value
}

// 세력도감 뷰(faction_atlas_members)의 원천. 뷰는 직접 못 고치므로 여기서 고친다.
const FIELDS = ['name', 'epithet', 'lines', 'quote', 'quote_chunks', 'web_short_desc', 'web_long_desc']

let rows = [], from = 0
while (true) {
  const { data, error } = await db.from('faction_people').select(['id', ...FIELDS].join(','))
    .order('id', { ascending: true }).range(from, from + 499)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) break
  rows = rows.concat(data); from += data.length
}

const changed = []
for (const r of rows) {
  const patch = {}
  for (const f of FIELDS) {
    const next = convert(r[f])
    if (JSON.stringify(next) !== JSON.stringify(r[f])) patch[f] = next
  }
  if (Object.keys(patch).length) changed.push({ id: r.id, before: r, patch })
}

console.log(`faction_people ${rows.length}행 조회 / ${changed.length}행 변경\n`)
for (const c of changed) {
  const f = Object.keys(c.patch)[0]
  console.log(`  - ${String(JSON.stringify(c.before[f])).slice(0, 95)}`)
  console.log(`  + ${String(JSON.stringify(c.patch[f])).slice(0, 95)}\n`)
}

if (!APPLY) {
  console.log('(dry-run) --apply 없이 실행됨.')
  process.exit(0)
}
for (const c of changed) {
  const { error } = await db.from('faction_people').update(c.patch).eq('id', c.id)
  if (error) throw new Error(`${c.id}: ${error.message}`)
}
console.log('반영 완료.')
