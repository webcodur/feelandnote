import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FactionScript } from '@/lib/faction-types'
import { FactionShortsPartHeader } from './FactionShortsPartHeader'

(globalThis as typeof globalThis & { React: typeof React }).React = React

test('같은 세력의 여러 컷은 편성 헤더에서 세력 하나로 요약한다', () => {
  const markup = renderToStaticMarkup(
    <FactionShortsPartHeader
      part={1}
      label="1편"
      collapsed={false}
      groups={[
        { index: 1, name: '키르케', color: '#0891b2', textColor: '#ffffff' },
        { index: 1, name: '키르케', color: '#0891b2', textColor: '#ffffff' },
      ]}
      peopleCount={1}
      durationSec={12}
      script={{ groups: [] } as unknown as FactionScript}
      update={() => undefined}
      editLang="ko"
      series="Homer-Odyssey"
      episodeName="ko"
      onToggle={() => undefined}
      onGroupClick={() => undefined}
    />,
  )

  assert.match(markup, /세력 1/)
  assert.equal(markup.match(/>키르케<\/button>/g)?.length, 1)
})
