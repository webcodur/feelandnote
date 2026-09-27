import assert from 'node:assert/strict'
import test from 'node:test'
import { consoleUrl, getConsoleReferences, type ConsoleReference } from './consoleReferences'
import { findNintendoProducts, parseConsoleStore, parseNintendoProduct } from './consoleStores'

const xbox: ConsoleReference = { store: 'xbox', url: 'https://www.xbox.com/ko-kr/games/store/-/9P8DL6W0JBB8', game: { id: 1, name: 'Hades' } }
const xboxPage = (availability: string) => `<script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': ['Product', 'VideoGame'], name: 'Hades', url: xbox.url, gamePlatform: ['XBOX One', 'PC'], offers: { price: 31400, priceCurrency: 'KRW', availability } }] })}</script>`

test('공식 호스트·상품 식별자만 국내 주소로 변환한다', () => {
  assert.equal(consoleUrl('https://store.playstation.com/en-us/concept/225857')?.url, 'https://store.playstation.com/ko-kr/concept/225857')
  assert.equal(consoleUrl('https://www.xbox.com/en-us/games/store/hades/9p8dl6w0jbb8')?.url, xbox.url)
  assert.equal(consoleUrl('https://www.xbox.com.evil.test/en-us/games/store/hades/9p8dl6w0jbb8'), null)
  assert.equal(consoleUrl('https://store.playstation.com/en-us/concept/225857/other'), null)
})
test('HTTP 200이어도 판매 중단 상품과 다른 상품 리다이렉트는 제외한다', () => {
  assert.ok(parseConsoleStore(xboxPage('https://schema.org/InStock'), xbox.url!, xbox))
  assert.equal(parseConsoleStore(xboxPage('https://schema.org/OutOfStock'), xbox.url!, xbox), null)
  assert.equal(parseConsoleStore(xboxPage('https://schema.org/InStock'), xbox.url!.replace('9P8DL6W0JBB8', 'AAAAAAAAAAAA'), xbox), null)
})
test('PlayStation의 정상 응답 오류 페이지를 판매 링크로 만들지 않는다', () => {
  const reference: ConsoleReference = { ...xbox, store: 'playstation', url: 'https://store.playstation.com/ko-kr/concept/123' }
  assert.equal(parseConsoleStore(xboxPage('https://schema.org/InStock'), 'https://store.playstation.com/ko-kr/error?conceptId=123', reference), null)
})
test('Nintendo 검색의 유사 제목·DLC·해외 주소를 제외한다', () => {
  const html = [
    ['Hades II', 'https://store.nintendo.co.kr/700100123'],
    ['Hades', 'https://store.nintendo.co.kr/700500123'],
    ['Hades', 'https://store.nintendo.com/700100123'],
    ['Hades', 'https://store.nintendo.co.kr/700100456'],
  ].map(([title, url]) => `<a class="product-item-link" href="${url}">${title}</a>`).join('')
  assert.deepEqual(findNintendoProducts(html, ['Hades']), ['https://store.nintendo.co.kr/700100456'])
})
test('Nintendo 상세에서 품절·이름·기종을 다시 확인한다', () => {
  const reference: ConsoleReference = { store: 'nintendo', game: { id: 1, name: 'Hades', platforms: [{ name: 'Nintendo Switch' }] } }
  const html = '<h1>Hades</h1><div class="stock available">구매 가능</div><div class="product-attribute label_platform_attr">Nintendo Switch</div>'
  assert.ok(parseNintendoProduct(html, 'https://store.nintendo.co.kr/700100123', reference))
  assert.equal(parseNintendoProduct(html.replace('available', 'unavailable'), 'https://store.nintendo.co.kr/700100123', reference), null)
  assert.equal(parseNintendoProduct(html.replace('Nintendo Switch', 'Nintendo Switch 2'), 'https://store.nintendo.co.kr/700100123', reference), null)
  assert.equal(parseNintendoProduct(`${html}<div class="mfr_notice">게임 타이틀이 'Hades 2'에서 'Hades'로 업데이트되었습니다.</div>`, 'https://store.nintendo.co.kr/700100123', reference), null)
})
test('저장 작품이 맞을 때만 명시된 리마스터의 포함 합본까지 따라간다', () => {
  const game = { id: 1, name: 'Uncharted 2', remasters: [{ id: 2, name: 'Uncharted 2 Remastered', bundles: [{ id: 3, name: 'Nathan Drake Collection', websites: [{ url: 'https://store.playstation.com/en-us/concept/205353' }] }] }] }
  assert.equal(getConsoleReferences(game, ['Uncharted 3']).length, 0)
  assert.equal(getConsoleReferences(game, ['Uncharted 2'])[0].edition, 'collection')
})
