import assert from 'node:assert/strict'
import test from 'node:test'

import { isAllowedSeoImageUrl } from './seoImageOrigin'

test('allows configured cover providers and Open Library archive redirects', () => {
  for (const value of [
    'https://covers.openlibrary.org/b/id/123-L.jpg',
    'https://archive.org/download/example/page/n0_w400.jpg',
    'https://ia801234.us.archive.org/view_archive.php?archive=/example.zip',
    'https://assets.example.r2.dev/cover.webp',
  ]) {
    assert.equal(isAllowedSeoImageUrl(new URL(value)), true, value)
  }
})

test('rejects insecure, local, and suffix-confusion URLs', () => {
  for (const value of [
    'http://archive.org/download/example.jpg',
    'https://archive.org.attacker.example/cover.jpg',
    'https://localhost/cover.jpg',
    'https://127.0.0.1/cover.jpg',
  ]) {
    assert.equal(isAllowedSeoImageUrl(new URL(value)), false, value)
  }
})
