import assert from 'node:assert/strict'
import test from 'node:test'

import { isAllowedSeoImageUrl, normalizeSeoImageUrl } from './seoImageOrigin'

test('allows configured cover providers and Open Library archive redirects', () => {
  for (const value of [
    'https://covers.openlibrary.org/b/id/123-L.jpg',
    'https://archive.org/download/example/page/n0_w400.jpg',
    'https://ia801234.us.archive.org/view_archive.php?archive=/example.zip',
    'https://assets.example.r2.dev/cover.webp',
    'https://assets.feelandnote.com/celebs/example/avatar.webp',
  ]) {
    assert.equal(isAllowedSeoImageUrl(new URL(value)), true, value)
  }
})

test('rejects insecure, local, and suffix-confusion URLs', () => {
  for (const value of [
    'http://archive.org/download/example.jpg',
    'https://archive.org.attacker.example/cover.jpg',
    'https://legacy-storage.example/avatar.webp',
    'https://localhost/cover.jpg',
    'https://127.0.0.1/cover.jpg',
    'https://user:password@t1.daumcdn.net/cover.jpg',
    'https://t1.daumcdn.net:8080/cover.jpg',
  ]) {
    assert.equal(isAllowedSeoImageUrl(new URL(value)), false, value)
  }
})

test('legacy HTTP covers upgrade to HTTPS only for allowed providers', () => {
  for (const host of ['t1.daumcdn.net', 'books.google.com']) {
    const normalized = normalizeSeoImageUrl(new URL(`http://${host}/cover.jpg`))
    assert.equal(normalized.href, `https://${host}/cover.jpg`)
    assert.equal(isAllowedSeoImageUrl(normalized), true)
  }
  for (const source of [
    'http://127.0.0.1/cover.jpg',
    'http://t1.daumcdn.net.attacker.example/cover.jpg',
    'http://user:password@t1.daumcdn.net/cover.jpg',
    'http://t1.daumcdn.net:8080/cover.jpg',
  ]) {
    assert.equal(normalizeSeoImageUrl(new URL(source)).href, source)
    assert.equal(isAllowedSeoImageUrl(normalizeSeoImageUrl(new URL(source))), false)
  }
})

test('Kakao originals must still pass the origin policy after conversion', () => {
  const wrap = (source: string) => new URL('https://search1.kakaocdn.net/thumb/?fname=' + encodeURIComponent(source))
  assert.equal(normalizeSeoImageUrl(wrap('http://t1.daumcdn.net/book.jpg')).href, 'https://t1.daumcdn.net/book.jpg')
  for (const source of ['http://127.0.0.1/private', 'https://user:password@t1.daumcdn.net/book.jpg', 'not a URL']) {
    const wrapper = wrap(source)
    assert.equal(normalizeSeoImageUrl(wrapper).href, wrapper.href)
    assert.equal(isAllowedSeoImageUrl(normalizeSeoImageUrl(wrapper)), false)
  }
  const unrelated = new URL('https://attacker.example/?fname=https://t1.daumcdn.net/book.jpg')
  assert.equal(normalizeSeoImageUrl(unrelated).href, unrelated.href)
})
