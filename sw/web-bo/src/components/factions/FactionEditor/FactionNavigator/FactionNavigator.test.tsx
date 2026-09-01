import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FactionGroup } from '@/lib/faction-types'
import { FactionNavigator } from './FactionNavigator'

globalThis.React = React

test('목차의 빈 장면명은 첫 인물 이름 대신 제목 없음으로 표시한다', () => {
  const groups = [{
    name: '표류',
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    clusters: [{
      label: '',
      people: [{ name: '엘페노르' }],
      beats: [{ speaker: '엘페노르', text: '묻어 주십시오.' }],
    }],
  }] as FactionGroup[]

  const markup = renderToStaticMarkup(
    <FactionNavigator groups={groups} editLang="ko" onAddGroup={() => {}} />,
  )

  assert.match(markup, /title="1-1 제목 없음 \(대사 1컷 · 인물 1명\)"/)
  assert.doesNotMatch(markup, /title="1-1 엘페노르/)
})
