/**
 * 행적 좌표 보정기 — 좌표가 빈 항목의 지명으로 후보를 찾아 **보여준다**
 *
 * 🔴 **`--apply` 를 쓰지 마라. 사람이 눈으로 고르는 용도다.**
 *
 * [왜 자동 채택을 막았는가 — 26.07.26 실측]
 *   GPT 조사분의 좌표 결손 20%를 자동으로 메우려 했으나, 규칙을 아무리 조여도
 *   엉뚱한 곳이 박혔다.
 *     · 융중(후베이 샹양 근처)  → 티베트 근처 룽롱          1,900km
 *     · 가정(간쑤)             → 저장성 제팅진 / 간쑤성 전체  400km
 *     · 백제성(충칭 펑제)       → 푸젠성 융안현              완전 오배정
 *     · 오장원(치산현)          → 산시성 전체                130km
 *   이름을 정확히 맞춰도 성(省) 단위 항목이 걸려 점이 뭉개진다. 중국 고대 지명이
 *   특히 위험하다.
 *
 * [그래서 어떻게 하나]
 *   **좌표는 비워 둔다.** 빈 좌표는 연표에만 남고 지도에 뜨지 않아 무해하지만,
 *   틀린 점은 지도 전체를 못 믿게 만든다. 채우려면 이 도구로 후보를 뽑아
 *   사람이 하나씩 확인하거나, 백오피스 편집 화면(`/celebs/timeline/[slug]`)에서
 *   지명을 검색해 고른다.
 *
 * [실행]  sw/web-bo 에서
 *   node scripts/timeline-fill-coords.mjs --slugs=cao-cao   # 후보만 본다
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'

const APPLY = process.argv.includes('--apply')
const slugArg = process.argv.find((a) => a.startsWith('--slugs='))
const ONLY = slugArg ? slugArg.slice('--slugs='.length).split(',').map((s) => s.trim()) : null

const DIR = resolve(process.cwd(), '../../docs/celeb-data/timeline')
const UA = { 'user-agent': 'feelandnote-timeline-fillcoords/1.0 (webcodur@gmail.com)' }

/** 서술형 지명에서 검색어 후보를 뽑는다. 짧은 조각을 앞에 둔다 */
function queries(placeEn, placeKo) {
  const out = []
  const src = placeEn || placeKo || ''
  if (!src) return out
  // "Wuzhang Plains, modern Qishan County, Shaanxi" → 조각별로
  const parts = src.split(',').map((s) => s.trim()).filter(Boolean)
  for (const p of parts) {
    // "modern Qishan County" 처럼 붙은 수식어를 떼어낸다
    const cleaned = p.replace(/^(modern|present-day|near|around|in|the)\s+/i, '').trim()
    if (cleaned && !out.includes(cleaned)) out.push(cleaned)
  }
  if (!out.includes(src)) out.push(src)
  return out.slice(0, 4)
}

/** 지명 문자열에 담긴 지역 힌트(뒤쪽 조각들) */
function hints(placeEn) {
  if (!placeEn) return []
  return placeEn
    .split(',')
    .slice(1)
    .map((s) => s.replace(/^(modern|present-day|near|around|in|the)\s+/i, '').trim())
    .filter((s) => s.length > 2)
}

