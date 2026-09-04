/**
 * 셀럽 위키데이터 QID 매칭기 — 이름 검색 → 생년 대조 → celebs.wikidata_qid
 *
 * [왜 필요한가]
 *   관계망 수집기(relations.ts)는 wikidata_qid 보유자만 조회한다. QID가 비면 그 인물은
 *   관계가 영원히 0이다. 실측 848명(가상 인물 제외)이 비어 있고 그 절반이 음악인이라,
 *   아이돌 그룹 멤버끼리 서로 남남으로 남아 있었다.
 *
 * [오배정을 막는 장치 — 이게 이 스크립트의 전부다]
 *   같은 이름의 다른 사람을 물면 남의 가족·사제 관계가 통째로 붙는다(실사고: 서태후가
 *   아퀴나스 QID를 물어 아퀴나스의 사제 관계 18건이 서태후 화면에 전시됐다).
 *   그래서 이름이 같다는 것만으로는 절대 채택하지 않는다.
 *     1) 위키데이터 항목이 사람(P31=Q5)이어야 한다
 *     2) 생년이 우리 기록과 ±1년 안이어야 한다 — 통과 못 하면 버린다
 *     3) 이미 다른 셀럽이 쓰는 QID면 버린다
 *   생년이 없는 후보도 버린다. 맞출 방법이 없는 것을 찍지 않는다.
 *
 * [실행]  sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/celeb/qid-match.ts          # 실측만(DB 미반영)
 *   node --env-file=.env --import tsx scripts/celeb/qid-match.ts --apply  # 갱신까지
 *   ... --limit 50   # 앞에서 N명만 (시험용)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const APPLY = process.argv.includes('--apply')
const limitArg = process.argv.indexOf('--limit')
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Infinity

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  process.env.DB_SECRET_KEY!,
)

const UA = 'feelandnote-qid-match/1.0 (webcodur@gmail.com)'
const SEARCH_SLEEP_MS = 150
const SPARQL_BATCH = 200
const SPARQL_SLEEP_MS = 1100
/** 생년 허용 오차(년). 사료마다 한 해씩 어긋나는 일이 흔해 ±1까지만 연다 */
const BIRTH_TOLERANCE = 1

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** '-480', '1997-09-01' 같은 표기에서 연도만 뽑는다(웹의 lib/celeb/lifespan과 같은 규칙) */
function yearOf(value: string | null | undefined): number | null {
  if (!value) return null
  const m = /^(-?\d{1,6})/.exec(value.trim())
  if (!m) return null
  const y = Number(m[1])
  return Number.isFinite(y) ? y : null
}

interface CelebRow {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  profession: string | null
  birth_date: string | null
  celeb_tier: string | null
  celeb_reality: string | null
  wikidata_qid: string | null
}

