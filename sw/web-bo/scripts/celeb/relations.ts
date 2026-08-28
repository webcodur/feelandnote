/**
 * 셀럽 인물 관계망 수집기 — 위키데이터 → celeb_relations
 * ── 관계망 데이터의 단일원천(SSoT). 관계 종류·방향 규약은 이 파일의 PROPS 가 전부 쥔다. ──
 *
 * [무엇을 하는가]
 *   celebs.wikidata_qid 보유 셀럽에 대해 위키데이터의 인물 관계를 조회하고,
 *   **양끝이 모두 우리 셀럽인 관계만** celeb_relations 에 적재한다. 내용을 창작하지 않는다 —
 *   위키데이터가 보증하는 사실 관계만 옮긴다.
 *
 * [방향 규약 — 이 규약이 전부다]
 *   관계 사실 하나는 한 행만 쓴다. 방향 관계는 영향을 받거나 배운 사람을 from_id에 두고,
 *   대칭 관계는 두 id를 정렬한다. 화면은 양끝을 조회해 현재 인물 기준 라벨을 만든다.
 *   공용 규칙은 @feelandnote/shared/constants/celeb-relations가 쥔다.
 *
 * [관계 그룹]  family(혈연) · thought(사상: 사제·영향) · rivalry(대립: P7047 enemy of, 희소)
 *   위키데이터에 라이벌 개념이 거의 없으므로 rivalry 는 얇다. 수동 보강은 source='manual' 로
 *   같은 테이블에 넣는다. 이 스크립트는 source='wikidata' 행만 지우고 다시 쓴다(수동분 보존).
 *
 * [명단 밖 가족 — celeb_relations_external]
 *   가족은 대부분 셀럽이 아니라서 명단 안 짝만 남기면 혈연이 텅 빈다(실측 148간선).
 *   가족 속성(부모·배우자·자녀·형제·동반자)의 명단 밖 상대는 이름만 받아
 *   celeb_relations_external 에 넣고, 화면은 이동 불가 노드로 띄운다.
 *
 * [실행]  sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/celeb/relations.ts          # 실측만(DB 미반영)
 *   node --env-file=.env --import tsx scripts/celeb/relations.ts --apply  # 적재까지
 */

import { createClient } from '@supabase/supabase-js'
import { canonicalizeCelebRelation } from '@feelandnote/shared/constants/celeb-relations'
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

/* 같은 집단 소속(P361·P527·P463)을 관계로 얹을지. 기본은 끈다 —
   위키데이터에서 이 속성을 가장 많이 다는 집단이 학회·아카데미·순위 목록이라,
   그대로 넣으면 「같은 소속」이 서로 만난 적 없는 회원 명부가 된다(실측: 채택 212개 중
   대다수가 과학원·학회, 최대 순위 목록은 Bloomberg Billionaires Index). 밴드·역사 집단만
   가려낼 방법이 서기 전에는 켜지 않는다. */
const WITH_GROUPS = process.argv.includes('--with-groups')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Group = 'family' | 'thought' | 'rivalry' | 'career'
type PropDef = { type: string; group: Group }

/**
 * 위키데이터 속성 → 원문 기준 관계 종류. 저장 직전에 공용 규칙으로 한 방향만 남긴다.
 * P40은 자녀를 가리키므로 정규화하면 자녀→부모의 중립형 parent가 된다.
 */
const PROPS: Record<string, PropDef> = {
  P22:   { type: 'father',    group: 'family' },
  P25:   { type: 'mother',    group: 'family' },
  P40:   { type: 'child',     group: 'family' },
  P26:   { type: 'spouse',    group: 'family' },
  P451:  { type: 'partner',   group: 'family' },
  P3373: { type: 'sibling',   group: 'family' },
  P1038: { type: 'relative',  group: 'family' },
  P1066: { type: 'teacher',   group: 'thought' },
  P802:  { type: 'student',   group: 'thought' },
  P184:  { type: 'teacher',   group: 'thought' },
  P185:  { type: 'student',   group: 'thought' },
  P737:  { type: 'influence', group: 'thought' },
  P941:  { type: 'influence', group: 'thought' },
  P7047: { type: 'rival',     group: 'rivalry' },
}

