import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionGroup, FactionSceneBeat } from '@/lib/faction-types'
import { moveFactionSceneBeat } from './faction-scene-beat-move'

const movedBeat: FactionSceneBeat = {
  id: 'circe-warning',
  label: '경고를 듣다',
  speakerCelebId: 'circe-id',
  speaker: '키르케',
  text: '섬을 떠나면 저승으로 가세요.',
  media: 'circe-warning.webp',
  mediaChanges: [{ chunk: 1, media: 'underworld.webp', filter: 'cold' }],
  voiceDuration: 4.6,
  voicePlaybackRate: 1.1,
  legacyPersonVoice: true,
  shortsCutBefore: true,
}

const groups: FactionGroup[] = [
  {
    name: '표류',
    people: [],
    clusters: [{
      label: '키르케를 만나다',
      people: [{ name: '키르케', celebId: 'circe-id' }],
      beats: [{ text: '섬에 닿았다.' }, movedBeat],
    }],
  },
  {
    name: '귀환',
    people: [],
    clusters: [{
      label: '이타카로 향하다',
      people: [],
      beats: [{ text: '고향이 가까워졌다.' }],
    }],
  },
]

test('컷 한 개를 다른 세력의 기존 장면 끝으로 옮기며 모든 컷 설정을 보존한다', () => {
  const result = moveFactionSceneBeat({
    groups,
    fromGroupIndex: 0,
    fromClusterIndex: 0,
    fromBeatIndex: 1,
    toGroupIndex: 1,
    toClusterIndex: 0,
  })
  assert.ok(result)

  assert.deepEqual(result[0]?.clusters?.[0]?.beats, [{ text: '섬에 닿았다.' }])
  assert.deepEqual(result[1]?.clusters?.[0]?.beats?.[1], {
    ...movedBeat,
    voiceFile: 'F01C01P01-quote.wav',
  })
  assert.deepEqual(result[1]?.clusters?.[0]?.beats?.[1]?.mediaChanges, [
    { chunk: 1, media: 'underworld.webp', filter: 'cold' },
  ])
  assert.equal(result[1]?.clusters?.[0]?.beats?.[1]?.shortsCutBefore, true)
})

test('마지막 컷을 옮겨도 출발 장면 자체와 장면 설정은 남긴다', () => {
  const result = moveFactionSceneBeat({
    groups: [{
      name: '표류',
      people: [],
      clusters: [
        { label: '빈 장면이 될 곳', image: 'scene.webp', people: [], beats: [{ text: '유일한 컷' }] },
        { label: '받을 장면', people: [], beats: [] },
      ],
    }],
    fromGroupIndex: 0,
    fromClusterIndex: 0,
    fromBeatIndex: 0,
    toGroupIndex: 0,
    toClusterIndex: 1,
  })
  assert.ok(result)

  assert.equal(result[0]?.clusters?.[0]?.label, '빈 장면이 될 곳')
  assert.equal(result[0]?.clusters?.[0]?.image, 'scene.webp')
  assert.deepEqual(result[0]?.clusters?.[0]?.beats, [])
  assert.deepEqual(result[0]?.clusters?.[1]?.beats, [{ text: '유일한 컷' }])
})

test('같은 장면이나 존재하지 않는 위치로는 옮기지 않는다', () => {
  assert.equal(moveFactionSceneBeat({
    groups,
    fromGroupIndex: 0,
    fromClusterIndex: 0,
    fromBeatIndex: 0,
    toGroupIndex: 0,
    toClusterIndex: 0,
  }), null)
  assert.equal(moveFactionSceneBeat({
    groups,
    fromGroupIndex: 0,
    fromClusterIndex: 0,
    fromBeatIndex: 99,
    toGroupIndex: 1,
    toClusterIndex: 0,
  }), null)
})
