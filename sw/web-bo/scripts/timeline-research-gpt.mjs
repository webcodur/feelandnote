/**
 * 인물 행적 조사기 — 한 번의 GPT 조사 → 좌표 보강 → DB 직접 적재.
 * 로컬 JSON을 만들지 않으며 celeb_timeline_events가 유일 원천이다.
 *
 * 실행 (sw/web-bo):
 *   node --env-file=.env scripts/timeline-research-gpt.mjs --all-deceased
 *   node --env-file=.env scripts/timeline-research-gpt.mjs --all-deceased --apply --concurrency=3
 *   node --env-file=.env scripts/timeline-research-gpt.mjs --slugs=ada-lovelace,aeschylus --force --apply
 *
 * --apply가 없으면 DB의 미완료 대상만 출력하고 모델을 호출하지 않는다.
 */

import { createClient } from '@supabase/supabase-js'
import { codexCall } from '../../../.claude/skills/codex-gpt/scripts/codex-call.mjs'

const APPLY = process.argv.includes('--apply')
const ALL_DECEASED = process.argv.includes('--all-deceased')
const FORCE = process.argv.includes('--force')
const slugArg = process.argv.find((arg) => arg.startsWith('--slugs='))
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='))
const shardArg = process.argv.find((arg) => arg.startsWith('--shard='))
const LIMIT = limitArg ? Number(limitArg.slice('--limit='.length)) : null
const CONCURRENCY = Number(concurrencyArg?.slice('--concurrency='.length) ?? 2)
const UA = { 'user-agent': 'feelandnote-timeline-research/2.0 (webcodur@gmail.com)' }
const KINDS = new Set([
  'birth', 'death', 'education', 'work', 'publish',
  'battle', 'travel', 'office', 'meeting', 'other',
])

if (!ALL_DECEASED && !slugArg) throw new Error('--all-deceased 또는 --slugs가 필요하다')
if (ALL_DECEASED && slugArg) throw new Error('--all-deceased와 --slugs는 함께 쓸 수 없다')
if (FORCE && !slugArg) throw new Error('--force는 --slugs와 함께 특정 인물에만 쓸 수 있다')
if (!Number.isInteger(CONCURRENCY) || CONCURRENCY < 1 || CONCURRENCY > 6) throw new Error('--concurrency는 1~6 정수여야 한다')
if (LIMIT != null && (!Number.isInteger(LIMIT) || LIMIT < 1)) throw new Error('--limit는 양의 정수여야 한다')

