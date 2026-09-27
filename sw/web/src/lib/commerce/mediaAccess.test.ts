import assert from 'node:assert/strict'
import test from 'node:test'
import { appleMusicLink, parseWatchProviders } from './mediaAccess'

test('Apple Music 곡 ID와 앨범 ID를 서로 바꾸지 않는다', () => {
  const track = 'https://music.apple.com/us/album/example/123?i=456'
  assert.ok(appleMusicLink(track, 'itunes-456'))
  assert.equal(appleMusicLink(track, 'itunes-123'), null)
  assert.ok(appleMusicLink('https://music.apple.com/us/album/example/123', 'itunes-123'))
  assert.equal(appleMusicLink('https://music.apple.com.evil.test/us/album/example/123', 'itunes-123'), null)
})

test('비제휴 Apple Music 링크는 곡 ID를 보존하고 외부 제휴 추적을 제거한다', () => {
  const link = appleMusicLink('https://music.apple.com/us/album/example/123?i=456&at=external&ct=campaign&uo=4', 'itunes-456')
  assert.equal(link, 'https://music.apple.com/us/album/example/123?i=456&app=music')
})
test('영상은 한국 제공처만 모으고 구독·대여·구매를 합치되 Watcha는 되살리지 않는다', () => {
  const result = parseWatchProviders({ results: { KR: { link: 'https://www.themoviedb.org/movie/157336-interstellar/watch?locale=KR',
    flatrate: [{ provider_id: 8, provider_name: 'Netflix' }, { provider_id: 97, provider_name: 'Watcha' }],
    rent: [{ provider_id: 2, provider_name: 'Apple TV' }], buy: [{ provider_id: 2, provider_name: 'Apple TV' }],
  }, US: { flatrate: [{ provider_id: 9, provider_name: 'US only' }] } } }, 'tmdb-movie-157336')
  assert.equal(result.providers?.length, 2)
  assert.deepEqual(result.providers?.find(value => value.id === 2)?.kinds, ['rent', 'buy'])
  assert.equal(parseWatchProviders({ results: { KR: { link: result.watchUrl } } }, 'tmdb-movie-123').watchUrl, undefined)
})
