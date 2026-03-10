const TESTS = [
  { qid: 'Q2680', name: '브루스 윌리스', note: '배우+출연작' },
  { qid: 'Q43203', name: '클린트 이스트우드', note: '배우+감독+제작' },
  { qid: 'Q5879', name: '요한 볼프강 폰 괴테', note: '저자+시인+과학' },
  { qid: 'Q483907', name: '한스 짐머', note: '작곡+영화음악' },
  { qid: 'Q762', name: '레오나르도 다빈치', note: '미술+과학+저술' },
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const P31_BOOK = new Set(['Q7725634','Q571','Q8261','Q47461344','Q49084','Q5185279','Q35760','Q277759','Q23622','Q131539','Q780605','Q386724','Q5292','Q860861','Q17518461','Q3331189','Q28869365'])
const P31_VIDEO = new Set(['Q11424','Q5398426','Q24856','Q93204','Q226730','Q1261214'])
const P31_MUSIC = new Set(['Q105543609','Q482994','Q7366','Q55850593','Q9734','Q1344','Q34379'])
const P31_ART = new Set(['Q3305213','Q219423','Q4989906','Q18573970','Q11060274','Q17516'])

function classifyType(typeIds) {
  for (const id of typeIds) {
    if (P31_VIDEO.has(id)) return 'VIDEO'
    if (P31_MUSIC.has(id)) return 'MUSIC'
    if (P31_ART.has(id)) return 'ART'
    if (P31_BOOK.has(id)) return 'BOOK'
  }
  return '?'
}

const PROP_ROLE = {
  P800: 'notable',
  P50: 'author',
  P170: 'creator',
  P57: 'director',
  P86: 'composer',
  P161: 'performer',
  P175: 'performer',
}

async function queryAll(qid) {
  const sparql = `SELECT ?work ?workLabel ?workLabelKo ?date ?type ?prop WHERE {
    {
      wd:${qid} wdt:P800 ?work . BIND("P800" AS ?prop)
    } UNION {
      ?work wdt:P50 wd:${qid} . BIND("P50" AS ?prop)
    } UNION {
      ?work wdt:P170 wd:${qid} . BIND("P170" AS ?prop)
    } UNION {
      ?work wdt:P57 wd:${qid} . BIND("P57" AS ?prop)
    } UNION {
      ?work wdt:P86 wd:${qid} . BIND("P86" AS ?prop)
    } UNION {
      ?work wdt:P161 wd:${qid} . BIND("P161" AS ?prop)
    } UNION {
      ?work wdt:P175 wd:${qid} . BIND("P175" AS ?prop)
    }
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work wdt:P31 ?type }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  }`

  const t0 = Date.now()
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'FeelandnoteBot/1.0' } })
  const elapsed = Date.now() - t0

  if (!res.ok) { console.log(`  SPARQL ERROR ${res.status} (${elapsed}ms)`); return null }
  const data = await res.json()

  // 그룹핑: work QID 기준
  const workMap = new Map()
  for (const b of data.results.bindings) {
    const en = b.workLabel?.value || ''
    const wid = b.work?.value?.split('/').pop() || ''
    if (!en || (en.startsWith('Q') && /^\d+$/.test(en.slice(1)))) continue
    if (!workMap.has(wid)) {
      workMap.set(wid, { en, ko: b.workLabelKo?.value || '', yr: b.date?.value?.slice(0, 4) || '', props: new Set(), types: new Set() })
    }
    if (b.prop?.value) workMap.get(wid).props.add(b.prop.value)
    const tid = b.type?.value?.split('/').pop()
    if (tid) workMap.get(wid).types.add(tid)
  }

  // 중복 제거 (title 기준)
  const seen = new Set()
  const results = []
  for (const w of workMap.values()) {
    const key = w.en.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    results.push(w)
  }

  return { works: results, elapsed, rawCount: data.results.bindings.length }
}

async function main() {
  for (const t of TESTS) {
    console.log(`\n========== ${t.name} (${t.qid}) — ${t.note} ==========`)
    const result = await queryAll(t.qid)
    if (!result) continue

    console.log(`  쿼리: ${result.elapsed}ms | raw: ${result.rawCount}행 | 고유: ${result.works.length}건\n`)

    for (const w of result.works) {
      const props = [...w.props].map(p => PROP_ROLE[p] || p).join('+')
      const type = classifyType([...w.types])
      console.log(`  [${type}] (${props}) ${w.en} | ${w.ko || '-'} | ${w.yr || '?'}`)
    }
    console.log(`\n  총: ${result.works.length}건`)
    await sleep(2000)
  }
}
main()
