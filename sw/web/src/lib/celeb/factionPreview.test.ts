import assert from 'node:assert/strict'
import test from 'node:test'
import { selectFactionPreview, type FactionPreviewMember } from './factionPreview'

function person(id: string, position: number, groupId: string | null = null, groupPosition = 1): FactionPreviewMember {
  return { id, name: id, nameEn: `EN ${id}`, groupId, groupName: groupId, groupNameEn: groupId ? `EN ${groupId}` : null, groupPosition, position }
}

test('exclude the owner, prioritize group peers, and count every remaining person once', () => {
  const members = [person('owner', 1, 'executives'), person('shotwell', 2, 'executives'), person('davis', 3, 'executives'),
    ...Array.from({ length: 16 }, (_, index) => person(`other-${index}`, index + 4, 'investors', 2))]
  assert.deepEqual(selectFactionPreview(members.reverse(), 'owner', 'ko'), {
    kind: 'people', names: ['shotwell', 'davis'], remaining: 16,
  })
})

test('a lone member in a group shows the atlas groups in group order', () => {
  const members = [person('owner', 10, 'third', 3), person('one', 20, 'first', 1), person('two', 30, 'second', 2)]
  assert.deepEqual(selectFactionPreview(members, 'owner', 'en'), {
    kind: 'groups', names: ['EN first', 'EN second'], remaining: 1,
  })
})

test('one peer is followed by another group member with localized names', () => {
  const members = [person('early-outsider', 0, 'b', 2), person('owner', 1, 'a'), person('peer', 2, 'a')]
  members[2].nameEn = null
  assert.deepEqual(selectFactionPreview(members, 'owner', 'en'), {
    kind: 'people', names: ['peer', 'EN early-outsider'], remaining: 0,
  })
})

test('duplicate assignments do not inflate the remaining count', () => {
  const members = [person('owner', 1), person('one', 2), person('two', 3), person('two', 4), person('three', 5)]
  assert.deepEqual(selectFactionPreview(members, 'owner', 'ko'), { kind: 'people', names: ['one', 'two'], remaining: 1 })
})

test('a sole member has no other-person preview; a single colleague has no more count', () => {
  assert.equal(selectFactionPreview([person('owner', 1)], 'owner', 'ko'), null)
  assert.equal(selectFactionPreview([], 'owner', 'ko'), null)
  assert.deepEqual(selectFactionPreview([person('owner', 1), person('one', 2)], 'owner', 'ko'), {
    kind: 'people', names: ['one'], remaining: 0,
  })
})