async function loadCelebs(): Promise<CelebRow[]> {
  const rows: CelebRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('celebs')
      .select('id, slug, nickname, nickname_en, profession, birth_date, celeb_tier,celeb_reality, wikidata_qid')
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as CelebRow[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

/** 이름 하나로 후보 QID를 받는다. 실패해도 배치를 세우지 않는다 */
async function searchEntities(term: string, language: string): Promise<string[]> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities`
    + `&search=${encodeURIComponent(term)}&language=${language}&uselang=${language}`
    + `&type=item&limit=5&format=json`
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) })
    if (!res.ok) return []
    const json = (await res.json()) as { search?: { id: string }[] }
    return (json.search ?? []).map((s) => s.id)
  } catch {
    return []
  }
}

async function wdqsFetch(query: string): Promise<Record<string, { value: string }>[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql?format=json', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': UA,
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

interface Fact {
  isHuman: boolean
  birthYear: number | null
  labelKo?: string
  labelEn?: string
}

/** 후보 QID들의 사람 여부·생년·이름을 한꺼번에 받는다 */
async function fetchFacts(qids: string[]): Promise<Map<string, Fact>> {
  const facts = new Map<string, Fact>()
  for (let i = 0; i < qids.length; i += SPARQL_BATCH) {
    const values = qids.slice(i, i + SPARQL_BATCH).map((q) => `wd:${q}`).join(' ')
    const query = `SELECT ?a ?human ?birth ?ko ?en WHERE { VALUES ?a { ${values} }
      OPTIONAL { ?a wdt:P31 ?human . FILTER(?human = wd:Q5) }
      OPTIONAL { ?a wdt:P569 ?birth }
      OPTIONAL { ?a rdfs:label ?ko . FILTER(lang(?ko)='ko') }
      OPTIONAL { ?a rdfs:label ?en . FILTER(lang(?en)='en') } }`
    for (const r of await wdqsFetch(query)) {
      const qid = r.a.value.split('/').pop()!
      const prev = facts.get(qid) ?? { isHuman: false, birthYear: null }
      // 생년은 여러 값이 올 수 있다(추정치 병기). 먼저 온 값을 쓴다.
      const birth = r.birth ? yearOf(r.birth.value.replace(/^\+/, '')) : null
      facts.set(qid, {
        isHuman: prev.isHuman || Boolean(r.human),
        birthYear: prev.birthYear ?? birth,
        labelKo: prev.labelKo ?? r.ko?.value,
        labelEn: prev.labelEn ?? r.en?.value,
      })
    }
    console.log(`  사실 조회 ${Math.min(i + SPARQL_BATCH, qids.length)}/${qids.length}`)
    if (i + SPARQL_BATCH < qids.length) await sleep(SPARQL_SLEEP_MS)
  }
  return facts
}

async function run() {
  const celebs = await loadCelebs()
  const taken = new Set(celebs.map((c) => c.wikidata_qid).filter(Boolean) as string[])

  // 가상 인물은 위키데이터의 실존 인물과 이어질 수 없다 — 대상에서 뺀다
  const targets = celebs
    .filter((c) => !c.wikidata_qid && c.celeb_reality !== 'FICTION' && c.birth_date)
    .slice(0, LIMIT)

  console.log(`셀럽 ${celebs.length} | QID 보유 ${taken.size} | 매칭 대상 ${targets.length} | 모드 ${APPLY ? '갱신' : '실측만'}`)

  // ── 1단계: 이름으로 후보 모으기 ──
  const candidatesOf = new Map<string, string[]>()
  for (const [index, celeb] of targets.entries()) {
    const found = new Set<string>()
    for (const qid of await searchEntities(celeb.nickname, 'ko')) found.add(qid)
    await sleep(SEARCH_SLEEP_MS)
    if (celeb.nickname_en && celeb.nickname_en !== celeb.nickname) {
      for (const qid of await searchEntities(celeb.nickname_en, 'en')) found.add(qid)
      await sleep(SEARCH_SLEEP_MS)
    }
    candidatesOf.set(celeb.id, [...found])
    if ((index + 1) % 50 === 0 || index + 1 === targets.length) {
      console.log(`  이름 검색 ${index + 1}/${targets.length}`)
    }
  }

  // ── 2단계: 후보의 사실 확인 ──
  const allCandidates = [...new Set([...candidatesOf.values()].flat())]
  console.log(`후보 항목 ${allCandidates.length}개 — 사람 여부·생년 확인`)
  const facts = await fetchFacts(allCandidates)

  // ── 3단계: 게이트 통과분만 채택 ──
  interface Hit { celeb: CelebRow; qid: string; ourYear: number; theirYear: number; label: string }
  const hits: Hit[] = []
  const rejected = { noCandidate: 0, notHuman: 0, noBirth: 0, yearGap: 0, alreadyTaken: 0 }

  for (const celeb of targets) {
    const ourYear = yearOf(celeb.birth_date)
    const candidates = candidatesOf.get(celeb.id) ?? []
    if (!candidates.length) { rejected.noCandidate++; continue }
    if (ourYear === null) { rejected.noBirth++; continue }

    let best: Hit | null = null
    for (const qid of candidates) {
      if (taken.has(qid)) { rejected.alreadyTaken++; continue }
      const fact = facts.get(qid)
      if (!fact) continue
      if (!fact.isHuman) { rejected.notHuman++; continue }
      if (fact.birthYear === null) { rejected.noBirth++; continue }
      if (Math.abs(fact.birthYear - ourYear) > BIRTH_TOLERANCE) { rejected.yearGap++; continue }
      // 생년이 더 가까운 후보를 남긴다
      const label = fact.labelKo ?? fact.labelEn ?? qid
      if (!best || Math.abs(fact.birthYear - ourYear) < Math.abs(best.theirYear - ourYear)) {
        best = { celeb, qid, ourYear, theirYear: fact.birthYear, label }
      }
    }
    if (best) {
      hits.push(best)
      taken.add(best.qid) // 한 QID를 두 사람이 물지 않게 즉시 잠근다
    }
  }

  // ── 보고 ──
  console.log(`\n[실측]`)
  console.log(`  채택 ${hits.length}/${targets.length} (${Math.round((100 * hits.length) / Math.max(1, targets.length))}%)`)
  console.log(`  탈락 사유:`, rejected)
  const byProfession = new Map<string, number>()
  for (const h of hits) byProfession.set(h.celeb.profession ?? '?', (byProfession.get(h.celeb.profession ?? '?') ?? 0) + 1)
  console.log(`  직군별 채택:`, Object.fromEntries([...byProfession].sort((a, b) => b[1] - a[1])))
  console.log(`  표본 20건:`)
  for (const h of hits.slice(0, 20)) {
    console.log(`    ${h.celeb.nickname} (${h.ourYear}) → ${h.qid} ${h.label} (${h.theirYear})`)
  }

  if (!APPLY) { console.log('\n※ 갱신하려면 --apply'); return }

  for (const h of hits) {
    const { error } = await db.from('celebs').update({ wikidata_qid: h.qid }).eq('id', h.celeb.id)
    if (error) throw error
  }
  console.log(`\n갱신 완료. ${hits.length}명에 wikidata_qid를 채웠다.`)
}

run().catch((e) => { console.error(e); process.exit(1) })
