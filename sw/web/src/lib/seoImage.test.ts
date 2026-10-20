import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import sharp from 'sharp'
import ts from 'typescript'
import * as imageOrigin from './seoImageOrigin'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./seoImage.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText

function loadImageModule(fetcher: (url: URL) => Promise<Response>) {
  const loaded = { exports: {} as {
    createSquareSeoImage: (url: string | null, variant: string) => Promise<Buffer>
    createSeoImageResponse: (image: Buffer) => Response
    createSeoImageFailureResponse: (variant: string) => Promise<Response>
  } }
  new Function('require', 'module', 'exports', compiled)((id: string) => {
    if (id === 'server-only') return {}
    if (id === '@/lib/seoImageOrigin') return imageOrigin
    if (id === '@/lib/rawFetch') return { rawFetch: fetcher }
    return require(id)
  }, loaded, loaded.exports)
  return loaded.exports
}

test('stored Kakao cover wrappers download their allowed HTTPS original before rendering', async () => {
  const source = await sharp({ create: { width: 120, height: 174, channels: 3, background: '#e05020' } }).png().toBuffer()
  const fetched: string[] = []
  const images = loadImageModule(async url => {
    fetched.push(url.href)
    return new Response(new Uint8Array(source), { headers: { 'content-type': 'image/png' } })
  })
  const wrapper = 'https://search1.kakaocdn.net/thumb/R120x174/?fname=' + encodeURIComponent('http://t1.daumcdn.net/book/cover.jpg')
  const response = images.createSeoImageResponse(await images.createSquareSeoImage(wrapper, 'content'))
  assert.equal(response.status, 200)
  assert.deepEqual(fetched, ['https://t1.daumcdn.net/book/cover.jpg'])
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width, 800)
})

test('Kakao wrappers and redirects cannot bypass the image origin policy', async () => {
  let fetched = 0
  const images = loadImageModule(async () => {
    fetched++
    return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } })
  })
  for (const target of ['http://127.0.0.1/private', 'https://t1.daumcdn.net.attacker.example/cover.jpg']) {
    const wrapper = 'https://search1.kakaocdn.net/thumb/?fname=' + encodeURIComponent(target)
    await assert.rejects(images.createSquareSeoImage(wrapper, 'content'), /허용되지 않은 이미지 호스트/)
  }
  assert.equal(fetched, 0)
  await assert.rejects(images.createSquareSeoImage('https://t1.daumcdn.net/cover.jpg', 'content'), /허용되지 않은 이미지 호스트/)
  assert.equal(fetched, 1)
})

async function render(source: Buffer, variant = 'person') {
  return loadImageModule(async () => new Response(new Uint8Array(source), { headers: { 'content-type': 'image/png' } }))
    .createSquareSeoImage('https://assets.feelandnote.com/test.png', variant)
}

test('portrait fills the square without margins, retaining the top and original brightness', async () => {
  const source = await sharp(Buffer.from('<svg width="400" height="500"><rect width="400" height="500" fill="#e05020"/><rect width="400" height="20" fill="#20c060"/><rect y="480" width="400" height="20" fill="#2040e0"/></svg>')).png().toBuffer()
  const rendered = await render(source)
  const { data, info } = await sharp(rendered).raw().toBuffer({ resolveWithObject: true })
  const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)]
  assert.equal(info.width, 800)
  assert.equal(info.height, 800)
  for (const x of [0, 400, 799]) {
    const [red, green, blue] = pixel(x, 0)
    assert.ok(green > 170 && red < 50 && blue < 110, 'top of the portrait should remain visible')
  }
  for (const [x, y] of [[0, 400], [799, 400], [0, 799], [400, 799], [799, 799]]) {
    const [red, green, blue] = pixel(x, y)
    assert.ok(red > 200 && green > 65 && green < 100 && blue < 50, `${x},${y}: ${pixel(x, y)}`)
  }
})

test('avatar gets a stable ochre texture while foreground colors remain intact', async () => {
  const source = await sharp(Buffer.from('<svg width="400" height="400"><rect x="100" y="100" width="200" height="200" fill="#e05020"/></svg>')).png().toBuffer()
  const rendered = await render(source, 'avatar')
  const { data, info } = await sharp(rendered).raw().toBuffer({ resolveWithObject: true })
  const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)]
  const samples = Array.from({ length: 20 }, (_, i) => pixel(i * 40, 20))
  for (const [red, green, blue] of samples) {
    assert.ok(red > green && green > blue, 'background should be yellow-brown')
    assert.ok(red > 165 && green > 120 && blue > 60, 'background should stay visible in a small thumbnail')
  }
  const tones = samples.map(([red]) => red)
  assert.ok(Math.max(...tones) - Math.min(...tones) > 8, 'background should have visible texture and lighting')
  assert.ok(pixel(400, 400)[0] > 200)
  assert.deepEqual(rendered, await render(source, 'avatar'))
})

test('a genuinely missing source returns a cacheable fallback without fetching', async () => {
  const images = loadImageModule(async () => { throw new Error('must not fetch') })
  const response = images.createSeoImageResponse(await images.createSquareSeoImage(null, 'person'))
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control')!, /s-maxage=2592000/)
  assert.equal(response.headers.get('retry-after'), null)
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width, 800)
})

test('download and decode failures propagate rather than becoming cacheable images', async () => {
  const failures = [
    async () => { throw new Error('timeout') },
    async () => new Response('unavailable', { status: 503 }),
    async () => new Response('invalid bytes', { headers: { 'content-type': 'image/png' } }),
  ]
  for (const fetcher of failures) {
    const images = loadImageModule(fetcher)
    await assert.rejects(images.createSquareSeoImage('https://assets.feelandnote.com/test.png', 'person'))
    const response = await images.createSeoImageFailureResponse('person')
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(response.headers.get('retry-after'), '60')
    assert.equal(response.headers.get('content-type'), 'image/jpeg')
    assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width, 800)
  }
})

test('a failed download can recover on the next request', async () => {
  const source = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#e05020' } }).png().toBuffer()
  let attempts = 0
  const images = loadImageModule(async () => {
    if (++attempts === 1) throw new Error('temporary failure')
    return new Response(new Uint8Array(source), { headers: { 'content-type': 'image/png' } })
  })
  await assert.rejects(images.createSquareSeoImage('https://assets.feelandnote.com/test.png', 'person'))
  const response = images.createSeoImageResponse(await images.createSquareSeoImage('https://assets.feelandnote.com/test.png', 'person'))
  assert.equal(attempts, 2)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control')!, /s-maxage=2592000/)
})
