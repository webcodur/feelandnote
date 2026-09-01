import assert from 'node:assert/strict'
import test from 'node:test'
import {
  joinCluster,
  joinPerson,
  splitCluster,
  splitPerson,
} from './faction-schema'

test('이미지 경로는 폴더 구조를 해석하지 않고 DB와 JSON 사이에서 그대로 보존한다', () => {
  const personPath = '02-homeward/circe.png'
  const quotePath = '02-homeward/circe-reveals-the-road.png'
  const clusterPath = '02-homeward/circe-palace-group.png'

  const personSplit = splitPerson({
    name: '키르케',
    slug: 'circe',
    image: personPath,
    quoteImage: quotePath,
  })
  const person = joinPerson({
    ...personSplit.cols,
    data: personSplit.data,
    mined: personSplit.mined,
  })

  const clusterSplit = splitCluster({
    label: '키르케의 섬',
    image: clusterPath,
    people: [person],
  })
  const cluster = joinCluster({
    ...clusterSplit.cols,
    data: clusterSplit.data,
  }, [person])

  assert.equal(cluster.image, clusterPath)
  assert.equal((cluster.people as Record<string, unknown>[])[0]?.image, personPath)
  assert.equal((cluster.people as Record<string, unknown>[])[0]?.quoteImage, quotePath)
})

test('장면 발화의 인물 UUID 할당은 faction_people data에서 무손실 왕복한다', () => {
  const split = splitPerson({
    isPerson: false,
    name: '활의 시험',
    beats: [{
      speakerCelebId: '00000000-0000-0000-0000-000000000001',
      speaker: '오디세우스',
      text: '활을 가져오너라.',
    }],
  })
  const joined = joinPerson({
    ...split.cols,
    data: split.data,
    mined: split.mined,
  })

  assert.deepEqual(joined.beats, [{
    speakerCelebId: '00000000-0000-0000-0000-000000000001',
    speaker: '오디세우스',
    text: '활을 가져오너라.',
  }])
})

test('장면명 위치는 cluster data에서 무손실 왕복한다', () => {
  const split = splitCluster({
    label: '저승을 빠져나오다',
    labelPosition: 'bottom',
    people: [],
  })
  const joined = joinCluster({
    ...split.cols,
    data: split.data,
  }, [])

  assert.equal(joined.labelPosition, 'bottom')
})

test('장면 효과음 시작률은 cluster data의 beat에서 무손실 왕복한다', () => {
  const beats = [{
    text: '활시위를 놓는다.',
    sfx: 'bow-string.mp3',
    sfxStartPercent: 42,
  }]
  const split = splitCluster({
    label: '활의 시험',
    beats,
    people: [],
  })
  const joined = joinCluster({
    ...split.cols,
    data: split.data,
  }, [])

  assert.deepEqual(joined.beats, beats)
})

test('한 컷의 여러 효과음과 시작률은 cluster data에서 무손실 왕복한다', () => {
  const beats = [{
    text: '활이 부딪힌다.',
    sfxs: [
      { file: 'bow-string.mp3', startPercent: 12 },
      { file: 'bow-arrow-body.mp3', startPercent: 68 },
    ],
  }]
  const split = splitCluster({ label: '활의 시험', beats, people: [] })
  const joined = joinCluster({ ...split.cols, data: split.data }, [])

  assert.deepEqual(joined.beats, beats)
})