let shard = null
if (shardArg) {
  const match = /^(\d+)\/(\d+)$/.exec(shardArg.slice('--shard='.length))
  if (!match) throw new Error('--shard는 0/4 같은 형식이어야 한다')
  shard = { index: Number(match[1]), total: Number(match[2]) }
  if (shard.total < 2 || shard.index < 0 || shard.index >= shard.total) throw new Error('--shard 범위가 잘못됐다')
  if (!ALL_DECEASED) throw new Error('--shard는 --all-deceased와 함께 쓴다')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function fetchAll(table, select, configure = (query) => query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await configure(supabase.from(table).select(select)).range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

const [profiles, researchEvents] = await Promise.all([
  fetchAll('profiles', 'id, slug, nickname, nickname_en, profession, nationality, birth_date, death_date, wikidata_qid, profile_type, status, celeb_tier'),
  fetchAll('celeb_timeline_events', 'celeb_id', (query) => query.eq('source', 'research')),
])
const existingIds = new Set(researchEvents.map((event) => event.celeb_id))
const eligible = profiles
  .filter((profile) => (
    profile.profile_type === 'CELEB'
    && profile.status === 'active'
    && (profile.celeb_tier === 'full' || profile.celeb_tier === 'light')
    && profile.birth_date?.trim()
    && profile.death_date?.trim()
  ))
  .sort((a, b) => a.slug.localeCompare(b.slug))

const requestedSlugs = slugArg
  ? new Set(slugArg.slice('--slugs='.length).split(',').map((slug) => slug.trim()).filter(Boolean))
  : null
if (requestedSlugs) {
  const eligibleSlugs = new Set(eligible.map((profile) => profile.slug))
  const invalid = [...requestedSlugs].filter((slug) => !eligibleSlugs.has(slug))
  if (invalid.length) throw new Error(`대상 범위를 벗어나거나 없는 slug: ${invalid.join(', ')}`)
}

let scoped = eligible.filter((profile) => !requestedSlugs || requestedSlugs.has(profile.slug))
if (shard) scoped = scoped.filter((_, index) => index % shard.total === shard.index)
const pending = scoped.filter((profile) => FORCE || !existingIds.has(profile.id))
const todo = pending.slice(0, LIMIT ?? undefined).map((profile) => ({
  ...profile,
  name: profile.nickname,
  nameEn: profile.nickname_en,
  birthDate: profile.birth_date,
  deathDate: profile.death_date,
  wikidataQid: profile.wikidata_qid,
}))

console.log(`대상 ${scoped.length}명 · DB 완료 ${scoped.length - pending.length}명 · 미완료 ${pending.length}명 · 이번 실행 ${todo.length}명`)
if (!APPLY) {
  console.log(todo.slice(0, 20).map((person) => person.slug).join('\n'))
  if (todo.length > 20) console.log(`... 외 ${todo.length - 20}명`)
  console.log('목록만 확인했다. 조사하고 DB에 넣으려면 --apply를 붙여라.')
  process.exit(0)
}

function parseProfileYear(value) {
  const match = /^(-?\d{1,4})/.exec(String(value ?? '').trim())
  return match ? Number(match[1]) : null
}

function buildPrompt(person) {
  return `${person.name}의 생애 행적 연표를 만든다. 아래 신원과 생몰일이 맞는 인물만 웹에서 조사한다.

- 한국어 이름: ${person.name}
- 영문 이름: ${person.nameEn ?? '(없음)'}
- 직군: ${person.profession ?? '(없음)'}
- 국적 코드: ${person.nationality ?? '(없음)'}
- 출생일: ${person.birthDate}
- 사망일: ${person.deathDate}
- Wikidata QID: ${person.wikidataQid ?? '(없음)'}

항목 수를 먼저 정하지 마라. 확인되는 사건의 밀도에 따라 3~30개 안에서 결정한다. 첫 항목은 출생, 마지막 항목은 사망으로 두고, 중간에는 그 항목을 빼면 생애의 방향·주요 성취·실패·활동 반경을 이해하는 데 손실이 생기는 사건만 남긴다. 숫자를 채우려고 사건을 쪼개거나 근거가 약한 일화를 넣지 마라.

각 항목:
- year 정수, 기원전은 음수. yearEnd/month/day는 모르면 null
- title/titleEn은 사건 한 줄. 한국어 제목은 동사형이며 반드시 '~다'로 끝낸다
- description/descriptionEn은 처음부터 서비스에 쓸 최종 문장으로 각각 2~3문장 쓴다. 사실만 구체적으로 쓰고 번역투·미사여구·교훈조 마무리를 피한다. 한국어는 사람을 주어로 세우고 한자 원문과 em dash를 쓰지 않는다
- kind는 birth, death, education, work, publish, battle, travel, office, meeting, other 중 하나
- placeName/placeNameEn은 화면에 표시할 실제 장소. placeQuery는 위키데이터 검색용 짧은 영문 지명, placeCountry는 오늘날 국가 영문명. 장소가 없으면 모두 null

불확실한 연도와 후대 전승은 서술에서 명확히 구분한다. 기록에 없는 연도·사건·인용을 만들지 마라. 동명이인을 섞지 마라.

JSON 배열만 출력한다.
[{'year':-1,'yearEnd':null,'month':null,'day':null,'title':'','titleEn':'','description':'','descriptionEn':'','kind':'birth','placeName':'','placeNameEn':'','placeQuery':'','placeCountry':''}]`.replaceAll("'", '"')
}

function parseArray(text) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end < 0) throw new Error('JSON 배열을 찾지 못했다')
  return JSON.parse(text.slice(start, end + 1))
}

