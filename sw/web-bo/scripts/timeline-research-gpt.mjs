/**
 * 인물 행적 조사기 — GPT(codex) 발주 + 좌표는 위키데이터로 후처리
 *
 * [왜 있는가]
 *   조사는 원래 Claude 서브에이전트가 맡았는데 26.07.26 서버 과부하(529)로
 *   여섯 묶음이 통째로 죽었다. codex는 별개 API라 영향을 받지 않아 우회로가 된다.
 *
 * [분업]
 *   GPT — 사건·연도·서술·지명(나라까지)·근거 문서 제목까지.  **좌표는 시키지 않는다.**
 *   이 스크립트 — 지명을 위키데이터에서 찾아 좌표를 붙인다. 후보가 여럿이면
 *   GPT가 적어 준 나라 이름이 설명에 들어 있는 것만 고르고, 못 고르면 비운다.
 *   좌표를 모델에게 맡기면 동명 지명에 물린다(실측으로 스무 번 넘게 걸렸다).
 *
 * [실행]  sw/web-bo 에서
 *   node scripts/timeline-research-gpt.mjs --slugs=yi-sun-sin:이순신,cao-cao:조조
 *   node scripts/timeline-research-gpt.mjs --file=../../docs/celeb-data/timeline/_batches/deceased-active-2026-08-04.json
 *   node scripts/timeline-research-gpt.mjs --file=... --limit=10 --concurrency=2
 *   node scripts/timeline-research-gpt.mjs --file=... --shard=0/4 --concurrency=3
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { codexCall } from '../../../.claude/skills/codex-gpt/scripts/codex-call.mjs'

const OUT_DIR = resolve(process.cwd(), '../../docs/celeb-data/timeline')
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='))
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const slugArg = process.argv.find((a) => a.startsWith('--slugs='))
const fileArg = process.argv.find((a) => a.startsWith('--file='))
const shardArg = process.argv.find((a) => a.startsWith('--shard='))
const FORCE = process.argv.includes('--force')
const CONCURRENCY = Number(concurrencyArg?.slice('--concurrency='.length) ?? 2)
const LIMIT = limitArg ? Number(limitArg.slice('--limit='.length)) : null
const UA = { 'user-agent': 'feelandnote-timeline-research/1.0 (webcodur@gmail.com)' }
const KINDS = new Set([
  'birth', 'death', 'education', 'work', 'publish',
  'battle', 'travel', 'office', 'meeting', 'other',
])

if (!Number.isInteger(CONCURRENCY) || CONCURRENCY < 1 || CONCURRENCY > 6) {
  throw new Error('--concurrency는 1~6 정수여야 한다')
}
if (LIMIT != null && (!Number.isInteger(LIMIT) || LIMIT < 1)) {
  throw new Error('--limit는 양의 정수여야 한다')
}
if (FORCE && !slugArg) throw new Error('--force는 --slugs와 함께 특정 인물에만 쓸 수 있다')

let shard = null
if (shardArg) {
  const match = /^(\d+)\/(\d+)$/.exec(shardArg.slice('--shard='.length))
  if (!match) throw new Error('--shard는 0/4 같은 형식이어야 한다')
  shard = { index: Number(match[1]), total: Number(match[2]) }
  if (shard.total < 2 || shard.index < 0 || shard.index >= shard.total) {
    throw new Error('--shard 인덱스는 0 이상 total 미만이어야 하고 total은 2 이상이어야 한다')
  }
  if (!fileArg || slugArg) throw new Error('--shard는 --file 전체 대상 실행에만 쓸 수 있다')
}

let fileTargets = []
if (fileArg) {
  const parsed = JSON.parse(readFileSync(resolve(process.cwd(), fileArg.slice('--file='.length)), 'utf-8'))
  fileTargets = Array.isArray(parsed) ? parsed : (parsed.targets ?? [])
}

let targets = []
if (slugArg) {
  const requested = slugArg
    .slice('--slugs='.length)
    .split(',')
    .map((pair) => {
      const [slug, name] = pair.split(':')
      return { slug: slug.trim(), name: name?.trim() || null }
    })
  const fileTargetBySlug = new Map(fileTargets.map((target) => [target.slug, target]))
  targets = requested.map(({ slug, name }) => {
    const fromFile = fileTargetBySlug.get(slug)
    if (fileArg && !fromFile) throw new Error(`--file 대상 목록에 없는 slug: ${slug}`)
    return { ...(fromFile ?? {}), slug, name: name ?? fromFile?.name ?? slug }
  })
} else if (fileArg) {
  targets = fileTargets.filter((target) => target.needsResearch !== false)
}
if (shard) targets = targets.filter((_, index) => index % shard.total === shard.index)
if (targets.length === 0) {
  console.log('사용법: node scripts/timeline-research-gpt.mjs --slugs=slug:이름,slug:이름')
  process.exit(1)
}

function parseProfileYear(value) {
  const match = /^(-?\d{1,4})/.exec(String(value ?? '').trim())
  return match ? Number(match[1]) : null
}

function buildPrompt(person) {
  const {
    name,
    nameEn,
    profession,
    nationality,
    birthDate,
    deathDate,
    wikidataQid,
  } = person
  return `${name}의 생애 행적 연표를 만든다. 인물 상세 화면에 연표와 지도로 표시된다.

## 신원

- 한국어 이름: ${name}
- 영문 이름: ${nameEn ?? '(없음)'}
- 직군: ${profession ?? '(없음)'}
- 국적 코드: ${nationality ?? '(없음)'}
- 출생일: ${birthDate ?? '(없음)'}
- 사망일: ${deathDate ?? '(없음)'}
- Wikidata QID: ${wikidataQid ?? '(없음. 이름·직군·생몰일을 함께 대조할 것)'}

동명이인을 섞지 마라. 위 신원과 생몰일이 맞는 인물만 조사한다. 웹 검색으로 연도와 사건을 확인하고, 확인할 수 없는 일화는 빼라.

항목 수를 먼저 정하지 마라. 확인되는 사건의 밀도에 따라 3~30개 안에서 스스로 결정한다. 첫 항목은 출생, 마지막 항목은 사망이어야 한다. 그 사이에는 교육·이동·작품 발표·취임·전투·만남처럼 삶의 방향이 실제로 바뀐 사건만 고른다.

- 기록이 희박한 인물은 출생·핵심 행적·사망 세 건으로 끝나도 된다. 숫자를 채우려고 비슷한 사건을 쪼개거나 근거 약한 일화를 넣지 마라.
- 보통 인물은 중요한 전환점만 고르면 대개 8~16건 안에 들어온다. 이것은 목표치가 아니라 참고 범위다.
- 국가 지도자·장군·장수한 창작자처럼 행적이 풍부한 인물은 서로 다른 시기와 장소의 핵심 사건이 모두 필요하면 17~30건까지 쓸 수 있다.
- 한 항목을 빼도 인물의 삶을 이해하는 데 차이가 없다면 뺀다. 반대로 빼면 중요한 시기·업적·실패·이동이 사라진다면 남긴다.

각 항목에 담을 것:

- **year** — 정수. 기원전은 음수. 연도 오름차순으로 정렬한다.
- **yearEnd** — 여러 해에 걸친 일이면 끝 연도, 아니면 null
- **month** — 아는 경우만, 아니면 null
- **day** — 아는 경우만, 아니면 null
- **title / titleEn** — 그 사건이 무엇인지 한 줄. 한국어 제목은 반드시 동사형으로 쓰고 "~다"로 끝낸다
- **description / descriptionEn** — 각각 2~3문장. 무슨 일이 있었고 무엇이 달라졌는지 쓴다. 미사여구·교훈조·감동 다큐식 마무리를 넣지 않는다. 한국어는 사람을 주어로 세우고 번역투·한자 원문·em dash를 쓰지 않는다
- **kind** — birth, death, education, work, publish, battle, travel, office, meeting, other 중 하나
- **placeName / placeNameEn** — 사건이 벌어진 곳. 화면에 그대로 보이는 이름이다. 도시·건물·유적 단위로 적는다. 강이나 산맥처럼 넓은 지형은 쓰지 말고 그 안의 지점이나 가까운 도시를 적어라
- **placeQuery** — 그 장소를 **위키데이터에서 찾을 때 쓸 짧은 영문 이름**. 한두 단어로 끊고 설명을 붙이지 마라. 위 이름이 길거나 설명이 섞여 있어도 여기에는 검색어만 적는다.
  - "Geoncheon-dong, Hanseong, near modern Inhyeon-dong in Seoul" → placeQuery는 "Seoul"
  - "Hunryeonwon in Hanseong, modern Seoul" → "Seoul"
  - "Noktundo stockade, near Krasnoye Selo in Primorsky Krai" → "Noktundo"
  - "명량 (울돌목)" → "Myeongnyang Strait"
  - 찾을 만한 이름이 떠오르지 않으면 그 지역을 담는 **가장 가까운 도시 이름**을 적어라.
- **placeCountry** — 그곳이 오늘날 어느 나라인지 영어로(예: Italy, South Korea, Turkey). 같은 이름의 다른 곳과 헷갈리지 않게 하려는 것이다. 장소가 없으면 null
- **wikiTitle** — 그 사건을 확인할 수 있는 영문 위키백과 문서 제목(예: "Battle of Myeongnyang"). 실제 문서 제목을 확인해서 적는다. 사건별 문서가 없으면 인물 문서 제목을 쓴다
- **uncertain** — 연도나 사실이 학설마다 갈리면 true, 아니면 false

**사실을 지어내지 마라.** 기록에 없는 연도를 만들어 넣지 마라. 확정할 수 없으면 통설을 쓰고 uncertain을 true로 두며 서술에도 불확실성을 밝힌다. 소설·후대 전승을 사실로 적지 마라(예: 삼국지연의의 창작, 위인전 일화). 다루려면 서술에서 "전한다"로 구분한다.

평가가 갈리는 인물은 단죄도 미화도 하지 마라. 불리한 사실을 빼지도 마라. 무슨 일이 언제 있었는지만 쓴다.

## 출력

JSON 배열만 출력한다. 설명·머리말·코드펜스를 붙이지 마라.

[{"year":-1,"yearEnd":null,"month":null,"day":null,"title":"","titleEn":"","description":"","descriptionEn":"","kind":"birth","placeName":"","placeNameEn":"","placeQuery":"","placeCountry":"","wikiTitle":"","uncertain":false}]`
}

function parseArray(text) {
  const s = text.indexOf('[')
  const e = text.lastIndexOf(']')
  if (s < 0 || e < 0) throw new Error('JSON 배열을 찾지 못했다')
  return JSON.parse(text.slice(s, e + 1))
}

function normalizeCountry(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  const aliases = new Map([
    ['united states', 'united states of america'],
    ['usa', 'united states of america'],
    ['south korea', 'republic of korea'],
    ['north korea', "democratic people's republic of korea"],
    ['russia', 'russian federation'],
  ])
  return aliases.get(normalized) ?? normalized
}

function normalizeLabel(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** 지명 → 좌표. 나라가 맞아도 후보가 여럿이면 자동 채택하지 않는다. */
async function geocode(placeEn, country) {
  if (!placeEn) return null
  const url =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities` +
    `&search=${encodeURIComponent(placeEn)}&language=en&uselang=en&limit=8&format=json`
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) })
  if (!r.ok) return null
  const hits = (await r.json()).search ?? []
  if (hits.length === 0) return null

  const q = `SELECT ?item ?ko ?coord ?countryLabel WHERE {
    VALUES ?item { ${hits.map((h) => 'wd:' + h.id).join(' ')} }
    ?item wdt:P625 ?coord .
    OPTIONAL { ?item wdt:P17 ?c . ?c rdfs:label ?countryLabel . FILTER(LANG(?countryLabel)='en') }
    OPTIONAL { ?item rdfs:label ?ko . FILTER(LANG(?ko)='ko') }
  }`
  const res = await fetch('https://query.wikidata.org/sparql?format=json', {
    method: 'POST',
    headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/sparql-results+json' },
    body: 'query=' + encodeURIComponent(q),
    signal: AbortSignal.timeout(45000),
  })
  if (!res.ok) return null

  const found = new Map()
  for (const b of (await res.json()).results.bindings) {
    const id = b.item.value.split('/').pop()
    if (found.has(id)) continue
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord.value)
    if (!m) continue
    const hit = hits.find((candidate) => candidate.id === id)
    found.set(id, {
      qid: id,
      lng: Number(m[1]),
      lat: Number(m[2]),
      country: b.countryLabel?.value ?? '',
      ko: b.ko?.value ?? null,
      label: hit?.label ?? '',
      description: hit?.description ?? '',
    })
  }
  if (found.size === 0) return null

  // 검색 순위를 유지하되, 유일한 후보이거나 이름이 정확히 맞을 때만 고른다.
  const ordered = hits.map((h) => found.get(h.id)).filter(Boolean)
  if (country) {
    const matches = ordered.filter((candidate) => (
      candidate.country
      && normalizeCountry(candidate.country) === normalizeCountry(country)
    ))
    if (matches.length === 1) return matches[0]
    const exact = matches.filter((candidate) => normalizeLabel(candidate.label) === normalizeLabel(placeEn))
    return exact.length === 1 ? exact[0] : null
  }
  const exact = ordered.filter((candidate) => normalizeLabel(candidate.label) === normalizeLabel(placeEn))
  return exact.length === 1 ? exact[0] : null
}

async function wikiExists(title, language = 'en') {
  if (!title) return null
  const u = `https://${language}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&format=json&formatversion=2&redirects=1`
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return null
    const page = (await r.json()).query?.pages?.[0]
    if (!page || page.missing) return null
    return `https://${language}.wikipedia.org/wiki/` + encodeURIComponent(page.title.replace(/ /g, '_'))
  } catch {
    return null
  }
}

