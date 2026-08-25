import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FactionSequenceCard } from './FactionSequenceCard'

globalThis.React = React

test('모든 장면은 종류색 없이 같은 시퀀스 카드 골격과 세력-순서 번호를 쓴다', () => {
  const group = renderToStaticMarkup(
    <FactionSequenceCard id="group" numberLabel="2-1" title="귀향자">
      첫 본문
    </FactionSequenceCard>,
  )
  const scene = renderToStaticMarkup(
    <FactionSequenceCard id="scene" numberLabel="2-2" title="활의 시험">
      둘째 본문
    </FactionSequenceCard>,
  )

  assert.match(group, /data-faction-sequence-card="true"/)
  assert.match(scene, /data-faction-sequence-card="true"/)
  assert.match(group, /data-sequence-number="2-1"/)
  assert.match(scene, /data-sequence-number="2-2"/)
  assert.match(group, /rounded-lg border border-border bg-bg-card shadow-sm/)
  assert.match(scene, /rounded-lg border border-border bg-bg-card shadow-sm/)
  assert.match(group, /bg-bg-secondary/)
  assert.match(scene, /bg-bg-secondary/)
  assert.doesNotMatch(group, /bg-amber-400|bg-cyan-400/)
  assert.doesNotMatch(scene, /bg-amber-400|bg-cyan-400/)
  assert.doesNotMatch(group, />그룹</)
  assert.doesNotMatch(scene, />장면</)
})

test('시퀀스 카드는 내부 fixed 모듈의 뷰포트 기준 배치를 가두지 않는다', () => {
  const markup = renderToStaticMarkup(
    <FactionSequenceCard id="voice-host" numberLabel="2-1" title="오디세우스">
      <div className="fixed inset-0">대사 음성</div>
    </FactionSequenceCard>,
  )

  assert.doesNotMatch(markup, /overflow-hidden/)
  assert.doesNotMatch(markup, /content-visibility:auto/)
  assert.doesNotMatch(markup, /contain-intrinsic-size/)
})
