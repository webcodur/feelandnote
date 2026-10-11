import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { SNAPSHOT_TABLES } from './merge-work-sql.mjs'
import { applyReviewedCatalogInsert, buildReviewedCatalogInsertSql, planReviewedCatalogInsert, verifyReviewedCatalogInsertReadback } from './reviewed-catalog-insert.mjs'

const ids = ['existing-a', 'existing-b']
const timestamp = '2026-10-11T07:00:00+00:00'
function fixture() {
  const before = Object.fromEntries(SNAPSHOT_TABLES.map(table => [table, []]))
  before.contents = [
    { id: ids[0], type: 'BOOK', release_date: '2013-10-10', metadata: { figureBook: { workTitle: 'Existing original A', workCreator: 'Original Author A' } }, member_count: 1, celeb_count: 1 },
    { id: ids[1], type: 'BOOK', release_date: null, metadata: { figureBook: { workTitle: 'Existing original B', workCreator: 'Original Author B' } } },
  ]
  before.content_locales = [
    { content_id: ids[0], locale: 'en', title: 'Original A', creator: 'Original Author A', isbn: '9780451464163', publisher: ' English Publisher ',
      description: 'A complete introduction already written by a person.', thumbnail_url: null, verified: false,
      sources: { primary: 'openlibrary', isbn: 'https://openlibrary.org/books/OL1234M', description: 'https://publisher.example/a', translators: [] } },
    { content_id: ids[0], locale: 'ko', title: '한국어 번역 A', creator: '원저자 A', isbn: '9791167972064', publisher: '한국 출판사',
      description: '기존 한국어 소개는 글자와 출처를 그대로 보존한다.', thumbnail_url: 'https://publisher.example/cover.jpg', verified: true,
      sources: { primary: 'kakao_book', title: 'https://search.daum.net/search?w=bookpage&bookId=123', translators: ['실제 역자'], description: 'https://publisher.example/ko-a' } },
    { content_id: ids[1], locale: 'ko', title: '기존 국내 저작', creator: '국내 작가', isbn: '9788932042596', publisher: '국내 출판사',
      description: null, thumbnail_url: null, verified: true,
      sources: { primary: 'kakao_book', isbn: 'https://dapi.kakao.com/v3/search/book?target=isbn&query=9788932042596' } },
    { content_id: ids[1], locale: 'en', title: 'Display title only', creator: 'Author', isbn: null, sources: { primary: 'none', title: 'translated' }, description: 'Preserved display introduction.' },
  ]
  before.celeb_contents = [{ id: 1, content_id: ids[0], celeb_id: 'celeb', review: '감상 원문', review_en: 'Original reading account', source_url: 'https://example.org/account', visibility: 'public', rating: 5 }]
  before.member_contents = [{ id: 2, content_id: ids[0], member_id: 'member', status: 'completed', rating: 5 }]
  before.flows = [{ id: 3, tiers: { shelf: [ids[0], 'other', ids[1]] } }]
  before.activity_logs = [{ id: 4, content_id: ids[0], data: { ordered: [1, 2] } }]
  const reviews = [
    { contentId: ids[0], locale: 'en', textLanguage: 'en', isbn: '9780451464163', title: 'Original A', creator: 'Original Author A',
      workTitle: 'Existing original A', workCreator: 'Original Author A', sourceUrl: 'https://publisher.example/a', reason: 'Exact publisher ISBN and English original reviewed; scope has not been asserted.', editionKind: null, textScope: null },
    { contentId: ids[0], locale: 'ko', textLanguage: 'ko', isbn: '9791167972064', title: '한국어 번역 A', creator: '원저자 A', translators: ['실제 역자'],
      workTitle: 'Existing original A', workCreator: 'Original Author A', sourceUrl: 'https://publisher.example/ko-a', reason: '정확한 ISBN과 실제 역자·전체 번역 목차를 확인했다.', editionKind: 'full', textScope: 'complete' },
    { contentId: ids[1], locale: 'ko', textLanguage: 'ko', isbn: '9788932042596', title: '기존 국내 저작', creator: '국내 작가',
      workTitle: 'Existing original B', workCreator: 'Original Author B', sourceUrl: 'https://publisher.example/b', reason: '실제 한국어 원문과 시작권 목차를 확인했다.', editionKind: 'volume', textScope: '한국어 원작 분권 1권; 시작권 대표' },
  ]
  return { before, reviews }
}
function committed(before, reviews) {
  const plan = planReviewedCatalogInsert(ids, before, reviews), after = structuredClone(before)
  for (const content_id of plan.newParentIds) after.figure_book_contents.push({ content_id, created_at: timestamp, updated_at: timestamp })
  plan.editions.forEach((row, index) => after.figure_book_editions.push({ ...row, id: 100 + index, created_at: timestamp, updated_at: timestamp }))
  return after
}

