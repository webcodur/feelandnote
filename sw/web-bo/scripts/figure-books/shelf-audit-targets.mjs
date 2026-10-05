/**
 * 인물 단위 책장 정밀 정비의 대상 선정(읽기 전용).
 * view_count·celeb_influence 합집합 상위 인물 중 책장 결손이 있는 사람을 점수 순으로 낸다.
 * 절차는 docs/continuous/figure-books.md 「인물 단위 정밀 정비」가 쥔다.
 *
 * node --env-file=.env --import tsx scripts/figure-books/shelf-audit-targets.mjs
 * node --env-file=.env --import tsx scripts/figure-books/shelf-audit-targets.mjs --limit 30 --out ../../data/celeb/figure-books/shelf-audit-targets.json
 * --include-empty 를 붙이면 관계 0건 인물도 포함한다(기본은 제외 — 0권 난공략분은 별도 과제).
 */

import { writeFileSync } from 'node:fs'
import { createClient } from '@feelandnote/db'

const PAGE_SIZE = 1000

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
const db = createClient(dbUrl, dbKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function allRows(label, page) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const current = data ?? []
    rows.push(...current)
    if (current.length < PAGE_SIZE) return rows
  }
}

const includeEmpty = process.argv.includes('--include-empty')
const limit = Number(argumentValue('limit', '100'))
const out = argumentValue('out')

const [celebs, influence, relations, editions, locales] = await Promise.all([
  allRows('celebs', (from, to) => db
    .from('celebs')
    .select('id,slug,nickname,nickname_en,profession,view_count,celeb_reality,created_at')
    .eq('publication_status', 'active')
    .order('id')
    .range(from, to)),
  allRows('celeb_influence', (from, to) => db
    .from('celeb_influence')
    .select('celeb_id,total_score')
    .order('celeb_id')
    .range(from, to)),
  allRows('figure_book_characters', (from, to) => db
    .from('figure_book_characters')
    .select('celeb_id,content_id,relation_type')
    .order('celeb_id')
    .range(from, to)),
  allRows('figure_book_editions', (from, to) => db
    .from('figure_book_editions')
    .select('content_id,locale')
    .order('content_id')
    .range(from, to)),
  allRows('content_locales', (from, to) => db
    .from('content_locales')
    .select('content_id,locale,sources')
    .order('content_id')
    .range(from, to)),
])

const realCelebs = celebs.filter((celeb) => celeb.celeb_reality !== 'FICTION')
const scoreById = new Map(influence.map((row) => [row.celeb_id, row.total_score ?? 0]))

// 관계된 작품 집합과 그 메타를 모은다
const relByCeleb = new Map()
const contentIds = new Set()
for (const row of relations) {
  if (!relByCeleb.has(row.celeb_id)) relByCeleb.set(row.celeb_id, [])
  relByCeleb.get(row.celeb_id).push(row)
  contentIds.add(row.content_id)
}

const editionLocales = new Map()
for (const row of editions) {
  if (!editionLocales.has(row.content_id)) editionLocales.set(row.content_id, new Set())
  editionLocales.get(row.content_id).add(row.locale)
}

// 표시용 제목 행(sources.primary='none')과 번역 미확인 표식
const displayOnlyLocale = new Set()
for (const row of locales) {
  const sources = row.sources && typeof row.sources === 'object' ? row.sources : {}
  if (sources.primary === 'none') displayOnlyLocale.add(`${row.content_id}:${row.locale}`)
}

const contents = (await allRows('contents', (from, to) => db
  .from('contents')
  .select('id,metadata')
  .eq('type', 'BOOK')
  .order('id')
  .range(from, to))).filter((row) => contentIds.has(row.id))
const figureById = new Map(contents.map((row) => {
  const figure = row.metadata && typeof row.metadata === 'object' ? row.metadata.figureBook ?? {} : {}
  return [row.id, figure]
}))
// 같은 workIdentity를 가리키는 중복 작품(통합 후보)
const identityOwners = new Map()
for (const [id, figure] of figureById) {
  const identity = typeof figure.workIdentity === 'string' ? figure.workIdentity : null
  if (!identity) continue
  if (!identityOwners.has(identity)) identityOwners.set(identity, [])
  identityOwners.get(identity).push(id)
}
const dupedIds = new Set()
for (const ids of identityOwners.values()) if (ids.length > 1) for (const id of ids) dupedIds.add(id)

// 신호 점수 — view_count·영향력 각각 백분위를 내고 큰 쪽을 쓴다(합집합 상위)
const byView = [...realCelebs].sort((a, b) => (a.view_count ?? 0) - (b.view_count ?? 0))
const byInf = [...realCelebs].sort((a, b) => (scoreById.get(a.id) ?? 0) - (scoreById.get(b.id) ?? 0))
const denom = Math.max(1, realCelebs.length - 1)
const rankView = new Map(byView.map((p, i) => [p.id, i / denom]))
const rankInf = new Map(byInf.map((p, i) => [p.id, i / denom]))

const targets = []
for (const celeb of realCelebs) {
  const rels = relByCeleb.get(celeb.id) ?? []
  if (!includeEmpty && rels.length === 0) continue
  const flags = []
  let koGap = 0, koRecheck = 0, enGap = 0, dup = 0
  for (const rel of rels) {
    const locales = editionLocales.get(rel.content_id) ?? new Set()
    const figure = figureById.get(rel.content_id) ?? {}
    const identity = typeof figure.workIdentity === 'string' ? figure.workIdentity : ''
    const isDomestic = identity.startsWith('book/')
    if (!locales.has('ko')) {
      if (figure.koTranslationStatus === 'verified_unavailable') koRecheck += 1
      else koGap += 1
    } else if (displayOnlyLocale.has(`${rel.content_id}:ko`)) koRecheck += 1
    if (!isDomestic && !locales.has('en')) enGap += 1
    if (dupedIds.has(rel.content_id)) dup += 1
  }
  if (rels.length <= 2) flags.push('thin')
  if (koGap) flags.push(`koGap:${koGap}`)
  if (koRecheck) flags.push(`koRecheck:${koRecheck}`)
  if (enGap) flags.push(`enGap:${enGap}`)
  if (dup) flags.push(`dup:${dup}`)
  if (!rels.length) flags.push('empty')
  if (!flags.length) continue
  targets.push({
    slug: celeb.slug,
    nickname: celeb.nickname,
    nickname_en: celeb.nickname_en,
    profession: celeb.profession,
    view_count: celeb.view_count ?? 0,
    influence: scoreById.get(celeb.id) ?? 0,
    signal: Math.max(rankView.get(celeb.id) ?? 0, rankInf.get(celeb.id) ?? 0),
    relations: rels.length,
    flags,
  })
}

targets.sort((a, b) => b.signal - a.signal || b.view_count - a.view_count || a.slug.localeCompare(b.slug))
const picked = targets.slice(0, limit)

if (out) {
  writeFileSync(out, JSON.stringify(picked, null, 2) + '\n', 'utf8')
  console.log(`WROTE ${out}`)
}
console.log(`정비 후보 ${targets.length}명 (관계 0건 제외 ${includeEmpty ? '해제' : '적용'}) — 상위 ${picked.length}명`)
for (const t of picked.slice(0, 40)) {
  console.log(`  ${t.slug} | ${t.nickname} | 신호 ${t.signal.toFixed(2)} 조회 ${t.view_count} 영향력 ${t.influence} | 관계 ${t.relations} | ${t.flags.join(' ')}`)
}
