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
 *   node scripts/timeline-research-gpt.mjs --file=scripts/_targets.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { codexCall } from '../../../.claude/skills/codex-gpt/scripts/codex-call.mjs'

const OUT_DIR = resolve(process.cwd(), '../../docs/celeb-data/timeline')
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const CONCURRENCY = 2
const UA = { 'user-agent': 'feelandnote-timeline-research/1.0 (webcodur@gmail.com)' }

const slugArg = process.argv.find((a) => a.startsWith('--slugs='))
const fileArg = process.argv.find((a) => a.startsWith('--file='))
let targets = []
if (slugArg) {
  targets = slugArg
    .slice('--slugs='.length)
    .split(',')
    .map((pair) => {
      const [slug, name] = pair.split(':')
      return { slug: slug.trim(), name: (name ?? slug).trim() }
    })
} else if (fileArg) {
  targets = JSON.parse(readFileSync(resolve(process.cwd(), fileArg.slice('--file='.length)), 'utf-8'))
}
if (targets.length === 0) {
  console.log('사용법: node scripts/timeline-research-gpt.mjs --slugs=slug:이름,slug:이름')
  process.exit(1)
}

function buildPrompt(name) {
  return `${name}의 생애 행적 연표를 만든다. 인물 상세 화면에 연표와 지도로 표시된다.

12~18개 항목. 출생과 사망을 양 끝에 두고 그 사이를 굵직한 전환점으로 채운다. 생존 인물이면 사망 항목 없이 최근 활동까지 쓴다.

각 항목에 담을 것:

- **year** — 정수. 기원전은 음수. 연도 오름차순으로 정렬한다.
- **yearEnd** — 여러 해에 걸친 일이면 끝 연도, 아니면 null
- **month** — 아는 경우만, 아니면 null
- **title / titleEn** — 그 사건이 무엇인지 한 줄
- **description / descriptionEn** — 2~3문장. 무슨 일이 있었고 무엇이 달라졌는지. 미사여구·교훈조 마무리는 넣지 않는다
- **kind** — birth, death, education, work, publish, battle, travel, office, meeting, other 중 하나
- **placeName / placeNameEn** — 사건이 벌어진 곳. 화면에 그대로 보이는 이름이다. 도시·건물·유적 단위로 적는다. 강이나 산맥처럼 넓은 지형은 쓰지 말고 그 안의 지점이나 가까운 도시를 적어라
- **placeQuery** — 그 장소를 **위키데이터에서 찾을 때 쓸 짧은 영문 이름**. 한두 단어로 끊고 설명을 붙이지 마라. 위 이름이 길거나 설명이 섞여 있어도 여기에는 검색어만 적는다.
  - "Geoncheon-dong, Hanseong, near modern Inhyeon-dong in Seoul" → placeQuery는 "Seoul"
  - "Hunryeonwon in Hanseong, modern Seoul" → "Seoul"
  - "Noktundo stockade, near Krasnoye Selo in Primorsky Krai" → "Noktundo"
  - "명량 (울돌목)" → "Myeongnyang Strait"
  - 찾을 만한 이름이 떠오르지 않으면 그 지역을 담는 **가장 가까운 도시 이름**을 적어라.
- **placeCountry** — 그곳이 오늘날 어느 나라인지 영어로(예: Italy, South Korea, Turkey). 같은 이름의 다른 곳과 헷갈리지 않게 하려는 것이다. 장소가 없으면 null
- **wikiTitle** — 그 사건의 근거가 될 영문 위키백과 문서 제목(예: "Battle of Myeongnyang"). 확실하지 않으면 인물 문서 제목을 쓴다
- **uncertain** — 연도나 사실이 학설마다 갈리면 true, 아니면 false

**사실을 지어내지 마라.** 기록에 없는 연도를 만들어 넣지 마라 — 확정할 수 없으면 통설을 쓰고 uncertain을 true로 두고 서술에 그 사실을 한마디 적어라. 소설·후대 전승을 사실로 적지 마라(예: 삼국지연의의 창작, 위인전 일화). 다루려면 서술에서 "전한다"로 구분하라.

평가가 갈리는 인물은 단죄도 미화도 하지 마라. 불리한 사실을 빼지도 마라. 무슨 일이 언제 있었는지만 쓴다.

## 출력

JSON 배열만 출력한다. 설명·머리말·코드펜스를 붙이지 마라.

[{"year":-1,"yearEnd":null,"month":null,"title":"","titleEn":"","description":"","descriptionEn":"","kind":"birth","placeName":"","placeNameEn":"","placeQuery":"","placeCountry":"","wikiTitle":"","uncertain":false}]`
}

