import assert from 'node:assert/strict'
import test from 'node:test'
import { connectVideoProfiles, normalizeVideoCredits, VIDEO_CREDIT_LIMITS, type VideoProfileRow } from './videoCredits'

test('credits keep actor identities and character names separate and combine multiple crew jobs', () => {
  const people = normalizeVideoCredits({
    cast: [{ id: 1, name: 'Actor', character: 'Historical Person', profile_path: '/actor.jpg' }],
    crew: [{ id: 1, name: 'Actor', job: 'Writer' }, { id: 2, name: 'Director', job: 'Director' }, { id: 2, name: 'Director', job: 'Screenplay' }, { id: 3, name: 'Thanks', job: 'Thanks' }],
  })
  assert.deepEqual(people.map(person => person.id), [2, 1])
  assert.deepEqual(people[0].roles, ['director', 'writer'])
  assert.equal(people[1].character, 'Historical Person')
  assert.deepEqual(people[1].roles, ['writer', 'cast'])
})

test('credits bound cast and crew independently and discard invalid identity or image paths', () => {
  const people = normalizeVideoCredits({
    cast: Array.from({ length: 100 }, (_, i) => ({ id: i + 100, name: 'Cast', profile_path: '//evil/path' })),
    crew: Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: 'Crew', job: 'Writer' })),
  })
  assert.equal(people.length, VIDEO_CREDIT_LIMITS.cast + VIDEO_CREDIT_LIMITS.crew)
  assert.equal(people.at(-1)?.portrait, null)
  assert.deepEqual(normalizeVideoCredits({ cast: [{ id: 0, name: 'Invalid' }, { id: 5, name: '' }] }), [])
})

test('profile links require one exact QID match, never a shared actor or character name', () => {
  const people = normalizeVideoCredits({ cast: [{ id: 1, name: 'Same Name', character: 'Same Name' }, { id: 2, name: 'Other' }] })
  const row: VideoProfileRow = { id: 'registered-person-id', wikidata_qid: 'Q1', slug: 'right-person', nickname: 'Same Name', nickname_en: 'Localized', avatar_url: null }
  const linked = connectVideoProfiles(people, { 2: 'Q1' }, [row], 'en')
  assert.equal(linked[0].profile, undefined)
  assert.equal(linked[1].profile?.slug, 'right-person')
  assert.equal(linked[1].profile?.id, 'registered-person-id')
  assert.equal(linked[1].profile?.name, 'Localized')
  assert.equal(connectVideoProfiles(people, { 1: 'Q1' }, [row, { ...row, slug: 'duplicate' }], 'ko')[0].profile, undefined)
})

test('TV creators survive missing crew and retain their exact person ID', () => {
  const people = normalizeVideoCredits({ created_by: [{ id: 7, name: 'Creator' }], cast: [] })
  assert.equal(people[0].id, 7)
  assert.deepEqual(people[0].roles, ['creator'])
})

test('source author, story and screenplay remain distinct credits', () => {
  const people = normalizeVideoCredits({ crew: [
    { id: 1, name: 'Novelist', job: 'Novel' }, { id: 2, name: 'Story', job: 'Story' }, { id: 3, name: 'Screenwriter', job: 'Screenplay' }, { id: 4, name: 'Character creator', job: 'Characters' },
  ] })
  assert.deepEqual(people.map(person => person.roles), [['sourceAuthor'], ['story'], ['writer'], ['characterCreator']])
})