function sentenceCount(text) {
  const normalized = String(text ?? '')
    .replace(/\b(?:[A-Za-z]\.\s*){2,}/g, 'ABBR')
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|St|No|Nos|Op|Opp|Vol|Pt|Chap|Fig|pp|p)\./gi, '$1')
  return normalized.split(/[.!?。]\s*(?=\S|$)/).filter((part) => part.trim()).length
}

function validateDraft(person, events) {
  const problems = []
  if (!Array.isArray(events) || events.length < 3 || events.length > 30) return [`항목 수 ${events?.length ?? 0}개(3~30 필요)`]
  const birthYear = parseProfileYear(person.birthDate)
  const deathYear = parseProfileYear(person.deathDate)
  if (events[0]?.kind !== 'birth' || events.filter((event) => event.kind === 'birth').length !== 1) problems.push('출생 항목이 처음에 정확히 한 번 있지 않다')
  if (events.at(-1)?.kind !== 'death' || events.filter((event) => event.kind === 'death').length !== 1) problems.push('사망 항목이 마지막에 정확히 한 번 있지 않다')
  if (events[0]?.year !== birthYear) problems.push(`출생 연도 ${events[0]?.year}가 프로필 ${birthYear}와 다르다`)
  if (events.at(-1)?.year !== deathYear) problems.push(`사망 연도 ${events.at(-1)?.year}가 프로필 ${deathYear}와 다르다`)
  const keys = new Set()
  for (const [index, event] of events.entries()) {
    const at = `${index + 1}번`
    if (!Number.isInteger(event.year)) problems.push(`${at} 연도가 정수가 아니다`)
    if (index && event.year < events[index - 1].year) problems.push(`${at} 연도가 앞 항목보다 이르다`)
    if (event.yearEnd != null && (!Number.isInteger(event.yearEnd) || event.yearEnd < event.year)) problems.push(`${at} 끝 연도가 잘못됐다`)
    if (event.month != null && (!Number.isInteger(event.month) || event.month < 1 || event.month > 12)) problems.push(`${at} 월이 잘못됐다`)
    if (event.day != null && (!Number.isInteger(event.day) || event.day < 1 || event.day > 31)) problems.push(`${at} 일이 잘못됐다`)
    if (!KINDS.has(event.kind)) problems.push(`${at} kind가 잘못됐다`)
    if (!event.title?.trim().endsWith('다')) problems.push(`${at} 한국어 제목이 '~다'로 끝나지 않는다`)
    if (!event.titleEn?.trim()) problems.push(`${at} 영문 제목이 비었다`)
    if (sentenceCount(event.description) < 2 || sentenceCount(event.description) > 3) problems.push(`${at} 한국어 서술이 2~3문장이 아니다`)
    if (sentenceCount(event.descriptionEn) < 2 || sentenceCount(event.descriptionEn) > 3) problems.push(`${at} 영문 서술이 2~3문장이 아니다`)
    if (/[一-鿿]/.test((event.title ?? '') + (event.description ?? ''))) problems.push(`${at} 한국어에 한자가 섞였다`)
    if (/[가-힣]/.test((event.titleEn ?? '') + (event.descriptionEn ?? ''))) problems.push(`${at} 영문에 한글이 섞였다`)
    if (/[—–]/.test((event.title ?? '') + (event.description ?? ''))) problems.push(`${at} 한국어에 dash가 섞였다`)
    const key = `${event.year}|${event.title}`
    if (keys.has(key)) problems.push(`${at} 중복 사건 ${key}`)
    keys.add(key)
  }
  return problems
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
    year: row.year,
    year_end: row.year_end ?? null,
    month: row.month ?? null,
    day: row.day ?? null,
    title: row.title,
    title_en: row.title_en,
    description: row.description,
    description_en: row.description_en,
    kind: row.kind,
    place_name: row.place_name ?? null,
    place_name_en: row.place_name_en ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    place_qid: row.place_qid ?? null,
    source: row.source,
    source_url: row.source_url ?? null,
    sort_order: row.sort_order,
  }
}

