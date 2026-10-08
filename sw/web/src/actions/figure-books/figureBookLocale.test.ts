import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getFigureBookPurchasePlatform,
  mapFigureBookPurchaseOptions,
  mergeFigureBookEditions,
  isFigureBookOriginalLocale,
  type FigureBookEditionRow,
  type FigureBookPurchaseOptionRow,
} from './figureBookLocale'

const BASE_ROW: FigureBookPurchaseOptionRow = {
  edition_id: 7,
  content_id: 'work-1',
  locale: 'ko',
  title: '일리아스',
  creator: '호메로스',
  description: '완역 판본 소개',
  isbn: '9791139721966',
  publisher: '민음사',
  thumbnail_url: 'https://example.com/iliad.jpg',
  release_date: '2023-06-30',
  edition_kind: 'full',
  text_scope: 'complete',
  sort_order: 1,
  platform: 'coupang',
  affiliate_url: 'https://link.coupang.com/a/example',
}

test('다른 언어 카드 유무 대신 독립 출처로 원어를 판정한다', () => {
  assert.equal(isFigureBookOriginalLocale({ originalLanguage: 'en' }, 'en'), false)
  assert.equal(isFigureBookOriginalLocale({ originalLanguage: 'fr', identityEvidence: 'https://library.example/work' }, 'en'), false)
  assert.equal(isFigureBookOriginalLocale({ originalLanguage: 'en', identityEvidence: 'https://library.example/work' }, 'en'), true)
})

test('독립 확인한 원어 본문은 미국·영국 부제를 접고 축약 학습판은 배제한다', () => {
  const edition = (id: number, title: string, publisher: string): FigureBookEditionRow => {
    const row = { ...BASE_ROW, id, content_id: 'vance', locale: 'en', title, creator: 'Ashlee Vance', publisher, isbn: String(id), edition_kind: 'full', text_scope: 'complete' }
    return { ...row, sources: { edition_work_evidence: [{ method: 'independent_work_review', content_id: row.content_id, locale: row.locale,
      original_language: 'en', isbn: row.isbn, edition_title: row.title, edition_creator: row.creator, edition_kind: row.edition_kind,
      text_scope: row.text_scope, work_identity: 'ashlee-vance/elon-musk', source_url: 'https://publisher.example/book' }] } }
  }
  const us = edition(1, 'Elon Musk: Tesla, SpaceX, and the Quest for a Fantastic Future', 'Ecco')
  const uk = edition(2, 'Elon Musk: How the Billionaire CEO Is Shaping Our Future', 'Virgin Books')
  const reader = { ...edition(3, 'Penguin Readers Level 3: Elon Musk', 'Penguin'), edition_kind: 'abridged', text_scope: 'Level 3 A2' }
  assert.deepEqual(mergeFigureBookEditions([us, uk, reader], [], 'en', false, true).map(e => e.id), [1])
  assert.equal(mergeFigureBookEditions([us, uk], [], 'en', false, false).length, 1)
  assert.equal(mergeFigureBookEditions([us, { ...uk, creator: 'Ashlee Vance, editor credit' }], [], 'en', false, true).length, 1)
  assert.equal(mergeFigureBookEditions([us, uk, reader], [], 'en', true, true).length, 1)
})

test('요청 locale은 구매 플랫폼 하나로 고정한다', () => {
  assert.equal(getFigureBookPurchasePlatform('ko'), 'coupang')
  assert.equal(getFigureBookPurchasePlatform('en'), 'amazon')
  assert.equal(getFigureBookPurchasePlatform('ja'), null)
})

test('같은 작품의 여러 활성 판본을 순서대로 보존한다', () => {
  const editions = mapFigureBookPurchaseOptions([
    { ...BASE_ROW, edition_id: 9, title: '일리아스 다른 번역', sort_order: 2 },
    BASE_ROW,
  ], 'ko')

  assert.deepEqual(editions.map((edition) => edition.id), [7, 9])
  assert.equal(editions[0].isbn, '9791139721966')
  assert.equal(editions[0].purchaseUrl, 'https://link.coupang.com/a/example')
})

test('다른 locale이나 플랫폼의 판본은 대체 노출하지 않는다', () => {
  const editions = mapFigureBookPurchaseOptions([
    { ...BASE_ROW, locale: 'en', platform: 'amazon', affiliate_url: 'https://www.amazon.com/dp/example' },
    { ...BASE_ROW, platform: 'amazon', affiliate_url: 'https://www.amazon.com/dp/example' },
    { ...BASE_ROW, affiliate_url: 'javascript:alert(1)' },
  ], 'ko')

  assert.deepEqual(editions, [])
})