async function search(term) {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities` +
    `&search=${encodeURIComponent(term)}&language=en&uselang=en&limit=8&format=json`
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) })
    if (!r.ok) return []
    return (await r.json()).search ?? []
  } catch {
    return []
  }
}

async function coordsOf(qids) {
  if (qids.length === 0) return new Map()
  const q = `SELECT ?item ?ko ?coord ?countryLabel WHERE {
    VALUES ?item { ${qids.map((x) => 'wd:' + x).join(' ')} }
    ?item wdt:P625 ?coord .
    OPTIONAL { ?item wdt:P17 ?c . ?c rdfs:label ?countryLabel . FILTER(LANG(?countryLabel)='en') }
    OPTIONAL { ?item rdfs:label ?ko . FILTER(LANG(?ko)='ko') }
  }`
  try {
    const res = await fetch('https://query.wikidata.org/sparql?format=json', {
      method: 'POST',
      headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/sparql-results+json' },
      body: 'query=' + encodeURIComponent(q),
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) return new Map()
    const out = new Map()
    for (const b of (await res.json()).results.bindings) {
      const id = b.item.value.split('/').pop()
      if (out.has(id)) continue
      const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord.value)
      if (!m) continue
      out.set(id, {
        qid: id,
        lng: Number(m[1]),
        lat: Number(m[2]),
        country: b.countryLabel?.value ?? '',
        ko: b.ko?.value ?? null,
      })
    }
    return out
  } catch {
    return new Map()
  }
}

const cache = new Map()

async function resolvePlace(placeEn, placeKo) {
  const key = placeEn || placeKo || ''
  if (cache.has(key)) return cache.get(key)

  const hintList = hints(placeEn).map((h) => h.toLowerCase())
  let picked = null
  let how = ''

  for (const term of queries(placeEn, placeKo)) {
    const hits = await search(term)
    if (hits.length === 0) continue
    const co = await coordsOf(hits.map((h) => h.id))
    const ordered = hits.map((h) => ({ ...co.get(h.id), label: h.label, desc: h.description ?? '' })).filter((x) => x.qid)
    if (ordered.length === 0) continue

    /* 후보 이름이 지역 힌트와 **정확히 같을 때만** 받는다.
       느슨하게 풀면 엉뚱한 곳이 박힌다 — 실측으로 융중(후베이)이 티베트 근처
       룽롱으로, 가정(간쑤)이 저장성 제팅진으로 잡혔다. 좌표를 비워 두는 편이
       틀린 점을 지도에 찍는 것보다 낫다(빈 좌표는 연표에만 남고 지도에 안 뜬다). */
    const exact = ordered.find((c) =>
      hintList.some((h) => c.label.toLowerCase() === h || (c.ko && c.ko.toLowerCase() === h)),
    )
    if (exact) {
      picked = exact
      how = `이름일치(${term})`
      break
    }
    // 검색어 자체가 후보 이름과 똑같으면 그것도 확실하다
    const selfExact = ordered.find((c) => c.label.toLowerCase() === term.toLowerCase())
    if (selfExact && hintList.length === 0) {
      picked = selfExact
      how = `단일지명(${term})`
      break
    }
  }

  const result = picked ? { ...picked, how } : null
  cache.set(key, result)
  return result
}

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !ONLY || ONLY.includes(f.replace(/\.json$/, '')))

let filled = 0
let stillEmpty = 0
const log = []

for (const f of files) {
  const p = join(DIR, f)
  const j = JSON.parse(readFileSync(p, 'utf-8'))
  let touched = false

  for (const e of j.events) {
    if (e.lat != null) continue
    if (!e.placeName && !e.placeNameEn) {
      stillEmpty++
      continue
    }
    const hit = await resolvePlace(e.placeNameEn, e.placeName)
    if (!hit) {
      stillEmpty++
      log.push(`  ✗ ${j.slug} | ${e.placeNameEn ?? e.placeName} | 후보 없음`)
      continue
    }
    log.push(
      `  ✓ ${j.slug} | ${e.placeNameEn ?? e.placeName}\n      → ${hit.label}${hit.ko && hit.ko !== hit.label ? ` (${hit.ko})` : ''} ${hit.qid} | ${hit.lat.toFixed(3)},${hit.lng.toFixed(3)} | ${hit.country || '나라정보없음'} | ${hit.how}`,
    )
    if (APPLY) {
      e.lat = hit.lat
      e.lng = hit.lng
      e.placeQid = hit.qid
      touched = true
    }
    filled++
  }

  if (touched) writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf-8')
}

console.log(log.join('\n'))
console.log(`\n채울 수 있는 것 ${filled}건 · 여전히 못 찾는 것 ${stillEmpty}건`)
if (!APPLY) console.log('보여주기만 했다. 반영하려면 --apply 를 붙여라.')
