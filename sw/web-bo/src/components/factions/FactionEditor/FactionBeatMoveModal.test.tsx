import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FactionBeatMoveModal } from './FactionBeatMoveModal'

globalThis.React = React

test('현재 장면을 제외하고 실제 이야기 순서의 다른 장면을 목적지로 보여준다', () => {
  const markup = renderToStaticMarkup(
    <FactionBeatMoveModal
      groups={[
        {
          name: '표류',
          people: [],
          clusters: [
            { label: '키르케를 만나다', people: [], beats: [{ text: '현재 컷' }] },
            { label: '저승을 방문하다', people: [], beats: [] },
          ],
          sequence: [
            { kind: 'cluster', clusterIndex: 1 },
            { kind: 'cluster', clusterIndex: 0 },
          ],
        },
        {
          name: '귀환',
          people: [],
          clusters: [{ label: '', people: [], beats: [] }],
        },
      ]}
      fromGroupIndex={0}
      fromClusterIndex={0}
      onClose={() => {}}
      onConfirm={() => {}}
    />,
  )

  assert.match(markup, /컷을 다른 장면으로 이동/)
  assert.match(markup, /1-1 · 표류 \/ 저승을 방문하다/)
  assert.match(markup, /2-1 · 귀환 \/ 제목 없음/)
  assert.doesNotMatch(markup, /키르케를 만나다/)
  assert.match(markup, /화자·이미지·음성·효과음 설정은 함께 이동/)
})
