import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { buildMediumAvatar, buildSmallAvatar, uploadAvatarVariants } from './avatar-small'
import { celebAvatarTier, celebAvatarMediumUrl } from '@feelandnote/shared/constants/celeb-avatar-small'

test('derivatives preserve transparency, aspect and do not enlarge small sources', async () => {
  const source = await sharp({ create: { width: 800, height: 800, channels: 4, background: '#00000000' } })
    .composite([{ input: await sharp({ create: { width: 400, height: 400, channels: 4, background: '#ff0000' } }).png().toBuffer(), left: 200, top: 200 }])
    .webp().toBuffer()
  for (const [build, size] of [[buildSmallAvatar, 96], [buildMediumAvatar, 384]] as const) {
    const output = await build(source)
    const metadata = await sharp(output).metadata()
    assert.equal(metadata.width, size)
    assert.equal(metadata.height, size)
    assert.equal(metadata.hasAlpha, true)
    const stats = await sharp(output).stats()
    assert.equal(stats.channels[3].min, 0)
    assert.equal(stats.channels[3].max, 255)
  }
  const small = await sharp(source).resize(64, 64).toBuffer()
  assert.equal((await sharp(await buildMediumAvatar(small)).metadata()).width, 64)
  const portrait = await sharp(source).resize(200, 400).toBuffer()
  const meta = await sharp(await buildMediumAvatar(portrait)).metadata()
  assert.deepEqual([meta.width, meta.height], [192, 384])
})

test('variant upload propagates failure before caller can publish a new version', async () => {
  const source = await sharp({ create: { width: 800, height: 800, channels: 4, background: '#00000000' } }).webp().toBuffer()
  const keys: string[] = []
  await assert.rejects(uploadAvatarVariants('person', source, async (key) => {
    keys.push(key)
    if (key.endsWith('avatar-md.webp')) throw new Error('storage unavailable')
  }), /storage unavailable/)
  assert.deepEqual(keys, ['celebs/person/avatar-sm.webp', 'celebs/person/avatar-md.webp'])
})

test('URL version and density boundaries remain exact', () => {
  assert.equal(celebAvatarMediumUrl('https://assets.feelandnote.com/celebs/person/avatar.webp?v=12#face'), 'https://assets.feelandnote.com/celebs/person/avatar-md.webp?v=12#face')
  assert.equal(celebAvatarMediumUrl('https://example.com/person.jpg'), 'https://example.com/person.jpg')
  assert.equal(celebAvatarTier(48, 48, 2), 'small')
  assert.equal(celebAvatarTier(112, 112, 3), 'medium')
  assert.equal(celebAvatarTier(192, 192, 2), 'medium')
  assert.equal(celebAvatarTier(193, 193, 2), 'original')
  assert.equal(celebAvatarTier(30, 200, 2), 'original')
})
