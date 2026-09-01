import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFactionDescription,
  buildFactionTags,
  factionVariants,
  type FactionMetaInput,
} from './youtube-faction-meta'

const input: FactionMetaInput = {
  title: '테스트 세력도',
  groups: [
    {
      name: '공통 세력',
      people: [
        { name: '공통 인물' },
        { name: '인물 롱폼 전용', longformOnly: true },
      ],
      clusters: [
        { people: [{ name: '공통 그룹 인물' }] },
        { longformOnly: true, people: [{ name: '그룹 롱폼 전용' }] },
      ],
    },
    {
      name: '세력 롱폼 전용',
      longformOnly: true,
      people: [{ name: '세력 전용 인물' }],
    },
  ],
}

test('편 경계가 없는 쇼츠는 단편(KO-S1) 하나다', () => {
  assert.deepEqual(
    factionVariants(input.groups).map(variant => variant.key),
    ['ko-longform', 'ko-shorts-1'],
  )
})

test('세력 끝 경계로 세력 단위 편이 갈린다', () => {
  const groups = [
    { name: '앞 세력', clusters: [{}], sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cut' }] },
    { name: '뒤 세력', clusters: [{}], sequence: [{ kind: 'cluster', clusterIndex: 0 }] },
  ]
  assert.deepEqual(
    factionVariants(groups as never).map(variant => variant.fileSuffix),
    ['KO-LV', 'KO-S1', 'KO-S2'],
  )
})

test('모든 활성 세력이 longformOnly면 쇼츠 변형을 만들지 않는다', () => {
  assert.deepEqual(
    factionVariants([{ longformOnly: true }]).map(variant => variant.key),
    ['ko-longform'],
  )
})

test('longformOnly 세력·그룹·인물은 롱폼 메타에 모두 포함한다', () => {
  const tags = buildFactionTags(input, 'ko', false)
  assert(tags.includes('세력 롱폼 전용'))
  assert(tags.includes('세력 전용 인물'))
  assert(tags.includes('그룹 롱폼 전용'))
  assert(tags.includes('인물 롱폼 전용'))
})

test('longformOnly 세력·그룹·인물은 쇼츠 메타에서만 제외한다', () => {
  const tags = buildFactionTags(input, 'ko', true, 1)
  const description = buildFactionDescription(input, 'ko', true, 1)

  assert(tags.includes('공통 인물'))
  assert(tags.includes('공통 그룹 인물'))
  assert(!tags.includes('세력 롱폼 전용'))
  assert(!tags.includes('세력 전용 인물'))
  assert(!tags.includes('그룹 롱폼 전용'))
  assert(!tags.includes('인물 롱폼 전용'))
  assert(!description.includes('세력 롱폼 전용'))
  assert(!description.includes('그룹 롱폼 전용'))
  assert(!description.includes('인물 롱폼 전용'))
})

test('세력 내부 경계가 쇼츠 변형을 만들고 롱폼은 한 편으로 유지한다', () => {
  const split: FactionMetaInput = {
    title: '내부 경계',
    groups: [{
      name: '긴 여정',
      clusters: [
        { people: [{ name: '전반 인물' }] },
        { people: [{ name: '후반 인물' }] },
      ],
      sequence: [
        { kind: 'cluster', clusterIndex: 0 },
        { kind: 'cut' },
        { kind: 'cluster', clusterIndex: 1 },
      ],
    }],
    longformLayout: [{ group: 0 }],
  }

  assert.deepEqual(
    factionVariants(split.groups, split.longformLayout).map(variant => variant.key),
    ['ko-longform', 'ko-shorts-1', 'ko-shorts-2'],
  )
  const first = buildFactionDescription(split, 'ko', true, 1)
  const second = buildFactionDescription(split, 'ko', true, 2)
  assert(first.includes('전반 인물'))
  assert(!first.includes('후반 인물'))
  assert(!second.includes('전반 인물'))
  assert(second.includes('후반 인물'))
})
