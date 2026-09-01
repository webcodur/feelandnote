import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FactionVoicePanel } from './FactionVoicePanel'

globalThis.React = React

/**
 * 대사 음성은 한 줄 헤더로 접혀 있고, 파형은 펼쳐야 나온다.
 * 예전에는 상속 상태만 담은 줄이 패널 위에 따로 있고 파형이 늘 펼쳐져 있어,
 * 대사 하나가 화면을 세 덩어리로 차지했다.
 */

const meta = { size: 120_000, duration: 6.9 }
const activeFile = { name: 'F02C02P01-quote.wav', sizeKB: 117, duration: 6.9, engine: 'gemini' as const }

function render(extra: Partial<React.ComponentProps<typeof FactionVoicePanel>> = {}) {
  return renderToStaticMarkup(
    <FactionVoicePanel
      person={{ name: '에우리마코스', quote: '협상이 거부되자' } as never}
      series="faction"
      episodeName="Homer-Odyssey"
      voiceFile="F02C02P01-quote.wav"
      hasContent
      meta={meta as never}
      activeFile={activeFile}
      onOpenModal={() => {}}
      lang="ko"
      {...extra}
    />,
  )
}

test('음원이 있어도 파형은 접힌 채로 시작한다', () => {
  const markup = render()

  assert.doesNotMatch(markup, /<canvas/, '접힌 상태에서는 파형을 그리지 않는다')
  assert.match(markup, /aria-expanded="false"/)
  assert.match(markup, /파형 펼치기/)
})

test('헤더 한 줄이 재생·상속 상태·상속 원본 진입을 함께 쥔다', () => {
  const markup = render({
    inheritanceNote: '인물 기본값에서 2개 덮어씀',
    headerAction: <button type="button">인물 기본 음성</button>,
  })

  assert.match(markup, /aria-label="대사 음성 재생"/)
  assert.match(markup, /인물 기본값에서 2개 덮어씀/)
  assert.match(markup, /인물 기본 음성/)
  assert.match(markup, /6\.9s/)
})

test('음원이 없으면 재생·펼침을 막는다', () => {
  const markup = render({ meta: undefined, activeFile: undefined })

  assert.match(markup, /aria-label="대사 음성 음원 없음"/)
  // 재생·펼침 두 버튼 모두 잠겨 있어야 헛클릭이 없다.
  assert.equal((markup.match(/disabled=""/g) ?? []).length, 2)
})
