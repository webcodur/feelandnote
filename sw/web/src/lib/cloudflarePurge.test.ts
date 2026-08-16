import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tagToUrls, tagsToUrls } from './cloudflarePurge'

test('slug 태그는 인물 상세 두 언어와 SEO 이미지로', () => {
  assert.deepEqual(tagToUrls('celebs:elon-musk'), ['/celeb/elon-musk', '/en/celeb/elon-musk', '/seo-image/celeb/elon-musk'])
})
test('uuid 태그는 URL이 없다', () => {
  assert.deepEqual(tagToUrls('celebs:c8ac8c9d-c229-4570-ad5f-0b68a59153c0'), [])
})
test('도메인 태그 celebs는 목록 화면만', () => {
  assert.equal(tagToUrls('celebs').length, 4)
  assert.deepEqual(tagToUrls('dialogues'), [])
})
test('작품 태그는 uuid·external_id 그대로 URL', () => {
  assert.deepEqual(tagToUrls('contents:abc123'), ['/content/abc123', '/en/content/abc123', '/seo-image/content/abc123'])
})
test('중복 URL은 하나로', () => {
  assert.equal(tagsToUrls(['celebs:x', 'celebs:x']).length, 3)
})
