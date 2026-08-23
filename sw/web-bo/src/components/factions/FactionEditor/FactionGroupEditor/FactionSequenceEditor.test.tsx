import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FactionSequenceItem } from '@/lib/faction-types'
import { FactionSequenceEditor } from './FactionSequenceEditor'

test('세력 본문은 묶음과 공통 서사 항목을 sequence 순서 그대로 교차 렌더한다', () => {
  const sequence: FactionSequenceItem[] = [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'entry', clusterIndex: 0, entryIndex: 1 },
    { kind: 'cut' },
    { kind: 'entry', clusterIndex: 1, entryIndex: 2 },
    { kind: 'cluster', clusterIndex: 1 },
  ]
  const markup = renderToStaticMarkup(
    <FactionSequenceEditor
      sequence={sequence}
      renderCluster={clusterIndex => <span>{`그룹 ${clusterIndex}`}</span>}
      renderEntry={item => <span>{`항목 ${item.clusterIndex}-${item.entryIndex}`}</span>}
      renderCut={() => <span>쇼츠 편 경계</span>}
    />,
  )

  const labels = ['그룹 0', '항목 0-1', '쇼츠 편 경계', '항목 1-2', '그룹 1']
  const positions = labels.map(label => markup.indexOf(label))
  assert.ok(positions.every(position => position >= 0))
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
})
