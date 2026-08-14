import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MediaEmbed from './MediaEmbed'

test('BOOK detail does not render a permanent media loading placeholder', () => {
  const html = renderToStaticMarkup(
    createElement(MediaEmbed, { contentId: 'book-content-id', type: 'BOOK' })
  )

  assert.equal(html, '')
})
