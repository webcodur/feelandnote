import assert from 'node:assert/strict'
import test from 'node:test'
import { selectBookShelfPeople } from './bookShelfPeople'

const member = { id: 'member', slug: 'member', name: 'Member' }
const author = { id: 'author', slug: 'author', name: 'Author' }
const peer = { id: 'peer', slug: 'peer', name: 'Peer', review: 'Reading evidence' }
const outsider = { id: 'outsider', slug: 'outsider', name: 'Outsider' }
const people = { appeared: [member, outsider], authored: [author], read: [member, peer, outsider] }

test('theme membership prioritizes people without hiding actual book relations', () => {
  const selected = selectBookShelfPeople(people, { kind: 'theme', memberIds: ['member'] })
  assert.deepEqual(selected, people)
})

test('personal reading keeps all readers and centers the current person', () => {
  assert.deepEqual(selectBookShelfPeople(people, { kind: 'read', personId: 'peer' }), {
    appeared: [member, outsider], authored: [author], read: [peer, member, outsider],
  })
})

test('recommendation evidence prioritizes its readers without removing other readers', () => {
  const selected = selectBookShelfPeople(people, { kind: 'profession', personId: 'unassigned' }, ['peer'])
  assert.deepEqual(selected.read, [peer, member, outsider])
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

test('personal shelves omit only their owner from appearances in every mode', () => {
  for (const kind of ['appeared', 'authored', 'read', 'profession', 'affiliation'] as const) {
    const selected = selectBookShelfPeople(people, { kind, personId: 'member' })
    assert.deepEqual(selected.appeared, [outsider])
    assert.deepEqual(selected.read, [member, peer, outsider])
    assert.deepEqual(selected.authored, [author])
  }
})

test('empty recommendation or membership metadata never hides public readers', () => {
  assert.deepEqual(selectBookShelfPeople(people, { kind: 'profession' }, []).read, people.read)
  assert.deepEqual(selectBookShelfPeople(people, { kind: 'theme', memberIds: [] }).read, people.read)
})

test('duplicate relationships are counted once while keeping the complete reading record', () => {
  const selected = selectBookShelfPeople({
    appeared: [member, member, outsider], authored: [author, author], read: [member, peer, { ...peer, review: 'Full review', sourceUrl: 'https://example.com/source' }],
  }, { kind: 'theme' })
  assert.equal(selected.appeared.length, 2)
  assert.equal(selected.authored.length, 1)
  assert.equal(selected.read.length, 2)
  assert.equal(selected.read[1].review, 'Full review')
  assert.equal(selected.read[1].sourceUrl, 'https://example.com/source')
})
