import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { load } from 'cheerio'
import ContentReadingBody from './ContentReadingBody'
import { resolveAppreciationText, resolveContentIntroduction } from './contentReadingData'

test('an introduction keeps its text paired with its own source in every reading view', () => {
  const brief = {
    description: 'First &amp; second.\r\n\r\nParagraph.',
    introductionAttribution: { url: 'https://publisher.test/book' },
    introSources: [{ provider: 'wikipedia', text: 'Different description', url: 'https://wikipedia.test/article' }],
  }
  assert.deepEqual(resolveContentIntroduction(brief, 'wikipedia'), {
    text: 'First & second.\n\nParagraph.', sourceUrl: 'https://publisher.test/book',
  })
  assert.deepEqual(resolveContentIntroduction({ ...brief, description: null }), {
    text: 'Different description', sourceUrl: 'https://wikipedia.test/article',
  })
  assert.equal(resolveContentIntroduction({ description: 'Text without a source' }).sourceUrl, null)
})

test('introduction and appreciation labels use the same source navigation and preserve body emphasis', () => {
  for (const kind of ['intro', 'review'] as const) {
    const $ = load(renderToStaticMarkup(<ContentReadingBody kind={kind} label={kind === 'intro' ? '작품 소개' : '감상 배경'}
      text={'첫 문단의 《작품》.\n\n두 번째 문단.'} sourceUrl="https://source.test/evidence" />))
    const link = $(`[data-content-reading-label="${kind}"] a`)
    assert.equal(link.attr('href'), 'https://source.test/evidence')
    assert.equal(link.attr('target'), '_blank')
    assert.match(link.attr('class') ?? '', /underline/)
    assert.ok($('[data-content-reading-body]').text().endsWith('두 번째 문단.'))
    assert.equal($('a').length, 1)
    const plain = load(renderToStaticMarkup(<ContentReadingBody kind={kind} label="Label" text="Text" sourceUrl="javascript:alert(1)" />))
    assert.equal(plain('a').length, 0)
    assert.equal(plain('[data-content-reading-label]').text(), 'Label: ')
  }
})

test('all reading views select the same review language and identify fallback text', () => {
  assert.deepEqual(resolveAppreciationText('en', '한국어 원문', 'English review'), { text: 'English review', originalLanguage: false })
  assert.deepEqual(resolveAppreciationText('en', '한국어 원문', '  '), { text: '한국어 원문', originalLanguage: true })
  assert.deepEqual(resolveAppreciationText('ko', '한국어 원문', 'English review'), { text: '한국어 원문', originalLanguage: false })
})