/** 모호해서 노이즈가 많은 속성 — 실측에는 세지만 적재하지 않는다. */
const MEASURE_ONLY = new Set(['P1038'])

/** 명단 밖 상대도 이름 노드로 수집하는 속성(가족만). 사상·영향까지 열면 노드가 폭발한다. */
const EXTERNAL_PROPS = new Set(['P22', 'P25', 'P26', 'P40', 'P3373', 'P451'])

const BATCH = 250
const SLEEP_MS = 1100
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** WDQS 는 부하에 따라 산발적으로 502/429 를 뱉는다 — 3회까지 물러났다 재시도한다. */
async function wdqsFetch(query: string): Promise<Record<string, { value: string }>[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql?format=json', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'feelandnote-relations-sync/1.0 (webcodur@gmail.com)',
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

async function sparql(query: string): Promise<{ a: string; p: string; b: string }[]> {
  const bindings = await wdqsFetch(query)
  return bindings.map((r) => ({
    a: r.a.value.split('/').pop()!,
    p: r.p ? r.p.value.split('/').pop()! : '',
    b: r.b.value.split('/').pop()!,
  }))
}

type Row = { slug: string; id: string; nickname: string; wikidata_qid: string | null }

async function loadCelebs(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('celebs')
      .select('slug, id, nickname, wikidata_qid')
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function run() {
  const celebs = await loadCelebs()
  // 같은 QID를 두 인물이 물고 있으면 한쪽은 반드시 오배정이다. 선착순으로 삼키면
  // 엉뚱한 인물이 남의 관계망을 통째로 가져간다(실사고: 서태후가 아퀴나스 Q9438을 물어
  // 아퀴나스의 사제 관계 18건이 서태후 페이지에 전시됐다). 중복 QID는 전원 제외하고 크게 알린다.
  const holders = new Map<string, Row[]>()
  for (const c of celebs) {
    if (!c.wikidata_qid) continue
    const list = holders.get(c.wikidata_qid) ?? []
    list.push(c)
    holders.set(c.wikidata_qid, list)
  }
  const byQid = new Map<string, Row>()
  const dups: string[] = []
  for (const [qid, list] of holders) {
    if (list.length === 1) byQid.set(qid, list[0])
    else dups.push(`${qid} ← ${list.map((c) => c.slug).join(', ')}`)
  }
  if (dups.length) {
    console.error(`\n⚠ 중복 wikidata_qid ${dups.length}건 — 해당 인물 전원 수집에서 제외했다. celebs를 교정하라:`)
    for (const d of dups) console.error(`  ${d}`)
    console.error('')
  }
  const qids = [...byQid.keys()]
  console.log(`셀럽 ${celebs.length} | QID 보유 ${qids.length} | 모드 ${APPLY ? '적재' : '실측만'}`)

  const propList = Object.keys(PROPS).map((p) => `wdt:${p}`).join(' ')
  const allValues = qids.map((q) => `wd:${q}`).join(' ')
  const triples: { a: string; p: string; b: string }[] = []
  const cofounder: { a: string; b: string; org?: string; orgEn?: string }[] = []
  const groupmate: { a: string; b: string; grp: string; org?: string; orgEn?: string }[] = []
  for (let i = 0; i < qids.length; i += BATCH) {
    const values = qids.slice(i, i + BATCH).map((q) => `wd:${q}`).join(' ')
    const q = `SELECT ?a ?p ?b WHERE { VALUES ?a { ${values} } VALUES ?p { ${propList} } ?a ?p ?b . FILTER(isIRI(?b)) }`
    triples.push(...(await sparql(q)))
    await sleep(SLEEP_MS)
    // 현대 인물의 관계는 가족이 아니라 조직에 있다 — 같은 조직을 공동 창업한 쌍(P112 founded by)을
    // 조직을 매개로 잇는다. 위키데이터 사실이므로 창작이 아니다. (페이팔: 머스크·틸 / 구글: 페이지·브린)
    // 조직 이름도 함께 받아 근거(note)로 남긴다 — "공동 창업"만으로는 어느 회사인지 화면이 말하지 못한다.
    const cq = `SELECT ?a ?b ?ko ?en WHERE { VALUES ?a { ${values} } VALUES ?b { ${allValues} }
      ?org wdt:P112 ?a . ?org wdt:P112 ?b . FILTER(?a != ?b)
      OPTIONAL { ?org rdfs:label ?ko . FILTER(lang(?ko)='ko') }
      OPTIONAL { ?org rdfs:label ?en . FILTER(lang(?en)='en') } }`
    for (const r of await wdqsFetch(cq)) {
      cofounder.push({
        a: r.a.value.split('/').pop()!,
        b: r.b.value.split('/').pop()!,
        org: r.ko?.value ?? r.en?.value,
        orgEn: r.en?.value ?? r.ko?.value,
      })
    }
    // 아이돌 그룹·밴드·팀처럼 한 집단에 함께 속한 쌍을 집단을 매개로 잇는다. 가족 속성만 긁던
    // 때는 방탄소년단 멤버끼리도, 같은 팀 선수끼리도 서로 남남이었다(실측: 정국의 관계 0건).
    // 소속을 말하는 속성이 항목마다 달라 셋을 함께 본다 — 부분(P361)·구성원(P527)·소속(P463).
    if (WITH_GROUPS) {
    const gq = `SELECT ?a ?b ?grp ?ko ?en WHERE { VALUES ?a { ${values} } VALUES ?b { ${allValues} }
      { ?a wdt:P361 ?grp . ?b wdt:P361 ?grp } UNION
      { ?grp wdt:P527 ?a . ?grp wdt:P527 ?b } UNION
      { ?a wdt:P463 ?grp . ?b wdt:P463 ?grp }
      FILTER(?a != ?b)
      OPTIONAL { ?grp rdfs:label ?ko . FILTER(lang(?ko)='ko') }
      OPTIONAL { ?grp rdfs:label ?en . FILTER(lang(?en)='en') } }`
    for (const r of await wdqsFetch(gq)) {
      groupmate.push({
        a: r.a.value.split('/').pop()!,
        b: r.b.value.split('/').pop()!,
        grp: r.grp.value.split('/').pop()!,
        org: r.ko?.value ?? r.en?.value,
        orgEn: r.en?.value ?? r.ko?.value,
      })
    }
    }
    console.log(`  조회 ${Math.min(i + BATCH, qids.length)}/${qids.length} (관계 ${triples.length} · 공동창업 ${cofounder.length} · 한솥밥 ${groupmate.length})`)
    if (i + BATCH < qids.length) await sleep(SLEEP_MS)
  }

  // ── 관계망 목록 구성: 양끝이 모두 우리 셀럽 + 자기 참조 제외 ──
  const inSet = triples.filter((t) => byQid.has(t.b) && t.a !== t.b)
  const outSet = triples.length - inSet.length

  // ── 명단 밖 가족: 이름 노드용 수집 ──
  type ExtEdge = { from: string; qid: string; type: string; group: Group }
  const extEdges = new Map<string, ExtEdge>()
  for (const t of triples) {
    if (byQid.has(t.b) || t.a === t.b) continue
    if (!EXTERNAL_PROPS.has(t.p)) continue
    const def = PROPS[t.p]
    const A = byQid.get(t.a)
    if (!def || !A) continue
    const key = `${A.id}|${t.b}|${def.type}`
    if (!extEdges.has(key)) extEdges.set(key, { from: A.id, qid: t.b, type: def.type, group: def.group })
  }
  // 이름(ko·en 라벨)과 사진(P18) 조회. 항목 하나가 여러 행으로 올 수 있어 병합한다.
  const extQids = [...new Set([...extEdges.values()].map((e) => e.qid))]
  const labels = new Map<string, { ko?: string; en?: string; img?: string }>()
  for (let i = 0; i < extQids.length; i += BATCH) {
    const values = extQids.slice(i, i + BATCH).map((q) => `wd:${q}`).join(' ')
    const lq = `SELECT ?a ?ko ?en ?img WHERE { VALUES ?a { ${values} }
      OPTIONAL { ?a rdfs:label ?ko . FILTER(lang(?ko)='ko') }
      OPTIONAL { ?a rdfs:label ?en . FILTER(lang(?en)='en') }
      OPTIONAL { ?a wdt:P18 ?img } }`
    for (const r of await wdqsFetch(lq)) {
      const qid = r.a.value.split('/').pop()!
      const cur = labels.get(qid) ?? {}
      labels.set(qid, { ko: cur.ko ?? r.ko?.value, en: cur.en ?? r.en?.value, img: cur.img ?? r.img?.value })
    }
    console.log(`  이름 조회 ${Math.min(i + BATCH, extQids.length)}/${extQids.length}`)
    if (i + BATCH < extQids.length) await sleep(SLEEP_MS)
  }
  // 이름이 아예 없는 항목은 띄울 방법이 없다
  const extFinal = [...extEdges.values()].filter((e) => {
    const l = labels.get(e.qid)
    return l && (l.ko || l.en)
  })

  type Edge = { from: string; to: string; type: string; group: Group; note?: string; noteEn?: string }
  const edgeKey = (e: Edge) => `${e.from}|${e.to}|${e.type}`
  const edges = new Map<string, Edge>()
  const addEdge = (e: Edge) => {
    const canonical = canonicalizeCelebRelation({ fromId: e.from, toId: e.to, relType: e.type })
    const normalized = { ...e, from: canonical.fromId, to: canonical.toId, type: canonical.relType }
    if (!edges.has(edgeKey(normalized))) edges.set(edgeKey(normalized), normalized)
  }

  const perProp = new Map<string, number>()
  for (const t of inSet) {
    const def = PROPS[t.p]
    if (!def) continue
    perProp.set(t.p, (perProp.get(t.p) ?? 0) + 1)
    if (MEASURE_ONLY.has(t.p)) continue
    const A = byQid.get(t.a)!, B = byQid.get(t.b)!
    addEdge({ from: A.id, to: B.id, type: def.type, group: def.group })
  }

  // 정리 1: 같은 쌍에 father/mother 가 있으면 중립형 parent 제거
  for (const e of [...edges.values()]) {
    if (e.type !== 'parent') continue
    if (edges.has(`${e.from}|${e.to}|father`) || edges.has(`${e.from}|${e.to}|mother`)) edges.delete(edgeKey(e))
  }
  // 정리 2: 사제와 영향이 같은 쌍에 겹치면 영향 제거(더 구체적인 쪽만 남긴다)
  for (const e of [...edges.values()]) {
    if (e.type !== 'influence') continue
    if (edges.has(`${e.from}|${e.to}|teacher`)) edges.delete(edgeKey(e))
  }
  // 정리 3: 지기가 있는 쌍의 위키 동반자(P451)는 가계에 넣지 않는다.
  // 헤파이스티온·토르-로키처럼 벗을 배우/동반자 칸에 세우던 사고를 막는다.
  const friendPairs = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('celeb_relations')
      .select('from_id,to_id').eq('rel_type', 'friend').range(from, from + 999)
    if (error) throw error
    for (const r of data ?? []) friendPairs.add([r.from_id, r.to_id].sort().join('|'))
    if (!data || data.length < 1000) break
  }
  for (const e of [...edges.values()]) {
    if (e.type !== 'partner') continue
    if (friendPairs.has([e.from, e.to].sort().join('|'))) edges.delete(edgeKey(e))
  }

  // 공동 창업 간선 — 이미 더 가까운 관계(가족·사제)가 있는 쌍에는 얹지 않는다.
  // 같은 쌍이 여러 회사를 함께 세웠으면 조직 이름을 병기한다(머스크·틸: 페이팔 + OpenAI 후원 등).
  const orgOf = new Map<string, Set<string>>()
  const orgEnOf = new Map<string, Set<string>>()
  for (const c of cofounder) {
    if (!c.org) continue
    const key = [c.a, c.b].sort().join('|')
    const set = orgOf.get(key) ?? new Set<string>()
    set.add(c.org)
    orgOf.set(key, set)
    if (c.orgEn) {
      const setEn = orgEnOf.get(key) ?? new Set<string>()
      setEn.add(c.orgEn)
      orgEnOf.set(key, setEn)
    }
  }
  const seenPairs = new Set<string>()
  for (const c of cofounder) {
    const A = byQid.get(c.a), B = byQid.get(c.b)
    if (!A || !B || A.id === B.id) continue
    const pairKey = [c.a, c.b].sort().join('|')
    if (seenPairs.has(pairKey)) continue
    seenPairs.add(pairKey)
    const hasCloser = [...edges.values()].some((e) =>
      [e.from, e.to].sort().join('|') === [A.id, B.id].sort().join('|'))
    if (hasCloser) continue
    const orgs = [...(orgOf.get(pairKey) ?? [])].slice(0, 3).join(' · ')
    const orgsEn = [...(orgEnOf.get(pairKey) ?? [])].slice(0, 3).join(' and ')
    const note = orgs ? `${orgs} 공동 창업` : undefined
    const noteEn = orgsEn ? `Co-founded ${orgsEn}` : undefined
    addEdge({ from: A.id, to: B.id, type: 'cofounder', group: 'career', note, noteEn })
  }

  // ── 한솥밥 간선 ──
  // 학회·아카데미처럼 회원이 수십인 단체는 회원 전원을 서로 잇는다. 그건 관계망이 아니라 명부다.
  // 우리 명단 안 구성원이 상한을 넘는 집단은 통째로 버린다(버린 수는 아래 실측에 적는다).
  const MAX_GROUP_SIZE = 12
  const groupMembers = new Map<string, Set<string>>()
  for (const g of groupmate) {
    const set = groupMembers.get(g.grp) ?? new Set<string>()
    set.add(g.a)
    set.add(g.b)
    groupMembers.set(g.grp, set)
  }
  /* 집단 유형으로 한 번 더 거른다. 위키데이터에서 소속 속성을 가장 많이 다는 것은 학회·아카데미와
     부자 순위 목록인데, 그 명부에 함께 오른 사람들은 서로 만난 적도 없다(실측: 미국 과학 진흥
     협회, Bloomberg Billionaires Index). 사람이 실제로 한 무리로 묶이는 유형만 통과시킨다.
     하위 유형까지 P279* 로 훑어 보이밴드·걸그룹이 음악 밴드에 딸려 들어오게 한다. */
  const GROUP_TYPE_WHITELIST = [
    'Q215380',   // 음악 밴드 — 보이밴드·걸그룹을 하위로 품는다
    'Q847017',   // 스포츠 클럽
    'Q12973014', // 스포츠팀
    // '사람들의 모임'(Q16334295)은 넣지 않는다. 상위 클래스가 넓어 P279* 를 타고 학회·아카데미가
    // 통째로 딸려 들어왔다(실측: 유형 통과 324/364 — 헝가리 과학원·교황청 과학원·아카데미
    // 프랑세즈가 전부 통과). 페이팔 마피아 같은 통칭 무리를 잃더라도 명부는 들이지 않는다.
  ]
  const groupQids = [...groupMembers.keys()]
  const typedGroups = new Set<string>()
  if (WITH_GROUPS && groupQids.length) {
    const okValues = GROUP_TYPE_WHITELIST.map((q) => `wd:${q}`).join(' ')
    for (let i = 0; i < groupQids.length; i += BATCH) {
      const values = groupQids.slice(i, i + BATCH).map((q) => `wd:${q}`).join(' ')
      const tq = `SELECT DISTINCT ?g WHERE { VALUES ?g { ${values} } VALUES ?ok { ${okValues} }
        ?g wdt:P31/wdt:P279* ?ok }`
      for (const r of await wdqsFetch(tq)) typedGroups.add(r.g.value.split('/').pop()!)
      console.log(`  집단 유형 조회 ${Math.min(i + BATCH, groupQids.length)}/${groupQids.length}`)
      if (i + BATCH < groupQids.length) await sleep(SLEEP_MS)
    }
  }
  const keptGroups = new Set(
    [...groupMembers.entries()]
      .filter(([q, m]) => m.size <= MAX_GROUP_SIZE && typedGroups.has(q))
      .map(([q]) => q),
  )
  const groupOf = new Map<string, Set<string>>()
  const groupEnOf = new Map<string, Set<string>>()
  for (const g of groupmate) {
    if (!keptGroups.has(g.grp) || !g.org) continue
    const key = [g.a, g.b].sort().join('|')
    const set = groupOf.get(key) ?? new Set<string>()
    set.add(g.org)
    groupOf.set(key, set)
    if (g.orgEn) {
      const setEn = groupEnOf.get(key) ?? new Set<string>()
      setEn.add(g.orgEn)
      groupEnOf.set(key, setEn)
    }
  }
  const seenGroupPairs = new Set<string>()
  for (const g of groupmate) {
    if (!keptGroups.has(g.grp)) continue
    const A = byQid.get(g.a), B = byQid.get(g.b)
    if (!A || !B || A.id === B.id) continue
    const pairKey = [g.a, g.b].sort().join('|')
    if (seenGroupPairs.has(pairKey)) continue
    seenGroupPairs.add(pairKey)
    // 이미 더 가까운 사이(가족·사제·창업)가 있으면 얹지 않는다
    const hasCloser = [...edges.values()].some((e) =>
      [e.from, e.to].sort().join('|') === [A.id, B.id].sort().join('|'))
    if (hasCloser) continue
    const orgs = [...(groupOf.get(pairKey) ?? [])].slice(0, 2).join(' · ')
    const orgsEn = [...(groupEnOf.get(pairKey) ?? [])].slice(0, 2).join(' and ')
    const note = orgs ? `${orgs} 소속` : undefined
    const noteEn = orgsEn ? `Both in ${orgsEn}` : undefined
    addEdge({ from: A.id, to: B.id, type: 'colleague', group: 'career', note, noteEn })
  }

  const final = [...edges.values()]

  // ── 실측 보고 ──
  const idToRow = new Map(celebs.map((c) => [c.id, c]))
  const persons = new Set(final.map((e) => e.from))
  const perGroup = new Map<Group, number>()
  const degree = new Map<string, number>()
  for (const e of final) {
    perGroup.set(e.group, (perGroup.get(e.group) ?? 0) + 1)
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
  }
  console.log(`\n[실측]`)
  console.log(`  세트 내 삼중항 ${inSet.length} / 세트 밖 ${outSet} (밖 비율 ${Math.round((100 * outSet) / Math.max(1, triples.length))}%)`)
  console.log(`  속성별:`, Object.fromEntries([...perProp.entries()].sort((x, y) => y[1] - x[1])))
  console.log(`  최종 공유 관계 ${final.length}`)
  console.log(`  그룹별:`, Object.fromEntries(perGroup))
  console.log(`  한솥밥 집단 채택 ${keptGroups.size} / 후보 ${groupMembers.size}(유형 통과 ${typedGroups.size} · 구성원 ${MAX_GROUP_SIZE}명 이하) · 맺은 쌍 ${seenGroupPairs.size}`)
  {
    const named = [...groupMembers].map(([q, m]) => {
      const sample = groupmate.find((g) => g.grp === q)
      return { q, name: sample?.org ?? sample?.orgEn ?? q, size: m.size, kept: keptGroups.has(q) }
    }).sort((a, b) => b.size - a.size)
    const fmt = (list: typeof named) => list.map((g) => `${g.name}(${g.size})`).join(', ')
    console.log(`  채택 집단:`, fmt(named.filter((g) => g.kept)))
    console.log(`  제외 집단:`, fmt(named.filter((g) => !g.kept)))
  }
  console.log(`  관계 1개 이상 보유 셀럽 ${persons.size}/${celebs.length} (${Math.round((100 * persons.size) / celebs.length)}%)`)
  const extPersons = new Set(extFinal.map((e) => e.from))
  const extKo = extFinal.filter((e) => labels.get(e.qid)?.ko).length
  const extImg = extFinal.filter((e) => labels.get(e.qid)?.img).length
  console.log(`  명단 밖 가족 노드 ${extFinal.length} (한국어 이름 ${extKo}, ${Math.round((100 * extKo) / Math.max(1, extFinal.length))}% · 사진 ${extImg}, ${Math.round((100 * extImg) / Math.max(1, extFinal.length))}%) · 보유 셀럽 ${extPersons.size}`)
  const hubs = [...degree.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12)
  console.log(`  허브 상위:`, hubs.map(([id, n]) => `${idToRow.get(id)?.nickname}(${n})`).join(', '))

  if (!APPLY) { console.log('\n※ 적재하려면 --apply'); return }

  // ── 적재: wikidata 출처만 전량 교체(수동분 보존) ──
  const { error: delErr } = await supabase.from('celeb_relations').delete().eq('source', 'wikidata')
  if (delErr) throw delErr
  for (let i = 0; i < final.length; i += 500) {
    const chunk = final.slice(i, i + 500).map((e) => ({
      from_id: e.from, to_id: e.to, rel_type: e.type, rel_group: e.group, source: 'wikidata',
      note: e.note ?? null,
      note_en: e.noteEn ?? null,
    }))
    const { error } = await supabase.from('celeb_relations')
      .upsert(chunk, { onConflict: 'from_id,to_id,rel_type', ignoreDuplicates: true })
    if (error) throw error
  }
  // 명단 밖 가족도 wikidata 출처 전량 교체
  const { error: extDelErr } = await supabase.from('celeb_relations_external').delete().eq('source', 'wikidata')
  if (extDelErr) throw extDelErr
  for (let i = 0; i < extFinal.length; i += 500) {
    const chunk = extFinal.slice(i, i + 500).map((e) => {
      const l = labels.get(e.qid)
      return {
        from_id: e.from, qid: e.qid, rel_type: e.type, rel_group: e.group, source: 'wikidata',
        name_ko: l?.ko ?? null, name_en: l?.en ?? null,
        // Commons Special:FilePath 는 ?width= 로 썸네일을 준다. https 로 통일.
        image_url: l?.img ? `${l.img.replace(/^http:\/\//, 'https://')}?width=112` : null,
      }
    })
    const { error } = await supabase.from('celeb_relations_external')
      .upsert(chunk, { onConflict: 'from_id,qid,rel_type', ignoreDuplicates: true })
    if (error) throw error
  }

  const { count } = await supabase.from('celeb_relations').select('*', { count: 'exact', head: true })
  const { count: extCount } = await supabase.from('celeb_relations_external').select('*', { count: 'exact', head: true })
  console.log(`\n적재 완료. celeb_relations ${count}행 · celeb_relations_external ${extCount}행`)
}

run().catch((e) => { console.error(e); process.exit(1) })
