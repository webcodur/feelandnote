import test from 'node:test'
import assert from 'node:assert/strict'
import { INTEGRITY_QUERIES, inspectContentIntegrity, readIntegrityRows, type IntegrityRows } from './lib/content-integrity'

function fixture(): IntegrityRows {
  const rows = Object.fromEntries(INTEGRITY_QUERIES.map(query => [query.table, []])) as unknown as IntegrityRows
  rows.contents = [{ id: 'book', type: 'BOOK', external_id: 'OL123M', external_source: 'openlibrary', member_count: 1, celeb_count: 1, record_count: 2 }]
  rows.content_locales = [{ content_id: 'book', locale: 'en', isbn: '9780192802552', sources: { primary: 'openlibrary' } }, { content_id: 'book', locale: 'ko', isbn: null, publisher: null, thumbnail_url: null, description: '실제 작품 소개', sources: { primary: 'none', title: 'translated' } }]
  rows.figure_book_contents = [{ content_id: 'book' }]
  rows.figure_book_characters = [{ content_id: 'book', celeb_id: 'person' }]
  rows.figure_book_editions = [{ id: 1, content_id: 'book', locale: 'en', isbn: '0192802550' }, { id: 2, content_id: 'book', locale: 'ko', isbn: '9788937464102', sources: { primary: 'none' }, text_scope: 'volume-4' }]
  rows.figure_book_products = [{ id: 1, edition_id: 2 }]
  rows.member_contents = [{ id: 'm', member_id: 'member', content_id: 'book' }]
  rows.celeb_contents = [{ id: 'c', celeb_id: 'person', content_id: 'book' }]
  // record_count는 이 세 행의 개수가 아니라 member+celeb다.
  rows.records = [{ id: 'r1', content_id: 'book' }, { id: 'r2', content_id: 'book' }, { id: 'r3', content_id: 'book' }]
  rows.notes = [{ id: 'n', content_id: 'book' }]
  rows.curated_list_items = [{ id: 'l', content_id: null }]
  rows.activity_logs = [{ id: 'a', content_id: null }]
  rows.faction_lv2 = [{ id: 'f', theme_book_ids: ['book'] }]
  rows.flow_nodes = [{ id: 'node', content_id: 'book', bonus_content_ids: ['book'] }]
  rows.flows = [{ id: 'flow', tiers: { '다시 읽기': ['book'] } }]
  rows.tier_lists = [{ id: 'tier', tiers: { S: ['book'] }, unranked: [] }]
  return rows
}

test('ISBN10·13의 같은 판본, nullable 참조, 표시카드 소개와 기존판본 이력은 정상', () => {
  const rows = fixture(), before = structuredClone(rows)
  assert.deepEqual(inspectContentIntegrity(rows), { issueCount: 0, countsByIssue: {}, issues: [], reviewCandidateCount: 0, reviewCandidates: [] })
  assert.deepEqual(rows, before)
})

test('다른 작품에 붙은 ISBN10·13은 하나의 ISBN 충돌로 보고하며 원전 동일성을 단정하지 않음', () => {
  const rows = fixture()
  rows.contents.push({ id: 'other', type: 'BOOK', external_id: '9780192802552', member_count: 0, celeb_count: 0, record_count: 0 })
  rows.content_locales.push({ content_id: 'other', locale: 'en', isbn: '0192802550' })
  const report = inspectContentIntegrity(rows)
  assert.equal(report.issueCount, 0)
  assert.equal(report.reviewCandidateCount, 1)
  assert.deepEqual(report.reviewCandidates, [{ kind: 'isbn-content-collision', table: 'contents', isbn: '9780192802552', contentIds: ['book', 'other'] }])
})

test('체크섬·fake ISBN, locale0, 표시카드 판본 메타와 실제 관계 카운트를 검사', () => {
  const rows = fixture()
  rows.content_locales[0].isbn = '9780192802553'
  rows.content_locales[1].publisher = '실판본처럼 남은 출판사'
  rows.figure_book_editions[0].isbn = '480D12345'
  rows.contents[0].record_count = 3
  rows.contents.push({ id: 'no-locale', type: 'BOOK', external_id: '9780192802553', member_count: 0, celeb_count: 0, record_count: 0 })
  const report = inspectContentIntegrity(rows)
  assert.equal(report.issueCount, 6)
  assert.equal(report.countsByIssue['invalid-isbn'], 2)
  assert.equal(report.countsByIssue['display-card-edition-metadata'], 1)
  assert.equal(report.countsByIssue['book-without-locale'], 1)
  assert.equal(report.countsByIssue['invalid-book-external-isbn'], 1)
  assert.deepEqual(report.issues.find(issue => issue.kind === 'content-count-mismatch'), { kind: 'content-count-mismatch', table: 'contents', rowId: 'book', contentId: 'book', field: 'record_count', actual: 3, expected: 2 })
})

