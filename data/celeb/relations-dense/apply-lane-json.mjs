import { createClient } from 'file:///C:/project/feelandnote/sw/web-bo/node_modules/@supabase/supabase-js/dist/index.mjs'
import {
  canonicalizeCelebRelation,
  celebRelationFactKey,
} from '@feelandnote/shared/constants/celeb-relations'
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
  influence: { type: 'influence', group: 'thought' },
  teacher: { type: 'teacher', group: 'thought' },
  cofounder: { type: 'cofounder', group: 'career' },
  friend: { type: 'friend', group: 'friendship' },
  rival: { type: 'rival', group: 'rivalry' },
}

const skipExact = new Set([
  'michael-jackson|diana-ross|teacher',
  'matt-damon|ben-affleck|cofounder',
  'sylvester-stallone|arnold-schwarzenegger|rival',
  'son-heung-min|son-woong-jung|teacher',
])

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, { auth: { persistSession: false } })
const json = JSON.parse(readFileSync(file, 'utf8'))
const pairs = json.pairs ?? []
const slugs = [...new Set(pairs.flatMap((p) => [p.a, p.b]))]
const { data: celebs, error } = await db.from('celebs').select('id,slug').in('slug', slugs)
if (error) throw error
const id = Object.fromEntries(celebs.map((c) => [c.slug, c.id]))
const missing = slugs.filter((s) => !id[s])

const [outgoing, incoming] = await Promise.all([
  db.from('celeb_relations').select('from_id,to_id,rel_type').in('from_id', Object.values(id)),
  db.from('celeb_relations').select('from_id,to_id,rel_type').in('to_id', Object.values(id)),
])
if (outgoing.error) throw outgoing.error
if (incoming.error) throw incoming.error
const have = new Set(
  [...(outgoing.data ?? []), ...(incoming.data ?? [])].map((row) => celebRelationFactKey({
    fromId: row.from_id,
    toId: row.to_id,
    relType: row.rel_type,
  })),
)

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
  const canonical = canonicalizeCelebRelation({ fromId: id[p.a], toId: id[p.b], relType: spec.type })
  const factKey = celebRelationFactKey(canonical)
  if (have.has(factKey)) { skipped.push({ reason: 'exists', a: p.a, b: p.b, kind: p.kind }); continue }
  if (!p.note_ko || !p.note_en) { skipped.push({ reason: 'note', a: p.a, b: p.b }); continue }
  rows.push({
    from_id: canonical.fromId,
    to_id: canonical.toId,
    rel_type: canonical.relType,
    rel_group: spec.group,
    source: 'manual',
    note: p.note_ko,
    note_en: p.note_en,
  })
  have.add(factKey)
  applied.push({ a: p.a, b: p.b, kind: p.kind })
}

if (rows.length) {
  const { error: upErr } = await db.from('celeb_relations').upsert(rows, { onConflict: 'from_id,to_id,rel_type' })
  if (upErr) throw upErr
}

const stamp = resolve('C:/project/feelandnote/data/celeb/relations-dense', `2026-08-22-${json.lane}.json`)
mkdirSync(resolve('C:/project/feelandnote/data/celeb/relations-dense'), { recursive: true })
writeFileSync(stamp, JSON.stringify({ applied_at: new Date().toISOString(), lane: json.lane, applied, skipped, missing }, null, 2), 'utf8')
console.log(JSON.stringify({ lane: json.lane, upserted: rows.length, relations: applied.length, skipped: skipped.length, missing }, null, 2))
