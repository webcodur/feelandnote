import { NextRequest, NextResponse } from "next/server"

interface WorkItem {
  id: string
  title_en: string
  title_ko: string
  work_type: "BOOK" | "VIDEO" | "MUSIC" | "ART" | null
  role: string
  release_year: number | null
  props: string[]
}

const CACHE = new Map<string, { data: WorkItem[]; ts: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24시간

const P31_BOOK = new Set([
  "Q7725634","Q571","Q8261","Q47461344","Q49084","Q5185279","Q35760",
  "Q277759","Q23622","Q131539","Q780605","Q386724","Q5292","Q860861",
  "Q17518461","Q3331189","Q28869365",
])
const P31_VIDEO = new Set([
  "Q11424","Q5398426","Q24856","Q93204","Q226730","Q1261214",
])
const P31_MUSIC = new Set([
  "Q105543609","Q482994","Q7366","Q55850593","Q9734","Q1344","Q34379",
])
const P31_ART = new Set([
  "Q3305213","Q219423","Q4989906","Q18573970","Q11060274","Q17516",
])

function classifyType(typeIds: string[]): WorkItem["work_type"] {
  for (const id of typeIds) {
    if (P31_VIDEO.has(id)) return "VIDEO"
    if (P31_MUSIC.has(id)) return "MUSIC"
    if (P31_ART.has(id)) return "ART"
    if (P31_BOOK.has(id)) return "BOOK"
  }
  return null
}

const PROP_ROLE: Record<string, string> = {
  P800: "notable",
  P50: "author",
  P170: "creator",
  P57: "director",
  P86: "composer",
  P161: "performer",
  P175: "performer",
}

export async function GET(req: NextRequest) {
  const qid = req.nextUrl.searchParams.get("qid")
  if (!qid || !/^Q\d+$/.test(qid)) {
    return NextResponse.json({ error: "valid qid required" }, { status: 400 })
  }

  const cached = CACHE.get(qid)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ works: cached.data })
  }

  try {
    const sparql = `SELECT ?work ?workLabel ?workLabelKo ?date ?type ?prop WHERE {
      { wd:${qid} wdt:P800 ?work . BIND("P800" AS ?prop) }
      UNION { ?work wdt:P50 wd:${qid} . BIND("P50" AS ?prop) }
      UNION { ?work wdt:P170 wd:${qid} . BIND("P170" AS ?prop) }
      UNION { ?work wdt:P57 wd:${qid} . BIND("P57" AS ?prop) }
      UNION { ?work wdt:P86 wd:${qid} . BIND("P86" AS ?prop) }
      UNION { ?work wdt:P161 wd:${qid} . BIND("P161" AS ?prop) }
      UNION { ?work wdt:P175 wd:${qid} . BIND("P175" AS ?prop) }
      OPTIONAL { ?work wdt:P577 ?date }
      OPTIONAL { ?work wdt:P31 ?type }
      OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }`

    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
    const res = await fetch(url, {
      headers: { "User-Agent": "FeelandnoteBot/1.0" },
    })

    if (!res.ok) {
      return NextResponse.json({ works: [], error: "sparql_error" })
    }

    const data = await res.json()
    const bindings = data.results?.bindings || []

    // 그룹핑
    const workMap = new Map<string, {
      en: string; ko: string; yr: string; props: Set<string>; types: Set<string>
    }>()

    for (const b of bindings) {
      const en = b.workLabel?.value || ""
      const wid = b.work?.value?.split("/").pop() || ""
      if (!en || (en.startsWith("Q") && /^\d+$/.test(en.slice(1)))) continue

      if (!workMap.has(wid)) {
        workMap.set(wid, {
          en,
          ko: b.workLabelKo?.value || "",
          yr: b.date?.value?.slice(0, 4) || "",
          props: new Set(),
          types: new Set(),
        })
      }
      if (b.prop?.value) workMap.get(wid)!.props.add(b.prop.value)
      const tid = b.type?.value?.split("/").pop()
      if (tid) workMap.get(wid)!.types.add(tid)
    }

    // 중복 제거 + 변환
    const seen = new Set<string>()
    const works: WorkItem[] = []

    for (const [wid, w] of workMap) {
      const key = w.en.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      const propsArr = [...w.props]
      const role = propsArr.map(p => PROP_ROLE[p]).filter(Boolean)[0] || "unknown"

      works.push({
        id: wid,
        title_en: w.en,
        title_ko: w.ko,
        work_type: classifyType([...w.types]),
        role,
        release_year: w.yr ? parseInt(w.yr) : null,
        props: propsArr,
      })
    }

    CACHE.set(qid, { data: works, ts: Date.now() })
    return NextResponse.json({ works })
  } catch {
    return NextResponse.json({ works: [], error: "fetch_error" })
  }
}
