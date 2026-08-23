import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FactionGroup } from '@/lib/faction-types'
import { FactionHeaderSequence } from './FactionHeaderSequence'

// shared/bo/icons는 현재 고전 JSX 런타임을 사용하므로 서버 렌더 테스트에서 전역을 명시한다.
globalThis.React = React

test('세력 헤더 그룹은 그룹 화보가 없으면 첫 유효한 개인 이미지를 보여준다', () => {
  const group = {
    name: '귀향길',
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    clusters: [{
      label: '개인 화보로 가는 그룹',
      image: '',
      people: [
        { name: '이미지 없음', image: '' },
        {
          name: '오디세우스',
          image: '02-homeward/odysseus.png',
          imageCrop: { x: 25, y: 30, scale: 1.2 },
        },
      ],
    }],
  } as FactionGroup

  const markup = renderToStaticMarkup(
    <FactionHeaderSequence
      group={group}
      groupIndex={1}
      series="faction"
      episodeName="Homer-Odyssey"
      borderColor="#2c5f6f"
      onChange={() => {}}
      onJumpCluster={() => {}}
      onJumpNarrativeEntry={() => {}}
    />,
  )

  assert.match(markup, /02-homeward\/odysseus\.png/)
  assert.match(markup, />2-1</)
  assert.doesNotMatch(markup, /· 그룹/)
  assert.match(markup, /object-position:25% 30%/)
  assert.match(markup, /transform:scale\(1\.2\)/)
  assert.doesNotMatch(markup, /화보 없음/)
  assert.doesNotMatch(markup, />이야기 순서</)
})

test('세력 헤더는 쇼츠 편 경계를 이야기 순서 사이에 표시한다', () => {
  const group = {
    name: '귀향자들',
    people: [],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'cut' },
      { kind: 'cluster', clusterIndex: 1 },
    ],
    clusters: [
      { label: '앞편', image: '', people: [] },
      { label: '뒷편', image: '', people: [] },
    ],
  } as FactionGroup

  const markup = renderToStaticMarkup(
    <FactionHeaderSequence
      group={group}
      groupIndex={1}
      series="faction"
      episodeName="Homer-Odyssey"
      borderColor="#2c5f6f"
      onChange={() => {}}
      onJumpCluster={() => {}}
      onJumpNarrativeEntry={() => {}}
    />,
  )

  assert.match(markup, /쇼츠 편 경계/)
  const labels = ['앞편', '쇼츠 편 경계', '뒷편']
  const positions = labels.map(label => markup.indexOf(label))
  assert.ok(positions.every(position => position >= 0))
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
})
