import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { refreshVariants, AvatarChanged, sha256, type VariantIO, type Target } from './refresh-variants-core'

const target: Target = { id: 'person', slug: 'person', avatar_url: 'https://assets.feelandnote.com/celebs/person/avatar.webp?v=1' }
const originalKey = 'celebs/person/avatar.webp'
async function fixture() {
  const original = await sharp({ create: { width: 800, height: 800, channels: 4, background: '#5070a080' } }).webp().toBuffer()
  const objects = new Map<string, Buffer>([[originalKey, original], ['celebs/person/avatar-sm.webp', Buffer.from('old-small')]])
  const writes: string[] = [], publications: string[] = []
  let currentUrl: string | null = target.avatar_url
  const io: VariantIO = {
    async head(key) { const body = objects.get(key); return body ? { etag: sha256(body), bytes: body.length } : null },
    async read(key) { const body = objects.get(key); if (!body) throw new Error('Not found'); return { body, etag: sha256(body), bytes: body.length } },
    async put(key, body, previous) {
      const existing = objects.get(key)
      if (previous ? !existing || sha256(existing) !== previous.etag : existing) throw new AvatarChanged('Conditional write conflict')
      writes.push(key); objects.set(key, body)
    },
    async currentUrl() { return currentUrl },
    async publish(_id, expected, next) { if (expected !== currentUrl) return false; currentUrl = next; publications.push(next); return true },
  }
  return { io, original, objects, writes, publications, changeUrl: (url: string) => { currentUrl = url } }
}

test('replaces existing small and creates missing medium; verifies both before publication; never writes original', async () => {
  const f = await fixture()
  const result = await refreshVariants(target, f.io, 'execute')
  assert.equal(result.status, 'updated')
  assert.equal(result.missingSmall, false)
  assert.equal(result.missingMedium, true)
  assert.deepEqual(f.writes, ['celebs/person/avatar-sm.webp', 'celebs/person/avatar-md.webp'])
  assert.ok(f.objects.get(originalKey)!.equals(f.original))
  assert.equal(f.publications.length, 1)
  const updated = { ...target, avatar_url: f.publications[0] }
  assert.equal((await refreshVariants(updated, f.io, 'verify')).status, 'verified')
  assert.equal(f.publications.length, 1)
})

test('dry-run reads and validates without writing or publishing', async () => {
  const f = await fixture()
  assert.equal((await refreshVariants(target, f.io, 'plan')).status, 'planned')
  assert.deepEqual(f.writes, [])
  assert.deepEqual(f.publications, [])
})

test('failed second upload does not publish', async () => {
  const f = await fixture(), put = f.io.put
  f.io.put = async (...args) => { if (args[0].endsWith('avatar-md.webp')) throw new Error('Upload failed'); await put(...args) }
  await assert.rejects(refreshVariants(target, f.io, 'execute'), /Upload failed/)
  assert.deepEqual(f.publications, [])
})

test('bad stored bytes do not publish', async () => {
  const f = await fixture(), put = f.io.put
  f.io.put = async (...args) => { await put(...args); f.objects.set(args[0], Buffer.from('corrupt')) }
  await assert.rejects(refreshVariants(target, f.io, 'execute'), /checksum mismatch/)
  assert.deepEqual(f.publications, [])
})

test('original replacement stops the second upload and publication', async () => {
  const f = await fixture(), put = f.io.put
  f.io.put = async (...args) => { await put(...args); f.objects.set(originalKey, Buffer.from('concurrent-original')) }
  await assert.rejects(refreshVariants(target, f.io, 'execute'), AvatarChanged)
  assert.deepEqual(f.writes, ['celebs/person/avatar-sm.webp'])
  assert.deepEqual(f.publications, [])
})

test('DB compare-and-set conflict does not overwrite another session URL', async () => {
  const f = await fixture()
  f.io.publish = async () => { f.changeUrl('https://assets.feelandnote.com/celebs/person/avatar.webp?v=other'); return false }
  await assert.rejects(refreshVariants(target, f.io, 'execute'), AvatarChanged)
  assert.deepEqual(f.publications, [])
})

test('changed derivative is protected by its previous ETag', async () => {
  const f = await fixture(), put = f.io.put
  f.io.put = async (...args) => { f.objects.set(args[0], Buffer.from('other-session')); await put(...args) }
  await assert.rejects(refreshVariants(target, f.io, 'execute'), AvatarChanged)
  assert.deepEqual(f.writes, [])
  assert.deepEqual(f.publications, [])
})
