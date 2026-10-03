import assert from 'node:assert/strict'
import test from 'node:test'

test('이전 Google 우선 옵션도 도서 신규 메타 검색을 Google로 보내지 않는다', async t => {
  process.env.KAKAO_REST_API_KEY = 'test-key'
  const { searchExternal } = await import('./unified-search')
  const mock = t.mock.method(globalThis, 'fetch', async url => {
    assert.ok(String(url).startsWith('https://dapi.kakao.com/v3/search/book?'))
    return Response.json({ documents: [], meta: { total_count: 0, is_end: true } })
  })
  assert.deepEqual(await searchExternal('BOOK', '책', 1, { preferGoogle: true }), { items: [], total: 0, hasMore: false })
  assert.equal(mock.mock.callCount(), 1)
})
