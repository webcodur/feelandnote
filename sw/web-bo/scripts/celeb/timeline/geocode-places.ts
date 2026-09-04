/**
 * 연표 사건의 장소명을 Wikidata에서 조회해 좌표를 채운다.
 * 규칙 SSoT: docs/project/celeb/celeb-06-01-timeline.md (좌표는 그 장소의 P625만 쓴다)
 *
 * 이미 확인된 장소명에 좌표만 붙이는 순수 조회 작업이며
 * 사건의 사실관계는 건드리지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/celeb/timeline/geocode-places.ts lookup --min 2   # 조회 후 파일로 저장
 *   pnpm exec tsx scripts/celeb/timeline/geocode-places.ts apply            # 저장된 결과를 반영
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  process.env.DB_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const OUT = resolve(process.cwd(), '.tmp-timeline-geocode.json')

/** 국가·대륙은 지도에 점으로 찍을 대상이 아니다. 국토 중심 좌표는 아무 것도 뜻하지 않는다. */
const NOT_A_POINT = new Set([
  '미국', '대한민국', '한국', '중국', '일본', '영국', '프랑스', '독일', '러시아', '인도',
  '이탈리아', '스페인', '캐나다', '호주', '브라질', '멕시코', '네덜란드', '스위스', '스웨덴',
  '폴란드', '튀르키예', '이집트', '그리스', '베트남', '태국', '조선', '고려', '신라', '백제',
  '로마 제국', '소련', '북한', '유럽', '아시아', '아프리카', '북아메리카', '남아메리카',
  '중동', '중앙아시아', '스코틀랜드', '웨일스', '미상', '불명', '전국', '해외',
  '캘리포니아', '미국 캘리포니아주', '이스라엘', '시리아', '대만', '몽골', '실리콘밸리',
  '진나라', '노나라', '제나라', '형주', '상군',
])

/** 사람이 사는 곳인지를 설명문으로 판정한다. 좌표가 있는 역·건물·작품을 걸러 낸다. */
const SETTLEMENT = /(도시|수도|주도|주청|현급|행정 ?구역|자치|특별시|광역시|[가-힣]+시\b|[가-힣]+군\b|마을|읍|면|city|town|capital|municipality|commune|village|settlement|prefecture|county)/i
const NOT_A_PLACE = /(역$|역\b|철도|station|영화|음반|앨범|소설|기업|회사|band|album|film)/i

type Hit = { place: string; qid: string; label: string; desc: string; lat: number; lng: number; events: number }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function wd(url: string): Promise<any> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'feelandnote-timeline-geocode/1.0' } })
      if (res.ok) return await res.json()
    } catch { /* 재시도 */ }
    await sleep(500 * (i + 1))
  }
  return null
}

/**
 * 검색어를 여러 형태로 바꿔 가며 시도한다. 「영국 런던」을 통째로 물으면 못 찾지만
 * 접두어를 떼면 「런던」이라 바로 나온다. 실패의 큰 덩어리가 이 형태였다.
 */
function queryForms(name: string): string[] {
  const base = name.trim().replace(/\s+/g, ' ')
  const forms = [base]
  const modern = base.match(/(?:현|오늘날|현재)\s+([^\s,，]+)/)
  if (modern) forms.push(modern[1])
  const comma = base.split(/[,，]/)[0]?.trim()
  if (comma && comma !== base) forms.push(comma)
  const stripped = base.replace(
    /^(대한민국|한국|미국|영국|중국|일본|프랑스|독일|러시아|이탈리아|스페인|캐나다|인도|호주|브라질|멕시코|네덜란드|스위스|스웨덴|폴란드|튀르키예|그리스|이집트|베트남|태국|조선|소련)\s+/,
    '',
  )
  if (stripped !== base) forms.push(stripped)
  const noBuilding = stripped.replace(/\s*(수녀원|수도원|의사당|형무소|감옥|대학|대학교|고등학교)$/, '').trim()
  if (noBuilding && noBuilding !== stripped) forms.push(noBuilding)
  const last = stripped.split(' ').pop() ?? ''
  if (last && last !== stripped) forms.push(last)
  const first = stripped.split(' ')[0] ?? ''
  if (first.length >= 2 && first !== stripped) forms.push(first)
  return [...new Set(forms)].filter((f) => f.length >= 2)
}

/** 이름으로 검색한 뒤 P625를 가진 첫 항목을 쓴다. 좌표가 없는 개념·인물은 자연히 걸러진다. */
async function lookupOne(name: string): Promise<Omit<Hit, 'place' | 'events'> | null> {
  for (const form of queryForms(name)) {
    const got = await searchForm(form)
    if (got) return got
    await sleep(80)
  }
  return null
}

