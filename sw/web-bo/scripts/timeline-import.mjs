/**
 * 인물 행적 적재기 — docs/celeb-data/timeline/<slug>.json → celeb_timeline_events
 *
 * [무엇을 하는가]
 *   조사 산출물(JSON)을 읽어 검증하고 DB에 넣는다. 같은 인물을 다시 넣으면
 *   그 인물의 조사분(source='research')만 지우고 새로 쓴다 — 손으로 고친 행
 *   (source='manual')은 건드리지 않는다.
 *
 * [실행]  sw/web-bo 에서
 *   node --env-file=.env scripts/timeline-import.mjs            # 검증만(DB 미반영)
 *   node --env-file=.env scripts/timeline-import.mjs --apply    # 적재까지
 *   node --env-file=.env scripts/timeline-import.mjs --apply --slugs a,b
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve, join } from 'path'

const APPLY = process.argv.includes('--apply')
const slugArg = process.argv.find((a) => a.startsWith('--slugs='))
const ONLY = slugArg ? slugArg.slice('--slugs='.length).split(',').map((s) => s.trim()) : null

const DIR = resolve(process.cwd(), '../../docs/celeb-data/timeline')
const KINDS = new Set([
  'birth', 'death', 'education', 'work', 'publish',
  'battle', 'travel', 'office', 'meeting', 'other',
])

if (!existsSync(DIR)) {
  console.error(`조사 폴더가 없다: ${DIR}`)
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

/** 한 인물 파일을 검사한다. 반환값이 비어 있으면 통과. */
function validate(slug, events) {
  const problems = []
  if (!Array.isArray(events) || events.length === 0) return ['events가 비었다']

  events.forEach((e, i) => {
    const at = `${i + 1}번째`
    if (!Number.isInteger(e.year)) problems.push(`${at}: year가 정수가 아니다`)
    if (e.yearEnd != null && e.yearEnd < e.year) problems.push(`${at}: yearEnd가 year보다 앞선다`)
    if (!e.title?.trim()) problems.push(`${at}: title이 비었다`)
    if (!e.titleEn?.trim()) problems.push(`${at}: titleEn이 비었다`)
    if (e.kind && !KINDS.has(e.kind)) problems.push(`${at}: kind '${e.kind}'는 정해진 값이 아니다`)
    const hasLat = e.lat != null
    const hasLng = e.lng != null
    if (hasLat !== hasLng) problems.push(`${at}: 위도·경도는 둘 다 있거나 둘 다 없어야 한다`)
    if (hasLat && (e.lat < -90 || e.lat > 90)) problems.push(`${at}: 위도 ${e.lat}가 범위 밖이다`)
    if (hasLng && (e.lng < -180 || e.lng > 180)) problems.push(`${at}: 경도 ${e.lng}가 범위 밖이다`)
    // 좌표를 뒤집어 넣는 사고가 잦다 — 위도에 |값|>90이 오면 위에서 걸리고,
    // 한국·유럽처럼 경도가 위도보다 확연히 큰 곳은 아래 힌트로 잡는다
    if (hasLat && hasLng && Math.abs(e.lat) > 60 && Math.abs(e.lng) < 20 && e.placeName?.match(/한국|서울|중국|일본/)) {
      problems.push(`${at}: 위도·경도가 뒤바뀐 것 같다 (${e.lat}, ${e.lng})`)
    }
    if (hasLat && !e.placeName?.trim()) problems.push(`${at}: 좌표가 있는데 장소 이름이 없다`)
  })

  const years = events.map((e) => e.year)
  if (years.some((y, i) => i > 0 && y < years[i - 1])) {
    problems.push('연도가 오름차순이 아니다')
  }
  return problems
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.json'))
let totalEvents = 0
let totalWithCoord = 0
let failed = 0
const loaded = []

for (const file of files) {
  const slug = file.replace(/\.json$/, '')
  if (ONLY && !ONLY.includes(slug)) continue

  let parsed
  try {
    parsed = JSON.parse(readFileSync(join(DIR, file), 'utf-8'))
  } catch (e) {
    console.log(`✗ ${slug}: JSON 파싱 실패 — ${e.message}`)
    failed++
    continue
  }

  const events = parsed.events ?? parsed
  const problems = validate(slug, events)
  if (problems.length > 0) {
    console.log(`✗ ${slug}: ${problems.length}건`)
    problems.slice(0, 5).forEach((p) => console.log(`    ${p}`))
    failed++
    continue
  }

  const withCoord = events.filter((e) => e.lat != null).length
  totalEvents += events.length
  totalWithCoord += withCoord
  loaded.push({ slug, events })
  console.log(`✓ ${slug}: ${events.length}건 (좌표 ${withCoord})`)
}

console.log(
  `\n합계 — 인물 ${loaded.length}명 · 행적 ${totalEvents}건 · 좌표 보유 ${totalWithCoord}건` +
    (failed > 0 ? ` · 불합격 ${failed}명` : ''),
)

if (!APPLY) {
  console.log('검증만 했다. 적재하려면 --apply 를 붙여라.')
  process.exit(failed > 0 ? 1 : 0)
}

if (failed > 0) {
  console.error('불합격이 있어 적재하지 않는다. 고친 뒤 다시 실행하라.')
  process.exit(1)
}

for (const { slug, events } of loaded) {
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', slug)
    .single()
  if (pErr || !profile) {
    console.error(`✗ ${slug}: 인물을 찾지 못했다 — ${pErr?.message ?? '없음'}`)
    process.exitCode = 1
    continue
  }

  const { error: dErr } = await supabase
    .from('celeb_timeline_events')
    .delete()
    .eq('celeb_id', profile.id)
    .eq('source', 'research')
  if (dErr) {
    console.error(`✗ ${slug}: 기존 조사분 삭제 실패 — ${dErr.message}`)
    process.exitCode = 1
    continue
  }

  const rows = events.map((e, i) => ({
    celeb_id: profile.id,
    year: e.year,
    year_end: e.yearEnd ?? null,
    month: e.month ?? null,
    day: e.day ?? null,
    title: e.title,
    title_en: e.titleEn,
    description: e.description ?? null,
    description_en: e.descriptionEn ?? null,
    kind: e.kind ?? 'other',
    place_name: e.placeName ?? null,
    place_name_en: e.placeNameEn ?? null,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    place_qid: e.placeQid ?? null,
    source: 'research',
    source_url: e.sourceUrl ?? null,
    sort_order: i,
  }))

  const { error: iErr } = await supabase.from('celeb_timeline_events').insert(rows)
  if (iErr) {
    console.error(`✗ ${slug}: 적재 실패 — ${iErr.message}`)
    process.exitCode = 1
    continue
  }
  console.log(`  적재 ${slug}: ${rows.length}건`)
}

console.log('\n완료.')
