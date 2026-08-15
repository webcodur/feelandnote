import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionScript } from '@/lib/faction-types'
import { collectUsedImages, remapFactionImages } from './usedImages'

function scriptWithLvHero(): FactionScript {
  return {
    title: '롱폼 핵심 이미지 테스트',
    heroesByLvPart: {
      1: ['odysseus', 'logo:longform/part-1.png'],
      2: ['logo:longform/part-2.png'],
    },
    groups: [],
  }
}

test('롱폼 편별 핵심 이미지도 사용 중 이미지로 수집한다', () => {
  const used = collectUsedImages(scriptWithLvHero())

  assert.deepEqual([...used].sort(), [
    'longform/part-1.png',
    'longform/part-2.png',
  ])
})

test('롱폼 편별 핵심 이미지도 파일 이동 경로를 따라간다', () => {
  const next = remapFactionImages(
    scriptWithLvHero(),
    'longform',
    'longform-renamed',
  )

  assert.deepEqual(next.heroesByLvPart, {
    1: ['odysseus', 'logo:longform-renamed/part-1.png'],
    2: ['logo:longform-renamed/part-2.png'],
  })
})
