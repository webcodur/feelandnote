import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ClusterCard } from '../src/compositions/Faction/sections/GroupCard'

globalThis.React = React

test('장면명은 장면별 위치값에 따라 대사와 같은 하단 슬롯을 쓴다', () => {
  const markup = renderToStaticMarkup(
    <ClusterCard
      episodeName="Homer-Odyssey"
      group={{ name: '귀향길', color: '#22d3ee', people: [] }}
      cluster={{
        label: '저승을 빠져나오다',
        labelPosition: 'bottom',
        people: [],
      } as any}
      frame={30}
      cueStart={0}
      cueDuration={90}
      orientation="portrait"
      captionPosition="bottom"
    />,
  )

  assert.match(markup, /data-faction-card-caption-position="bottom"/)
  assert.match(markup, /bottom:200px/)
  assert.match(markup, /flex-direction:row/)
  assert.match(markup, /align-items:flex-end/)
})

test('장면별 위치값이 없으면 전달받은 에피소드 중단 위치를 쓴다', () => {
  const markup = renderToStaticMarkup(
    <ClusterCard
      episodeName="Homer-Odyssey"
      group={{ name: '귀향길', people: [] }}
      cluster={{ label: '키르케를 만나다', people: [] }}
      frame={30}
      cueStart={0}
      cueDuration={90}
      orientation="portrait"
      captionPosition="center"
    />,
  )

  assert.match(markup, /data-faction-card-caption-position="center"/)
  assert.match(markup, /translateY\(56px\)/)
})
