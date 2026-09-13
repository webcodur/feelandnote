import assert from 'node:assert/strict'
import test from 'node:test'
import {
  durationLookupOf,
  groupTagLookupOf,
  sortedPeopleOf,
  webOverrideLookupOf,
  restoreReferencedScenePeople,
  replaceFactionEpisode,
  type ExistingTree,
} from './faction-save'
import { assertFactionSceneSpeakerAssignments } from '@feelandnote/shared/lib/faction-scene-speaker'

test('출연 배치를 지워도 다른 장면에 남은 엘페노르 발화는 기존 인물로 다시 연결한다', () => {
  const beat = { speakerCelebId: 'elpenor', text: '편집 중인 대사', voiceFile: 'existing.wav', media: 'new.png' }
  const script = { groups: [{ name: '표류', clusters: Array.from({ length: 13 }, (_, index) => ({
    people: [], beats: index === 12 ? [beat] : [],
  })) }] }
  const existing: ExistingTree = {
    episode: { id: 'ep' }, groups: [{ id: 'g', position: 1 }], clusters: [{ id: 'c', group_id: 'g', position: 1 }],
    people: [{ cluster_id: 'c', position: 1, is_person: true, celeb_id: 'elpenor', name: '엘페노르', slug: 'elpenor',
      image: 'old.png', quote_duration: 7.81, data: { quoteElevenlabsVoiceId: 'voice-id', stepVoiceLongform: true } }],
  }
  assert.throws(() => assertFactionSceneSpeakerAssignments(script.groups), /표류 · 장면 13의 1번 발화/)
  const restored = restoreReferencedScenePeople(script, existing) as typeof script
  assert.doesNotThrow(() => assertFactionSceneSpeakerAssignments(restored.groups))
  assert.deepEqual(restored.groups[0].clusters[12].beats, [beat])
  assert.equal(script.groups[0].clusters[12].people.length, 0)
  const person = restored.groups[0].clusters[12].people[0] as Record<string, unknown>
  assert.equal(person.celebId, 'elpenor')
  assert.equal(person.quoteElevenlabsVoiceId, 'voice-id')
  assert.equal(person.stepVoiceLongform, true)
  assert.equal(person.quoteDuration, 7.81)
})

test('원래 없던 인물은 거부하고, 남아 있는 인물이나 참조 없는 삭제 인물은 복원하지 않는다', () => {
  const existing: ExistingTree = {
    episode: {}, groups: [], clusters: [], people: [
      { celeb_id: 'a', name: '옛 이름', is_person: true },
      { celeb_id: 'removed', name: '지운 인물', is_person: true },
    ],
  }
  const script = { groups: [{ clusters: [{ people: [{ celebId: 'a', name: '새 이름' }], beats: [{ speakerCelebId: 'a' }] }] }] }
  assert.equal(restoreReferencedScenePeople(script, existing), script)
  const unknown = { groups: [{ clusters: [{ people: [], beats: [{ speakerCelebId: 'unknown' }] }] }] }
  const result = restoreReferencedScenePeople(unknown, existing)
  assert.throws(() => assertFactionSceneSpeakerAssignments(result.groups as never), /이 에피소드에 없는 인물/)
})

test('실제 저장 경로가 빠진 기존 화자를 복원하고 편집한 발화를 원자 저장에 전달한다', async () => {
  const person = { cluster_id: 'c', position: 1, is_person: true, celeb_id: 'elpenor', name: '엘페노르', slug: 'elpenor',
    quote: '예전 원고', quote_duration: 7.81, data: { stepVoiceLongform: true, quoteElevenlabsVoiceId: 'voice-id' } }
  const rows: Record<string, unknown> = {
    faction_episodes: { id: 'ep', updated_at: 'version-1', status: 'ready', registered: true, sort_order: 1,
      faction_groups: [{ id: 'g', name: '표류', position: 1, faction_clusters: [{ id: 'c', position: 1, faction_people: [person] }] }] },
    faction_episode_parts: [], celeb_tags: [],
    celebs: [{ id: 'elpenor', slug: 'elpenor', nickname: '엘페노르', nickname_en: 'Elpenor', status: 'active' }],
  }
  let saved: Record<string, unknown> | undefined
  const db = {
    from(table: string) {
      const result = { data: rows[table], error: null }
      type Query = PromiseLike<typeof result> & {
        select: () => Query; eq: () => Query; in: () => Query
        maybeSingle: () => Promise<typeof result>
      }
      const query: Query = {
        select: () => query, eq: () => query, in: () => query,
        maybeSingle: async () => result,
        then: Promise.resolve(result).then.bind(Promise.resolve(result)),
      }
      return query
    },
    async rpc(name: string, payload: Record<string, unknown>) {
      assert.equal(name, 'faction_replace_episode')
      saved = payload
      return { data: { episode_id: 'ep', updated_at: 'version-2' }, error: null }
    },
  }
  const beat = { speakerCelebId: 'elpenor', text: '사용자가 고친 새 대사', voiceFile: 'F02C05P01-quote.wav', media: 'new.png' }
  await replaceFactionEpisode(db as never, 'Homer-Odyssey', {
    title: '오디세이아', groups: [{ name: '표류', clusters: [{ label: '망자들을 만나다', people: [], beats: [beat] }] }],
  }, 'version-1')
  assert.ok(saved)
  assert.equal(saved.p_expected_updated_at, 'version-1')
  const people = saved.p_people as Array<{ celeb_id: string; data: Record<string, unknown> }>
  const clusters = saved.p_clusters as Array<{ data: Record<string, unknown> }>
  assert.equal(people.length, 1)
  assert.equal(people[0].celeb_id, 'elpenor')
  assert.equal(people[0].data.quoteElevenlabsVoiceId, 'voice-id')
  assert.deepEqual(clusters[0].data.beats, [beat])
})

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
