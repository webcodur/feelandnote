import { createClient } from 'file:///C:/project/feelandnote/sw/web-bo/node_modules/@supabase/supabase-js/dist/index.mjs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const p = resolve('C:/project/feelandnote/sw/web-bo/.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|['"]$/g, '')
  }
}
loadEnv()

const file = process.argv[2]
if (!file) throw new Error('usage: node apply-lane-json.mjs <pairs.json>')

const KIND = {
  influence: { a: 'influence', b: 'influenced', group: 'thought' },
  teacher: { a: 'teacher', b: 'student', group: 'thought' },
  cofounder: { a: 'cofounder', b: 'cofounder', group: 'career' },
  friend: { a: 'friend', b: 'friend', group: 'friendship' },
  rival: { a: 'rival', b: 'rival', group: 'rivalry' },
}

const skipExact = new Set([
  'michael-jackson|diana-ross|teacher',
  'matt-damon|ben-affleck|cofounder',
  'sylvester-stallone|arnold-schwarzenegger|rival',
  'son-heung-min|son-woong-jung|teacher',
])

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const json = JSON.parse(readFileSync(file, 'utf8'))
const pairs = json.pairs ?? []
const slugs = [...new Set(pairs.flatMap((p) => [p.a, p.b]))]
const { data: celebs, error } = await db.from('celebs').select('id,slug').in('slug', slugs)
if (error) throw error
const id = Object.fromEntries(celebs.map((c) => [c.slug, c.id]))
const missing = slugs.filter((s) => !id[s])

const { data: existing } = await db.from('celeb_relations').select('from_id,to_id,rel_type').in('from_id', Object.values(id))
const have = new Set((existing ?? []).map((r) => `${r.from_id}|${r.to_id}|${r.rel_type}`))

const rows = []
const applied = []
const skipped = []
for (const p of pairs) {
  const spec = KIND[p.kind]
  if (!spec) { skipped.push({ reason: 'kind', a: p.a, b: p.b }); continue }
  if (!id[p.a] || !id[p.b]) { skipped.push({ reason: 'slug', a: p.a, b: p.b }); continue }
  if (skipExact.has(`${p.a}|${p.b}|${p.kind}`) || skipExact.has(`${p.b}|${p.a}|${p.kind}`)) {
    skipped.push({ reason: 'already', a: p.a, b: p.b, kind: p.kind }); continue
  }
  const aKey = `${id[p.a]}|${id[p.b]}|${spec.a}`
  const bKey = `${id[p.b]}|${id[p.a]}|${spec.b}`
  if (have.has(aKey) || have.has(bKey)) { skipped.push({ reason: 'exists', a: p.a, b: p.b, kind: p.kind }); continue }
  if (!p.a_ko || !p.a_en || !p.b_ko || !p.b_en) { skipped.push({ reason: 'note', a: p.a, b: p.b }); continue }
  rows.push({ from_id: id[p.a], to_id: id[p.b], rel_type: spec.a, rel_group: spec.group, source: 'manual', note: p.a_ko, note_en: p.a_en })
  rows.push({ from_id: id[p.b], to_id: id[p.a], rel_type: spec.b, rel_group: spec.group, source: 'manual', note: p.b_ko, note_en: p.b_en })
  applied.push({ a: p.a, b: p.b, kind: p.kind })
}

if (rows.length) {
  const { error: upErr } = await db.from('celeb_relations').upsert(rows, { onConflict: 'from_id,to_id,rel_type' })
  if (upErr) throw upErr
}

const stamp = resolve('C:/project/feelandnote/data/celeb/relations-dense', `2026-08-22-${json.lane}.json`)
mkdirSync(resolve('C:/project/feelandnote/data/celeb/relations-dense'), { recursive: true })
writeFileSync(stamp, JSON.stringify({ applied_at: new Date().toISOString(), lane: json.lane, applied, skipped, missing }, null, 2), 'utf8')
console.log(JSON.stringify({ lane: json.lane, upserted: rows.length, pairs: applied.length, skipped: skipped.length, missing }, null, 2))