test('one parent per original seeds both reviewed real languages while preserving display cards and unknown scope', () => {
  const { before, reviews } = fixture(), original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews)
  assert.deepEqual(plan.parentIds, ids); assert.equal(plan.editions.length, 3)
  assert.equal(plan.editions[0].edition_kind, null); assert.equal(plan.editions[0].text_scope, null)
  assert.equal(plan.editions[0].publisher, 'English Publisher'); assert.equal(plan.editions[0].release_date, '2013-10-10')
  assert.deepEqual(plan.editions[1].sources.translators, ['실제 역자'])
  assert.equal(plan.editions[1].description, before.content_locales[1].description)
  assert.equal(plan.editions[1].sources.description, before.content_locales[1].sources.description)
  assert.deepEqual(before, original)
})

test('missing 18-table state, absent BOOK and unassigned work fail before execution', () => {
  const { before, reviews } = fixture()
  const missing = structuredClone(before); delete missing.tier_lists
  assert.throws(() => planReviewedCatalogInsert(ids, missing, reviews), /full snapshot tier_lists/)
  const video = structuredClone(before); video.contents[0].type = 'VIDEO'
  assert.throws(() => planReviewedCatalogInsert(ids, video, reviews), /existing assigned BOOK/)
  assert.throws(() => planReviewedCatalogInsert([ids[0]], before, reviews), /assigned owner/)
  assert.throws(() => planReviewedCatalogInsert([ids[0], ids[0]], before, reviews), /distinct assigned/)
})

test('existing editions, duplicate parents and duplicate ISBNs are refused instead of being duplicated', () => {
  for (const change of [s => s.figure_book_contents.push({ content_id: ids[0] }, { content_id: ids[0] }), s => s.figure_book_editions.push({ id: 99, content_id: ids[0], isbn: null }),
    s => s.figure_book_editions.push({ id: 99, content_id: 'other', isbn: '9780451464163' }), s => s.content_locales.push({ content_id: 'other', locale: 'en', isbn: '9780451464163' })]) {
    const { before, reviews } = fixture(); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /existing catalog|existing edition|ISBN already/)
  }
  const { before, reviews } = fixture()
  assert.throws(() => planReviewedCatalogInsert(ids, before, [...reviews, reviews[0]]), /duplicate locale or ISBN/)
  const duplicate = structuredClone(reviews); duplicate[2].isbn = reviews[0].isbn
  assert.throws(() => planReviewedCatalogInsert(ids, before, duplicate), /duplicate locale or ISBN/)
})

test('English Kakao, swapped providers and unbound official URLs are rejected by the plan', () => {
  for (const change of [s => { s.content_locales[0].sources.primary = 'kakao_book' }, s => { s.content_locales[1].sources.primary = 'openlibrary' },
    s => { s.content_locales[0].sources.isbn = 'https://publisher.example/a' }, s => { s.content_locales[2].sources.isbn += '999' }]) {
    const { before, reviews } = fixture(); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /wrong primary|official ISBN binding/)
  }
})

test('every real card must be reviewed before the parent trigger runs; no-ISBN real placeholders are refused', () => {
  const { before, reviews } = fixture()
  assert.throws(() => planReviewedCatalogInsert(ids, before, [reviews[0], reviews[2]]), /unreviewed locale/)
  const real = structuredClone(before); real.content_locales[3].sources.primary = 'openlibrary'
  assert.throws(() => planReviewedCatalogInsert(ids, real, reviews), /unreviewed locale/)
  const invalidDisplay = structuredClone(before); invalidDisplay.content_locales[3].isbn = '9780140444964'
  assert.throws(() => planReviewedCatalogInsert(ids, invalidDisplay, reviews), /unreviewed locale/)
})

test('source, original anchor, actual language, live bibliography and known translators are explicit and cannot be fabricated', () => {
  for (const [field, value, message] of [
    ['sourceUrl', 'https://openlibrary.org/books/OL1234M', /independent work review/],
    ['sourceUrl', 'https://publisher.example/a?token=secret', /independent work review/],
    ['workTitle', 'Different original', /live work anchor/], ['workCreator', 'Different original author', /live work anchor/],
    ['textLanguage', 'ko', /exact text language/], ['isbn', '9780451464164', /real ISBN13/],
    ['title', 'Other product title', /live locale/], ['creator', 'Other contributor', /live locale/],
    ['editionKind', 'invented', /reviewed kind/], ['textScope', '', /reviewed kind/],
  ]) {
    const { before, reviews } = fixture(); reviews[0][field] = value
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), message)
  }
  const { before, reviews } = fixture(); reviews[1].translators = ['다른 역자']
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /verified translators/)
  delete reviews[1].translators
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /verified translators/)
})