test('모든 현재 content FK와 catalog·edition 자식 및 모든 ID 배열의 누락을 탐지', () => {
  const rows = fixture()
  const direct = ['content_locales', 'figure_book_contents', 'member_contents', 'celeb_contents', 'curated_list_items', 'flow_nodes', 'records', 'notes', 'activity_logs'] as const
  for (const table of direct) rows[table].push({ id: `${table}-missing`, content_id: 'deleted' })
  rows.figure_book_characters.push({ content_id: 'missing-catalog', celeb_id: 'person' })
  rows.figure_book_editions.push({ id: 3, content_id: 'missing-catalog', isbn: null })
  rows.figure_book_products.push({ id: 2, edition_id: 999 })
  rows.faction_lv2[0].theme_book_ids = ['deleted']
  rows.flow_nodes[0].bonus_content_ids = ['deleted']
  rows.flows[0].tiers = { '자유 등급': ['deleted'] }
  rows.tier_lists[0].tiers = { S: ['deleted'] }; rows.tier_lists[0].unranked = ['deleted']
  const report = inspectContentIntegrity(rows)
  assert.equal(report.countsByIssue['orphan-content-reference'], direct.length)
  assert.equal(report.countsByIssue['orphan-catalog-reference'], 2)
  assert.equal(report.countsByIssue['orphan-edition-reference'], 1)
  assert.equal(report.countsByIssue['dangling-content-id-array'], 5)
  assert.ok(report.issues.some(issue => issue.table === 'activity_logs' && issue.referencedId === 'deleted'))
  assert.ok(report.issues.some(issue => issue.field === 'tiers.자유 등급'))
})

test('입력이 누락되거나 배열 구조가 깨진 경우 성공 결과로 숨기지 않음', () => {
  const rows = fixture(); delete (rows as Partial<IntegrityRows>).notes
  assert.throws(() => inspectContentIntegrity(rows), /입력 누락: notes/)
  const wrong = fixture(); wrong.flows[0].tiers = ['book']; wrong.flow_nodes[0].bonus_content_ids = 'book'
  assert.equal(inspectContentIntegrity(wrong).countsByIssue['invalid-content-id-array'], 2)
})

test('페이지 상한 뒤에도 끝까지 읽고 첫 조회 실패 뒤 다음 표를 호출하지 않음', async () => {
  const rows = fixture(), calls: string[] = []
  const read = await readIntegrityRows(async (query, from, to) => {
    calls.push(`${query.table}:${from}`)
    return { data: rows[query.table].slice(from, to + 1), error: null }
  }, 2)
  assert.deepEqual(read, rows)
  assert.ok(calls.includes('records:2'))
  const failed: string[] = []
  await assert.rejects(readIntegrityRows(async (query) => {
    failed.push(query.table)
    return query.table === 'content_locales' ? { data: null, error: { message: 'denied' } } : { data: [], error: null }
  }), /content_locales 조회 실패: denied/)
  assert.deepEqual(failed, ['contents', 'content_locales'])
  await assert.rejects(readIntegrityRows(async () => ({ data: null, error: null })), /조회 결과가 배열/)
})


test('카카오 상품 바코드와 공급자 ID는 ISBN 오류로 취급하지 않음', () => {
  const rows = fixture()
  for (const external_id of ['2006753000265', '4809050215817', '480D12345', 'figure-book-hobbes']) {
    rows.contents[0].external_id = external_id
    assert.equal(inspectContentIntegrity(rows).issueCount, 0)
  }
})

test('ISBN이 있는 다른 콘텐츠 유형의 locale도 검사함', () => {
  const rows = fixture()
  rows.contents.push({ id: 'movie', type: 'VIDEO', external_id: 'movie-1', member_count: 0, celeb_count: 0, record_count: 0 })
  rows.content_locales.push({ content_id: 'movie', locale: 'ko', isbn: '487T123456' })
  assert.deepEqual(inspectContentIntegrity(rows).issues, [{ kind: 'invalid-isbn', table: 'content_locales', rowId: 'movie:ko', contentId: 'movie', field: 'isbn' }])
})

test('빈 ISBN과 서식 문자만 있는 ISBN은 nullable 누락으로 처리함', () => {
  const rows = fixture()
  for (const isbn of ['', ' \t\n', ' -- - ', null]) {
    rows.content_locales[1].isbn = isbn
    rows.figure_book_editions[0].isbn = isbn
    assert.equal(inspectContentIntegrity(rows).issueCount, 0)
  }
})

test('서로 다른 원전이 합본의 ISBN을 공유해도 구조 오류로 단정하지 않음', () => {
  const rows = fixture()
  rows.contents.push({ id: 'independent-work', type: 'BOOK', external_id: 'figure-book-independent-work', member_count: 0, celeb_count: 0, record_count: 0 })
  rows.content_locales.push({ content_id: 'independent-work', locale: 'ko', sources: { primary: 'none', title: 'original' } })
  rows.figure_book_contents.push({ content_id: 'independent-work' })
  rows.figure_book_editions.push({ id: 3, content_id: 'independent-work', locale: 'en', isbn: '9780192802552', text_scope: '독립 원전의 합본 수록 부분', edition_kind: 'selection' })
  const report = inspectContentIntegrity(rows)
  assert.equal(report.issueCount, 0)
  assert.equal(report.reviewCandidateCount, 1)
  assert.deepEqual(report.reviewCandidates[0].contentIds, ['book', 'independent-work'])
})
