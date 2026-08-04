/**
 * celeb_timeline_events DB 전수 감사.
 * 로컬 산출물과 비교하지 않고 서비스의 유일 원천인 DB 자체를 검사한다.
 *
 * 실행 (sw/web-bo):
 *   node --env-file=.env scripts/timeline-audit.mjs
 *   node --env-file=.env scripts/timeline-audit.mjs --slugs=ada-lovelace,aeschylus
 */

import { createClient } from '@supabase/supabase-js'

const slugArg = process.argv.find((arg) => arg.startsWith('--slugs='))
const requestedSlugs = slugArg
  ? new Set(slugArg.slice('--slugs='.length).split(',').map((slug) => slug.trim()).filter(Boolean))
  : null
const KINDS = new Set([
  'birth', 'death', 'education', 'work', 'publish',
  'battle', 'travel', 'office', 'meeting', 'other',
])

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function fetchAll(table, select, configure = (query) => query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await configure(supabase.from(table).select(select)).range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

function profileYear(value) {
  const match = /^(-?\d{1,4})/.exec(String(value ?? '').trim())
  return match ? Number(match[1]) : null
}

function validateEvent(event, index) {
  const errors = []
  const at = `${index + 1}번`
  if (!Number.isInteger(event.year)) errors.push(`${at}: year가 정수가 아니다`)
  if (event.year_end != null && (!Number.isInteger(event.year_end) || event.year_end < event.year)) errors.push(`${at}: year_end가 잘못됐다`)
  if (event.month != null && (!Number.isInteger(event.month) || event.month < 1 || event.month > 12)) errors.push(`${at}: month가 잘못됐다`)
  if (event.day != null && (!Number.isInteger(event.day) || event.day < 1 || event.day > 31)) errors.push(`${at}: day가 잘못됐다`)
  if (!KINDS.has(event.kind)) errors.push(`${at}: kind=${event.kind}`)
  for (const field of ['title', 'title_en', 'description', 'description_en']) {
    if (!event[field]?.trim()) errors.push(`${at}: ${field}가 비었다`)
  }
  if ((event.lat == null) !== (event.lng == null)) errors.push(`${at}: 위도·경도 중 하나만 있다`)
  if (event.lat != null && (event.lat < -90 || event.lat > 90 || event.lng < -180 || event.lng > 180)) errors.push(`${at}: 좌표 범위가 잘못됐다`)
  if (event.lat != null && !event.place_qid) errors.push(`${at}: 좌표에 place_qid가 없다`)
  if (event.place_qid && event.lat == null) errors.push(`${at}: place_qid에 좌표가 없다`)
  return errors
}

const [profiles, events] = await Promise.all([
  fetchAll('profiles', 'id, slug, birth_date, death_date, profile_type, status, celeb_tier'),
  fetchAll(
    'celeb_timeline_events',
    'celeb_id, year, year_end, month, day, title, title_en, description, description_en, kind, place_name, place_name_en, lat, lng, place_qid, source, source_url, sort_order',
    (query) => query.eq('source', 'research'),
  ),
])

const eligible = profiles
  .filter((profile) => (
    profile.profile_type === 'CELEB'
    && profile.status === 'active'
    && (profile.celeb_tier === 'full' || profile.celeb_tier === 'light')
    && profile.birth_date?.trim()
    && profile.death_date?.trim()
    && (!requestedSlugs || requestedSlugs.has(profile.slug))
  ))
  .sort((a, b) => a.slug.localeCompare(b.slug))

if (requestedSlugs) {
  const found = new Set(eligible.map((profile) => profile.slug))
  const invalid = [...requestedSlugs].filter((slug) => !found.has(slug))
  if (invalid.length) throw new Error(`대상 범위를 벗어나거나 없는 slug: ${invalid.join(', ')}`)
}

const eventsByCeleb = new Map()
for (const event of events) {
  const rows = eventsByCeleb.get(event.celeb_id) ?? []
  rows.push(event)
  eventsByCeleb.set(event.celeb_id, rows)
}

const failures = []
let covered = 0
let rowCount = 0
let coordCount = 0
for (const profile of eligible) {
  const rows = (eventsByCeleb.get(profile.id) ?? []).sort((a, b) => a.sort_order - b.sort_order)
  if (!rows.length) continue
  covered += 1
  rowCount += rows.length
  coordCount += rows.filter((row) => row.lat != null).length

  const errors = []
  if (rows.length < 3 || rows.length > 30) errors.push(`항목 수 ${rows.length}개(3~30 필요)`)
  if (rows.some((row, index) => row.sort_order !== index)) errors.push('sort_order가 0부터 연속되지 않는다')
  if (rows.some((row, index) => index > 0 && row.year < rows[index - 1].year)) errors.push('연도가 오름차순이 아니다')
  if (rows[0]?.kind !== 'birth' || rows.filter((row) => row.kind === 'birth').length !== 1) errors.push('출생 항목이 처음에 정확히 한 번 있지 않다')
  if (rows.at(-1)?.kind !== 'death' || rows.filter((row) => row.kind === 'death').length !== 1) errors.push('사망 항목이 마지막에 정확히 한 번 있지 않다')
  if (rows[0]?.year !== profileYear(profile.birth_date)) errors.push(`출생 연도가 프로필(${profileYear(profile.birth_date)})과 다르다`)
  if (rows.at(-1)?.year !== profileYear(profile.death_date)) errors.push(`사망 연도가 프로필(${profileYear(profile.death_date)})과 다르다`)
  for (const [index, event] of rows.entries()) errors.push(...validateEvent(event, index))
  if (errors.length) failures.push({ slug: profile.slug, errors })
}

console.log(`대상 ${eligible.length}명 · DB 완료 ${covered}명 · 미완료 ${eligible.length - covered}명`)
console.log(`연구 행 ${rowCount}건 · 좌표 ${coordCount}건 · 구조 결함 인물 ${failures.length}명`)
for (const failure of failures) console.log(`✗ ${failure.slug}: ${failure.errors.join(' / ')}`)

if (failures.length || covered !== eligible.length) process.exitCode = 1
