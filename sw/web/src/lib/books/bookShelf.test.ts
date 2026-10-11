import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveBookShelfBook } from './bookShelf'
import type { FigureBookEdition } from '@/actions/figure-books/figureBookLocale'
import type { ContentLocaleRow } from '@/lib/utils/content-locale'

const edition: FigureBookEdition = {
  id: 1, title: '확인된 판본', creator: '저자', description: null, isbn: '9791139721973',
  publisher: null, thumbnailUrl: null, releaseDate: null, editionKind: null,
  textScope: null, sortOrder: 0, platform: null, purchaseUrl: null,
}
const content = (rows: ContentLocaleRow[]) => ({ id: 'work', type: 'BOOK', content_locales: rows })
const row = (locale: string, sources: unknown = { primary: 'kakao_book' }): ContentLocaleRow => ({
  locale, title: '작품 제목', creator: '저자', thumbnail_url: null, sources,
})

test('다른 언어의 판본이나 표시용 번역 제목은 개인·테마 책장의 구매 후보가 아니다', () => {
  assert.equal(resolveBookShelfBook(content([row('ko')]), [], 'en'), null)
  assert.equal(resolveBookShelfBook(content([row('en', { primary: 'none', title: 'translated' })]), [], 'en'), null)
})

test('등록된 실제 언어판은 표시용 제목의 번역본 없음 판정을 바로잡는다', () => {
  const book = resolveBookShelfBook(content([row('en', { primary: 'none', title: 'original' })]), [edition], 'en')
  assert.equal(book?.titleBadge, null)
  assert.equal(book?.editionId, 1)
  assert.equal(book?.title, edition.title)
  assert.match(book?.url ?? '', /amazon\.com/)
})

test('절판 표식은 판본·제휴 링크가 남아 있어도 구매 후보에서 제외한다', () => {
  const out = row('ko', { primary: 'kakao_book', availability: 'out_of_print' })
  out.affiliate_url = [{ platform: 'coupang', url: 'https://link.coupang.com/a/old' }]
  assert.equal(resolveBookShelfBook(content([out]), [edition], 'ko'), null)
})

test('카탈로그 밖 감상 도서는 확인된 locale과 ISBN으로 카드화한다', () => {
  const locale = { ...row('ko'), isbn: '9791139721973' }
  assert.equal(resolveBookShelfBook(content([locale]), [], 'ko')?.isbn, locale.isbn)
})

test('시작권이 없어 제외된 카탈로그 판본을 locale의 중간 권 ISBN·표지·상품으로 되살리지 않는다', () => {
  const middle = { ...row('ko'), isbn: '9791127402228', thumbnail_url: 'https://example.com/vol41.jpg',
    affiliate_url: [{ platform: 'coupang', url: 'https://link.coupang.com/a/vol41' }] }
  assert.equal(resolveBookShelfBook(content([middle]), [], 'ko', undefined, false), null)
  assert.equal(resolveBookShelfBook(content([middle]), [edition], 'ko', undefined, false)?.editionId, 1)
})

const selectedTitle = 'Green Eggs and Ham'
const selectedSources = { primary: 'openlibrary', edition_selection_evidence: [{
  method: 'independent_selection_review', isbn: '9781524773458', locale: 'en', edition_title: selectedTitle,
  reason: 'children_picture', source_url: 'https://publisher.example/books/magnetic-play',
  explanation: 'Publisher confirms this ISBN is a magnetic play activity book intended for young children.',
}] }
test('카탈로그에서 제외한 판본은 보존된 감상·언어 카드로 책장에 다시 노출하지 않는다', () => {
  const excluded = { ...row('en', selectedSources), title: selectedTitle, isbn: '9781524773458', description: 'The stored original introduction.' }
  const saved = { ...content([excluded]), celeb_contents: [{ id: 'protected-review', content_id: 'work', review: 'Keep this original reading record.' }] }
  const before = structuredClone(saved)
  assert.equal(resolveBookShelfBook(saved, [], 'en'), null)
  assert.deepEqual(saved, before)
})
test('독립 판정된 아동 전용 창작물은 책장 연결을 보존하면서 locale fallback 노출을 막는다', () => {
  const title='꼬마 토끼 조지의 언덕',isbn='9788949170244'
  const sources={primary:'kakao_book',edition_selection_evidence:[{method:'independent_selection_review',
    isbn,locale:'ko',edition_title:title,reason:'children_only',source_url:'https://publisher.example/childrens-fiction',
    explanation:'Publisher confirms the exact ISBN is original fiction written specifically for elementary-school children.'}]}
  const saved={...content([{...row('ko',sources),title,isbn}]),curated_list_items:[{id:'protected-item',note:'Keep original curator note'}]}
  const before=structuredClone(saved)
  assert.equal(resolveBookShelfBook(saved,[],'ko'),null)
  assert.deepEqual(saved,before)
  assert.ok(resolveBookShelfBook(content([{...row('ko'),title,isbn}]),[],'ko'))
})

