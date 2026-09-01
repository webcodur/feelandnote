import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FactionSequenceItem } from '@/lib/faction-types'
import { FactionSequenceEditor } from './FactionSequenceEditor'

globalThis.React = React

test('세력 본문은 장면을 이야기 순서대로 놓고 장면 사이마다 편 경계 토글을 둔다', () => {
  const sequence: FactionSequenceItem[] = [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cut' },
    { kind: 'cluster', clusterIndex: 1 },
    { kind: 'cluster', clusterIndex: 2 },
  ]
  const markup = renderToStaticMarkup(
    <FactionSequenceEditor
      sequence={sequence}
      renderCluster={clusterIndex => <span>{`장면 ${clusterIndex}`}</span>}
      onToggleCut={() => {}}
    />,
  )

  // 장면 순서 그대로, 1번 뒤는 켜진 경계, 2번 뒤는 꺼진 경계, 마지막 뒤에는 토글이 없다(세력 사이 토글이 맡는다).
  const labels = ['장면 0', 'data-faction-shorts-cut="on"', '장면 1', 'data-faction-shorts-cut="off"', '장면 2']
  const positions = labels.map(label => markup.indexOf(label))
  assert.ok(positions.every(position => position >= 0), markup)
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
  assert.equal((markup.match(/data-faction-shorts-cut=/g) ?? []).length, 2)
  assert.match(markup, /1번 장면 뒤 편 경계/)
  assert.doesNotMatch(markup, /3번 장면 뒤 편 경계/)
})

test('토글 콜백이 없으면 경계를 그리지 않는다', () => {
  const markup = renderToStaticMarkup(
    <FactionSequenceEditor
      sequence={[{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cluster', clusterIndex: 1 }]}
      renderCluster={clusterIndex => <span>{`장면 ${clusterIndex}`}</span>}
    />,
  )
  assert.doesNotMatch(markup, /data-faction-shorts-cut/)
})
