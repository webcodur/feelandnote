import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTrackById, searchMusicAlbums } from './itunes-music'

test('album search excludes a same-named song and retains the collection identifier', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = new URL(String(input))
    assert.equal(url.searchParams.get('entity'), 'album')
    return Response.json({ results: [
      { wrapperType: 'track', trackId: 11, collectionId: 10, trackName: 'Example', artistName: 'Artist' },
      { wrapperType: 'collection', collectionId: 10, collectionName: 'Example', artistName: 'Artist', trackCount: 12 },
    ] })
  })
  const albums = await searchMusicAlbums('Example Artist')
  assert.equal(albums.length, 1)
  assert.equal(albums[0].externalId, 'itunes-10')
  assert.equal(albums[0].totalTracks, 12)
})

test('album lookup takes a preview only from a track belonging to that album', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ results: [
    { wrapperType: 'collection', collectionId: 10, collectionName: 'Example', artistName: 'Artist' },
    { wrapperType: 'track', collectionId: 99, trackId: 100, artistName: 'Other', previewUrl: 'https://example.com/wrong.m4a' },
    { wrapperType: 'track', collectionId: 10, trackId: 11, artistName: 'Artist', previewUrl: 'https://example.com/right.m4a' },
  ] }))
  const album = await getTrackById('itunes-10')
  assert.equal(album?.metadata.albumType, 'album')
  assert.equal(album?.metadata.previewUrl, 'https://example.com/right.m4a')
  assert.equal(album?.externalId, 'itunes-10')
})

test('an album without a playable preview is not registrable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ results: [
    { wrapperType: 'collection', collectionId: 10, collectionName: 'Example', artistName: 'Artist' },
    { wrapperType: 'track', collectionId: 10, trackId: 11, artistName: 'Artist' },
  ] }))
  assert.equal(await getTrackById('itunes-10'), null)
})

test('rate limiting is reported instead of appearing as an empty album search', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 429 }))
  await assert.rejects(searchMusicAlbums('Example'), /429/)
})

test('a regional album can be verified in its source storefront', async (t) => {
  const countries: string[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    countries.push(new URL(String(input)).searchParams.get('country')!)
    return Response.json({ results: [
      { wrapperType: 'collection', collectionId: 10, collectionName: 'Example', artistName: 'Artist' },
      { wrapperType: 'track', collectionId: 10, trackId: 11, artistName: 'Artist', previewUrl: 'https://example.com/preview.m4a' },
    ] })
  })
  assert.equal((await getTrackById('itunes-10', 'gb'))?.metadata.albumType, 'album')
  assert.deepEqual(countries, ['GB'])
})
