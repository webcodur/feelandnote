import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as policy from '@feelandnote/content-search/book-edition-policy'

const compiled = ts.transpileModule(readFileSync(new URL('./getCelebBookShelf.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function record(id: string, isbn: string | null = null) {
  return { id: `reading-${id}`, content_id: id, visibility: 'public', source_url: 'https://interview.example/reading',
    public_record: { content_preview: '보존할 감상문' },
    content: { id, type: 'BOOK', title: '작품', creator: '작가', metadata: null as unknown,
      title_badge: null, affiliate_url: [], isbn_ko: isbn, isbn_en: null,
      bookLocale: { locale: 'ko', title: '작품', isbn, publisher: '출판사', sources: {} as Record<string, unknown> } } }
}

async function shelf(records: ReturnType<typeof record>[], appeared: object[] = []) {
  const loaded = { exports: {} as { getCelebBookShelf: (id: string, locale: string) => Promise<{ readBooks: { id: string; editions: object[] }[] }> } }
  const mocks: Record<string, object> = {
    '@/actions/contents/getUserContents': { getPublicUserContents: async () => ({ items: records, total: records.length }) },
    '@/actions/home/affiliateLinks': { findAffiliateLink: () => undefined },
    '@/components/shared/BookShelf/types': { figureBookToShelfBook: (book: object) => book },
    '@/lib/books/bookShelf': { isBookShelfAvailable: (book: { titleBadge?: string | null }) => book.titleBadge == null },
    './getCelebReferenceBooks': { getCelebReferenceBooks: async () => ({ appeared, authored: [] }) },
    '@feelandnote/content-search/book-edition-policy': policy,
  }
  new Function('require', 'module', 'exports', compiled)((key: string) => {
    assert.ok(mocks[key], `unexpected import ${key}`)
    return mocks[key]
  }, loaded, loaded.exports)
  return loaded.exports.getCelebBookShelf('celeb', 'ko')
}

test('ISBN 없는 검수 제외 작품은 감상 원행을 보존하며 책장 locale 폴백에서 빠진다', async () => {
  const excluded = record('picture')
  excluded.content.metadata = { figureBook: { workTitle: '작품', workCreator: '작가', workSelectionEvidence: [{
    method: 'independent_work_selection_review', content_id: 'picture', work_title: '작품', work_creator: '작가',
    reason: 'children_picture', source_url: 'https://publisher.example/picture',
    explanation: '출판사가 유아 전용 그림책이라고 안내하며 실제 본문에서도 같은 독자군이 확인된다.',
  }] } }
  const records = [excluded, record('normal')]
  const before = structuredClone(records)
  assert.deepEqual((await shelf(records)).readBooks.map(book => book.id), ['normal'])
  assert.deepEqual(records, before)
})

test('ISBN별 제외 카드는 책장 폴백에서 빠지고 동일 작품의 정상 대체 판본은 남는다', async () => {
  const excluded = record('work', '9780140449112')
  excluded.content.bookLocale.sources = { edition_selection_evidence: [{ method: 'independent_selection_review',
    isbn: '9780140449112', locale: 'ko', edition_title: '작품', reason: 'children_only',
    source_url: 'https://publisher.example/children', explanation: '출판사 소개와 실제 본문이 어린이 교육용 각색이라는 사실을 확인한다.' }] }
  assert.deepEqual((await shelf([excluded])).readBooks, [])
  const normal = { id: 'work', type: 'BOOK', title: '정상 번역', editions: [{ id: 7, isbn: '9791139721966' }] }
  const result = await shelf([excluded], [normal])
  assert.equal(result.readBooks[0]?.id, 'work')
  assert.deepEqual(result.readBooks[0]?.editions, normal.editions)
})

test('정체성이 바뀐 뒤 남은 옛 작품 제외 근거는 정상 책장을 막지 않는다', async () => {
  const normal = record('work')
  normal.content.metadata = { figureBook: { workTitle: '작품', workCreator: '작가', workSelectionEvidence: [{
    method: 'independent_work_selection_review', content_id: 'work', work_title: '다른 작품', work_creator: '작가',
    reason: 'children_picture', source_url: 'https://publisher.example/picture',
    explanation: '출판사 원문과 본문을 대조하여 유아 전용 그림책임을 독립적으로 확인하였다.',
  }] } }
  assert.deepEqual((await shelf([normal])).readBooks.map(book => book.id), ['work'])
})
