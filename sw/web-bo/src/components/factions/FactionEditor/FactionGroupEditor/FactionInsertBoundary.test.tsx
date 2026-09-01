import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FactionInsertBoundary } from './FactionInsertBoundary'

globalThis.React = React

test('장면과 컷 사이에 컷·장면 추가 버튼을 함께 표시한다', () => {
  const markup = renderToStaticMarkup(
    <FactionInsertBoundary
      label="2번 컷 뒤 경계"
      onAddCut={() => {}}
      onAddScene={() => {}}
    />,
  )

  assert.match(markup, /data-faction-insert-boundary="true"/)
  assert.match(markup, /aria-label="2번 컷 뒤 경계"/)
  assert.match(markup, /컷 추가<\/button>/)
  assert.match(markup, /장면 추가<\/button>/)
  assert.match(markup, /aria-hidden="true">\|</)
})
