import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import sharp from 'sharp'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./seoImage.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText

async function render(source: Buffer, variant = 'person') {
  const loaded = { exports: {} as { createSquareSeoImage: (url: string, variant: string) => Promise<Buffer> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => {
    if (id === 'server-only') return {}
    if (id === '@/lib/seoImageOrigin') return { isAllowedSeoImageUrl: () => true }
    if (id === '@/lib/rawFetch') return { rawFetch: async () => new Response(new Uint8Array(source), { headers: { 'content-type': 'image/png' } }) }
    return require(id)
  }, loaded, loaded.exports)
  return loaded.exports.createSquareSeoImage('https://assets.feelandnote.com/test.png', variant)
}

test('portrait keeps its full 4:5 composition, original brightness and light side margins', async () => {
  const source = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#e05020' } }).png().toBuffer()
  const rendered = await render(source)
  const { data, info } = await sharp(rendered).raw().toBuffer({ resolveWithObject: true })
  const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)]
  assert.equal(info.width, 800)
  assert.equal(info.height, 800)
  for (const [x, y] of [[0, 0], [79, 400], [721, 400]]) assert.ok(pixel(x, y).every(channel => channel > 220))
  for (const [x, y] of [[81, 0], [400, 0], [400, 799], [719, 400]]) {
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
