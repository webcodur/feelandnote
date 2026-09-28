import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { buildPortraitVariants, uploadPortraitVariants } from './portrait-variants'
import { portraitVariantUrl } from '@feelandnote/shared/constants/responsive-artwork'

test('portrait variants preserve aspect, alpha and native resolution', async () => {
  const source = await sharp({ create: { width: 1080, height: 1350, channels: 4, background: '#00000000' } }).png().toBuffer()
  const variants = await buildPortraitVariants(source)
  for (const variant of variants) {
    const meta = await sharp(variant.body).metadata()
    assert.equal(meta.width, variant.width)
    assert.equal(meta.height, variant.width * 1.25)
    assert.equal(meta.hasAlpha, true)
  }
  const small = await sharp(source).resize(240, 300).toBuffer()
  for (const variant of await buildPortraitVariants(small)) assert.equal((await sharp(variant.body).metadata()).width, 240)
})

test('variant upload failure reaches the publisher; URLs retain version and external sources', async () => {
  const source = await sharp({ create: { width: 240, height: 300, channels: 3, background: '#345678' } }).webp().toBuffer()
  await assert.rejects(uploadPortraitVariants('celebs/person/photo.webp', source, async () => { throw new Error('failed') }), /failed/)
  assert.equal(portraitVariantUrl('https://assets.feelandnote.com/celebs/person/photo.webp?v=123#x', 768), 'https://assets.feelandnote.com/celebs/person/photo.display-768.webp?v=123#x')
  assert.equal(portraitVariantUrl('https://external.test/person.jpg', 768), 'https://external.test/person.jpg')
})
