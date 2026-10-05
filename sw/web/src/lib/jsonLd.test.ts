import assert from 'node:assert/strict'
import test from 'node:test'
import { load } from 'cheerio'
import { serializeJsonLd } from './jsonLd'

test('소개문의 태그·주석이 JSON-LD script를 끊지 않고 원문과 URL이 보존된다', () => {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: '책 & Book',
    description: '<!-- <script> --> </ScRiPt><script>alert(1)</script>',
    url: 'https://feelandnote.com/explore/works/curated?media=VIDEO&page=2',
  }
  const $ = load(`<script type="application/ld+json">${serializeJsonLd(data)}</script><p>본문</p>`)
  assert.equal($('script').length, 1)
  assert.deepEqual(JSON.parse($('script').text()), data)
  assert.equal($('p').text(), '본문')
})
