import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FactionSequenceItem } from '@/lib/faction-types'
import { FactionSequenceEditor } from './FactionSequenceEditor'

test('세력 본문은 그룹과 개별 장면을 sequence 순서 그대로 교차 렌더한다', () => {
  const sequence: FactionSequenceItem[] = [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'scene', id: 'scene-a', scene: { title: '장면 A' } },
    { kind: 'cut' },
    { kind: 'scene', id: 'scene-b', scene: { title: '장면 B' } },
    { kind: 'cluster', clusterIndex: 1 },
  ]
  const markup = renderToStaticMarkup(
    <FactionSequenceEditor
      sequence={sequence}
      renderCluster={clusterIndex => <span>{`그룹 ${clusterIndex}`}</span>}
      renderScene={item => <span>{item.scene.title}</span>}
      renderCut={() => <span>쇼츠 편 경계</span>}
    />,
  )

  const labels = ['그룹 0', '장면 A', '쇼츠 편 경계', '장면 B', '그룹 1']
  const positions = labels.map(label => markup.indexOf(label))
  assert.ok(positions.every(position => position >= 0))
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
})
