import assert from 'node:assert/strict'
import test from 'node:test'
import { selectBookShelfPeople } from './bookShelfPeople'

const member = { id: 'member', slug: 'member', name: 'Member' }
const author = { id: 'author', slug: 'author', name: 'Author' }
const peer = { id: 'peer', slug: 'peer', name: 'Peer', review: 'Reading evidence' }
const outsider = { id: 'outsider', slug: 'outsider', name: 'Outsider' }
const people = { appeared: [member, outsider], authored: [author], read: [member, peer, outsider] }

test('a theme shows its members’ appearances and readings while retaining a registered author outside the theme', () => {
  const selected = selectBookShelfPeople(people, { kind: 'theme', memberIds: ['member'] })
  assert.deepEqual(selected, { appeared: [member], authored: [author], read: [member] })
})

test('personal reading centers the actual person without treating every reader as that person’s peer', () => {
  assert.deepEqual(selectBookShelfPeople(people, { kind: 'read', personId: 'peer' }), {
    appeared: [], authored: [author], read: [peer],
  })
})

test('profession recommendation identifies exactly the readers who supplied the recommendation', () => {
  const selected = selectBookShelfPeople(people, { kind: 'profession', personId: 'member' }, ['peer'])
  assert.deepEqual(selected.read, [peer])
})

test('personal affiliation does not claim an appearance when that person has no work assignment', () => {
  const selected = selectBookShelfPeople(people, { kind: 'affiliation', personId: 'unassigned' })
  assert.deepEqual(selected.appeared, [member, outsider])
  assert.equal(selected.appeared.some((person) => person.id === 'unassigned'), false)
})

test('reading records never create appearance or authorship relations', () => {
  const selected = selectBookShelfPeople({ appeared: [], authored: [], read: [member] }, { kind: 'theme', memberIds: ['member'] })
  assert.deepEqual(selected, { appeared: [], authored: [], read: [member] })
})
