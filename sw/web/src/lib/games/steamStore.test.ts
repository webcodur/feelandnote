import test from 'node:test'
import assert from 'node:assert/strict'
import { readSteamStore } from './steamStore'
import { selectSteamReference, steamAppId } from './steamPurchase'

const page = (body: string, title = 'Portal', id = '400') => `
  <link rel="canonical" href="https://store.steampowered.com/app/${id}/Portal/">
  <div class="apphub_AppName">${title}</div>${body}`
const option = (name: string, price: string, sub = '515', extra = '') => `
  <div class="game_area_purchase_game"><h1>Buy ${name}</h1>
  <input name="subid" value="${sub}"><div class="game_purchase_action">
  <span class="game_purchase_price">${price}</span>${extra}<a>Add to Cart</a></div></div>`

test('판매 주소는 Steam app 경로만 허용하고 같은 작품에 연결된 단일 주소를 선택한다', () => {
  assert.equal(steamAppId('https://store.steampowered.com.evil.test/app/400'), null)
  assert.equal(steamAppId('https://store.steampowered.com/sub/515'), null)
  assert.equal(steamAppId('javascript:alert(1)'), null)
  const game = { name: 'Portal', websites: [{ url: 'https://store.steampowered.com/app/400' }] }
  assert.equal(selectSteamReference(game, ['포탈', 'Portal'])?.appId, '400')
  assert.equal(selectSteamReference({ ...game, name: 'Portal Maze 2' }, ['포탈', 'Portal']), null)
  assert.equal(selectSteamReference({ ...game, websites: [...game.websites, { url: 'https://store.steampowered.com/app/620' }] }, ['Portal']), null)
})

test('별칭은 동일 제목으로 대조하되 제목 일부나 본편·다른 판본을 서로 바꾸지 않는다', () => {
  const game = { name: 'Portal', alternative_names: [{ name: '포탈' }], websites: [{ url: 'https://store.steampowered.com/app/400' }] }
  assert.ok(selectSteamReference(game, ['포탈']))
  assert.equal(selectSteamReference(game, ['Portal 2']), null)
  assert.equal(selectSteamReference(game, ['Portal: RTX']), null)
})

test('IGDB의 bare uid나 URL과 다른 ID를 임의로 Steam app ID로 쓰지 않는다', () => {
  const entry = { uid: '400', external_game_source: { name: 'Steam' } }
  assert.equal(selectSteamReference({ name: 'Portal', external_games: [entry] }, ['Portal']), null)
  assert.equal(selectSteamReference({ name: 'Portal', external_games: [{ ...entry, url: 'https://store.steampowered.com/app/620' }] }, ['Portal']), null)
  assert.equal(selectSteamReference({ name: 'Portal', external_games: [{ ...entry, url: 'https://store.steampowered.com/app/400' }] }, ['Portal'])?.appId, '400')
})

test('일반판 가격만 고르고 Commercial License·묶음·DLC 가격은 섞지 않는다', () => {
  const body = option('Portal - Commercial License', '₩ 10,500', '99')
    + option('The Orange Box', '₩ 21,500', '469') + option('Portal', '₩ 11,000')
  assert.equal(readSteamStore(page(body), '400', ['Portal'])?.price, 11000)
  const wrongEdition = readSteamStore(page(option('Portal - Commercial License', '₩ 10,500')), '400', ['Portal'])
  assert.equal(wrongEdition?.price, null)
  assert.equal(wrongEdition?.status, 'store')
})

test('정상 할인만 표시하며 다른 통화·잘못된 정가·할인율은 노출하지 않는다', () => {
  const extra = '<s class="discount_original_price">₩ 27,000</s><span class="discount_pct">-75%</span>'
  const offer = readSteamStore(page(option('Portal', '₩ 6,750', '515', extra)), '400', ['Portal'])
  assert.equal(offer?.discountPercent, 75)
  assert.equal(offer?.originalPrice, 27000)
  const invalid = readSteamStore(page(option('Portal', '₩ 11,000', '515', extra)), '400', ['Portal'])
  assert.equal(invalid?.discountPercent, null)
  assert.equal(invalid?.originalPrice, null)
  assert.equal(readSteamStore(page(option('Portal', '$9.99')), '400', ['Portal'])?.price, null)
})

