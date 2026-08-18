/**
 * 연표 사건의 빈 좌표를 외부 호출 없이 채운다.
 * 규칙 SSoT: docs/project/celeb/celeb-timeline.md
 *
 * 조사가 아니라 정리 작업이다. 장소명은 이미 조사 단계에서 확인된 값이고, 여기서는
 * 그 이름에 해당하는 좌표를 테이블 안에서 찾아 붙이기만 한다. 사실관계는 건드리지 않는다.
 * 외부 조회가 필요한 이름은 geocode-celeb-timeline-places.ts가 맡는다.
 *
 * 세 경로로 채운다.
 *  1) 같은 장소명이 다른 행에서 이미 검증된 좌표를 갖고 있을 때 그대로 옮긴다.
 *  2) 「영국 런던」처럼 국가명이 앞에 붙은 이름은 접두어를 떼고 다시 맞춘다.
 *  3) 「서울」과 「서울특별시」처럼 행정단위 접미사만 다른 이름을 맞춘다.
 *
 * 안전 규칙
 *  - 이미 좌표가 있는 행은 건드리지 않는다.
 *  - 한 이름이 서로 다른 좌표를 갖고 있으면(흔들리는 이름) 쓰지 않는다.
 *  - 국가·대륙 이름에는 좌표를 붙이지 않는다. 국토 중심 좌표는 아무 것도 뜻하지 않는다.
 *  - 허구 인물은 제외한다. 현실 좌표가 확인되지 않은 무대에 점을 찍지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/celeb/timeline/backfill-coords.ts --dry
 *   pnpm exec tsx scripts/celeb/timeline/backfill-coords.ts
 */

import { existsSync, readFileSync } from 'node:fs'
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

/** 국가·대륙·미상. 지도에 점으로 찍을 대상이 아니다. */
const NOT_A_POINT = new Set([
  '미국', '대한민국', '한국', '중국', '일본', '영국', '프랑스', '독일', '러시아', '인도',
  '이탈리아', '스페인', '캐나다', '호주', '브라질', '멕시코', '네덜란드', '스위스', '스웨덴',
  '폴란드', '튀르키예', '이집트', '그리스', '베트남', '태국', '조선', '고려', '신라', '백제',
  '소련', '북한', '유럽', '아시아', '아프리카', '북아메리카', '남아메리카', '중동', '중앙아시아',
  '스코틀랜드', '웨일스', '미상', '불명', '전국', '해외',
])

/**
 * 주·도 같은 광역 행정구역도 점이 아니다. 「캘리포니아」에 주 중심 좌표를 찍으면
 * 사막 한복판이 나온다. 도시가 뒤에 붙은 「펜실베이니아주 필라델피아」는 도시이므로 통과한다.
 */
const REGION_ONLY = /^[^\s]+(주|도|州|省)$/
const KNOWN_REGIONS = new Set([
  '캘리포니아', '텍사스', '플로리다', '뉴잉글랜드', '시베리아', '카탈루냐', '바이에른',
  '토스카나', '프로방스', '안달루시아', '경기', '전라', '경상', '충청', '강원', '제주',
])
const isRegion = (s: string) => KNOWN_REGIONS.has(s) || REGION_ONLY.test(s)

const COUNTRY_PREFIX = new RegExp(
  `^(${[...NOT_A_POINT].filter((s) => s.length <= 5).join('|')})\\s+`,
)
/**
 * 행정단위 접미사. 「서울」과 「서울특별시」를 같은 곳으로 본다.
 *
 * 한 글자짜리(시·군·구·주·도)는 떼지 않는다. 「남양주」에서 「주」를 떼면 중국 「남양」이 되어
 * 경기도 지명에 중국 좌표가 붙는다. 실제로 그렇게 잘못 매칭됐다. 명시적인 여러 글자만 뗀다.
 */
const ADMIN_SUFFIX = /(특별시|광역시|특별자치시|특별자치도|자치구|직할시)$/

/**
 * 국가·주 중심점으로 보이는 좌표는 쓰지 않는다. 소수점이 딱 떨어지는 값(53.000,-1.000 =
 * 잉글랜드 중심, 33.000,-90.000 = 미시시피주 중심)이 그 표지다. 도시 좌표가 이렇게 정확히
 * 떨어질 확률은 거의 없다.
 */
const isCentroid = (lat: number, lng: number) =>
  Number.isInteger(lat * 10) && Number.isInteger(lng * 10) && lat % 1 === 0 && lng % 1 === 0

type Row = { id: string; place_name: string | null; lat: number | null; lng: number | null; celeb_id: string }

async function page<T>(table: string, cols: string, build: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(supabase.from(table).select(cols)).order('id').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return out
  }
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')
const keyOf = (s: string) => norm(s).replace(COUNTRY_PREFIX, '').replace(ADMIN_SUFFIX, '')

/**
 * 한 장소명에서 도시로 볼 만한 후보를 뽑는다. 실제 데이터가 이런 형태로 들어와 있다.
 *   「파리, 프랑스」 「클리블랜드, 오하이오주」   → 쉼표로 나눈 각 조각
 *   「장안, 현 시안」 「무창, 오늘날 어저우」     → 「현/오늘날」 뒤의 현대 지명
 *   「개봉 황궁」 「베이징 금지성」 「도쿄 황거」   → 앞 토큰이 도시
 *   「미국 뉴욕주 뉴욕」 「소련 모스크바」        → 뒤 토큰이 도시
 * 후보는 이미 좌표를 아는 이름과 맞을 때만 쓰이므로, 헛짚어도 매칭이 안 되면 그만이다.
 */