async function deleteByIds(ids) {
  if (!ids.length) return null
  const { error } = await supabase.from('celeb_timeline_events').delete().in('id', ids)
  return error
}

async function replaceTimeline(person, rows) {
  const { data: oldRows, error: oldError } = await supabase.from('celeb_timeline_events').select('*').eq('celeb_id', person.id).eq('source', 'research')
  if (oldError) throw oldError
  if (!FORCE && oldRows.length) return { skipped: true }

  const { data: inserted, error: insertError } = await supabase.from('celeb_timeline_events').insert(rows).select('id')
  if (insertError || inserted?.length !== rows.length) {
    if (inserted?.length) await deleteByIds(inserted.map((row) => row.id))
    throw new Error(insertError?.message ?? `${inserted?.length ?? 0}/${rows.length}건만 삽입됐다`)
  }
  const deleteError = await deleteByIds(oldRows.map((row) => row.id))
  if (deleteError) {
    await deleteByIds(inserted.map((row) => row.id))
    throw deleteError
  }
  const { data: saved, error: verifyError } = await supabase.from('celeb_timeline_events').select('*').eq('celeb_id', person.id).eq('source', 'research').order('sort_order')
  if (verifyError || JSON.stringify(saved.map(comparable)) !== JSON.stringify(rows.map(comparable))) {
    await supabase.from('celeb_timeline_events').delete().eq('celeb_id', person.id).eq('source', 'research')
    if (oldRows.length) await supabase.from('celeb_timeline_events').insert(oldRows)
    throw new Error(`DB 저장 후 대조 실패${verifyError ? `: ${verifyError.message}` : ''}`)
  }
  return { skipped: false }
}

async function researchOne(person) {
  const raw = await codexCall(buildPrompt(person), { model: 'gpt-5.6-sol', effort: 'medium', timeoutMs: 900_000 })
  const draft = parseArray(raw)
  const problems = validateDraft(person, draft)
  if (problems.length) throw new Error(problems.slice(0, 5).join(' / '))

  const placeCache = new Map()
  const events = []
  for (const event of draft) {
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
  const rows = events.map((event, sort_order) => ({ ...event, celeb_id: person.id, sort_order }))
  const saved = await replaceTimeline(person, rows)
  return { n: rows.length, coords: rows.filter((row) => row.lat != null).length, skipped: saved.skipped }
}

let ok = 0
const failed = []
let nextTarget = 0
async function runLane(lane) {
  while (nextTarget < todo.length) {
    const person = todo[nextTarget++]
    try {
      const result = await researchOne(person)
      if (result.skipped) console.log(`↷ [lane ${lane}] ${person.slug}: 다른 실행이 먼저 채워 건너뜀`)
      else {
        ok++
        console.log(`✓ [lane ${lane}] ${person.slug} ${result.n}건 (좌표 ${result.coords}) DB 적재·대조`)
      }
    } catch (error) {
      const message = String(error?.message ?? error).slice(0, 240)
      failed.push(`${person.slug}: ${message}`)
      console.log(`✗ [lane ${lane}] ${person.slug} — ${message}`)
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, (_, lane) => runLane(lane + 1)))
console.log(`\n완료 ${ok} / 실패 ${failed.length}`)
for (const failure of failed) console.log(`  ${failure}`)
if (failed.length) process.exitCode = 1
