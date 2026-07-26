/**
 * 지명 → 위키데이터 좌표 후보 조회기
 *
 * [무엇을 하는가]
 *   지명을 받아 위키데이터에서 좌표를 가진 후보를 찾아 나열한다. 고르는 것은 사람이다 —
 *   동명 지명이 흔해서 자동 채택은 위험하다(실측: "온양"이 충남 아산이 아니라 울산
 *   근처 온양읍으로 잡혔다). 설명·한국어 표기를 함께 보여주니 그것으로 판별하라.
 *
 * [실행]  sw/web-bo 에서
 *   node scripts/timeline-geocode.mjs "Pella" "Gaugamela" "온양온천"
 *   node scripts/timeline-geocode.mjs --ko "경복궁" "회령시"     # 한국어로 검색
 */

const UA = { 'user-agent': 'feelandnote-timeline-geocode/1.0 (webcodur@gmail.com)' }

const args = process.argv.slice(2)
const lang = args.includes('--ko') ? 'ko' : 'en'
const terms = args.filter((a) => !a.startsWith('--'))

if (terms.length === 0) {
  console.log('사용법: node scripts/timeline-geocode.mjs [--ko] "지명" "지명" ...')
  process.exit(1)
}

async function searchEntities(term) {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities` +
    `&search=${encodeURIComponent(term)}&language=${lang}&uselang=${lang}&limit=6&format=json`
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`wbsearchentities ${res.status}`)
  const json = await res.json()
  return (json.search ?? []).map((s) => ({ q: s.id, label: s.label, desc: s.description ?? '' }))
}

async function fetchCoords(qids) {
  if (qids.length === 0) return {}
  const query = `SELECT ?item ?ko ?coord WHERE {
    VALUES ?item { ${qids.map((q) => 'wd:' + q).join(' ')} }
    ?item wdt:P625 ?coord .
    OPTIONAL { ?item rdfs:label ?ko . FILTER(LANG(?ko)='ko') }
  }`
  const res = await fetch('https://query.wikidata.org/sparql?format=json', {
    method: 'POST',
    headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/sparql-results+json' },
    body: 'query=' + encodeURIComponent(query),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`WDQS ${res.status}`)
  const json = await res.json()
  const out = {}
  for (const row of json.results.bindings) {
    const id = row.item.value.split('/').pop()
    if (out[id]) continue
    // Point(경도 위도) 순서다 — 뒤집어 쓰면 엉뚱한 곳에 찍힌다
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord.value)
    if (!m) continue
    out[id] = { ko: row.ko?.value ?? null, lng: Number(m[1]), lat: Number(m[2]) }
  }
  return out
}

const results = []
for (const term of terms) {
  const found = await searchEntities(term)
  results.push({ term, found })
}

const allQids = [...new Set(results.flatMap((r) => r.found.map((f) => f.q)))]
const coords = await fetchCoords(allQids)

for (const { term, found } of results) {
  const withCoord = found.filter((f) => coords[f.q])
  console.log(`\n■ ${term}`)
  if (withCoord.length === 0) {
    console.log('   좌표를 가진 후보 없음 — 검색어를 바꾸거나 상위 지명으로 시도하라')
    continue
  }
  for (const f of withCoord) {
    const c = coords[f.q]
    console.log(
      `   ${f.q} | ${f.label}${c.ko && c.ko !== f.label ? ` (${c.ko})` : ''} | ` +
        `lat ${c.lat.toFixed(4)}, lng ${c.lng.toFixed(4)} | ${f.desc.slice(0, 70)}`,
    )
  }
}
