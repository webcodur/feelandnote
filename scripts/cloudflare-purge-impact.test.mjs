import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shouldPurgeCloudflare } from './lib/cloudflare-purge-impact.mjs'

test('탐색 허브만 바뀐 배포는 퍼지하지 않는다', () => {
  assert.equal(shouldPurgeCloudflare(['sw/web/src/app/[locale]/(main)/explore/page.tsx', 'docs/x.md']), false)
})
test('인물 상세·공통 레이아웃·번역이 바뀌면 퍼지한다', () => {
  assert.equal(shouldPurgeCloudflare(['sw/web/src/app/[locale]/(main)/celeb/[slug]/page.tsx']), true)
  assert.equal(shouldPurgeCloudflare(['sw/web/src/components/layout/header/Header.tsx']), true)
  assert.equal(shouldPurgeCloudflare(['sw/web/messages/ko/core.json']), true)
})
test('백오피스·문서·데이터만 바뀌면 퍼지하지 않는다', () => {
  assert.equal(shouldPurgeCloudflare(['sw/web-bo/src/x.ts', 'data/celeb/a.json', '.github/workflows/y.yml']), false)
})
