import assert from 'node:assert/strict'
import test from 'node:test'
import { GET } from '@/app/sitemaps/[name]/route'

test('설정이 없으면 정상 빈 XML 대신 캐시하지 않는 503을 낸다', async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_DB_API_URL
  delete process.env.NEXT_PUBLIC_DB_API_URL
  t.after(() => {
    if (previousUrl !== undefined) process.env.NEXT_PUBLIC_DB_API_URL = previousUrl
  })
  const response = await GET(new Request('https://feelandnote.com/sitemaps/celebs.xml'), {
    params: Promise.resolve({ name: 'celebs.xml' }),
  })
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(response.headers.get('Retry-After'), '60')
  assert.ok(!(await response.text()).includes('<urlset'))
})

test('없는 사이트맵은 DB 설정과 무관하게 404다', async () => {
  const response = await GET(new Request('https://feelandnote.com/sitemaps/contents-0.xml'), {
    params: Promise.resolve({ name: 'contents-0.xml' }),
  })
  assert.equal(response.status, 404)
})
