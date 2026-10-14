/** Wikidata의 가족 사실과 명시적 영향·사제·공동창업·대립 사실을 수집한다.
 * 규칙: docs/project/celeb/celeb-07-01-relations.md. 기본 dry-run, 조사 보강은 --supplement.
 */
import { createClient } from '@feelandnote/db'
import { canonicalizeCelebRelation, celebRelationInputGroup, celebRelationFactKey, isCelebFamilyRelation, CELEB_RELATION_AXES, celebRelationPairKey, preferSpecificCelebRelationType, type CelebRelationInputType } from '@feelandnote/shared/constants/celeb-relations'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { externalFamilyRelationFacts, relationConflict, type RelationFact } from './relations-supplement'
import { WIKIDATA_RELATION_PROPS, canCollectExternalRelation } from './relations-wikidata'

config({ path: resolve(process.cwd(), '.env'), quiet: true })
const { values: options } = parseArgs({ args: process.argv.slice(2).filter(arg => arg !== '--'), options: {
  apply: { type: 'boolean', default: false }, supplement: { type: 'string' },
} })
if (options.supplement !== undefined && !options.supplement.trim()) throw new Error('--supplement 조사 파일 경로가 필요합니다.')
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const BATCH = 250
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function wdqsFetch(query: string): Promise<Record<string, { value: string }>[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql?format=json', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'feelandnote-relations-sync/1.0 (webcodur@gmail.com)',
          accept: 'application/sparql-results+json',
        },
        body: `query=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(90000),
      })
      if (!res.ok) throw new Error(`WDQS ${res.status}`)
      const json = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } }
      return json.results.bindings
    } catch (e) {
      if (attempt >= 3) throw e
      console.log(`  재시도 ${attempt}/3 — ${(e as Error).message}`)
      await sleep(5000 * attempt)
    }
  }
}

type Row = { slug: string; id: string; nickname: string; wikidata_qid: string | null }

async function loadCelebs(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('celebs')
      .select('slug, id, nickname, wikidata_qid')
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function run() {
  if (options.supplement) {
    const { runRelationSupplement } = await import('./relations-supplement-run')
    await runRelationSupplement(db, resolve(options.supplement), options.apply)
    return
  }
  const celebs = await loadCelebs()
  const holders = new Map<string, Row[]>()
  for (const person of celebs) {
    if (!person.wikidata_qid) continue
    holders.set(person.wikidata_qid, [...(holders.get(person.wikidata_qid) ?? []), person])
  }
  const byQid = new Map<string, Row>()
  let duplicateQids = 0
  for (const [qid, people] of holders) {
    if (people.length === 1) byQid.set(qid, people[0])
    else {
      duplicateQids++
      console.error(`중복 QID 제외: ${qid} ← ${people.map(p => p.slug).join(', ')}`)
    }
  }
  if (options.apply && duplicateQids) throw new Error(`중복 QID ${duplicateQids}건을 먼저 교정해야 합니다. DB 반영을 중단합니다.`)
  const existing: Array<RelationFact & { id: string; source: string }> = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('celeb_relations').select('id,from_id,to_id,rel_type,rel_group,source').order('id').range(offset, offset + 999)
    if (error) throw error
    existing.push(...data)
    if (data.length < 1000) break
  }
  // 수동 기록과 기존 세부 유형은 보존한다. 현재 네 축의 자동 기록만 갱신한다.
  const replaceable = (r: typeof existing[number]) => r.source === 'wikidata'
    && !isCelebFamilyRelation(r.rel_type, r.rel_group) && (CELEB_RELATION_AXES as readonly string[]).includes(r.rel_type)
  const preserved: RelationFact[] = existing.filter(r => !replaceable(r))
  const existingExternalKeys = new Set<string>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('celeb_relations_external')
      .select('id,from_id,qid,rel_type,rel_group').order('id').range(offset, offset + 999)
    if (error) throw error
    preserved.push(...externalFamilyRelationFacts(data ?? [], celebs))
    for (const row of data ?? []) existingExternalKeys.add(`${row.from_id}|${row.qid}|${row.rel_type}`)
    if (!data || data.length < 1000) break
  }
  const byPair = new Map<string, RelationFact[]>()
  for (const row of preserved) {
    const key = [row.from_id, row.to_id].sort().join('|')
    byPair.set(key, [...(byPair.get(key) ?? []), row])
  }
  const edges = new Map<string, { from_id: string; to_id: string; rel_type: string; rel_group: string; source: 'wikidata'; note: string | null; note_en: string | null }>()
  const external = new Map<string, { from_id: string; qid: string; rel_type: CelebRelationInputType; rel_group: 'family'; source: 'wikidata' }>()
  function add(a: string, b: string, type: CelebRelationInputType, note: string | null = null, noteEn: string | null = null) {
    const from = byQid.get(a), to = byQid.get(b)
    if (!from || a === b) return
    if (!to) {
      if (!canCollectExternalRelation(type, holders.has(b)) || !/^Q\d+$/.test(b)) return
      const key = `${from.id}|${b}|${type}`
      if (!existingExternalKeys.has(key)) external.set(key, { from_id: from.id, qid: b, rel_type: type, rel_group: 'family', source: 'wikidata' })
      return
    }
    const c = canonicalizeCelebRelation({ fromId: from.id, toId: to.id, relType: type })
    const row = { from_id: c.fromId, to_id: c.toId, rel_type: c.relType }
    if (relationConflict(row, byPair.get([from.id, to.id].sort().join('|')) ?? [])) return
    const key = celebRelationFactKey(c)
    const previous = edges.get(key)
    if (previous && preferSpecificCelebRelationType(c.relType, previous.rel_type)) {
      edges.set(key, { ...previous, ...row })
    } else if (previous && note && !previous.note?.includes(note)) {
      previous.note = previous.note ? `${previous.note} / ${note}` : note
      previous.note_en = previous.note_en ? `${previous.note_en} / ${noteEn}` : noteEn
    } else if (!previous) edges.set(key, { ...row, rel_group: celebRelationInputGroup(c.relType as CelebRelationInputType), source: 'wikidata', note, note_en: noteEn })
  }
  const qids = [...byQid.keys()]
  const allValues = qids.map(q => `wd:${q}`).join(' ')
  const propList = Object.keys(WIKIDATA_RELATION_PROPS).map(p => `wdt:${p}`).join(' ')
  console.log(`셀럽 ${celebs.length} · QID ${qids.length} · ${options.apply ? '반영' : 'dry-run'}`)
  for (let offset = 0; offset < qids.length; offset += BATCH) {
    const values = qids.slice(offset, offset + BATCH).map(q => `wd:${q}`).join(' ')
    const triples = await wdqsFetch(`SELECT ?a ?p ?b WHERE { VALUES ?a { ${values} } VALUES ?p { ${propList} } ?a ?p ?b . FILTER(isIRI(?b)) }`)
    for (const row of triples) add(row.a.value.split('/').pop()!, row.b.value.split('/').pop()!, WIKIDATA_RELATION_PROPS[row.p.value.split('/').pop()!])
    await sleep(1100)
    const founders = await wdqsFetch(`SELECT DISTINCT ?a ?b ?org ?ko ?en WHERE { VALUES ?a { ${values} } VALUES ?b { ${allValues} }
      ?org wdt:P112 ?a . ?org wdt:P112 ?b . FILTER(?a != ?b)
      OPTIONAL { ?org rdfs:label ?ko . FILTER(lang(?ko)='ko') }
      OPTIONAL { ?org rdfs:label ?en . FILTER(lang(?en)='en') } }`)
    for (const row of founders) {
      const ko = row.ko?.value ?? row.en?.value, en = row.en?.value ?? row.ko?.value
      if (!ko || !en) continue
      add(row.a.value.split('/').pop()!, row.b.value.split('/').pop()!, 'colleague', `${ko} 공동 창업`, `Co-founded ${en}`)
    }
    console.log(`조회 ${Math.min(offset + BATCH, qids.length)}/${qids.length} · 가족·사회 사실 ${edges.size} · 외부 가족 ${external.size}`)
    if (offset + BATCH < qids.length) await sleep(1100)
  }
  const familyPairs = new Set([...preserved, ...edges.values()].filter(r => isCelebFamilyRelation(r.rel_type, r.rel_group)).map(r => celebRelationPairKey(r.from_id, r.to_id)))
  const rows = [...edges.values()].filter(r => isCelebFamilyRelation(r.rel_type) || !familyPairs.has(celebRelationPairKey(r.from_id, r.to_id)))
  const labels = new Map<string, { name_ko: string | null; name_en: string | null; image_url: string | null }>()
  const externalQids = [...new Set([...external.values()].map(r => r.qid))]
  for (let i = 0; i < externalQids.length; i += 100) {
    const values = externalQids.slice(i, i + 100).map(q => `wd:${q}`).join(' ')
    const found = await wdqsFetch(`SELECT ?q ?ko ?en ?img WHERE { VALUES ?q { ${values} }
      OPTIONAL { ?q rdfs:label ?ko . FILTER(lang(?ko)='ko') }
      OPTIONAL { ?q rdfs:label ?en . FILTER(lang(?en)='en') }
      OPTIONAL { ?q wdt:P18 ?img } }`)
    for (const row of found) labels.set(row.q.value.split('/').pop()!, {
      name_ko: row.ko?.value ?? null, name_en: row.en?.value ?? null, image_url: row.img?.value ? `${row.img.value.replace(/^http:\/\//, 'https://')}?width=112` : null,
    })
    if (i + 100 < externalQids.length) await sleep(1100)
  }
  const externalRows = [...external.values()].flatMap(r => {
    const label = labels.get(r.qid)
    return label && (label.name_ko || label.name_en) ? [{ ...r, ...label }] : []
  })
  const touched = new Set(rows.flatMap(r => [r.from_id, r.to_id]))
  console.log(`신규·갱신 후보 ${rows.length} · 외부 가족 ${externalRows.length} · 연결 인물 ${touched.size} · 수동·레거시 보존 ${preserved.length}`)
  if (!options.apply) { console.log('DB 미반영. 검증한 후보를 --apply로 반영합니다.'); return }
  // 수집·삽입이 모두 성공한 뒤 기존 자동 기록의 잔여 행만 삭제한다.
  for (let offset = 0; offset < rows.length; offset += 500) {
    const { error } = await db.from('celeb_relations').upsert(rows.slice(offset, offset + 500), { onConflict: 'from_id,to_id,rel_type', ignoreDuplicates: true })
    if (error) throw error
  }
  for (let offset = 0; offset < externalRows.length; offset += 500) {
    const { error } = await db.from('celeb_relations_external').upsert(externalRows.slice(offset, offset + 500), { onConflict: 'from_id,qid,rel_type', ignoreDuplicates: true })
    if (error) throw error
  }
  const keptKeys = new Set(rows.map(r => celebRelationFactKey({ fromId: r.from_id, toId: r.to_id, relType: r.rel_type })))
  const staleIds = existing.filter(r => replaceable(r) && !keptKeys.has(celebRelationFactKey({ fromId: r.from_id, toId: r.to_id, relType: r.rel_type }))).map(r => r.id)
  for (let offset = 0; offset < staleIds.length; offset += 500) {
    const { error } = await db.from('celeb_relations').delete().in('id', staleIds.slice(offset, offset + 500)).eq('source', 'wikidata')
    if (error) throw error
  }
  console.log(`반영 완료 · 후보 ${rows.length} · 이전 자동 사실 제거 ${staleIds.length}`)
}
run().catch(error => { console.error(error); process.exitCode = 1 })
