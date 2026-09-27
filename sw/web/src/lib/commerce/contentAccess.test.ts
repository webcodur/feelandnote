import assert from 'node:assert/strict'
import test from 'node:test'
import { ACCESS_SOURCES, accessSources, steamAccessAppId, withAccessFallback, type ContentAccess } from './contentAccess'
import { applyAccessEvent } from './accessStream'

test('external Steam identities reject ambiguous or malformed IDs', () => {
  assert.equal(steamAccessAppId('steam-570'), 570)
  for (const id of ['steam-0', 'steam-0570', 'steam-1e3', 'steam--1', 'steam-9007199254740992', 'game-chart-570', 'steam-570?x=1']) {
    assert.equal(steamAccessAppId(id), null)
  }
})

test('Apple chart IDs use only their verified service, while Steam can resolve other platforms', () => {
  const music: ContentAccess = { links: [{ service: 'appleMusic', url: 'https://music.apple.com/us/song/example/123', title: '', platforms: [] }] }
  const movie: ContentAccess = { links: [{ service: 'appleTv', url: 'https://itunes.apple.com/kr/movie/example/id123', title: '', platforms: [] }] }
  assert.deepEqual(accessSources('MUSIC', music), ['appleMusic'])
  assert.deepEqual(accessSources('VIDEO', movie), ['appleTv'])
  assert.deepEqual(accessSources('VIDEO'), ['watchProviders'])
  assert.deepEqual(accessSources('GAME', { links: [] }), ACCESS_SOURCES.GAME)
})

test('a verified chart link survives an empty lookup, stream failure, and late progress without hiding fresh offers', () => {
  const seed: ContentAccess = { links: [{ service: 'steam', url: 'https://store.steampowered.com/app/570/', title: '', platforms: ['PC'] }] }
  assert.deepEqual(withAccessFallback({ links: [] }, 'steam', seed).links, seed.links)
  assert.deepEqual(withAccessFallback({ links: [] }, 'xbox', seed).links, [])
  const fresh: ContentAccess = { links: [{ ...seed.links[0], price: 10000 }] }
  assert.equal(withAccessFallback(fresh, 'steam', seed), fresh)
  const ready = { status: 'ready' as const, phase: 'identity' as const, data: seed }
  assert.equal(applyAccessEvent(ready, { kind: 'error', source: 'steam' }), ready)
  assert.equal(applyAccessEvent(ready, { kind: 'progress', source: 'steam', phase: 'reference' }), ready)
})
