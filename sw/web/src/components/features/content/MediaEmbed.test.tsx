import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const cssLoader = require.extensions['.css']
require.extensions['.css'] = module => { module.exports = {} }
const MediaEmbed = require('./MediaEmbed').default as typeof import('./MediaEmbed').default
if (cssLoader) require.extensions['.css'] = cssLoader
else delete require.extensions['.css']

test('BOOK detail does not render a permanent media loading placeholder', () => {
  const html = renderToStaticMarkup(
    createElement(MediaEmbed, { contentId: 'book-content-id', type: 'BOOK' })
  )

  assert.equal(html, '')
})

test('video loading reserves both the gallery and trailer instead of a single player', () => {
  const html = renderToStaticMarkup(
    createElement(MediaEmbed, { contentId: 'video-content-id', type: 'VIDEO', showImages: true })
  )
  assert.match(html, /data-media-gallery-placeholder/)
  assert.equal((html.match(/aspect-video/g) ?? []).length, 6)
})
