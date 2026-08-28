import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canonicalizeCelebRelation,
  celebRelationCounterpartId,
  celebRelationFactKey,
  celebRelationTypeForViewer,
  preferSpecificCelebRelationType,
} from './celeb-relations'

test('inverse rows produce one canonical influence fact', () => {
  const received = { fromId: 'b', toId: 'a', relType: 'influence' }
  const gave = { fromId: 'a', toId: 'b', relType: 'influenced' }

  assert.deepEqual(canonicalizeCelebRelation(gave), received)
  assert.equal(celebRelationFactKey(received), celebRelationFactKey(gave))
  assert.equal(celebRelationTypeForViewer(received, 'a'), 'influenced')
  assert.equal(celebRelationTypeForViewer(received, 'b'), 'influence')
})

test('teacher and student rows share one fact and keep viewer labels', () => {
  const teacher = { fromId: 'student', toId: 'teacher', relType: 'teacher' }
  const student = { fromId: 'teacher', toId: 'student', relType: 'student' }

  assert.equal(celebRelationFactKey(teacher), celebRelationFactKey(student))
  assert.equal(celebRelationTypeForViewer(teacher, 'teacher'), 'student')
  assert.equal(celebRelationTypeForViewer(teacher, 'student'), 'teacher')
})

test('parent labels keep the specific parent type on the child side', () => {
  const relation = { fromId: 'child', toId: 'parent', relType: 'mother' }

  assert.equal(celebRelationTypeForViewer(relation, 'child'), 'mother')
  assert.equal(celebRelationTypeForViewer(relation, 'parent'), 'child')
  assert.equal(celebRelationCounterpartId(relation, 'child'), 'parent')
  assert.equal(preferSpecificCelebRelationType('mother', 'parent'), true)
})

test('symmetric rows normalize endpoint order', () => {
  const left = { fromId: 'z', toId: 'a', relType: 'friend' }
  const right = { fromId: 'a', toId: 'z', relType: 'friend' }

  assert.deepEqual(canonicalizeCelebRelation(left), right)
  assert.equal(celebRelationFactKey(left), celebRelationFactKey(right))
  assert.equal(celebRelationTypeForViewer(left, 'a'), 'friend')
  assert.equal(celebRelationTypeForViewer(left, 'z'), 'friend')
})

test('different relationship kinds between the same people stay separate', () => {
  const friend = { fromId: 'a', toId: 'b', relType: 'friend' }
  const rival = { fromId: 'a', toId: 'b', relType: 'rival' }

  assert.notEqual(celebRelationFactKey(friend), celebRelationFactKey(rival))
})
