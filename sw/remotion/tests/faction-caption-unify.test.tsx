import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ClusterCard } from '../src/compositions/Faction/sections/GroupCard'
import { CaptionSlotBox, resolveFactionCaptionAppearance } from '../src/compositions/Faction/sections/CaptionSwapSlot'
import { CAPTION_SHADOW_PAINT, captionShadowTextStyle } from '../src/components/caption/ShortCaption'

globalThis.React = React

/**
 * 한 화면 안에서 자막·인물명·장면 라벨이 같은 기준선과 같은 글자 표면을 쓰는지 지킨다.
 *
 * 예전에는 장면 라벨만 `AbsoluteFill`(height:100% 포함) 위에 그려져 `bottom` 이 통째로 무시됐고,
 * 화자 없는 해설만 자기만의 얇은 외곽선을 썼다. 그래서 같은 화면에서 라벨은 200px 아래로
 * 내려앉고 해설 자막은 인물 대사와 다른 무게로 보였다.
 */

test('장면 라벨 상자와 자막 상자는 같은 하단 슬롯 값을 그대로 쓴다', () => {
  const slotStyle = resolveFactionCaptionAppearance('portrait', { position: 'bottom' }).slotStyle

  const captionMarkup = renderToStaticMarkup(
    <CaptionSlotBox slotStyle={slotStyle}>자막</CaptionSlotBox>,
  )
  const labelMarkup = renderToStaticMarkup(
    <ClusterCard
      episodeName="Homer-Odyssey"
      group={{ name: '귀향길', people: [] } as never}
      cluster={{ label: '저승을 빠져나오다', people: [] } as never}
      frame={30}
      cueStart={0}
      cueDuration={90}
      orientation="portrait"
      captionPosition="bottom"
    />,
  )

  const bottomOf = (markup: string, marker: RegExp) =>
    markup.match(marker)?.[1]?.match(/bottom:(-?[\d.]+px)/)?.[1]

  const captionBottom = bottomOf(captionMarkup, /<div style="([^"]*)"/)
  const labelBottom = bottomOf(labelMarkup, /data-faction-card-caption-position="bottom" style="([^"]*)"/)

  assert.equal(captionBottom, '200px')
  assert.equal(labelBottom, captionBottom)
})

test('슬롯 상자는 높이를 내용에 맡겨 bottom 이 죽지 않는다', () => {
  const slotStyle = resolveFactionCaptionAppearance('portrait', { position: 'bottom' }).slotStyle
  const markup = renderToStaticMarkup(<CaptionSlotBox slotStyle={slotStyle}>자막</CaptionSlotBox>)
  const style = markup.match(/<div style="([^"]*)"/)?.[1] ?? ''

  // top·height 가 bottom 과 함께 잡히면 CSS 가 bottom 을 버린다 — AbsoluteFill 을 쓰면 안 되는 이유.
  assert.ok(!/(^|;)top:/.test(style), `top 이 잡히면 안 된다: ${style}`)
  assert.ok(!/(^|;)height:/.test(style), `height 가 잡히면 안 된다: ${style}`)
  assert.ok(style.includes('bottom:200px'), style)
})

test('배경 없는 자막의 글자 표면은 한 규격을 공유한다', () => {
  assert.equal(
    captionShadowTextStyle.WebkitTextStroke,
    `${CAPTION_SHADOW_PAINT.strokeWidth}px ${CAPTION_SHADOW_PAINT.strokeColor}`,
  )
  assert.equal(captionShadowTextStyle.textShadow, CAPTION_SHADOW_PAINT.textShadow)
  // 화자 유무로 글자 무게가 갈리지 않게, 획은 인물 대사와 같은 굵기여야 한다.
  assert.equal(CAPTION_SHADOW_PAINT.strokeWidth, 2.4)
})
