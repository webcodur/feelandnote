import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FactionGroup } from '@/lib/faction-types'
import { FactionGroupHeader } from './FactionGroupHeader'

// shared/bo/icons는 현재 고전 JSX 런타임을 사용하므로 서버 렌더 테스트에서 전역을 명시한다.
globalThis.React = React

const group = {
  name: '출항\n귀향을 향한 첫걸음',
  logoImg: 'logos/homeward.png',
  people: [],
  sequence: [{ kind: 'cluster', clusterIndex: 0 }],
  clusters: [{ label: '귀향길에 오르다', image: '01-departure.webp', people: [] }],
} as FactionGroup

test('세력 제목과 로고는 한 정보 패널에 묶고 번호만 아코디언 손잡이로 쓴다', () => {
  const markup = renderToStaticMarkup(
    <FactionGroupHeader
      group={group}
      groupIndex={0}
      series="faction"
      episodeName="Homer-Odyssey"
      editLang="ko"
      expanded={false}
      onExpandedChange={() => {}}
      onChange={() => {}}
      onDelete={() => {}}
      onMoveUp={() => {}}
      onMoveDown={() => {}}
      onJumpCluster={() => {}}
    />,
  )

  assert.match(markup, /data-faction-group-identity="true"/)
  assert.match(markup, /aria-label="세력 로고"/)
  assert.match(markup, /data-faction-group-title="true"/)
  assert.ok(markup.indexOf('aria-label="세력 로고"') < markup.indexOf('data-faction-group-title="true"'))
  assert.match(markup, /출항/)
  assert.match(markup, /data-faction-group-accordion="true"/)
  assert.match(markup, /aria-label="1번 세력 펼치기"/)
  assert.match(markup, /aria-expanded="false"/)
  assert.equal(markup.match(/aria-expanded=/g)?.length, 1)
})
