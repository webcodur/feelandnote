/**
 * 출력되는 결손: 소개 없음: 현재 책장 판정 → 원문 수집 → LLM 검수분 반영 → 재조회·캐시·운영 검증.
 * pnpm contents:book-introductions                         현재 출력되는 결손: 소개 없음 집계
 * pnpm contents:book-introductions --collect               매번 새 대상 조회 후 출처 한 바퀴 수집
 * pnpm contents:book-introductions --collect --work-dir <TEMP 작업 폴더>  미완료 수집 재개·새 책 포함
 * pnpm contents:book-introductions --reviewed <검수 JSON>   현재 대상·CAS 변경 미리보기
 * pnpm contents:book-introductions --reviewed <검수 JSON> --apply
 * --content-id ID(반복 가능), --locale ko|en, --limit N, --providers openlibrary,google,google-page
 *
 * 검수 JSON은 배열. 각 항목은 {target: targets.json의 한 항목, llmReviewed:true,
 * description, sourceUrl, method:'provider'|'research'|'translation', sourceLocale:'ko'|'en'|'ja',
 * evidence:[{url:sourceUrl,note:'읽은 본문의 작품·판본 범위 판정'}]}.
 * en·ja→ko 번역에는 translationBackend:'agy'를 추가한다. 출처 응답을 기계 승인하지 않는다.
 * 기준: docs/project/celeb/celeb-02-06-content-introduction-sources.md
 * 대상·출처·검수 자료는 OS TEMP에서만 사용하고 반영·검증 후 폐기한다. DB 행 사본은 저장하지 않는다.
 */
import { appendFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const unwrap = module => module.default ?? module
const { boPath, repoPath } = unwrap(await import('../lib/paths.ts'))
if (existsSync(boPath('.env'))) process.loadEnvFile(boPath('.env'))
// 제공자 키만 보충한다. DB 연결과 운영 비밀값을 다른 앱의 env로 바꾸지 않는다.
if (existsSync(repoPath('sw/web/.env'))) {
  for (const line of readFileSync(repoPath('sw/web/.env'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^((?:KAKAO_REST_API_KEY|DATA4LIBRARY_API_KEY|YES24_API_KEY|GOOGLE_BOOKS_API_KEY\d*|GOOGLE_BOOKS_API_KEY_\d+))=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
}
const { values } = parseArgs({ strict: true, options: {
  collect: { type: 'boolean' }, apply: { type: 'boolean' }, reviewed: { type: 'string' }, help: { type: 'boolean' },
  'work-dir': { type: 'string' }, 'content-id': { type: 'string', multiple: true }, locale: { type: 'string' },
  limit: { type: 'string' }, providers: { type: 'string' },
} })
if (values.help) { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace('/**', '').replace(/^ \* ?/gm, '')); process.exit(0) }
if (values.locale && !['ko', 'en'].includes(values.locale)) throw Error('--locale ko|en')
if (values.apply && !values.reviewed) throw Error('--apply에는 --reviewed 검수 파일이 필요합니다.')
if (values['content-id']?.some(id => !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) throw Error('올바른 content-id가 필요합니다.')
const limit = values.limit === undefined ? Infinity : Number(values.limit)
if (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1)) throw Error('--limit은 양의 정수입니다.')
const lib = await import('./book-introductions-lib.mjs')
const { dbClient } = await import('../figure-books/lib/figure-work.mjs')
const db = dbClient()
if (new URL(process.env.NEXT_PUBLIC_DB_API_URL).hostname !== 'db.feelandnote.com') throw Error('운영 DB 환경을 확인하세요.')
const locales = values.locale ? [values.locale] : ['ko', 'en']
let catalog = await lib.loadBookIntroductionCatalog(db, values['content-id'] ?? [])
let census = await lib.visibleBookIntroductionCensus(catalog, db, locales)
const report = (event, result) => { const summary = { ...result }; delete summary.targets; console.log(JSON.stringify({ event, ...summary })) }
report('current', census)

if (values.reviewed) {
  if (values.apply && !process.env.CRON_SECRET) throw Error('반영 후 운영 캐시 갱신에 CRON_SECRET이 필요합니다.')
  let reviews = JSON.parse(readFileSync(resolve(values.reviewed), 'utf8'))
  if (!Array.isArray(reviews) || !reviews.length) throw Error('검수 배열이 필요합니다.')
  reviews = reviews.map(review => ({ ...review,
    target: census.targets.find(target => lib.targetKey(target) === lib.targetKey(review.target ?? {})) ?? review.target }))
  const ids = [...new Set(reviews.map(review => review.target?.contentId))]
  if (ids.some(id => !census.targets.some(target => target.contentId === id))) throw Error('현재 출력되는 결손: 소개 없음에 없는 작품입니다.')
  const guards = await import('../figure-books/lib/guarded-catalog-repairs.mjs')
  const snapshot = await guards.captureCatalogRepairSnapshot(db, ids)
  const changes = lib.buildReviewedIntroductionChanges(snapshot, reviews, census.targets)
  guards.planGuardedCatalogRepairs(ids, snapshot, changes)
  console.log(JSON.stringify({ event: 'reviewed', apply: Boolean(values.apply), introductions: reviews.length, rows: changes.length }))
  if (values.apply) {
    console.log(JSON.stringify({ event: 'applied', ...await guards.guardedCatalogRepairs(db, ids, changes) }))
    const after = await guards.captureCatalogRepairSnapshot(db, ids)
    for (const change of changes) {
      const row = after[change.table].find(row => change.table === 'content_locales'
        ? row.content_id === change.before.content_id && row.locale === change.before.locale : String(row.id) === String(change.before.id))
      if (row?.description !== change.patch.description || row.sources?.description !== change.patch.sources.description) throw Error('소개 재조회 불일치')
    }
    const selected = await lib.visibleBookIntroductionCensus(after, db, locales)
    if (reviews.some(review => selected.targets.some(target => lib.targetKey(target) === lib.targetKey(review.target)))) throw Error('반영한 소개가 서비스에서 선택되지 않습니다.')
    const rm = unwrap(await import('./revalidate-filled-lib.ts')), ct = unwrap(await import('../../../../packages/shared/src/constants/cache-tags.ts'))
    const people = [...new Set([...after.celeb_contents, ...after.figure_book_characters].map(row => row.celeb_id).filter(Boolean))]
    const tags = [...new Set([...changes.flatMap(change => [`contents:${change.before.content_id}`,
      ...change.before.isbn ? [`contents:${change.before.isbn}`] : []]), ...people.map(id => ct.itemTag(ct.CACHE_TAGS.CELEBS, id))])]
    for (let from = 0; from < tags.length; from += rm.MAX_TARGETED_TAGS) {
      console.log(JSON.stringify({ event: 'cache', ...await rm.sendRevalidationTags({ tags: tags.slice(from, from + rm.MAX_TARGETED_TAGS),
        dry: false, webUrl: 'https://feelandnote.com', secret: process.env.CRON_SECRET }) }))
    }
    let publicVerified = 0
    for (const review of reviews.filter(review => review.target.isDefault)) {
      const response = await fetch(`https://feelandnote.com/${review.target.locale}/content/${review.target.contentId}`)
      const html = await response.text(), escaped = review.description.trim().slice(0, 60).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
      if (!response.ok || (!html.includes(review.description.trim().slice(0, 60)) && !html.includes(escaped))) throw Error('운영 상세 소개 확인 실패: ' + review.target.contentId)
      publicVerified++
    }
    console.log(JSON.stringify({ event: 'verified', runtimeVerified: reviews.length, publicVerified }))
    catalog = await lib.loadBookIntroductionCatalog(db, values['content-id'] ?? [])
    census = await lib.visibleBookIntroductionCensus(catalog, db, locales)
    report('after', census)
  }
}

if (values.collect) {
  const sources = await import('./book-introductions-sources.mjs')
  const providers = values.providers?.split(/[,\s]+/).filter(Boolean) ?? sources.BOOK_INTRODUCTION_PROVIDERS
  if (providers.some(provider => !sources.BOOK_INTRODUCTION_PROVIDERS.includes(provider))) throw Error('알 수 없는 제공자입니다.')
  const base = resolve(tmpdir(), 'feelandnote'); mkdirSync(base, { recursive: true })
  const dir = values['work-dir'] ? resolve(values['work-dir']) : mkdtempSync(join(base, 'book-introductions-'))
  const rel = relative(realpathSync(base), dir)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw Error('작업 폴더는 OS TEMP/feelandnote 아래에 둡니다.')
  for (let path = dir;; path = dirname(path)) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw Error('연결된 경로는 작업 폴더로 사용할 수 없습니다.')
    if (dirname(path) === path) break
  }
  mkdirSync(dir, { recursive: true })
  for (const name of ['targets.json', 'sources.jsonl']) {
    const path = join(dir, name)
    if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) throw Error('작업 파일은 일반 파일이어야 합니다.')
  }
  const file = join(dir, 'sources.jsonl')
  const saved = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)) : []
  const rows = lib.refreshCollectionRows(saved, census.targets, { contentIds: values['content-id'], locale: values.locale })
  const collectors = sources.createBookIntroductionCollectors(), disabled = new Set()
  writeFileSync(join(dir, 'targets.json'), JSON.stringify(census.targets))
  writeFileSync(file, rows.map(row => JSON.stringify(row) + '\n').join(''))
  console.log(JSON.stringify({ event: 'collection', workDir: dir, targets: census.targets.length }))
  let visited = 0, fetched = 0, failures = 0
  for (const target of census.targets.slice(0, limit)) {
    for (const provider of providers) {
      if (target.locale === 'en' ? ['kakao', 'naru', 'yes24'].includes(provider) : provider === 'openlibrary') continue
      if (disabled.has(provider)) continue
      const index = rows.findIndex(row => row.provider === provider && lib.targetKey(row.target) === lib.targetKey(target))
      if (index >= 0 && rows[index].status === 'ok') continue
      let result
      try { result = await collectors[provider](target) }
      catch (error) { result = { status: 'error', reason: String(error?.message ?? 'request-failed').replace(/https?:\/\/\S+/g, '[request]') } }
      if (result.status === 'error') failures++
      if (result.status === 'unavailable' && ['quota', 'no-key'].includes(result.reason)) disabled.add(provider)
      const row = { provider, target, ...result }
      if (index < 0) rows.push(row); else rows[index] = row
      appendFileSync(file, JSON.stringify(row) + '\n'); fetched++
    }
    visited++
    if (visited % 10 === 0) console.log(JSON.stringify({ event: 'collection-progress', visited, fetched, failures }))
  }
  console.log(JSON.stringify({ event: 'collected', workDir: dir, visited, fetched, failures,
    introductionsApplied: 0, note: '출처 응답은 검수 자료이며 DB에 자동 반영하지 않습니다.' }))
}