async function searchForm(name: string): Promise<Omit<Hit, 'place' | 'events'> | null> {
  const search = await wd(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=ko&uselang=ko&limit=5&search=${encodeURIComponent(name)}`,
  )
  const ids: string[] = (search?.search ?? []).map((s: any) => s.id).filter(Boolean)
  if (ids.length === 0) return null

  const ent = await wd(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels|descriptions&languages=ko|en&ids=${ids.join('|')}`,
  )
  for (const id of ids) {
    const e = ent?.entities?.[id]
    const coord = e?.claims?.P625?.[0]?.mainsnak?.datavalue?.value
    if (!coord || typeof coord.latitude !== 'number') continue
    // 좌표가 있다고 다 장소는 아니다. 「개봉」이 카이펑 대신 서울 지하철 개봉역으로 잡혔다.
    // 설명문으로 정착지인지 확인한다.
    const desc = e?.descriptions?.ko?.value ?? e?.descriptions?.en?.value ?? ''
    const label = e?.labels?.ko?.value ?? e?.labels?.en?.value ?? ''
    if (!SETTLEMENT.test(desc) || NOT_A_PLACE.test(desc) || NOT_A_PLACE.test(label)) continue
    return {
      qid: id,
      label: e?.labels?.ko?.value ?? e?.labels?.en?.value ?? '',
      desc: e?.descriptions?.ko?.value ?? e?.descriptions?.en?.value ?? '',
      lat: coord.latitude,
      lng: coord.longitude,
    }
  }
  return null
}

function argOf(n: string) {
  const i = process.argv.indexOf(`--${n}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function lookup() {
  const min = Number.parseInt(argOf('min') ?? '2', 10)

  // 좌표 없는 행을 페이지로 끌어와 메모리에서 이름별로 센다.
  const rows: { place_name: string | null; lat: number | null; celeb_id: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data: page, error: e } = await db
      .from('celeb_timeline_events')
      .select('place_name,lat,celeb_id')
      .is('lat', null)
      .order('id')
      .range(from, from + 999)
    if (e) throw new Error(e.message)
    rows.push(...(page ?? []))
    if (!page || page.length < 1000) break
  }
  const fictionIds = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data: page } = await db
      .from('celebs').select('id').in('celeb_reality', ['FICTION', 'BOTH']).order('id').range(from, from + 999)
    for (const c of page ?? []) fictionIds.add(c.id)
    if (!page || page.length < 1000) break
  }

  const tally = new Map<string, number>()
  for (const r of rows) {
    const p = (r.place_name ?? '').trim()
    if (!p || NOT_A_POINT.has(p) || fictionIds.has(r.celeb_id)) continue
    tally.set(p, (tally.get(p) ?? 0) + 1)
  }
  const targets = [...tally.entries()].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1])
  const lanes = Number.parseInt(argOf('lanes') ?? '6', 10)
  console.log(`조회 대상 ${targets.length}개 이름 / 사건 ${targets.reduce((s, [, n]) => s + n, 0)}건 / 레인 ${lanes}`)

  const hits: Hit[] = []
  let miss = 0
  let done = 0
  const queue = [...targets]
  await Promise.all(Array.from({ length: Math.min(lanes, queue.length) }, async () => {
    for (;;) {
      const next = queue.shift()
      if (!next) return
      const [place, events] = next
      const got = await lookupOne(place)
      if (got) hits.push({ place, events, ...got })
      else miss++
      done++
      if (done % 40 === 0) console.log(`  진행 ${done}/${targets.length} (성공 ${hits.length})`)
    }
  }))
  writeFileSync(OUT, JSON.stringify(hits, null, 1), 'utf8')
  console.log(`\n조회 완료: 성공 ${hits.length} / 실패 ${miss} → ${OUT}`)
  console.log(`채울 수 있는 사건: ${hits.reduce((s, h) => s + h.events, 0)}건`)
}

async function apply() {
  const hits = JSON.parse(readFileSync(OUT, 'utf8')) as Hit[]
  let ok = 0
  for (const h of hits) {
    const { error, count } = await db
      .from('celeb_timeline_events')
      .update({ lat: h.lat, lng: h.lng }, { count: 'exact' })
      .is('lat', null)
      .eq('place_name', h.place)
    if (error) { console.log(`실패 ${h.place}: ${error.message}`); continue }
    ok += count ?? 0
  }
  console.log(`좌표 반영 ${ok}건 (이름 ${hits.length}개)`)
}

const cmd = process.argv[2]
const run = cmd === 'lookup' ? lookup : cmd === 'apply' ? apply : null
if (!run) {
  console.error('사용법: lookup [--min N] | apply')
  process.exit(1)
}
run().catch((e) => { console.error(e); process.exit(1) })
