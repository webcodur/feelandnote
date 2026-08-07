/**
 * 수동 조사 연표 일괄 적재기.
 * JSON 파일 구조:
 * {
 *   "people": [
 *     {
 *       "slug": "bill-russell",
 *       "events": [
 *         { "year": 1934, "yearEnd": null, "month": null, "day": null,
 *           "title": "...다", "titleEn": "...",
 *           "description": "2~3문장", "descriptionEn": "2~3문장",
 *           "kind": "birth|death|...",
 *           "placeName": "먼로", "placeNameEn": "Monroe",
 *           "placeQuery": "Monroe, Louisiana", "placeCountry": "United States of America" }
 *       ]
 *     }
 *   ]
 * }
 *
 * placeQuery/placeCountry가 있으면 위키데이터에서 좌표를 조회해 lat/lng/placeQid를 채운다.
 * --apply가 없으면 DB 대상 확인만 하고 끝낸다.
 * 실행 (sw/web-bo): node /path/to/timeline-apply-json.mjs /path/to/data.json --apply
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const APPLY = process.argv.includes('--apply')
const dataPath = process.argv.find((arg) => arg.endsWith('.json') && !arg.startsWith('--'))
if (!dataPath) throw new Error('JSON 경로가 필요하다')
const payload = JSON.parse(readFileSync(dataPath, 'utf-8'))

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const UA = { 'user-agent': 'feelandnote-timeline-manual/1.0 (webcodur@gmail.com)' }

async function fetchAll(table, select, configure = (q) => q) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await configure(supabase.from(table).select(select)).range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

const [profiles, researchEvents] = await Promise.all([
  fetchAll('profiles', 'id, slug, birth_date, death_date'),
  fetchAll('celeb_timeline_events', 'celeb_id, source'),
])
const profileById = new Map(profiles.map((p) => [p.id, p]))
const profileBySlug = new Map(profiles.map((p) => [p.slug, p]))
const hasResearch = new Set(researchEvents.filter((e) => e.source === 'research').map((e) => e.celeb_id))

// 대상 검증
for (const person of payload.people) {
  const profile = profileBySlug.get(person.slug)
  if (!profile) throw new Error(`없는 slug: ${person.slug}`)
  if (hasResearch.has(profile.id)) console.log(`↷ ${person.slug}: 이미 research 적재 있음 — 건너뜀 (force 없음)`)
}
console.log(`JSON 인물 ${payload.people.length}명`)
if (!APPLY) {
  console.log('목록만 확인했다. 적재하려면 --apply를 붙여라.')
  process.exit(0)
}

function normalizeCountry(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return new Map([
    ['united states', 'united states of america'], ['usa', 'united states of america'],
    ['south korea', 'republic of korea'], ['north korea', "democratic people's republic of korea"],
    ['russia', 'russian federation'],
  ]).get(normalized) ?? normalized
}
function normalizeLabel(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function geocode(placeEn, country) {
  if (!placeEn) return null
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(placeEn)}&language=en&uselang=en&limit=8&format=json`
  const response = await fetch(searchUrl, { headers: UA, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) return null
  const hits = (await response.json()).search ?? []
  if (!hits.length) return null
  const query = `SELECT ?item ?coord ?countryLabel WHERE {
    VALUES ?item { ${hits.map((hit) => `wd:${hit.id}`).join(' ')} }
    ?item wdt:P625 ?coord .
    OPTIONAL { ?item wdt:P17 ?country . ?country rdfs:label ?countryLabel . FILTER(LANG(?countryLabel)='en') }
  }`
  const result = await fetch('https://query.wikidata.org/sparql?format=json', {
    method: 'POST',
    headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/sparql-results+json' },
    body: `query=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(45_000),
  })
  if (!result.ok) return null
  const found = new Map()
  for (const binding of (await result.json()).results.bindings) {
    const qid = binding.item.value.split('/').pop()
    if (found.has(qid)) continue
    const point = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(binding.coord.value)
    if (!point) continue
    const hit = hits.find((candidate) => candidate.id === qid)
    found.set(qid, { qid, lng: Number(point[1]), lat: Number(point[2]), country: binding.countryLabel?.value ?? '', label: hit?.label ?? '' })
  }
  const ordered = hits.map((hit) => found.get(hit.id)).filter(Boolean)
  if (country) {
    const matches = ordered.filter((candidate) => normalizeCountry(candidate.country) === normalizeCountry(country))
    if (matches.length === 1) return matches[0]
    const exact = matches.filter((candidate) => normalizeLabel(candidate.label) === normalizeLabel(placeEn))
    return exact.length === 1 ? exact[0] : null
  }
  const exact = ordered.filter((candidate) => normalizeLabel(candidate.label) === normalizeLabel(placeEn))
  return exact.length === 1 ? exact[0] : null
}

function comparable(row) {
  return {
    year: row.year, year_end: row.year_end ?? null, month: row.month ?? null, day: row.day ?? null,
    title: row.title, title_en: row.title_en, description: row.description, description_en: row.description_en,
    kind: row.kind, place_name: row.place_name ?? null, place_name_en: row.place_name_en ?? null,
    lat: row.lat ?? null, lng: row.lng ?? null, place_qid: row.place_qid ?? null,
    source: row.source, source_url: row.source_url ?? null, sort_order: row.sort_order,
  }
}

async function deleteByIds(ids) {
  if (!ids.length) return null
  const { error } = await supabase.from('celeb_timeline_events').delete().in('id', ids)
  return error
}

async function replaceTimeline(personId, rows) {
  const { data: oldRows, error: oldError } = await supabase.from('celeb_timeline_events').select('*').eq('celeb_id', personId).eq('source', 'research')
  if (oldError) throw oldError
  const { data: inserted, error: insertError } = await supabase.from('celeb_timeline_events').insert(rows).select('id')
  if (insertError || inserted?.length !== rows.length) {
    if (inserted?.length) await deleteByIds(inserted.map((row) => row.id))
    throw new Error(insertError?.message ?? `${inserted?.length ?? 0}/${rows.length}건만 삽입됐다`)
  }
  const deleteError = await deleteByIds(oldRows.map((row) => row.id))
  if (deleteError) { await deleteByIds(inserted.map((row) => row.id)); throw deleteError }
  const { data: saved, error: verifyError } = await supabase.from('celeb_timeline_events').select('*').eq('celeb_id', personId).eq('source', 'research').order('sort_order')
  if (verifyError || JSON.stringify(saved.map(comparable)) !== JSON.stringify(rows.map(comparable))) {
    await supabase.from('celeb_timeline_events').delete().eq('celeb_id', personId).eq('source', 'research')
    if (oldRows.length) await supabase.from('celeb_timeline_events').insert(oldRows)
    throw new Error(`DB 저장 후 대조 실패${verifyError ? `: ${verifyError.message}` : ''}`)
  }
}

let ok = 0
for (const person of payload.people) {
  const profile = profileBySlug.get(person.slug)
  if (hasResearch.has(profile.id)) continue
  try {
    const placeCache = new Map()
    const events = []
    for (const event of person.events) {
      const query = event.placeQuery?.trim() || event.placeNameEn?.split(',')[0]?.trim() || ''
      const key = `${query}|${event.placeCountry ?? ''}`
      if (query && !placeCache.has(key)) placeCache.set(key, await geocode(query, event.placeCountry))
      const place = query ? placeCache.get(key) : null
      events.push({
        year: event.year, year_end: event.yearEnd ?? null, month: event.month ?? null, day: event.day ?? null,
        title: event.title.trim(), title_en: event.titleEn.trim(),
        description: event.description.trim(), description_en: event.descriptionEn.trim(),
        kind: event.kind, place_name: event.placeName || null, place_name_en: event.placeNameEn || null,
        lat: place?.lat ?? null, lng: place?.lng ?? null, place_qid: place?.qid ?? null,
        source: 'research', source_url: null,
      })
    }
    events.sort((a, b) => a.year - b.year)
    const rows = events.map((event, sort_order) => ({ ...event, celeb_id: profile.id, sort_order }))
    await replaceTimeline(profile.id, rows)
    ok++
    console.log(`✓ ${person.slug} ${rows.length}건 (좌표 ${rows.filter((r) => r.lat != null).length})`)
  } catch (error) {
    console.log(`✗ ${person.slug} — ${String(error?.message ?? error).slice(0, 200)}`)
  }
}
console.log(`\n완료 ${ok} / 실패 ${payload.people.length - ok}`)
