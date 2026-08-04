/**
 * 타임라인 원본 + 국문 재작문 + 영문 재작문을 DB 저장값과 전수 대조한다.
 *
 * 실행 (sw/web-bo):
 *   node --env-file=.env scripts/timeline-verify.mjs --slugs=ada-lovelace,aeschylus
 *   node --env-file=.env scripts/timeline-verify.mjs --file=../../docs/celeb-data/timeline/_batches/deceased-active-2026-08-04.json
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'

const DATA_DIR = resolve(process.cwd(), '../../docs/celeb-data/timeline')
const KO_DIR = join(DATA_DIR, '_rewrite')
const EN_DIR = join(DATA_DIR, '_rewrite-en')
const slugArg = process.argv.find((arg) => arg.startsWith('--slugs='))
const fileArg = process.argv.find((arg) => arg.startsWith('--file='))

function requestedSlugs() {
  if (slugArg) return slugArg.slice('--slugs='.length).split(',').map((slug) => slug.trim()).filter(Boolean)
  if (fileArg) {
    const parsed = JSON.parse(readFileSync(resolve(process.cwd(), fileArg.slice('--file='.length)), 'utf-8'))
    return (Array.isArray(parsed) ? parsed : (parsed.targets ?? [])).map((target) => target.slug)
  }
  throw new Error('--slugs 또는 --file이 필요하다')
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function rewriteMap(path) {
  if (!existsSync(path)) return null
  return new Map(readJson(path).events.map((event) => [`${event.year}\u0000${event.title}`, event.after]))
}

function normalize(value) {
  return value == null ? null : value
}

function expectedRows(slug) {
  const sourcePath = join(DATA_DIR, `${slug}.json`)
  if (!existsSync(sourcePath)) return { error: '조사 원본 없음' }
  const document = readJson(sourcePath)
  const events = document.events ?? document
  const ko = rewriteMap(join(KO_DIR, `${slug}.json`))
  const en = rewriteMap(join(EN_DIR, `${slug}.json`))
  if (!ko) return { error: '한국어 재작문 없음' }
  if (!en) return { error: '영문 재작문 없음' }

  const rows = events.map((event, index) => {
    const key = `${event.year}\u0000${event.title}`
    return {
      year: event.year,
      year_end: normalize(event.yearEnd),
      month: normalize(event.month),
      day: normalize(event.day),
      title: event.title,
      title_en: event.titleEn,
      description: ko.get(key) ?? '__MISSING_KO__',
      description_en: en.get(key) ?? '__MISSING_EN__',
      kind: event.kind ?? 'other',
      place_name: normalize(event.placeName),
      place_name_en: normalize(event.placeNameEn),
      lat: normalize(event.lat),
      lng: normalize(event.lng),
      place_qid: normalize(event.placeQid),
      source: 'research',
      source_url: normalize(event.sourceUrl),
      sort_order: index,
    }
  })
  if (rows.some((row) => row.description === '__MISSING_KO__')) return { error: '한국어 재작문 사건 매칭 실패' }
  if (rows.some((row) => row.description_en === '__MISSING_EN__')) return { error: '영문 재작문 사건 매칭 실패' }
  return { rows }
}

function actualComparable(row) {
  return {
    year: row.year,
    year_end: normalize(row.year_end),
    month: normalize(row.month),
    day: normalize(row.day),
    title: row.title,
    title_en: row.title_en,
    description: row.description,
    description_en: row.description_en,
    kind: row.kind,
    place_name: normalize(row.place_name),
    place_name_en: normalize(row.place_name_en),
    lat: normalize(row.lat),
    lng: normalize(row.lng),
    place_qid: normalize(row.place_qid),
    source: row.source,
    source_url: normalize(row.source_url),
    sort_order: row.sort_order,
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const slugs = [...new Set(requestedSlugs())]
const expectedBySlug = new Map()
const failures = []
for (const slug of slugs) {
  const expected = expectedRows(slug)
  if (expected.error) failures.push(`${slug}: ${expected.error}`)
  else expectedBySlug.set(slug, expected.rows)
}

const profileById = new Map()
for (let i = 0; i < slugs.length; i += 100) {
  const { data, error } = await supabase.from('profiles').select('id, slug').in('slug', slugs.slice(i, i + 100))
  if (error) throw error
  for (const profile of data) profileById.set(profile.id, profile.slug)
}
const foundSlugs = new Set(profileById.values())
for (const slug of slugs) if (!foundSlugs.has(slug)) failures.push(`${slug}: DB 프로필 없음`)

const actualBySlug = new Map()
const profileIds = [...profileById.keys()]
for (let i = 0; i < profileIds.length; i += 50) {
  const ids = profileIds.slice(i, i + 50)
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('celeb_timeline_events')
      .select('*')
      .in('celeb_id', ids)
      .eq('source', 'research')
      .order('celeb_id')
      .order('sort_order')
      .range(offset, offset + 999)
    if (error) throw error
    for (const row of data) {
      const slug = profileById.get(row.celeb_id)
      if (!actualBySlug.has(slug)) actualBySlug.set(slug, [])
      actualBySlug.get(slug).push(actualComparable(row))
    }
    if (data.length < 1000) break
    offset += 1000
  }
}

let checkedRows = 0
for (const [slug, expected] of expectedBySlug) {
  const actual = (actualBySlug.get(slug) ?? []).sort((a, b) => a.sort_order - b.sort_order)
  checkedRows += expected.length
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const first = expected.findIndex((row, index) => JSON.stringify(row) !== JSON.stringify(actual[index]))
    failures.push(`${slug}: 파일·DB 불일치 (expected ${expected.length}, actual ${actual.length}, first ${first})`)
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`)
  console.error(`\n실패 ${failures.length}개 · 대조 시도 ${expectedBySlug.size}명 ${checkedRows}건`)
  process.exit(1)
}
console.log(`✓ 파일·DB 완전 일치: ${expectedBySlug.size}명 · ${checkedRows}건`)