test('쿠팡 상품이 없는 한국어 판본도 보존하고 같은 판본의 기존 링크만 합친다', () => {
  const first: FigureBookEditionRow = { ...BASE_ROW, id: 7, sources: { translators: ['천병희'] } }
  const second = { ...first, id: 8, isbn: '9788937460012', sources: { translators: ['김기영'] }, sort_order: 2 }
  const editions = mergeFigureBookEditions([second, first], [BASE_ROW], 'ko')
  assert.deepEqual(editions.map((edition) => edition.id), [7, 8])
  assert.equal(editions[0].purchaseUrl, BASE_ROW.affiliate_url)
  assert.equal(editions[1].purchaseUrl, null)
  const mismatch = mergeFigureBookEditions([first], [{ ...BASE_ROW, isbn: second.isbn }], 'ko')
  assert.equal(mismatch[0].purchaseUrl, null)
})

test('같은 책의 재판·개정판·전자책은 대표 하나만 노출한다', () => {
  const row = (id: number, isbn: string, date: string, title = '사토시의 서'): FigureBookEditionRow => ({
    ...BASE_ROW, id, isbn, release_date: date, title, sort_order: id,
  })
  const editions = mergeFigureBookEditions([
    row(1, '9791162243855', '2021-02-05'),
    row(2, '9791175796898', '2026-08-06', '사토시의 서(개정증보판)'),
    row(3, '9791175790834', '2026-08-14'),
  ], [], 'ko')
  assert.deepEqual(editions.map((edition) => edition.id), [3])
})

test('확인된 한 저작의 초판·개정판·증보판은 표제와 ISBN이 달라도 한 권으로 안내한다', () => {
  const rows: FigureBookEditionRow[] = [
    { ...BASE_ROW, id: 1, title: '저작 초판', release_date: '1990-01-01', isbn: '9788937460012' },
    { ...BASE_ROW, id: 2, title: '저작: 개정판의 새 부제', release_date: '2000-01-01', isbn: '9788937460883' },
    { ...BASE_ROW, id: 3, title: '저작(증보판)', release_date: '2010-01-01', isbn: '9788932925929' },
  ]
  assert.deepEqual(mergeFigureBookEditions(rows, [], 'ko', true, true).map(row => row.id), [3])
  const translation = rows.map(row => ({ ...row, sources: { translators: ['천병희'] } }))
  assert.deepEqual(mergeFigureBookEditions(translation, [], 'ko', true).map(row => row.id), [3])
})

test('역자가 같으면 출판사가 바뀐 재출간도 같은 책으로 접고, 역자가 다르면 다른 번역으로 남긴다', () => {
  const row = (id: number, isbn: string, publisher: string, translators: string[], release_date = '2020-01-01'): FigureBookEditionRow => ({
    ...BASE_ROW, id, isbn, publisher, release_date, sort_order: id, sources: { translators },
  })
  const same = mergeFigureBookEditions([
    row(1, '9791188626007', '케이디북스', []),
    row(2, '9791188626069', '백산출판사', [], '2022-07-30'),
  ], [], 'ko', false, true)
  assert.deepEqual(same.map((edition) => edition.id), [2])
  const sameTranslation = mergeFigureBookEditions([
    row(1, '9791188626007', '케이디북스', ['김철수']),
    row(2, '9791188626069', '백산출판사', ['김철수'], '2022-07-30'),
  ], [], 'ko', false, false)
  assert.deepEqual(sameTranslation.map((edition) => edition.id), [2])
  const diff = mergeFigureBookEditions([
    row(1, '9788937460883', '민음사', ['전승희']),
    row(2, '9788932925929', '열린책들', ['원유경']),
  ], [], 'ko', false, true)
  assert.deepEqual(diff.map((edition) => edition.id), [1, 2])
  const unknownTranslations = mergeFigureBookEditions([
    row(1, '9791188626007', '케이디북스', []),
    row(2, '9791188626069', '백산출판사', []),
  ], [], 'ko', false, false)
  assert.deepEqual(unknownTranslations.map((edition) => edition.id), [1])
})

test('같은 책 그룹에서는 구매 링크가 있는 판본이 대표가 된다', () => {
  const first: FigureBookEditionRow = { ...BASE_ROW, id: 7, release_date: '2023-06-30' }
  const second = { ...first, id: 8, isbn: '9791139721966'.replace('966', '967'), release_date: '2024-01-01' }
  const editions = mergeFigureBookEditions([second, first], [BASE_ROW], 'ko')
  assert.deepEqual(editions.map((edition) => edition.id), [7])
  assert.equal(editions[0].purchaseUrl, BASE_ROW.affiliate_url)
})