test('지역 제한·판매 중단·다른 작품·다른 상품 주소는 연결하지 않는다', () => {
  const body = option('Portal', '₩ 11,000')
  assert.equal(readSteamStore(page(body + '<div class="notice_box_content">This game is no longer available on Steam.</div>'), '400', ['Portal']), null)
  assert.equal(readSteamStore(page('<div class="error">This item is currently unavailable in your region</div>'), '400', ['Portal']), null)
  assert.equal(readSteamStore(page(body, 'Portal Maze 2'), '400', ['Portal']), null)
  assert.equal(readSteamStore(page(body, 'Portal', '620'), '400', ['Portal']), null)
  assert.equal(readSteamStore('<html>Temporary server error</html>', '400', ['Portal']), null)
})

test('검색 제외된 작품도 같은 본편의 구매 옵션이 있으면 연결하며, 없으면 숨긴다', () => {
  const notice = '<div class="notice_box_content">This game is unlisted on the Steam store and will not appear in search.</div>'
  assert.equal(readSteamStore(page(option('Portal', '₩ 11,000') + notice), '400', ['Portal'])?.price, 11000)
  assert.equal(readSteamStore(page(notice), '400', ['Portal']), null)
})

test('가격 없는 응답은 무료가 아니다. 명시적인 무료 플레이 옵션만 무료로 표시한다', () => {
  assert.equal(readSteamStore(page(''), '400', ['Portal'])?.status, 'store')
  const free = '<div class="game_area_purchase_game"><h1>Play Portal</h1><div class="game_purchase_action"><span class="game_purchase_price">Free To Play</span><a>Play Game</a></div></div>'
  assert.equal(readSteamStore(page(free), '400', ['Portal'])?.status, 'free')
})

test('미출시 표시는 명시적인 출시 예정 영역에서만 가져온다', () => {
  assert.equal(readSteamStore(page('<div class="game_area_comingsoon">Coming soon</div>'), '400', ['Portal'])?.status, 'upcoming')
})

test('동명 구매 옵션이 여러 개면 최저가로 임의 선택하지 않는다', () => {
  const result = readSteamStore(page(option('Portal', '₩ 11,000') + option('Portal', '₩ 9,900', '123')), '400', ['Portal'])
  assert.equal(result?.price, null)
})

test('연령 확인은 정확한 메타 제목·주소를 대조하고 가격 없이 상점만 안내한다', () => {
  const html = '<link rel="canonical" href="https://store.steampowered.com/app/400/"><meta property="og:title" content="Save 50% on Portal on Steam"><div>Age check</div>'
  assert.equal(readSteamStore(html, '400', ['Portal'])?.status, 'store')
  assert.equal(readSteamStore(html, '400', ['Portal 2']), null)
})

test('확인된 완전판 이름의 연령 확인 페이지는 판본을 표시하고 가격 없이 연결한다', () => {
  const html = '<link rel="canonical" href="https://store.steampowered.com/app/400/"><meta property="og:title" content="Portal - Complete Edition on Steam"><div>Age check</div>'
  const edition = { kind: 'edition' as const, title: 'Portal - Complete Edition', names: ['Portal - Complete Edition'] }
  assert.equal(readSteamStore(html, '400', ['Portal']), null)
  const offer = readSteamStore(html, '400', ['Portal'], [edition])
  assert.deepEqual(offer?.edition, { kind: 'edition', title: edition.title })
  assert.equal(offer?.price, null)
})

test('완전판을 표시할 때 일반판 가격을 가져오지 않는다', () => {
  const edition = { kind: 'edition' as const, title: 'Portal - Complete Edition', names: ['Portal - Complete Edition'] }
  const html = page(option('Portal', '₩ 11,000'), edition.title)
  assert.equal(readSteamStore(html, '400', ['Portal'], [edition])?.price, null)
  const full = page(option(edition.title, '₩ 20,000') + option('Portal', '₩ 11,000'), edition.title)
  assert.equal(readSteamStore(full, '400', ['Portal'], [edition])?.price, 20000)
})
