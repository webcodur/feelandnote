import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FactionSequenceItem } from '@/lib/faction-types'
import { FactionSequenceEditor } from './FactionSequenceEditor'

test('세력 본문은 통합 장면과 쇼츠 편 경계만 sequence 순서대로 렌더한다', () => {
  const sequence: FactionSequenceItem[] = [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cut' },
    { kind: 'cluster', clusterIndex: 1 },
  ]
  const markup = renderToStaticMarkup(
    <FactionSequenceEditor
      sequence={sequence}
      renderCluster={clusterIndex => <span>{`장면 ${clusterIndex}`}</span>}
      renderCut={() => <span>쇼츠 편 경계</span>}
    />,
  )

  const labels = ['장면 0', '쇼츠 편 경계', '장면 1']
  const positions = labels.map(label => markup.indexOf(label))
  assert.ok(positions.every(position => position >= 0))
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
})