function parseArray(text) {
  const s = text.indexOf('[')
  const e = text.lastIndexOf(']')
  if (s < 0 || e < 0) throw new Error('JSON 배열을 찾지 못했다')
  return JSON.parse(text.slice(s, e + 1))
}

/** 지명 → 좌표. GPT가 적어 준 나라와 맞는 후보만 고른다 */
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
    found.set(id, {
      qid: id,
      lng: Number(m[1]),
      lat: Number(m[2]),
      country: b.countryLabel?.value ?? '',
      ko: b.ko?.value ?? null,
    })
  }
  if (found.size === 0) return null

  // 검색 순위를 유지한 채, 나라가 맞는 첫 후보를 고른다
  const ordered = hits.map((h) => found.get(h.id)).filter(Boolean)
  if (country) {
    const hit = ordered.find((c) => c.country && c.country.toLowerCase() === country.toLowerCase())
    if (hit) return hit
    // 나라 정보가 아예 없는 항목(고대 유적 등)은 1순위만 허용
    const noCountry = ordered.find((c) => !c.country)
    if (noCountry) return noCountry
    return null // 나라가 어긋나면 비운다 — 동명 지명일 가능성이 높다
  }
  return ordered[0] ?? null
}

async function wikiExists(title) {
  if (!title) return null
  const u = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&format=json&formatversion=2&redirects=1`
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return null
    const page = (await r.json()).query?.pages?.[0]
    if (!page || page.missing) return null
    return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_'))
  } catch {
    return null
  }
}

async function researchOne({ slug, name }) {
  // 조사는 재작문보다 오래 걸린다 — 기본 4분에서는 잘려 죽는다(실측 exit null)
  const raw = await codexCall(buildPrompt(name), { model: 'gpt-5.6-sol', timeoutMs: 900000 })
  const arr = parseArray(raw)
  if (!Array.isArray(arr) || arr.length < 8) throw new Error(`항목이 ${arr.length}건뿐이다`)

  const events = []
  const placeCache = new Map()
  const wikiCache = new Map()

  for (const [i, e] of arr.entries()) {
    if (!Number.isInteger(e.year)) throw new Error(`${i + 1}번 연도가 정수가 아니다`)
    if (!e.title?.trim() || !e.titleEn?.trim()) throw new Error(`${i + 1}번 제목이 비었다`)

    // 검색어는 GPT가 준 짧은 이름을 쓰고, 없으면 표시용 이름의 첫 조각으로 대신한다
    const query = (e.placeQuery?.trim()) || (e.placeNameEn ? e.placeNameEn.split(',')[0].trim() : '')
    const key = `${query}|${e.placeCountry ?? ''}`
    if (query && !placeCache.has(key)) {
      placeCache.set(key, await geocode(query, e.placeCountry))
    }
    const place = query ? placeCache.get(key) : null

    if (e.wikiTitle && !wikiCache.has(e.wikiTitle)) {
      wikiCache.set(e.wikiTitle, await wikiExists(e.wikiTitle))
    }
    const url = e.wikiTitle ? wikiCache.get(e.wikiTitle) : null

    events.push({
      year: e.year,
      yearEnd: e.yearEnd ?? null,
      month: e.month ?? null,
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
  writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify({ slug, events }, null, 2) + '\n', 'utf-8')
  return {
    n: events.length,
    coords: events.filter((x) => x.lat != null).length,
    urls: events.filter((x) => x.sourceUrl).length,
  }
}

const todo = targets.filter((t) => !existsSync(join(OUT_DIR, `${t.slug}.json`)))
console.log(`대상 ${todo.length}명 (전체 ${targets.length}, 이미 처리 ${targets.length - todo.length})`)

let ok = 0
const failed = []
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  await Promise.all(
    todo.slice(i, i + CONCURRENCY).map(async (t) => {
      try {
        const r = await researchOne(t)
        ok++
        console.log(`✓ ${t.slug} ${r.n}건 (좌표 ${r.coords} · 근거 ${r.urls})`)
      } catch (e) {
        const msg = String(e?.message ?? e).slice(0, 200)
        failed.push(`${t.slug}: ${msg}`)
        console.log(`✗ ${t.slug} — ${msg}`)
      }
    }),
  )
}

console.log(`\n완료 ${ok} / 실패 ${failed.length}`)
failed.forEach((f) => console.log('  ' + f))
if (failed.length) console.log('같은 명령을 다시 돌리면 실패분만 재시도한다.')
