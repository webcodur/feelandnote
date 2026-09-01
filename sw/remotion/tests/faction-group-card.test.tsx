import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ClusterCard, GroupCard } from '../src/compositions/Faction/sections/GroupCard'

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
  assert.match(markup, /align-items:flex-end/)
  // 라벨 상자는 높이를 내용에 맡겨야 bottom 이 살아 있다. top·height 를 함께 잡으면
  // CSS 가 bottom 을 버려 라벨만 화면 맨 아래로 내려앉는다(인물명·대사와 기준선이 어긋난다).
  const slot = markup.match(/data-faction-card-caption-position="bottom" style="([^"]*)"/)?.[1] ?? ''
  assert.ok(slot.includes('bottom:200px'), `라벨 상자가 하단 슬롯 값을 직접 가져야 한다: ${slot}`)
  assert.ok(!/(^|;)top:/.test(slot), `라벨 상자에 top 이 잡히면 안 된다: ${slot}`)
  assert.ok(!/(^|;)height:/.test(slot), `라벨 상자에 height 가 잡히면 안 된다: ${slot}`)
})

test('장면별 위치값이 없으면 전달받은 에피소드 중하단 위치를 쓴다', () => {
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

test('세력명 카드도 대사 자막의 하단 슬롯을 공유한다', () => {
  const markup = renderToStaticMarkup(
    <GroupCard
      episodeName="Homer-Odyssey"
      group={{ name: '항해자', logoImg: 'logo.png', people: [], clusters: [] }}
      frame={30}
      cueStart={0}
      cueDuration={90}
      orientation="portrait"
      captionPosition="bottom"
    />,
  )

  assert.match(markup, /data-faction-card-caption-position="bottom"/)
  assert.match(markup, /bottom:200px/)
})
