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
