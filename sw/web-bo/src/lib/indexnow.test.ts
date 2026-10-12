import assert from 'node:assert/strict'
import test from 'node:test'
import { notifyCelebIndexNow, notifyIndexNow } from './indexnow'

test('로컬 백오피스에서도 공개 인물 변경을 IndexNow에 통지한다', async (t) => {
  const originalEnvironment = process.env.NODE_ENV
  Object.assign(process.env, { NODE_ENV: 'development' })
  const requests: { url: string; body: { urlList: string[] } }[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) })
    return new Response(null, { status: 200 })
  })

  try {
    await notifyIndexNow(['/celeb/harris-fricker'])
    assert.equal(requests.length, 1)
    assert.equal(requests[0].url, 'https://api.indexnow.org/indexnow')
    assert.deepEqual(requests[0].body.urlList, ['https://feelandnote.com/celeb/harris-fricker'])
  } finally {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV
    else Object.assign(process.env, { NODE_ENV: originalEnvironment })
  }
})

test('인물 변경은 한국어와 영어 정식 주소를 한 번에 통지한다', async (t) => {
  const urls: string[][] = []
  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    urls.push(JSON.parse(String(init?.body)).urlList)
    assert.ok(init?.signal instanceof AbortSignal)
    return new Response(null, { status: 200 })
  })

  await notifyCelebIndexNow('harris-fricker')
  assert.deepEqual(urls, [[
    'https://feelandnote.com/celeb/harris-fricker',
    'https://feelandnote.com/en/celeb/harris-fricker',
  ]])
})

test('IndexNow가 거부해도 저장을 실패시키지 않고 응답 상태를 알린다', async (t) => {
  const warnings: unknown[][] = []
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  t.mock.method(console, 'warn', (...args: unknown[]) => { warnings.push(args) })

  await notifyCelebIndexNow('harris-fricker')
  assert.equal(warnings.length, 1)
  assert.ok(warnings[0].includes(503))
})

test('통신 실패도 저장을 실패시키지 않고 누락을 알린다', async (t) => {
  const warnings: unknown[][] = []
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network unavailable') })
  t.mock.method(console, 'warn', (...args: unknown[]) => { warnings.push(args) })

  await notifyCelebIndexNow('harris-fricker')
  assert.equal(warnings.length, 1)
})
