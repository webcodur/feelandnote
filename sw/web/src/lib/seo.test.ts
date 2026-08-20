import assert from 'node:assert/strict'
import test from 'node:test'
import { getSeoImageUrl } from './seo'

test('SEO 이미지 URL은 소스가 없어도 안정적인 버전 키를 갖는다', () => {
  const first = new URL(getSeoImageUrl('celeb', 'jensen-huang', 'ko'))
  const second = new URL(getSeoImageUrl('celeb', 'jensen-huang', 'ko'))

  assert.ok(first.searchParams.get('v'))
  assert.equal(first.searchParams.get('v'), second.searchParams.get('v'))
})

test('SEO 이미지 소스가 바뀌면 버전 키도 바뀌다', () => {
  const before = new URL(getSeoImageUrl('content', 'book-1', 'en', 'https://img.example/old.webp'))
  const after = new URL(getSeoImageUrl('content', 'book-1', 'en', 'https://img.example/new.webp'))

  assert.notEqual(before.searchParams.get('v'), after.searchParams.get('v'))
})
