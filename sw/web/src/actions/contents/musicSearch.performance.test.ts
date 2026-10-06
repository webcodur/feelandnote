import assert from 'node:assert/strict'
import test from 'node:test'
import { getMusicIntro } from '@feelandnote/content-search/wikipedia'

test('candidate verification and album fallback reuse the same summary', async t => {
  const calls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url)
    if (url.includes('/search/page')) return Response.json({ pages: [{ key: 'Example' }] })
    return Response.json({ type: 'standard', extract: 'This page is unrelated.', titles: { normalized: 'Example' } })
  })
  assert.equal(await getMusicIntro('track', 'Example', 'Artist'), null)
  assert.equal(calls.filter(url => url.includes('/summary/')).length, 1)
})

test('the search stops at the caller deadline instead of starting more candidates', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls++
    if (url.includes('/search/page')) return Response.json({ pages: [{ key: 'First' }, { key: 'Second' }] })
    return new Promise<Response>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('test fetch outlived deadline')), 200)
      init.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason) }, { once: true })
    })
  })
  const start = performance.now()
  await assert.rejects(getMusicIntro('track', 'Missing', 'Artist', 'en', AbortSignal.timeout(40)))
  assert.ok(performance.now() - start < 180)
  assert.equal(calls, 2)
})

test('a validated song introduction still matches the requested artist', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string) => url.includes('/search/page')
    ? Response.json({ pages: [{ key: 'Example' }] })
    : Response.json({ type: 'standard', extract: 'Example is a song by Artist.', titles: { normalized: 'Example' },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Example' } } }))
  assert.equal((await getMusicIntro('track', 'Example', 'Artist'))?.url, 'https://en.wikipedia.org/wiki/Example')
  assert.equal(await getMusicIntro('track', 'Example', 'Another artist'), null)
})
