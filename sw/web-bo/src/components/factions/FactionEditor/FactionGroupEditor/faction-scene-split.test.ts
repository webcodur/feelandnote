import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionGroup } from '@/lib/faction-types'
import { insertFactionSceneBefore, splitFactionSceneAtBeat } from './faction-scene-split'

const group: FactionGroup = {
  name: '키르케의 섬',
  clusters: [
    {
      label: '키르케를 만나다',
      image: 'circe-palace.png',
      holdMotion: 'zoomin',
      people: [
        { name: '키르케', celebId: 'circe-id' },
      ],
      beats: [
        { text: '섬에 도착했다.' },
        {
          label: '마법이 풀리다',
          labelEn: 'The spell breaks',
          speakerCelebId: 'circe-id',
          speaker: '키르케',
          text: '그들을 놓아주겠어요.\n하지만 먼저 쉬어가요.',
          media: 'circe-release.png',
          mediaCrop: { x: 12, y: 8, scale: 1.2 },
          mediaChanges: [{ chunk: 1, media: 'circe-feast.png', filter: 'warm' }],
          voiceDuration: 6.8,
          voicePlaybackRate: 1.15,
          legacyPersonVoice: true,
          shortsCutBefore: true,
        },
        { speakerCelebId: 'circe-id', speaker: '키르케', text: '길을 알려주죠.' },
      ],
    },
    {
      label: '저승으로 가다',
      people: [],
      beats: [{ text: '배는 저승을 향했다.' }],
    },
  ],
  sequence: [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cut' },
    { kind: 'cluster', clusterIndex: 1 },
  ],
  people: [],
}

test('선택한 대사부터 새 장면으로 옮기고 현재 장면 직후에 재생한다', () => {
  const result = splitFactionSceneAtBeat({ group, groupIndex: 1, clusterIndex: 0, beatIndex: 1 })
  assert.ok(result)

  assert.equal(result.newClusterIndex, 2)
  assert.deepEqual(result.group.sequence, [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cluster', clusterIndex: 2 },
    { kind: 'cut' },
    { kind: 'cluster', clusterIndex: 1 },
  ])
  assert.deepEqual(result.group.clusters?.[0]?.beats, [{ text: '섬에 도착했다.' }])
  assert.equal(result.group.clusters?.[1], group.clusters?.[1])
})

test('대사·화면 전환·화자 flag를 보존하고 구 좌표형 음성 파일을 분리 전 좌표로 고정한다', () => {
  const result = splitFactionSceneAtBeat({ group, groupIndex: 1, clusterIndex: 0, beatIndex: 1 })
  assert.ok(result)
  const scene = result.group.clusters?.[result.newClusterIndex]

  assert.equal(scene?.label, '마법이 풀리다')
  assert.equal(scene?.labelEn, 'The spell breaks')
  assert.equal(scene?.image, 'circe-release.png')
  assert.deepEqual(scene?.imageCrop, { x: 12, y: 8, scale: 1.2 })
  assert.equal(scene?.holdMotion, 'zoomin')
  assert.deepEqual(scene?.people, [])
  assert.equal(scene?.beats?.length, 2)
  assert.deepEqual(scene?.beats?.[0], {
    ...group.clusters?.[0]?.beats?.[1],
    voiceFile: 'F02C01P01-quote.wav',
  })
  assert.deepEqual(scene?.beats?.[0]?.mediaChanges, [
    { chunk: 1, media: 'circe-feast.png', filter: 'warm' },
  ])
  assert.equal(scene?.beats?.[0]?.shortsCutBefore, true)
})

test('첫 대사나 범위 밖에서는 빈 원본 장면을 만들지 않는다', () => {
  assert.equal(splitFactionSceneAtBeat({ group, groupIndex: 1, clusterIndex: 0, beatIndex: 0 }), null)
  assert.equal(splitFactionSceneAtBeat({ group, groupIndex: 1, clusterIndex: 0, beatIndex: 3 }), null)
})

test('현재 장면 바로 앞에 제목을 가진 독립 장면을 넣고 기존 장면 좌표는 보존한다', () => {
  const result = insertFactionSceneBefore({ group, clusterIndex: 1 })
  assert.ok(result)

  assert.equal(result.newClusterIndex, 2)
  assert.equal(result.group.clusters?.length, 3)
  assert.equal(result.group.clusters?.[0], group.clusters?.[0])
  assert.equal(result.group.clusters?.[1], group.clusters?.[1])
  assert.deepEqual(result.group.clusters?.[2], {
    label: '새 장면',
    people: [],
    beats: [],
  })
  assert.deepEqual(result.group.sequence, [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cut' },
    { kind: 'cluster', clusterIndex: 2 },
    { kind: 'cluster', clusterIndex: 1 },
  ])
})
