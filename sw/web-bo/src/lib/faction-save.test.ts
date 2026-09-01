import assert from 'node:assert/strict'
import test from 'node:test'
import {
  durationLookupOf,
  groupTagLookupOf,
  sortedPeopleOf,
  webOverrideLookupOf,
  type ExistingTree,
} from './faction-save'

/**
 * 저장 전 되살리기 — 기존 트리를 한 번 읽어 음성 길이·도감 손질·세력 테마를 신원 기준으로 새 행에 되싣는다.
 * 짝짓기 규칙(신원 → 자리 순서, 같은 신원은 나온 순서대로)이 셋에서 같아야 한다.
 */

const tree: ExistingTree = {
  episode: { id: 'ep', status: 'ready', registered: true, sort_order: 3 },
  // 세력 position 이 뒤집힌 채 들어와도 자리 순서로 정렬해야 한다.
  groups: [
    { id: 'g2', position: 2, name: '구혼자들\n왕궁의 손님', tag_id: 'tag-suitors' },
    { id: 'g1', position: 1, name: '귀향자들', tag_id: 'tag-home' },
    { id: 'g3', position: 3, name: '귀향자들', tag_id: 'tag-home-2' },
    { id: 'g4', position: 4, name: '테마 없음', tag_id: null },
  ],
  clusters: [
    { id: 'c2', group_id: 'g2', position: 1 },
    { id: 'c1', group_id: 'g1', position: 1 },
  ],
  people: [
    // 오디세우스가 두 자리에 나온다 — 첫 등장은 g1, 두 번째는 g2.
    { cluster_id: 'c2', position: 1, is_person: true, celeb_id: 'ody', slug: 'odysseus', name: '오디세우스', quote_duration: '7.5', epithet_duration: null, web_hidden: true, web_long_desc: '두 번째 자리 손질' },
    { cluster_id: 'c1', position: 2, is_person: true, celeb_id: 'ody', slug: 'odysseus', name: '오디세우스', quote_duration: 3, epithet_duration: 1.2, web_hidden: false, web_long_desc: '첫 자리 손질' },
    // 옛 행 — celeb_id 없이 slug 만.
    { cluster_id: 'c1', position: 1, is_person: true, celeb_id: null, slug: 'penelope', name: '페넬로페', quote_duration: 4, epithet_duration: null, web_hidden: false, web_image_url: 'pen.png' },
    // 서사 항목은 사람이 아니라 되살리기 대상이 아니다.
    { cluster_id: 'c1', position: 3, is_person: false, name: '폭풍', quote_duration: 9 },
  ],
}

test('사람 행을 세력→장면→인물 자리 순서로 줄 세우고 서사 항목은 뺀다', () => {
  const names = sortedPeopleOf(tree).map(p => `${p.name}@${p.cluster_id}`)

  assert.deepEqual(names, ['페넬로페@c1', '오디세우스@c1', '오디세우스@c2'])
})

test('음성 길이는 신원으로 찾고, 같은 신원은 나온 순서대로 짝짓는다', () => {
  const lookup = durationLookupOf(tree)

  assert.deepEqual(lookup(0, 0, 0, { celebId: 'ody', name: '오디세우스' } as never), { quoteDuration: 3, epithetDuration: 1.2 })
  assert.deepEqual(lookup(1, 0, 0, { celebId: 'ody', name: '오디세우스' } as never), { quoteDuration: 7.5, epithetDuration: undefined })
  // 세 번째 등장은 기존 행이 없다.
  assert.equal(lookup(2, 0, 0, { celebId: 'ody', name: '오디세우스' } as never), undefined)
})

test('celebId 없는 옛 행은 slug 로, 그마저 없으면 이름으로 찾는다', () => {
  const lookup = durationLookupOf(tree)

  assert.deepEqual(lookup(0, 0, 0, { slug: 'penelope', name: '페넬로페' } as never), { quoteDuration: 4, epithetDuration: undefined })
  assert.equal(lookup(0, 0, 1, { name: '폭풍' } as never), undefined)
})

test('도감 손질은 같은 순서 규칙으로 되살리고 web_hidden 은 true 일 때만 참이다', () => {
  const lookup = webOverrideLookupOf(tree)

  const first = lookup({ celeb_id: 'ody', name: '오디세우스' })
  const second = lookup({ celeb_id: 'ody', name: '오디세우스' })
  const legacy = lookup({ slug: 'penelope', name: '페넬로페' })

  assert.equal(first?.web_long_desc, '첫 자리 손질')
  assert.equal(first?.web_hidden, false)
  assert.equal(second?.web_long_desc, '두 번째 자리 손질')
  assert.equal(second?.web_hidden, true)
  assert.equal(legacy?.web_image_url, 'pen.png')
  assert.equal(legacy?.web_long_desc, null)
})

test('세력 테마는 이름 첫 줄로 찾고, 같은 이름은 자리 순서대로 짝짓는다', () => {
  const lookup = groupTagLookupOf(tree)

  assert.equal(lookup({ name: '구혼자들\n다른 부제' }), 'tag-suitors')
  assert.equal(lookup({ name: '귀향자들' }), 'tag-home')
  assert.equal(lookup({ name: '귀향자들' }), 'tag-home-2')
  assert.equal(lookup({ name: '귀향자들' }), undefined)
  assert.equal(lookup({ name: '테마 없음' }), undefined)
})
