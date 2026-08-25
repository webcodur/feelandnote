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

function scriptWithUnifiedSceneCuts(): FactionScript {
  return {
    title: '통합 장면 컷 이미지 테스트',
    groups: [{
      name: '키르케의 섬',
      image: 'groups/circe-island.png',
      people: [{
        name: '오디세우스',
        image: 'people/odysseus.png',
      }],
      clusters: [{
        label: '키르케를 만나다',
        people: [],
        beats: [
          {
            text: '',
            minimumSec: 4.5,
            media: 'scenes/circe-arrival.png',
          },
          {
            text: '먹고 마셔요.',
            speakerCelebId: 'circe-id',
            media: 'dialogue/circe-1.png',
            mediaChanges: [
              { chunk: 1, media: 'dialogue/circe-2.png' },
            ],
          },
        ],
      }],
    }],
  }
}

test('통합 장면의 화면 컷과 컷 안 전환 이미지도 쓰는 중으로 수집한다', () => {
  const used = collectUsedImages(scriptWithUnifiedSceneCuts())

  assert.deepEqual([...used].sort(), [
    'dialogue/circe-1.png',
    'dialogue/circe-2.png',
    'groups/circe-island.png',
    'people/odysseus.png',
    'scenes/circe-arrival.png',
  ])
})

test('통합 장면의 화면 컷과 컷 안 전환도 파일 이동 경로를 따라간다', () => {
  const next = remapFactionImages(
    scriptWithUnifiedSceneCuts(),
    'dialogue',
    'dialogue-used',
  )
  const beats = next.groups[0]?.clusters?.[0]?.beats

  assert.equal(beats?.[0]?.media, 'scenes/circe-arrival.png')
  assert.equal(beats?.[1]?.media, 'dialogue-used/circe-1.png')
  assert.equal(beats?.[1]?.mediaChanges?.[0]?.media, 'dialogue-used/circe-2.png')
})

test('세력 대표화면과 세력 직속 인물 이미지도 파일 이동 경로를 따라간다', () => {
  const groupMoved = remapFactionImages(
    scriptWithUnifiedSceneCuts(),
    'groups',
    'groups-used',
  )
  const personMoved = remapFactionImages(
    groupMoved,
    'people',
    'people-used',
  )

  assert.equal(personMoved.groups[0]?.image, 'groups-used/circe-island.png')
  assert.equal(personMoved.groups[0]?.people[0]?.image, 'people-used/odysseus.png')
})
