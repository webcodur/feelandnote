import assert from 'node:assert/strict'
import test from 'node:test'
import { selectInChunks } from './paginate'

test('large UUID selections stay within the REST gateway request limit and retain every row', async () => {
  const ids = Array.from({ length: 275 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
  const rows = await selectInChunks(ids, async (chunk) => {
    const url = new URL('https://data.example/rest/v1/contents')
    url.searchParams.set('select', 'id,type,figureBook:metadata->figureBook,content_locales(locale,title,creator,thumbnail_url,sources,affiliate_url,isbn)')
    url.searchParams.set('id', `in.(${chunk.join(',')})`)
    // The live gateway rejects the same contents request at 100 UUIDs (about 4 KiB).
    if (url.toString().length >= 4096) return { data: null, error: { message: 'Bad gateway' } }
    return { data: chunk.map((id) => ({ id })), error: null }
  })
  assert.deepEqual(rows.map((row) => row.id), ids)
})

test('a failed chunk rejects instead of returning an empty or partial shelf', async () => {
  const ids = Array.from({ length: 275 }, (_, i) => String(i))
  await assert.rejects(selectInChunks(ids, async (chunk) => {
    if (!chunk.includes('0')) return { data: null, error: { message: 'query unavailable' } }
    return { data: chunk.map((id) => ({ id })), error: null }
  }), /query unavailable/)
})
