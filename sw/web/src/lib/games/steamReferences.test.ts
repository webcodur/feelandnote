import test from 'node:test'
import assert from 'node:assert/strict'
import { getSteamReferences } from './steamReferences'
import { resolveSteamPurchase } from './steamResolver'
import type { GameStoreReference, SteamPurchase } from './steamPurchase'

const game = (id: number, name: string, appId?: string): GameStoreReference => ({
  id, name, websites: appId ? [{ url: `https://store.steampowered.com/app/${appId}/` }] : [],
})
const offer: SteamPurchase = {
  appId: '400', url: 'https://store.steampowered.com/app/400/?cc=kr',
  status: 'paid', price: 11000, originalPrice: null, discountPercent: null, edition: null,
}

test('원작 식별자가 틀리면 연결된 리메이크도 노출하지 않는다', () => {
  const root = { ...game(1, 'Portal Maze 2'), remakes: [game(2, 'Portal Remake', '400')] }
  assert.deepEqual(getSteamReferences(root, ['Portal']), [])
})

test('원작의 Steam이 없으면 명시된 리메이크를 판본 이름과 함께 후보로 삼는다', () => {
  const root = { ...game(1, 'The Last of Us'), remakes: [game(2, 'The Last of Us Part I', '1888930'), game(3, 'Firefly Edition')] }
  const refs = getSteamReferences(root, [root.name])
  assert.equal(refs.length, 1)
  assert.equal(refs[0].appId, '1888930')
  assert.deepEqual(refs[0].names, [])
  assert.equal(refs[0].editions[0].kind, 'remake')
  assert.equal(refs[0].editions[0].title, 'The Last of Us Part I')
})

test('같은 작품의 PC 확장판을 거쳐 연결된 리마스터도 자동으로 찾는다', () => {
  const root = { ...game(1, 'Gears of War'), expanded_games: [{
    ...game(2, 'Gears of War'), parent_game: 1,
    remasters: [game(3, 'Gears of War: Ultimate Edition'), game(4, 'Gears of War: Reloaded', '2523720')],
  }] }
  const refs = getSteamReferences(root, [root.name])
  assert.equal(refs.length, 1)
  assert.equal(refs[0].appId, '2523720')
  assert.equal(refs[0].editions[0].kind, 'remaster')
  assert.equal(refs[0].editions[0].title, 'Gears of War: Reloaded')
})

test('확장판에 원작 부모가 없거나 다른 작품명이면 경유하지 않는다', () => {
  for (const child of [
    { ...game(2, 'Portal'), parent_game: 99 },
    game(2, 'Portal'),
    { ...game(2, 'Portal 2'), parent_game: 1 },
  ]) {
    const root = { ...game(1, 'Portal'), expanded_games: [{ ...child, remasters: [game(3, 'Portal Remastered', '400')] }] }
    assert.deepEqual(getSteamReferences(root, [root.name]), [])
  }
})

test('확장판을 거친 서로 다른 리마스터 후보도 임의 선택하지 않는다', () => {
  const root = { ...game(1, 'Portal'), expanded_games: [
    { ...game(2, 'Portal'), parent_game: 1, remasters: [game(4, 'Portal Remastered', '400')] },
    { ...game(3, 'Portal'), parent_game: 1, remasters: [game(5, 'Portal Rebuilt', '620')] },
  ] }
  assert.deepEqual(getSteamReferences(root, [root.name]), [])
})

test('같은 이름의 확장판 자체에 Steam 상품이 있으면 판매 판본으로 표시한다', () => {
  const root = { ...game(1, 'Portal'), expanded_games: [{ ...game(2, 'Portal', '400'), parent_game: 1 }] }
  const refs = getSteamReferences(root, [root.name])
  assert.deepEqual(refs[0].names, [])
  assert.equal(refs[0].editions[0].kind, 'edition')
})

test('같은 관계의 서로 다른 Steam 후보는 첫 항목으로 임의 선택하지 않는다', () => {
  const root = { ...game(1, 'Portal'), remakes: [game(2, 'Portal Remake', '400'), game(3, 'Portal Rebuilt', '620')] }
  assert.deepEqual(getSteamReferences(root, [root.name]), [])
})

test('원작 포함 관계의 재출시 모음은 연결하되 여러 작품의 묶음은 고르지 않는다', () => {
  const root = { ...game(1, 'The Sims'), bundles: [
    game(2, 'The Sims: Legacy Collection', '3314060'),
    game(3, 'The Sims 25th Birthday Bundle', '999'),
    game(4, 'The Sims 2: Legacy Collection', '888'),
  ] }
  const refs = getSteamReferences(root, [root.name])
  assert.equal(refs.length, 1)
  assert.equal(refs[0].appId, '3314060')
  assert.equal(refs[0].editions[0].kind, 'collection')
})

test('같은 원작의 판본 관계만 기존 상품 페이지의 다른 판본명으로 인정한다', () => {
  const root = { ...game(1, 'Portal', '400'), bundles: [
    { ...game(2, 'Portal - Complete Edition'), version_parent: 1 },
    { ...game(3, 'Portal 2 - Complete Edition'), version_parent: 20 },
  ] }
  const refs = getSteamReferences(root, [root.name])
  assert.deepEqual(refs[0].editions.map(edition => edition.title), ['Portal - Complete Edition'])
})

test('정상 원작이 있으면 관련 판본의 판매 조회를 생략한다', async () => {
  const root = { ...game(1, 'Portal', '400'), remasters: [game(2, 'Portal Remastered', '620')] }
  const visited: string[] = []
  const result = await resolveSteamPurchase(root, [root.name], async ref => { visited.push(ref.appId); return offer })
  assert.equal(result, offer)
  assert.deepEqual(visited, ['400'])
})

test('원작이 명시적으로 연결 불가일 때 검증된 관련 판본을 조회한다', async () => {
  const root = { ...game(1, 'Portal', '400'), remasters: [game(2, 'Portal Remastered', '620')] }
  const visited: string[] = []
  await resolveSteamPurchase(root, [root.name], async ref => { visited.push(ref.appId); return null })
  assert.deepEqual(visited, ['400', '620'])
})

test('일시적 조회 실패는 가격 없이 주소를 유지하지만 명시적 거절은 되살리지 않는다', async () => {
  const root = game(1, 'Portal', '400')
  const fallback = await resolveSteamPurchase(root, [root.name], async () => { throw new Error('timeout') })
  assert.equal(fallback?.url, offer.url)
  assert.equal(fallback?.price, null)
  assert.equal(fallback?.status, 'store')
  assert.equal(await resolveSteamPurchase(root, [root.name], async () => null), null)
})

test('관련 판본의 조회 실패도 원작으로 가장하지 않고 판본명을 유지한다', async () => {
  const root = { ...game(1, 'The Last of Us'), remakes: [game(2, 'The Last of Us Part I', '1888930')] }
  const fallback = await resolveSteamPurchase(root, [root.name], async () => { throw new Error('timeout') })
  assert.equal(fallback?.edition?.kind, 'remake')
  assert.equal(fallback?.edition?.title, 'The Last of Us Part I')
})
