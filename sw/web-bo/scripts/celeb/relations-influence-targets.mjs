/** 영향력·조회수 상위 인물의 영향 관계 결손을 DB에서 조회한다. DB·작업 상태를 쓰지 않는다. */
import { parseArgs } from 'node:util'
import { createClient } from '@feelandnote/db'
import { canonicalizeCelebRelationAxis, celebRelationAxis, celebRelationPairKey, isCelebFamilyRelation } from '@feelandnote/shared/constants/celeb-relations'
import { wikidataQidOf } from '@feelandnote/shared/constants/celeb-wikidata'

const { values } = parseArgs({ options: {
  limit: { type: 'string', default: '10' },
  'top-percent': { type: 'string', default: '10' },
  json: { type: 'boolean', default: false },
} })
const limit = Number(values.limit)
const topPercent = Number(values['top-percent'])
if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(topPercent) || topPercent <= 0 || topPercent > 100) {
  throw new Error('--limit는 양의 정수, --top-percent는 0 초과 100 이하가 필요합니다.')
}
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
async function allRows(table, columns, order, active = false) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(columns).order(order).range(from, from + 999)
    if (active) query = query.eq('publication_status', 'active')
    const { data, error } = await query
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}
const [people, scores, relations, external] = await Promise.all([
  allRows('celebs', 'id,slug,nickname,nickname_en,title,profession,view_count,celeb_reality,wikidata_qid,birth_date,death_date', 'id', true),
  allRows('celeb_influence', 'celeb_id,total_score', 'celeb_id'),
  allRows('celeb_relations', 'id,from_id,to_id,rel_type,rel_group', 'id'),
  allRows('celeb_relations_external', 'id,from_id,qid,rel_type,rel_group', 'id'),
])
const real = people.filter(p => p.celeb_reality !== 'FICTION' && p.slug)
const scoreById = new Map(scores.map(r => [r.celeb_id, Number(r.total_score ?? 0)]))
// 동점은 같은 순위다. 조회·영향력이 모두 0인 사람은 상위 동점으로 끌어올리지 않는다.
function percentileMap(value) {
  const sorted = [...real].sort((a, b) => value(a) - value(b))
  const map = new Map()
  let rank = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || value(sorted[i]) !== value(sorted[i - 1])) rank = i
    map.set(sorted[i].id, value(sorted[i]) > 0 ? rank / Math.max(1, sorted.length - 1) : 0)
  }
  return map
}
const viewRank = percentileMap(p => Number(p.view_count ?? 0))
const influenceRank = percentileMap(p => scoreById.get(p.id) ?? 0)
const counts = new Map(real.map(p => [p.id, { influence_sources: 0, influence_recipients: 0 }]))
const peopleByQid = new Map(people.flatMap(p => { const qid = wikidataQidOf(p.wikidata_qid); return qid ? [[qid, p]] : [] }))
const familyPairs = new Set(relations
  .filter(r => isCelebFamilyRelation(r.rel_type, r.rel_group))
  .map(r => celebRelationPairKey(r.from_id, r.to_id)))
const externalFamilyPairs = new Set(external
  .filter(r => isCelebFamilyRelation(r.rel_type, r.rel_group)).map(r => `${r.from_id}|${r.qid}`))
for (const row of external) {
  if (!isCelebFamilyRelation(row.rel_type, row.rel_group)) continue
  const target = peopleByQid.get(row.qid)
  if (target) familyPairs.add(celebRelationPairKey(row.from_id, target.id))
}
const facts = new Set()
for (const row of relations) {
  if (familyPairs.has(celebRelationPairKey(row.from_id, row.to_id))) continue
  const r = canonicalizeCelebRelationAxis({ fromId: row.from_id, toId: row.to_id, relType: row.rel_type })
  if (!r || r.relType !== 'influence') continue
  const key = `${r.fromId}|${r.toId}|${r.relType}`
  if (facts.has(key)) continue
  facts.add(key)
  const from = counts.get(r.fromId), to = counts.get(r.toId)
  if (r.relType === 'influence') {
    if (from) from.influence_sources++
    if (to) to.influence_recipients++
  }
}
for (const row of external) {
  const target = peopleByQid.get(row.qid)
  if (externalFamilyPairs.has(`${row.from_id}|${row.qid}`)
    || (target && familyPairs.has(celebRelationPairKey(row.from_id, target.id)))) continue
  const axis = celebRelationAxis(row.rel_type)
  const count = counts.get(row.from_id)
  if (!count || !['influence', 'influenced'].includes(axis)) continue
  const key = `${row.from_id}|${row.qid}|${axis}`
  if (facts.has(key)) continue
  facts.add(key)
  if (axis === 'influence') count.influence_sources++
  else count.influence_recipients++
}
const significant = real.filter(p => Math.max(viewRank.get(p.id), influenceRank.get(p.id)) >= 1 - topPercent / 100)
const targets = significant.flatMap(p => {
  const count = counts.get(p.id)
  if (count.influence_sources && count.influence_recipients) return []
  return [{ ...p, ...count, influence_score: scoreById.get(p.id) ?? 0,
    priority: Math.max(viewRank.get(p.id), influenceRank.get(p.id)),
    missing: [!count.influence_sources && 'influence_sources', !count.influence_recipients && 'influence_recipients'].filter(Boolean),
  }]
}).sort((a, b) => b.priority - a.priority || b.view_count - a.view_count || a.slug.localeCompare(b.slug))
const result = { population: real.length, significant: significant.length, missing: targets.length, topPercent, targets: targets.slice(0, limit) }
if (values.json) console.log(JSON.stringify(result, null, 2))
else {
  console.log(`공개 실존 인물 ${result.population}명 · 조회수 또는 영향력 상위 ${topPercent}% ${result.significant}명 · 영향 관계 한쪽 이상 미수록 ${result.missing}명`)
  for (const p of result.targets) console.log(`${p.slug} | ${p.nickname} | 조회 ${p.view_count} 영향력 ${p.influence_score} | 영향원 ${p.influence_sources} 수용자 ${p.influence_recipients}`)
}