test('상세 전체 조회도 같은 번역의 판본을 중복 노출하지 않는다', () => {
  const first: FigureBookEditionRow = { ...BASE_ROW, id: 7 }
  const second = { ...first, id: 8, isbn: '9788937460012', sort_order: 2 }
  const editions = mergeFigureBookEditions([second, first], [BASE_ROW], 'ko', true)
  assert.deepEqual(editions.map((edition) => edition.id), [7])
})

test('상품이 있는 판본과 없는 판본 모두 저장된 제목의 문자 코드를 복원한다', () => {
  const title = '구스타브 말러의 Kindertotenlieder&#40;죽은 아이를 그리는 노래&#41;의...'
  const expected = '구스타브 말러의 Kindertotenlieder(죽은 아이를 그리는 노래)의...'
  const product = { ...BASE_ROW, title }
  const row: FigureBookEditionRow = { ...product, id: product.edition_id }
  assert.equal(mapFigureBookPurchaseOptions([product], 'ko')[0].title, expected)
  assert.equal(mergeFigureBookEditions([row], [], 'ko', true)[0].title, expected)
  assert.equal(product.title, title)
})

test('영문 구매 상품도 판본의 역자를 보존해 다른 번역을 합치지 않는다', () => {
  const first: FigureBookEditionRow = { ...BASE_ROW, id: 7, locale: 'en', sources: { translators: ['Translator A'] } }
  const second = { ...first, id: 8, isbn: '9788937460012', sources: { translators: ['Translator B'] } }
  const options = [first, second].map(row => ({ ...row, edition_id: row.id, platform: 'amazon', affiliate_url: 'https://amazon.com/dp/example' }))
  const editions = mergeFigureBookEditions([first, second], options, 'en', false, true)
  assert.deepEqual(editions.map(edition => edition.id), [7, 8])
  assert.deepEqual(editions.map(edition => edition.translator), ['Translator A', 'Translator B'])
})

test('한국어 카드가 함께 있어도 영문 원서의 출판사 USA 표기만으로 판본을 나누지 않는다', () => {
  const paperback: FigureBookEditionRow = { ...BASE_ROW, id: 263, locale: 'en', title: 'Superintelligence',
    creator: 'Nick Bostrom', publisher: 'Oxford University Press', isbn: '9780198739838',
    edition_kind: null, text_scope: null, release_date: '2016-01-01' }
  const hardback = { ...paperback, id: 1796, publisher: 'Oxford University Press, USA',
    isbn: '9780199678112', edition_kind: 'full', text_scope: 'complete', release_date: '2014-01-01' }
  assert.deepEqual(mergeFigureBookEditions([paperback, hardback], [], 'en', false, false).map(e => e.id), [263])
  const product = { ...hardback, edition_id: hardback.id, platform: 'amazon', affiliate_url: 'https://amazon.com/dp/example' }
  assert.deepEqual(mergeFigureBookEditions([paperback, hardback], [product], 'en', false, false).map(e => e.id), [1796])
  assert.equal(mergeFigureBookEditions([paperback, hardback], [], 'en', true).length, 1)
  assert.equal(mergeFigureBookEditions([paperback, { ...hardback, publisher: 'Another Press' }], [], 'en').length, 1)
  assert.equal(mergeFigureBookEditions([
    { ...paperback, sources: { translators: ['Translator A'] } },
    { ...hardback, sources: { translators: ['Translator B'] } },
  ], [], 'en').length, 2)
  assert.equal(mergeFigureBookEditions([paperback, { ...hardback, edition_kind: 'abridged', text_scope: 'abridged' }], [], 'en').length, 1)
})

const SERIES = { title: '전략 삼국지', creator: '요코야마 미츠테루', locale: 'ko', sourceUrl: 'https://publisher.example/series' }
const volume = (number: number, translator = '이길진'): FigureBookEditionRow => ({
  ...BASE_ROW, id: number, title: `전략 삼국지 ${number}: 부제`, creator: SERIES.creator,
  publisher: 'AK', sources: { translators: [translator] }, edition_kind: 'volume', text_scope: `volume/${number}`,
})