function candidateKeys(raw: string): string[] {
  const base = norm(raw)
  const modernFirst: string[] = []
  const rest: string[] = []

  const expand = (piece: string, bucket: string[]) => {
    const p = piece.replace(/\s*(일대|부근|근처|근방|인근)$/, '').trim()
    if (!p) return
    bucket.push(p, keyOf(p))
    const toks = p.split(' ').filter(Boolean)
    if (toks.length > 1) {
      bucket.push(toks[0], keyOf(toks[0]), toks[toks.length - 1], keyOf(toks[toks.length - 1]))
    }
    // 「장쑤성 피저우시」처럼 성·시·구가 이어진 주소에서 도시 토큰만 뽑는다.
    for (const t of toks) if (/시$/.test(t) && t.length >= 3) bucket.push(t, t.slice(0, -1))
  }

  // 괄호·쉼표로 나눈 조각 중 「현/오늘날」이 붙은 것이 현대 지명이다. 이것을 **먼저** 본다.
  // 옛 이름을 먼저 보면 동음이의어에 걸린다. 「하비(현 장쑤성 피저우시)」가 미국 일리노이
  // 하비로, 「강릉(현 후베이성 징저우시)」가 강원도 강릉으로 붙었다.
  for (const piece of base.split(/[(),·（）]/).map((s) => s.trim()).filter(Boolean)) {
    const isModern = /^(현|오늘날|지금의|현재의|현재)\s+/.test(piece)
    expand(piece.replace(/^(현|오늘날|지금의|현재의|현재)\s+/, ''), isModern ? modernFirst : rest)
  }
  return [...new Set([...modernFirst, base, keyOf(base), ...rest])].filter((k) => k.length >= 2)
}

async function main() {
  const dry = process.argv.includes('--dry')

  const fiction = new Set(
    (await page<{ id: string }>('celebs', 'id', (q) => q.eq('celeb_tier', 'fiction'))).map((c) => c.id),
  )
  const rows = await page<Row>('celeb_timeline_events', 'id,place_name,lat,lng,celeb_id', (q) => q)

  // ── 이름별 좌표 사전. 흔들리는 이름은 버린다.
  const seen = new Map<string, Set<string>>()
  const coord = new Map<string, { lat: number; lng: number }>()
  const add = (key: string, lat: number, lng: number) => {
    if (!key || NOT_A_POINT.has(key) || isRegion(key) || isCentroid(lat, lng)) return
    const sig = `${lat.toFixed(2)},${lng.toFixed(2)}`
    const s = seen.get(key) ?? new Set<string>()
    s.add(sig)
    seen.set(key, s)
    if (!coord.has(key)) coord.set(key, { lat, lng })
  }
  for (const r of rows) {
    if (r.lat === null || r.lng === null || !r.place_name || fiction.has(r.celeb_id)) continue
    const n = norm(r.place_name)
    add(n, r.lat, r.lng)
    add(keyOf(n), r.lat, r.lng)
  }
  for (const [k, s] of seen) if (s.size > 1) coord.delete(k)

  // ── 빈 좌표 행을 이름별로 모은다. 정확 일치 → 정규화 일치 순으로 본다.
  const plan = new Map<string, { lat: number; lng: number; n: number }>()
  for (const r of rows) {
    if (r.lat !== null || !r.place_name || fiction.has(r.celeb_id)) continue
    const n = norm(r.place_name)
    if (NOT_A_POINT.has(n) || isRegion(n)) continue
    let hit: { lat: number; lng: number } | undefined
    for (const k of candidateKeys(n)) {
      if (NOT_A_POINT.has(k) || isRegion(k)) continue
      hit = coord.get(k)
      if (hit) break
    }
    if (!hit) continue
    const cur = plan.get(r.place_name)
    plan.set(r.place_name, { lat: hit.lat, lng: hit.lng, n: (cur?.n ?? 0) + 1 })
  }

  const total = [...plan.values()].reduce((s, v) => s + v.n, 0)
  if (plan.size === 0) { console.log('채울 좌표 없음'); return }
  console.log(`${dry ? '[DRY] ' : ''}채울 사건 ${total}건 / 이름 ${plan.size}개`)
  for (const [name, v] of [...plan.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 28)) {
    console.log(`  ${String(v.n).padStart(4)}건  ${name} → ${v.lat.toFixed(3)},${v.lng.toFixed(3)}`)
  }
  if (dry) return

  let done = 0
  for (const [name, v] of plan) {
    const { error, count } = await supabase
      .from('celeb_timeline_events')
      .update({ lat: v.lat, lng: v.lng }, { count: 'exact' })
      .is('lat', null)
      .eq('place_name', name)
    if (error) { console.log(`실패 ${name}: ${error.message}`); continue }
    done += count ?? 0
  }

  const after = rows.filter((r) => r.lat !== null).length + done
  console.log(`반영 ${done}건 · 좌표율 ${(100 * after / rows.length).toFixed(1)}%`)
}

main().catch((e) => { console.error(e); process.exit(1) })
