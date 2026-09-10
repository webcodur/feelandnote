import assert from 'node:assert/strict'
import test from 'node:test'

import { getBookDescriptionByIsbn } from './openlibrary'

test('OpenLibrary는 선택한 ISBN의 판본 소개를 우선한다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    assert.equal(String(url), 'https://openlibrary.org/isbn/9780140328721.json')
    return Response.json({ description: { value: 'Edition introduction' }, works: [{ key: '/works/OL1W' }] })
  })
  assert.equal(await getBookDescriptionByIsbn('9780140328721'), 'Edition introduction')
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('판본 소개가 없으면 그 판본이 속한 작품 소개만 가져온다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0]) => {
    if (String(url).endsWith('/isbn/9780140328721.json')) return Response.json({ works: [{ key: '/works/OL1W' }] })
    assert.equal(String(url), 'https://openlibrary.org/works/OL1W.json')
    return Response.json({ description: 'Work introduction' })
  })
  assert.equal(await getBookDescriptionByIsbn('9780140328721'), 'Work introduction')
})

test('404와 정상 응답의 소개 누락만 null로 반환한다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  assert.equal(await getBookDescriptionByIsbn('9780140328721'), null)
  fetchMock.mock.mockImplementation(async () => Response.json({}))
  assert.equal(await getBookDescriptionByIsbn('9780140328721'), null)
})

test('일시적인 네트워크/HTTP 장애는 캐시 가능한 소개 누락으로 바꾸지 않는다', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))
  await assert.rejects(getBookDescriptionByIsbn('9780140328721'), /503/)
  fetchMock.mock.mockImplementation(async () => { throw new Error('timeout') })
  await assert.rejects(getBookDescriptionByIsbn('9780140328721'), /timeout/)
})