test('abridged, graded, later-volume and wrong-language cards remain subject to existing policy', () => {
  for (const change of [r => { r.editionKind = 'abridged' }, r => { r.textScope = 'abridged' },
    r => { r.textScope = 'volume 2 of 3' }]) {
    const { before, reviews } = fixture(); change(reviews[0])
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /reviewed kind|excluded or non-start/)
  }
  const { before, reviews } = fixture()
  before.content_locales[0].title = reviews[0].title = 'Oxford Bookworms Original A'
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /excluded or non-start/)
  const other = fixture(); other.before.contents[0].metadata.fictionSource = { editionKind: 'abridged' }
  assert.throws(() => planReviewedCatalogInsert(ids, other.before, other.reviews), /excluded or non-start/)
})

test('SQL uses automatic seed once per original and retains 18 before/after guards, FK checks and live trigger', () => {
  const { before, reviews } = fixture(), sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.equal(sql.match(/INSERT INTO public.figure_book_contents\(/g)?.length, 2)
  assert.doesNotMatch(sql, /INSERT INTO public.figure_book_editions/)
  assert.equal(sql.match(/SELECT id INTO STRICT seeded_id/g)?.length, 3)
  assert.match(sql, /BEGIN ISOLATION LEVEL READ COMMITTED/)
  assert.match(sql, /active automatic edition seed required/); assert.match(sql, /unhandled foreign reference/)
  assert.match(sql, /ISBN already registered/); assert.match(sql, /SHARE ROW EXCLUSIVE MODE/)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  assert.doesNotMatch(sql, /DISABLE TRIGGER|session_replication_role|DELETE FROM|UPDATE public\.(?:contents|content_locales|celeb_contents|member_contents)/)
  assert.ok(sql.indexOf('CATALOG_INSERT_EXPECTED:') < sql.indexOf('\nCOMMIT;'))
})

test('successful execution has two full reads, one transaction and compact actual generated IDs', async () => {
  const { before, reviews } = fixture(), after = committed(before, reviews), calls = [], paths = []
  let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async (_db, owned) => { assert.deepEqual(owned, ids); calls.push('read'); return ++reads === 1 ? before : after },
    execute(path) { paths.push(path); calls.push('execute'); const sql = readFileSync(path, 'utf8'); assert.match(sql, /expected_editions/)
      return 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED\n' },
  })
  assert.deepEqual(calls, ['read', 'execute', 'read'])
  assert.equal(result.completed, true); assert.equal(result.insertedParents, 2); assert.equal(result.checkedTables, 18)
  assert.deepEqual(result.insertedEditions.map(row => row.id), [100, 101, 102]); assert.ok(paths.every(path => !existsSync(path)))
})

test('every table and protected field is compared even if the emitted snapshot and actual readback agree', () => {
  for (const table of SNAPSHOT_TABLES) {
    const { before, reviews } = fixture(), after = committed(before, reviews)
    after[table].push({ id: 'unreviewed', field: 'unexpected' })
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), new RegExp(table + ' rows differ'))
  }
  for (const change of [s => { s.celeb_contents[0].review = 'changed' }, s => { s.member_contents[0].rating = 1 },
    s => { s.flows[0].tiers.shelf.reverse() }, s => { s.content_locales[0].description = 'changed' }]) {
    const { before, reviews } = fixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ/)
  }
})

test('seeded bibliography, description/source, kind/scope, arbitrary columns and generated timestamps cannot be silently accepted', () => {
  for (const change of [s => { s.figure_book_editions[0].description = 'changed' }, s => { s.figure_book_editions[0].sources.description = 'other source' },
    s => { s.figure_book_editions[0].text_scope = 'complete' }, s => { s.figure_book_editions[0].extra_column = 'unknown' },
    s => { s.figure_book_contents[0].extra_column = 'unknown' }, s => { s.figure_book_editions[0].id = -1 },
    s => { s.figure_book_editions[1].id = s.figure_book_editions[0].id }, s => { s.figure_book_editions[0].updated_at = 'later' },
    s => { s.figure_book_contents[1].created_at = '2026-10-12T00:00:00Z' }]) {
    const { before, reviews } = fixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ|identity\/timestamp/)
  }
})

test('execution failures and missing commit proof stop with no retry and clean temporary SQL', async () => {
  const { before, reviews } = fixture(), paths = []; let writes = 0
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, { capture: async () => before,
    execute(path) { paths.push(path); writes++; throw Error('seed trigger rejected') } }), /seed trigger rejected/)
  assert.equal(writes, 1); assert.ok(paths.every(path => !existsSync(path)))
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, { capture: async () => before,
    execute: () => 'MERGE_COMMITTED' }), /committed expected snapshot missing/)
})

