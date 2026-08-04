/**
 * 인물 행적 적재기 — docs/celeb-data/timeline/<slug>.json → celeb_timeline_events
 *
 * [무엇을 하는가]
 *   조사 산출물(JSON)을 읽어 검증하고 DB에 넣는다. 같은 인물을 다시 넣으면
 *   그 인물의 조사분(source='research')만 지우고 새로 쓴다 — 손으로 고친 행
 *   (source='manual')은 건드리지 않는다. 새 행을 먼저 넣고 기존 행을 지우므로,
 *   중간 실패가 나도 기존 조사분이 먼저 사라지지 않는다.
 *
 * [실행]  sw/web-bo 에서
 *   node --env-file=.env scripts/timeline-import.mjs            # 검증만(DB 미반영)
 *   node --env-file=.env scripts/timeline-import.mjs --apply    # 적재까지
 *   node --env-file=.env scripts/timeline-import.mjs --apply --slugs a,b
 *   node --env-file=.env scripts/timeline-import.mjs --v2-only --only-empty --apply
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve, join } from 'path'

const APPLY = process.argv.includes('--apply')
const V2_ONLY = process.argv.includes('--v2-only')
const ONLY_EMPTY = process.argv.includes('--only-empty')
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

function parseProfileYear(value) {
  const match = /^(-?\d{1,4})/.exec(String(value ?? '').trim())
  return match ? Number(match[1]) : null
}

function sentenceCount(text) {
  const normalized = String(text ?? '')
    .replace(/\b(?:[A-Za-z]\.\s*){2,}/g, 'ABBR')
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|St|No)\./g, '$1')
  return normalized.split(/[.!?。]\s*(?=\S|$)/).filter((part) => part.trim()).length
}

/** 한 인물 파일을 검사한다. 반환값이 비어 있으면 통과. */
function validate(slug, document, events) {
  const problems = []
  if (!Array.isArray(events) || events.length === 0) return ['events가 비었다']
  const strict = Number(document.schemaVersion ?? 1) >= 2

  if (strict) {
    if (document.schemaVersion !== 2) problems.push(`지원하지 않는 schemaVersion ${document.schemaVersion}`)
    if (document.scope !== 'active-deceased') problems.push(`scope가 active-deceased가 아니다`)
    if (document.slug !== slug) problems.push(`문서 slug '${document.slug}'가 파일명과 다르다`)
    if (!document.identity?.name?.trim()) problems.push('identity.name이 비었다')
    if (!document.identity?.birthDate?.trim()) problems.push('identity.birthDate가 비었다')
    if (!document.identity?.deathDate?.trim()) problems.push('identity.deathDate가 비었다')
    if (events.length < 3 || events.length > 30) problems.push(`행적이 ${events.length}건이다(3~30 필요)`)

    const births = events.filter((event) => event.kind === 'birth')
    const deaths = events.filter((event) => event.kind === 'death')
    if (events[0]?.kind !== 'birth') problems.push('첫 행적이 출생이 아니다')
    if (events.at(-1)?.kind !== 'death') problems.push('마지막 행적이 사망이 아니다')
    if (births.length !== 1) problems.push(`출생 행적이 ${births.length}건이다`)
    if (deaths.length !== 1) problems.push(`사망 행적이 ${deaths.length}건이다`)

    const birthYear = parseProfileYear(document.identity?.birthDate)
    const deathYear = parseProfileYear(document.identity?.deathDate)
    if (birthYear != null && events[0]?.year !== birthYear) {
      problems.push(`출생 연도 ${events[0]?.year}가 identity ${birthYear}와 다르다`)
    }
    if (deathYear != null && events.at(-1)?.year !== deathYear) {
      problems.push(`사망 연도 ${events.at(-1)?.year}가 identity ${deathYear}와 다르다`)
    }
  }

  events.forEach((e, i) => {
    const at = `${i + 1}번째`
    if (!Number.isInteger(e.year)) problems.push(`${at}: year가 정수가 아니다`)
    if (e.yearEnd != null && (!Number.isInteger(e.yearEnd) || e.yearEnd < e.year)) problems.push(`${at}: yearEnd가 잘못됐다`)
    if (e.month != null && (!Number.isInteger(e.month) || e.month < 1 || e.month > 12)) problems.push(`${at}: month가 범위 밖이다`)
    if (e.day != null && (!Number.isInteger(e.day) || e.day < 1 || e.day > 31)) problems.push(`${at}: day가 범위 밖이다`)
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
    if (strict && hasLat && !e.placeNameEn?.trim()) problems.push(`${at}: 좌표가 있는데 영문 장소 이름이 없다`)
    if (strict && hasLat && !e.placeQid?.trim()) problems.push(`${at}: 좌표가 있는데 placeQid가 없다`)
    if (strict && !e.title.trim().endsWith('다')) problems.push(`${at}: 한국어 제목이 동사형 '~다'로 끝나지 않는다`)
    if (strict && (!e.description?.trim() || sentenceCount(e.description) < 2)) problems.push(`${at}: 한국어 서술이 2문장보다 짧다`)
    if (strict && (!e.descriptionEn?.trim() || sentenceCount(e.descriptionEn) < 2)) problems.push(`${at}: 영문 서술이 2문장보다 짧다`)
    if (strict && /[一-鿿]/.test((e.title ?? '') + (e.description ?? ''))) problems.push(`${at}: 한국어에 한자가 섞였다`)
    if (strict && /[가-힣]/.test((e.titleEn ?? '') + (e.descriptionEn ?? ''))) problems.push(`${at}: 영문에 한글이 섞였다`)
    if (strict && /[—–]/.test((e.title ?? '') + (e.description ?? ''))) problems.push(`${at}: 한국어에 dash 문자가 섞였다`)
    if (strict && !/^https:\/\//.test(e.sourceUrl ?? '')) problems.push(`${at}: 확인된 HTTPS 근거 링크가 없다`)
  })

  const years = events.map((e) => e.year)
  if (years.some((y, i) => i > 0 && y < years[i - 1])) {
    problems.push('연도가 오름차순이 아니다')
  }
  if (strict) {
    const keys = new Set()
    for (const event of events) {
      const key = `${event.year}|${event.title}`
      if (keys.has(key)) problems.push(`중복 행적이 있다: ${key}`)
      keys.add(key)
    }
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
  if (V2_ONLY && Number(parsed.schemaVersion ?? 1) < 2) continue

  const events = parsed.events ?? parsed
  const problems = validate(slug, parsed, events)
  if (problems.length > 0) {
    console.log(`✗ ${slug}: ${problems.length}건`)
    problems.slice(0, 5).forEach((p) => console.log(`    ${p}`))
    failed++
    continue
  }

  const withCoord = events.filter((e) => e.lat != null).length
  totalEvents += events.length
  totalWithCoord += withCoord
  loaded.push({ slug, document: parsed, events })
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

function comparable(row) {
  return {
    year: row.year,
    yearEnd: row.year_end ?? row.yearEnd ?? null,
    month: row.month ?? null,
    day: row.day ?? null,
    title: row.title,
    titleEn: row.title_en ?? row.titleEn ?? null,
    description: row.description ?? null,
    descriptionEn: row.description_en ?? row.descriptionEn ?? null,
    kind: row.kind ?? 'other',
    placeName: row.place_name ?? row.placeName ?? null,
    placeNameEn: row.place_name_en ?? row.placeNameEn ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    placeQid: row.place_qid ?? row.placeQid ?? null,
    sourceUrl: row.source_url ?? row.sourceUrl ?? null,
    sortOrder: row.sort_order ?? row.sortOrder,
  }
}

async function deleteByIds(ids) {
  if (ids.length === 0) return null
  const { error } = await supabase.from('celeb_timeline_events').delete().in('id', ids)
  return error
}

async function restoreOldRows(profileId, oldRows) {
  const { error: clearError } = await supabase
    .from('celeb_timeline_events')
    .delete()
    .eq('celeb_id', profileId)
    .eq('source', 'research')
  if (clearError) return `새 조사분 정리 실패: ${clearError.message}`
  if (oldRows.length === 0) return null
  const { error: restoreError } = await supabase.from('celeb_timeline_events').insert(oldRows)
  return restoreError ? `기존 조사분 복원 실패: ${restoreError.message}` : null
}

for (const { slug, document, events } of loaded) {
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, profile_type, status, celeb_tier, birth_date, death_date, wikidata_qid')
    .eq('slug', slug)
    .single()
  if (pErr || !profile) {
    console.error(`✗ ${slug}: 인물을 찾지 못했다 — ${pErr?.message ?? '없음'}`)
    process.exitCode = 1
    continue
  }

  if (Number(document.schemaVersion ?? 1) >= 2) {
    if (
      profile.profile_type !== 'CELEB'
      || profile.status !== 'active'
      || (profile.celeb_tier !== 'full' && profile.celeb_tier !== 'light')
      || !profile.death_date?.trim()
    ) {
      console.error(`✗ ${slug}: active full/light 사망 인물 범위를 벗어났다`)
      process.exitCode = 1
      continue
    }
    if (profile.birth_date !== document.identity.birthDate || profile.death_date !== document.identity.deathDate) {
      console.error(`✗ ${slug}: 파일 생몰일이 현재 프로필과 다르다`)
      process.exitCode = 1
      continue
    }
    if (document.identity.wikidataQid && profile.wikidata_qid !== document.identity.wikidataQid) {
      console.error(`✗ ${slug}: 파일 Wikidata QID가 현재 프로필과 다르다`)
      process.exitCode = 1
      continue
    }
  }

  const { data: oldRows, error: oldError } = await supabase
    .from('celeb_timeline_events')
    .select('*')
    .eq('celeb_id', profile.id)
    .eq('source', 'research')
  if (oldError) {
    console.error(`✗ ${slug}: 기존 조사분 조회 실패 — ${oldError.message}`)
    process.exitCode = 1
    continue
  }
  if (ONLY_EMPTY && oldRows.length > 0) {
    console.log(`  건너뜀 ${slug}: 기존 조사분 ${oldRows.length}건`)
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

  const { data: inserted, error: iErr } = await supabase
    .from('celeb_timeline_events')
    .insert(rows)
    .select('id')
  if (iErr || inserted?.length !== rows.length) {
    if (inserted?.length) await deleteByIds(inserted.map((row) => row.id))
    const reason = iErr?.message ?? `${inserted?.length ?? 0}/${rows.length}건만 반환됐다`
    console.error(`✗ ${slug}: 적재 실패 — ${reason}`)
    process.exitCode = 1
    continue
  }

  const oldIds = oldRows.map((row) => row.id)
  const deleteError = await deleteByIds(oldIds)
  if (deleteError) {
    const rollbackError = await deleteByIds(inserted.map((row) => row.id))
    console.error(`✗ ${slug}: 기존 조사분 교체 실패 — ${deleteError.message}`)
    if (rollbackError) console.error(`  🔴 새 조사분 롤백도 실패 — ${rollbackError.message}`)
    process.exitCode = 1
    continue
  }

  const { data: saved, error: verifyError } = await supabase
    .from('celeb_timeline_events')
    .select('*')
    .eq('celeb_id', profile.id)
    .eq('source', 'research')
    .order('sort_order')
  const expected = rows.map(comparable)
  const actual = (saved ?? []).map(comparable)
  if (verifyError || JSON.stringify(actual) !== JSON.stringify(expected)) {
    const restoreError = await restoreOldRows(profile.id, oldRows)
    console.error(`✗ ${slug}: 적재 후 파일·DB 대조 실패${verifyError ? ` — ${verifyError.message}` : ''}`)
    if (restoreError) console.error(`  🔴 기존 조사분 복원 실패 — ${restoreError}`)
    process.exitCode = 1
    continue
  }

  console.log(`  적재·대조 ${slug}: ${rows.length}건`)
}

console.log('\n완료.')