test('같은 출간본의 8·17·41권을 판본 선택에 나열하지 않고 시작권만 보여 준다', () => {
  const rows = [volume(8), volume(17), volume(41), volume(1)]
  assert.deepEqual(mergeFigureBookEditions(rows, [], 'ko', false, false, SERIES).map(e => e.id), [1])
  assert.deepEqual(mergeFigureBookEditions(rows, [], 'ko', true, false, SERIES).map(e => e.id), [1])
  assert.deepEqual(rows.map(e => e.id), [8, 17, 41, 1])
})

test('시리즈 시작권이 없으면 41권을 임의의 대표로 선택하지 않는다', () => {
  assert.deepEqual(mergeFigureBookEditions([volume(41), volume(17)], [], 'ko', false, false, SERIES), [])
})

test('서로 다른 번역본은 각각 시작권을 남기고 곡별 악보와 권별 범위 없는 항목은 그대로 둔다', () => {
  const other = { ...volume(1, '다른 역자'), id: 101 }
  assert.deepEqual(mergeFigureBookEditions([volume(1), volume(2), other], [], 'ko', false, false, SERIES).map(e => e.id), [1, 101])
  const scores = [volume(1), volume(41)].map(row => ({ ...row, edition_kind: 'selection', text_scope: 'eight songs' }))
  assert.equal(mergeFigureBookEditions(scores, [], 'ko', false, false, SERIES).length, 1)
  const unknown = [volume(1), volume(41)].map(row => ({...row,edition_kind:null,text_scope:null}))
  assert.equal(mergeFigureBookEditions(unknown, [], 'ko').length, 1)
})

test('시리즈 메타가 없는 원전 아래의 다른 번역본도 명시된 권별 범위로 시작권만 고른다', () => {
  const rows = [volume(1),volume(17),volume(41)]
  assert.deepEqual(mergeFigureBookEditions(rows, [], 'ko').map(e=>e.id),[1])
  assert.deepEqual(mergeFigureBookEditions(rows.slice(1), [], 'ko'),[])
  assert.equal(mergeFigureBookEditions(rows, [], 'ko', true).length,1)
  const retelling = [volume(1),volume(5)].map(row=>({...row,edition_kind:'adaptation',text_scope:`comic-adaptation-volume-${row.id}`}))
  assert.deepEqual(mergeFigureBookEditions(retelling, [], 'ko').map(e=>e.id),[1])
  assert.deepEqual(mergeFigureBookEditions([{...volume(6),text_scope:'volume-6'}], [], 'ko'),[])
})

test('원작 표제 뒤의 권 번호는 자연어 범위·누락된 범위에도 원전 전체로 노출하지 않는다',()=>{
 const tail={id:900,content_id:'journey',locale:'en',title:'The Journey to the West, Revised Edition, Volume 3',creator:'Anthony C. Yu',description:null,isbn:'9780226971389',publisher:'University of Chicago Press',thumbnail_url:null,release_date:null,edition_kind:null,text_scope:'chapters-051-075',sort_order:0}
 assert.deepEqual(mergeFigureBookEditions([tail],[], 'en',true,false,undefined,['Journey to the West']),[])
 assert.equal(mergeFigureBookEditions([{...tail,title:'The Journey to the West, Revised Edition, Volume 1'}],[], 'en',true,false,undefined,['Journey to the West']).length,1)
})

test('확인된 번역 옆에 출판사·ISBN만 다른 미확인 상품을 추가 판본으로 만들지 않는다',()=>{
 const known={...BASE_ROW,id:501,sources:{translators:['천병희']}}
 const unknown={...BASE_ROW,id:502,publisher:'다른 출판사',isbn:'9788934971016',release_date:'2026-10-08'}
 assert.deepEqual(mergeFigureBookEditions([known,unknown],[],'ko',true).map(e=>e.id),[501])
 assert.deepEqual(mergeFigureBookEditions([unknown,{...unknown,id:503,publisher:'또 다른 출판사'}],[],'ko',true).map(e=>e.id),[502])
})

test('다른 영어 번역에 상품이 없어도 판본을 보존하고 제외 판본의 상품은 되살리지 않는다',()=>{
 const first={...BASE_ROW,id:700,locale:'en',sources:{translators:['Translator A']}}
 const second={...first,id:701,isbn:'9788937460012',sources:{translators:['Translator B']}}
 const product={...first,edition_id:700,platform:'amazon',affiliate_url:'https://amazon.com/dp/valid'}
 assert.deepEqual(mergeFigureBookEditions([first,second],[product],'en').map(e=>e.id),[700,701])
 const blocked={...first,sources:{provider_edition_title:'Penguin Readers Level 3',provider_edition_isbn:first.isbn}}
 assert.deepEqual(mergeFigureBookEditions([blocked],[product],'en'),[])
})
