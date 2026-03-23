import { NextRequest, NextResponse } from "next/server"

interface WorkItem {
  id: string
  title_en: string
  title_ko: string
  work_type: "BOOK" | "VIDEO" | "MUSIC" | "ART" | null
  role: string
  release_year: number | null
  props: string[]
  image: string | null
  genre: string | null
  genre_ko: string | null
  // VIDEO
  imdb_id: string | null
  poster: string | null
  duration: number | null
  // BOOK
  publisher: string | null
  pages: number | null
  isbn: string | null
  // MUSIC
  record_label: string | null
  music_duration: number | null
  // ART
  collection: string | null
  collection_ko: string | null
  material: string | null
  material_ko: string | null
  location: string | null
  location_ko: string | null
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

/** 영문 제목 목록 → Wikipedia 인터위키 링크로 한국어 제목 일괄 조회 (50개 단위) */
async function fetchKoTitlesFromWikipedia(enTitles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  // 50개씩 분할 (Wikipedia API 제한)
  for (let i = 0; i < enTitles.length; i += 50) {
    const chunk = enTitles.slice(i, i + 50)
    const titles = chunk.map(t => t.replace(/ /g, "_")).join("|")
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=langlinks&lllang=ko&lllimit=500&format=json&formatversion=2`
    try {
      const res = await fetch(url, { headers: { "User-Agent": "FeelandnoteBot/1.0" } })
      if (!res.ok) continue
      const data = await res.json()
      for (const page of data.query?.pages || []) {
        if (page.missing || !page.langlinks?.length) continue
        const koTitle = page.langlinks[0]?.title
        if (koTitle) {
          // Wikipedia 정규화된 제목 → 원본 매칭
          const enTitle = chunk.find(
            t => t.toLowerCase() === page.title?.replace(/_/g, " ").toLowerCase()
          )
          if (enTitle) result.set(enTitle, koTitle)
        }
      }
    } catch { /* 실패 무시 */ }
  }
  return result
}

async function sparqlFetch(sparql: string) {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
  const res = await fetch(url, { headers: { "User-Agent": "FeelandnoteBot/1.0" } })
  if (!res.ok) return []
  const data = await res.json()
  return data.results?.bindings || []
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
    // ── 1단계: 작품 목록 + 기본 속성 ──
    const listSparql = `SELECT ?work ?workLabel ?workLabelKo ?date ?type ?prop WHERE {
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

    const bindings = await sparqlFetch(listSparql)

    // 그룹핑
    const workMap = new Map<string, {
      en: string; ko: string; yr: string; props: Set<string>; types: Set<string>
    }>()

    for (const b of bindings) {
      const en = b.workLabel?.value || ""
      const wid = b.work?.value?.split("/").pop() || ""
      if (!en || (en.startsWith("Q") && /^\d+$/.test(en.slice(1)))) continue

      if (!workMap.has(wid)) {
        workMap.set(wid, { en, ko: b.workLabelKo?.value || "", yr: b.date?.value?.slice(0, 4) || "", props: new Set(), types: new Set() })
      }
      if (b.prop?.value) workMap.get(wid)!.props.add(b.prop.value)
      const tid = b.type?.value?.split("/").pop()
      if (tid) workMap.get(wid)!.types.add(tid)
    }

    // 중복 제거
    const seen = new Set<string>()
    const workIds: string[] = []
    const worksBase: Array<{ id: string; en: string; ko: string; yr: string; propsArr: string[]; workType: WorkItem["work_type"] }> = []

    for (const [wid, w] of workMap) {
      const key = w.en.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const workType = classifyType([...w.types])
      workIds.push(wid)
      worksBase.push({ id: wid, en: w.en, ko: w.ko, yr: w.yr, propsArr: [...w.props], workType })
    }

    // ── 2단계: 상세 속성 일괄 조회 ──
    const detailMap = new Map<string, Record<string, string>>()

    if (workIds.length > 0) {
      // 최대 200개씩 분할 (SPARQL VALUES 제한)
      const chunks: string[][] = []
      for (let i = 0; i < workIds.length; i += 200) {
        chunks.push(workIds.slice(i, i + 200))
      }

      for (const chunk of chunks) {
        const values = chunk.map(id => `wd:${id}`).join(" ")
        const detailSparql = `SELECT ?work ?image ?poster ?genre ?genreKo ?imdb ?duration ?publisher ?pages ?isbn ?label ?labelKo ?material ?materialKo ?location ?locationKo ?collection ?collectionKo WHERE {
          VALUES ?work { ${values} }
          OPTIONAL { ?work wdt:P18 ?image }
          OPTIONAL { ?work wdt:P3383 ?poster }
          OPTIONAL { ?work wdt:P136 ?genreEntity . ?genreEntity rdfs:label ?genre . FILTER(LANG(?genre) = "en")
            OPTIONAL { ?genreEntity rdfs:label ?genreKo . FILTER(LANG(?genreKo) = "ko") }
          }
          OPTIONAL { ?work wdt:P345 ?imdb }
          OPTIONAL { ?work wdt:P2047 ?duration }
          OPTIONAL { ?work wdt:P123 ?pub . ?pub rdfs:label ?publisher . FILTER(LANG(?publisher) = "en") }
          OPTIONAL { ?work wdt:P1104 ?pages }
          OPTIONAL { ?work wdt:P957 ?isbn }
          OPTIONAL { ?work wdt:P264 ?lbl . ?lbl rdfs:label ?label . FILTER(LANG(?label) = "en") }
          OPTIONAL { ?work wdt:P186 ?mat . ?mat rdfs:label ?material . FILTER(LANG(?material) = "en")
            OPTIONAL { ?mat rdfs:label ?materialKo . FILTER(LANG(?materialKo) = "ko") }
          }
          OPTIONAL { ?work wdt:P276 ?loc . ?loc rdfs:label ?location . FILTER(LANG(?location) = "en")
            OPTIONAL { ?loc rdfs:label ?locationKo . FILTER(LANG(?locationKo) = "ko") }
          }
          OPTIONAL { ?work wdt:P195 ?col . ?col rdfs:label ?collection . FILTER(LANG(?collection) = "en")
            OPTIONAL { ?col rdfs:label ?collectionKo . FILTER(LANG(?collectionKo) = "ko") }
          }
        }`

        const detailBindings = await sparqlFetch(detailSparql)

        for (const b of detailBindings) {
          const wid = b.work?.value?.split("/").pop() || ""
          if (!detailMap.has(wid)) detailMap.set(wid, {})
          const d = detailMap.get(wid)!
          if (b.image?.value && !d.image) d.image = b.image.value
          if (b.poster?.value && !d.poster) d.poster = b.poster.value
          if (b.genre?.value && !d.genre) { d.genre = b.genre.value; d.genreKo = b.genreKo?.value || "" }
          if (b.imdb?.value && !d.imdb) d.imdb = b.imdb.value
          if (b.duration?.value && !d.duration) d.duration = b.duration.value
          if (b.publisher?.value && !d.publisher) d.publisher = b.publisher.value
          if (b.pages?.value && !d.pages) d.pages = b.pages.value
          if (b.isbn?.value && !d.isbn) d.isbn = b.isbn.value
          if (b.label?.value && !d.label) d.label = b.label.value
          if (b.material?.value && !d.material) { d.material = b.material.value; d.materialKo = b.materialKo?.value || "" }
          if (b.location?.value && !d.location) { d.location = b.location.value; d.locationKo = b.locationKo?.value || "" }
          if (b.collection?.value && !d.collection) { d.collection = b.collection.value; d.collectionKo = b.collectionKo?.value || "" }
        }
      }
    }

    // ── 2.5단계: ko 라벨 없는 작품 → Wikipedia 인터위키로 한국어 제목 보강 ──
    const needsKo = worksBase.filter(w => !w.ko)
    if (needsKo.length > 0) {
      const koTitleMap = await fetchKoTitlesFromWikipedia(needsKo.map(w => w.en))
      for (const w of needsKo) {
        const koTitle = koTitleMap.get(w.en)
        if (koTitle) w.ko = koTitle
      }
    }

    // ── 결합 ──
    const works: WorkItem[] = worksBase.map(w => {
      const d = detailMap.get(w.id) || {}
      const role = w.propsArr.map(p => PROP_ROLE[p]).filter(Boolean)[0] || "unknown"

      return {
        id: w.id,
        title_en: w.en,
        title_ko: w.ko,
        work_type: w.workType,
        role,
        release_year: w.yr ? parseInt(w.yr) : null,
        props: w.propsArr,
        image: d.poster || d.image || null,
        genre: d.genre || null,
        genre_ko: d.genreKo || null,
        imdb_id: d.imdb || null,
        poster: d.poster || null,
        duration: d.duration ? parseInt(d.duration) : null,
        publisher: d.publisher || null,
        pages: d.pages ? parseInt(d.pages) : null,
        isbn: d.isbn || null,
        record_label: d.label || null,
        music_duration: d.duration ? parseInt(d.duration) : null,
        collection: d.collection || null,
        collection_ko: d.collectionKo || null,
        material: d.material || null,
        material_ko: d.materialKo || null,
        location: d.location || null,
        location_ko: d.locationKo || null,
      }
    })

    CACHE.set(qid, { data: works, ts: Date.now() })
    return NextResponse.json({ works }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ works: [], error: "fetch_error" })
  }
}
