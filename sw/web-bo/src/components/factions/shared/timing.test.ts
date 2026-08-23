import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionScript } from '@/lib/faction-types'
import {
  longformPartCount,
  longformSegments,
  longformSliceGroup,
} from './timing'

function scriptWithInternalCut(): FactionScript {
  return {
    title: '내부 경계 테스트',
    groups: [{
      name: '한 세력',
      people: [],
      clusters: [
        { label: '첫 묶음', people: [{ isPerson: false, name: '전환 장면' }] },
        { label: '둘째 묶음', people: [] },
      ],
      sequence: [
        { kind: 'cluster', clusterIndex: 0 },
        { kind: 'entry', clusterIndex: 0, entryIndex: 0 },
        { kind: 'cut' },
        { kind: 'cluster', clusterIndex: 1 },
      ],
    }],
  }
}

test('세력 내부 cut은 롱폼 편 수와 세그먼트를 가르지 않는다', () => {
  const script = scriptWithInternalCut()
  const segments = longformSegments(script)

  assert.equal(longformPartCount(script), 1)
  assert.equal(segments.length, 1)
  assert.deepEqual(segments[0], [{ gi: 0, sequenceStart: 0, sequenceEnd: 4 }])
})

test('롱폼 미리보기용 세력 slice에는 내부 쇼츠 경계를 제외한 전체 이야기만 남는다', () => {
  const script = scriptWithInternalCut()
  const [first] = longformSegments(script)
  const firstStep = first[0]
  assert.ok('gi' in firstStep)

  const firstSlice = longformSliceGroup(script, firstStep)

  assert.deepEqual(firstSlice?.sequence, [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'entry', clusterIndex: 0, entryIndex: 0 },
    { kind: 'cluster', clusterIndex: 1 },
  ])
  assert.equal(firstSlice?.clusters?.[0].disabled, undefined)
  assert.equal(firstSlice?.clusters?.[1].disabled, undefined)
})
