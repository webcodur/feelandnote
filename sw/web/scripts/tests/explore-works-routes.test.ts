import assert from 'node:assert/strict'
import test from 'node:test'
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server'
import nextConfig from '../../next.config'

const origin = 'https://feelandnote.com'
const cases = [
  ['', '/explore/works'],
  ['/popular?mode=classics', '/explore/works/popular?mode=classics'],
  ['/curated/example/list?tag=a', '/explore/works/curated/example/list?tag=a'],
  ['/museum?cat=music', '/explore/works/museum?cat=music'],
  ['/academy/video/composition', '/explore/works/academy/video/composition'],
  ['/figure', '/explore/today'],
  ['/era', '/explore/works/popular'],
  ['/profession?type=BOOK', '/explore/works/popular?type=BOOK&view=profession'],
] as const

for (const prefix of ['', '/ko', '/en']) {
  const canonicalPrefix = prefix === '/ko' ? '' : prefix
  for (const legacy of ['/library', '/scriptures']) {
    test(`${prefix}${legacy} goes directly to canonical works paths and preserves queries`, async () => {
      for (const [suffix, destination] of cases) {
        const response = await unstable_getResponseFromNextConfig({
          url: `${origin}${prefix}${legacy}${suffix}`, nextConfig,
        })
        assert.equal(response.status, 308)
        const actual = new URL(response.headers.get('location')!)
        const expected = new URL(`${origin}${canonicalPrefix}${destination}`)
        assert.equal(actual.pathname, expected.pathname)
        actual.searchParams.sort()
        expected.searchParams.sort()
        assert.equal(actual.search, expected.search)
        const final = await unstable_getResponseFromNextConfig({ url: actual.href, nextConfig })
        assert.equal(final.status, 200, `another config redirect at ${actual.href}`)
      }
    })
  }
  test(`${prefix}/explore/persona is permanent and youtube stays temporary`, async () => {
    const persona = await unstable_getResponseFromNextConfig({
      url: `${origin}${prefix}/explore/persona?sort=score`, nextConfig,
    })
    assert.equal(persona.status, 308)
    assert.equal(persona.headers.get('location'), `${origin}${canonicalPrefix}/explore/spectrum?sort=score`)
    const youtube = await unstable_getResponseFromNextConfig({ url: `${origin}${prefix}/explore/youtube`, nextConfig })
    assert.equal(youtube.status, 307)
  })
}

// Next의 config 테스트 도구는 배열 쿼리를 쉼표로 합친다. 반복 값 보존은 실제 HTTP로 검수한다.
test('old figure list aliases retain filters', async () => {
  for (const alias of ['figures', 'celebs']) {
    const response = await unstable_getResponseFromNextConfig({
      url: `${origin}/en/explore/${alias}?profession=actor&page=2`, nextConfig,
    })
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), `${origin}/en/explore?profession=actor&page=2`)
  }
})