test('오귀속 상품은 잘못 붙은 작품에서만 제외하고 정상 원작의 같은 ISBN은 안내한다', () => {
  const title='The Poppy War',isbn='9780008455194'
  const sources={primary:'openlibrary',edition_selection_evidence:[{method:'independent_selection_review',content_id:'work',
    isbn,locale:'en',edition_title:title,reason:'wrong_work',source_url:'https://publisher.example/exact-isbn',
    explanation:'The exact ISBN belongs to another novel and author, not the original work owning this shelf entry.'}]}
  const original=content([{...row('en',sources),title,isbn}]),before=structuredClone(original)
  assert.equal(resolveBookShelfBook(original,[],'en'),null)
  assert.deepEqual(original,before)
  assert.equal(resolveBookShelfBook({...original,id:'actual-poppy-war'},[],'en')?.isbn,isbn)
})
test('운영자 선정 제외는 기존 기록을 보존하며 카탈로그 밖 언어 카드로 되살리지 않는다',()=>{
 const title='삼국지 조조 천하 꿈 펼친 모신 무장들',isbn='9791130321561'
 const sources={primary:'kakao_book',edition_selection_evidence:[{method:'independent_selection_review',content_id:'work',
  isbn,locale:'ko',edition_title:title,reason:'editorial_exclusion',source_url:'https://www.pybook.co.kr/mall/goods/detail?goodsno=9328',
  explanation:'The operator explicitly excluded this actual publisher edition from the service shelf; it is not misclassified as abridged.'}]}
 const saved={...content([{...row('ko',sources),title,isbn}]),commerce_events:[{id:'purchase-click',content_id:'work'}]}
 const before=structuredClone(saved)
 assert.equal(resolveBookShelfBook(saved,[],'ko'),null)
 assert.deepEqual(saved,before)
 assert.equal(resolveBookShelfBook({...saved,id:'another-original'},[],'ko')?.isbn,isbn)
 assert.ok(resolveBookShelfBook(content([{...row('ko'),title,isbn}]),[],'ko'))
})

test('기존에 확인된 학습용·축약 제목과 공급처 범위도 locale fallback에서 제외한다', () => {
  for (const title of ['Penguin Readers Level 3: Elon Musk', 'Oxford Bookworms 1', '마리 퀴리(요약본)']) {
    assert.equal(resolveBookShelfBook(content([{ ...row('en'), title, isbn: '9781524773458' }]), [], 'en'), null)
  }
  const source = { primary: 'openlibrary', provider_scope_description: 'Penguin Reader, Level 5 (2300 words)' }
  assert.equal(resolveBookShelfBook(content([{ ...row('en', source), title: 'Doctor Zhivago' }]), [], 'en'), null)
})
test('다른 ISBN 정규 판본을 선정 제외 근거가 붙은 언어 카드 때문에 막지 않는다', () => {
  const excluded = { ...row('en', selectedSources), title: selectedTitle, isbn: '9781524773458' }
  const normal = { ...edition, locale: 'en' as const, title: selectedTitle, isbn: '9780394800165' }
  const book = resolveBookShelfBook(content([excluded]), [normal], 'en')
  assert.equal(book?.editionId, normal.id)
  assert.equal(book?.isbn, normal.isbn)
  assert.equal(book?.title, normal.title)
})
test('ISBN·제목이 다른 근거와 불완전한 출처는 정상 언어 카드 노출을 바꾸지 않는다', () => {
  const proof = selectedSources.edition_selection_evidence[0]
  for (const changed of [{ isbn: '9780394800165' }, { locale: 'ko' }, { edition_title: 'Another Book' }, { explanation: '' }, { source_url: 'https://openlibrary.org/books/OL1M' }]) {
    const sources = { primary: 'openlibrary', edition_selection_evidence: [{ ...proof, ...changed }] }
    assert.ok(resolveBookShelfBook(content([{ ...row('en', sources), title: selectedTitle, isbn: '9781524773458' }]), [], 'en'))
  }
  for (const title of ['An Illustrated History of Art', 'Picture Books: An Adult Literary Study']) {
    assert.equal(resolveBookShelfBook(content([{ ...row('en'), title, isbn: '9781524773458' }]), [], 'en')?.title, title)
  }
})