async function identitySource(person) {
  if (person.wikidataQid) {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(person.wikidataQid)}&props=sitelinks&format=json`
      const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) })
      if (response.ok) {
        const sitelinks = (await response.json()).entities?.[person.wikidataQid]?.sitelinks
        if (sitelinks?.enwiki?.title) return wikiExists(sitelinks.enwiki.title, 'en')
        if (sitelinks?.kowiki?.title) return wikiExists(sitelinks.kowiki.title, 'ko')
      }
    } catch {
      // 아래 이름 검색으로 이어 간다.
    }
  }
  return (await wikiExists(person.nameEn, 'en')) ?? (await wikiExists(person.name, 'ko'))
}

function sentenceCount(text) {
  const normalized = String(text ?? '')
    .replace(/\b(?:[A-Za-z]\.\s*){2,}/g, 'ABBR')
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|St|No)\./g, '$1')
  return normalized.split(/[.!?。]\s*(?=\S|$)/).filter((part) => part.trim()).length
}

function validateDraft(person, events) {
  const problems = []
  if (!Array.isArray(events) || events.length < 3 || events.length > 30) {
    return [`항목 수가 ${events?.length ?? 0}개다(3~30 필요)`]
  }

  const birthYear = parseProfileYear(person.birthDate)
  const deathYear = parseProfileYear(person.deathDate)
  const birthEvents = events.filter((event) => event.kind === 'birth')
  const deathEvents = events.filter((event) => event.kind === 'death')
  if (events[0]?.kind !== 'birth') problems.push('첫 항목이 출생이 아니다')
  if (events.at(-1)?.kind !== 'death') problems.push('마지막 항목이 사망이 아니다')
  if (birthEvents.length !== 1) problems.push(`출생 항목이 ${birthEvents.length}개다`)
  if (deathEvents.length !== 1) problems.push(`사망 항목이 ${deathEvents.length}개다`)
  if (birthYear != null && events[0]?.year !== birthYear) problems.push(`출생 연도 ${events[0]?.year}가 프로필 ${birthYear}와 다르다`)
  if (deathYear != null && events.at(-1)?.year !== deathYear) problems.push(`사망 연도 ${events.at(-1)?.year}가 프로필 ${deathYear}와 다르다`)

  for (const [index, event] of events.entries()) {
    const at = `${index + 1}번`
    if (!Number.isInteger(event.year)) problems.push(`${at} 연도가 정수가 아니다`)
    if (index > 0 && Number.isInteger(event.year) && event.year < events[index - 1].year) problems.push(`${at} 연도가 앞 항목보다 이르다`)
    if (event.yearEnd != null && (!Number.isInteger(event.yearEnd) || event.yearEnd < event.year)) problems.push(`${at} 끝 연도가 잘못됐다`)
    if (event.month != null && (!Number.isInteger(event.month) || event.month < 1 || event.month > 12)) problems.push(`${at} 월이 잘못됐다`)
    if (event.day != null && (!Number.isInteger(event.day) || event.day < 1 || event.day > 31)) problems.push(`${at} 일이 잘못됐다`)
    if (!KINDS.has(event.kind)) problems.push(`${at} kind가 잘못됐다`)
    if (!event.title?.trim() || !event.title.trim().endsWith('다')) problems.push(`${at} 한국어 제목이 동사형 '~다'로 끝나지 않는다`)
    if (!event.titleEn?.trim()) problems.push(`${at} 영문 제목이 비었다`)
    if (!event.description?.trim() || sentenceCount(event.description) < 2) problems.push(`${at} 한국어 서술이 2문장보다 짧다`)
    if (!event.descriptionEn?.trim() || sentenceCount(event.descriptionEn) < 2) problems.push(`${at} 영문 서술이 2문장보다 짧다`)
    if (/[一-鿿]/.test(event.title + event.description)) problems.push(`${at} 한국어에 한자가 섞였다`)
    if (/[가-힣]/.test(event.titleEn + event.descriptionEn)) problems.push(`${at} 영문에 한글이 섞였다`)
    if (/[—–]/.test(event.title + event.description)) problems.push(`${at} 한국어에 dash 문자가 섞였다`)
    if (!event.wikiTitle?.trim()) problems.push(`${at} 근거 문서 제목이 비었다`)
  }
  return problems
}

async function researchOne(person) {
  const { slug } = person
  // 조사는 재작문보다 오래 걸린다 — 기본 4분에서는 잘려 죽는다(실측 exit null)
  const raw = await codexCall(buildPrompt(person), {
    model: 'gpt-5.6-sol',
    effort: 'medium',
    timeoutMs: 900000,
  })
  const arr = parseArray(raw)
  const draftProblems = validateDraft(person, arr)
  if (draftProblems.length > 0) throw new Error(draftProblems.slice(0, 5).join(' / '))

  const events = []
  const placeCache = new Map()
  const wikiCache = new Map()
  const fallbackSource = await identitySource(person)
  if (!fallbackSource) throw new Error('신원을 확인할 위키백과 문서를 찾지 못했다')

  for (const [i, e] of arr.entries()) {
    // 검색어는 GPT가 준 짧은 이름을 쓰고, 없으면 표시용 이름의 첫 조각으로 대신한다
    const query = (e.placeQuery?.trim()) || (e.placeNameEn ? e.placeNameEn.split(',')[0].trim() : '')
    const key = `${query}|${e.placeCountry ?? ''}`
    if (query && !placeCache.has(key)) {
      placeCache.set(key, await geocode(query, e.placeCountry))
    }
    const place = query ? placeCache.get(key) : null

    if (e.wikiTitle && !wikiCache.has(e.wikiTitle)) {
      wikiCache.set(e.wikiTitle, await wikiExists(e.wikiTitle, 'en'))
    }
    const url = (e.wikiTitle ? wikiCache.get(e.wikiTitle) : null) ?? fallbackSource

    events.push({
      year: e.year,
      yearEnd: e.yearEnd ?? null,
      month: e.month ?? null,
      day: e.day ?? null,
      title: e.title.trim(),
      titleEn: e.titleEn.trim(),
      description: e.description ?? null,
      descriptionEn: e.descriptionEn ?? null,
      kind: e.kind ?? 'other',
      placeName: e.placeName ?? null,
      placeNameEn: e.placeNameEn ?? null,
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      placeQid: place?.qid ?? null,
      sourceUrl: url,
    })
  }

  events.sort((a, b) => a.year - b.year)
  writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify({
    schemaVersion: 2,
    scope: 'active-deceased',
    slug,
    identity: {
      name: person.name,
      nameEn: person.nameEn ?? null,
      profession: person.profession ?? null,
      nationality: person.nationality ?? null,
      birthDate: person.birthDate ?? null,
      deathDate: person.deathDate ?? null,
      wikidataQid: person.wikidataQid ?? null,
    },
    events,
  }, null, 2) + '\n', 'utf-8')
  return {
    n: events.length,
    coords: events.filter((x) => x.lat != null).length,
    urls: events.filter((x) => x.sourceUrl).length,
  }
}

const pending = targets
  .filter((target) => target.slug && target.name)
  .filter((target) => FORCE || !existsSync(join(OUT_DIR, `${target.slug}.json`)))
const todo = pending.slice(0, LIMIT ?? undefined)
console.log(`이번 실행 ${todo.length}명 (미처리 ${pending.length}, 전체 ${targets.length}, 이미 처리 ${targets.length - pending.length})`)

let ok = 0
const failed = []
let nextTarget = 0
async function runLane(lane) {
  while (nextTarget < todo.length) {
    const t = todo[nextTarget++]
    try {
      const r = await researchOne(t)
      ok++
      console.log(`✓ [lane ${lane}] ${t.slug} ${r.n}건 (좌표 ${r.coords} · 근거 ${r.urls})`)
    } catch (e) {
      const msg = String(e?.message ?? e).slice(0, 200)
      failed.push(`${t.slug}: ${msg}`)
      console.log(`✗ [lane ${lane}] ${t.slug} — ${msg}`)
    }
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, todo.length) }, (_, lane) => runLane(lane + 1)),
)

console.log(`\n완료 ${ok} / 실패 ${failed.length}`)
failed.forEach((f) => console.log('  ' + f))
if (failed.length) console.log('같은 명령을 다시 돌리면 실패분만 재시도한다.')
