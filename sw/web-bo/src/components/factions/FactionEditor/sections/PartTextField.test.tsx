import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PartTextField } from './PartTextField'

globalThis.React = React

test('편별 영문 시작문구는 대응하는 영문 레코드를 편집한다', () => {
  const markup = renderToStaticMarkup(
    <PartTextField
      part={2}
      label="시작문구"
      keys={{ common: 'logline', byPart: 'loglineByPart', en: 'loglineEn', byPartEn: 'loglineByPartEn' }}
      script={{ title: '제목', groups: [], loglineByPart: { 2: '한국어' }, loglineByPartEn: { 2: 'English opening' } }}
      update={() => {}}
      editLang="en"
    />,
  )

  assert.match(markup, /value="English opening"/)
  assert.doesNotMatch(markup, /value="한국어"/)
})

test('별도 영문 필드가 없는 편별 영상 명칭은 EN 화면에서도 언어 공통값을 숨기지 않는다', () => {
  const markup = renderToStaticMarkup(
    <PartTextField
      part={1}
      label="영상 명칭"
      keys={{ common: 'title', byPart: 'titleByLvPart' }}
      multiline
      script={{ title: '공통 제목', groups: [], titleByLvPart: { 1: '언어 공통 편 제목' } }}
      update={() => {}}
      editLang="en"
    />,
  )

  assert.match(markup, /언어 공통 편 제목/)
  assert.match(markup, /언어 공통 · 이 편 영상 명칭/)
})