test('a later live readback discrepancy fails even after a valid committed snapshot', async () => {
  const { before, reviews } = fixture(), committedState = committed(before, reviews), changed = structuredClone(committedState); let reads = 0
  changed.celeb_contents[0].review_en = 'corrupted'
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async () => ++reads === 1 ? before : changed,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(committedState) + '\nMERGE_COMMITTED',
  }), /actual celeb_contents rows differ/)
  assert.equal(reads, 2)
})

test('an original referenced by Remotion keeps its exact BOOK ID, locale cards and all existing references when the catalog is added', async () => {
  const { before, reviews } = fixture(), after = committed(before, reviews); let reads = 0
  // 삭제·통합용 가드를 읽지 않고 추가 경로 자체의 전후 18표 계약을 확인한다.
  const fixedOriginalId = before.contents[0].id
  const result = await applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async () => ++reads === 1 ? before : after,
    execute(path) {
      const sql = readFileSync(path, 'utf8')
      assert.doesNotMatch(sql, /DELETE FROM|UPDATE public\.(?:contents|content_locales)|SET content_id=/)
      assert.match(sql, /unhandled foreign reference/)
      return 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED'
    },
  })
  assert.equal(result.completed, true)
  assert.equal(after.contents[0].id, fixedOriginalId)
  for (const table of SNAPSHOT_TABLES.filter(table => !['figure_book_contents', 'figure_book_editions'].includes(table)))
    assert.deepEqual(after[table], before[table])
  assert.equal(after.figure_book_contents[0].content_id, fixedOriginalId)
  assert.ok(after.figure_book_editions.filter(row => row.content_id === fixedOriginalId).length === 2)
  assert.doesNotMatch(readFileSync(new URL('./reviewed-catalog-insert.mjs', import.meta.url), 'utf8'), /checkFixedReferences/)
})

test('existing zero-edition parents keep every original field and timestamp and receive only explicitly reviewed real cards', async () => {
  const { before, reviews } = fixture()
  before.figure_book_contents = ids.map(content_id => ({ content_id, created_at: '2020-01-01T00:00:00+00:00', updated_at: '2023-02-03T04:05:06+00:00', synopsis: '기존 값' }))
  // 자동 seed가 없는 기존 부모 경로에서는 ISBN 미확인 카드를 추가하지 않는다.
  before.content_locales[1].isbn = null
  const selected = [reviews[0], reviews[2]], original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, selected), after = committed(before, selected)
  assert.deepEqual(plan.newParentIds, []); assert.deepEqual(plan.existingParentIds, ids)
  assert.equal(plan.editions.length, 2)
  const sql = buildReviewedCatalogInsertSql(ids, before, selected)
  assert.equal(sql.match(/INSERT INTO public.figure_book_editions\(/g)?.length, 2)
  assert.equal(sql.match(/RETURNING id INTO seeded_id/g)?.length, 2)
  assert.doesNotMatch(sql, /INSERT INTO public.figure_book_contents|UPDATE public.figure_book_contents|SELECT id INTO STRICT seeded_id/)
  assert.match(sql, /unhandled foreign reference/)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, selected, {
    capture: async () => ++reads === 1 ? before : after,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED',
  })
  assert.equal(result.insertedParents, 0); assert.equal(result.insertedEditions.length, 2)
  assert.deepEqual(before, original)
  for (const table of SNAPSHOT_TABLES.filter(table => table !== 'figure_book_editions')) assert.deepEqual(after[table], before[table])
  const changed = structuredClone(after); changed.figure_book_contents[0].updated_at = timestamp
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, selected, changed), /figure_book_contents rows differ/)
})

test('mixed missing-parent automatic seed and existing-parent zero-edition insert remain one atomic plan', () => {
  const { before, reviews } = fixture()
  before.figure_book_contents.push({ content_id: ids[0], created_at: '2018-01-01T00:00:00Z', updated_at: '2019-01-01T00:00:00Z' })
  const plan = planReviewedCatalogInsert(ids, before, reviews), after = committed(before, reviews)
  assert.deepEqual(plan.newParentIds, [ids[1]]); assert.deepEqual(plan.existingParentIds, [ids[0]])
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.equal(sql.match(/INSERT INTO public.figure_book_contents\(/g)?.length, 1)
  assert.equal(sql.match(/INSERT INTO public.figure_book_editions\(/g)?.length, 2)
  assert.equal(sql.match(/SELECT id INTO STRICT seeded_id/g)?.length, 1)
  assert.match(sql, /active automatic edition seed required/)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, reviews, after).insertedParents, 1)
  const altered = structuredClone(after); altered.figure_book_editions[0].created_at = '2026-10-12T00:00:00Z'
  altered.figure_book_editions[0].updated_at = altered.figure_book_editions[0].created_at
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, altered), /identity\/timestamp/)
})
