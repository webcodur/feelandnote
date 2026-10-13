import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CELEB_RELATION_TYPE_ORDER,
  CELEB_RELATION_AXES,
  CELEB_FAMILY_RELATION_TYPES,
  canonicalizeCelebRelationAxis,
  celebRelationAxis,
  celebRelationDisplayType,
  celebRelationDisplayGroup,
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

  assert.deepEqual(
    canonicalizeCelebRelation({ fromId: 'parent', toId: 'child', relType: 'child' }),
    { fromId: 'child', toId: 'parent', relType: 'parent' },
  )
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

test('legacy counterpart normalization remains available outside the four-axis consumer', () => {
  const left = { fromId: 'zeus', toId: 'jupiter', relType: 'counterpart' }
  const right = { fromId: 'jupiter', toId: 'zeus', relType: 'counterpart' }

  assert.deepEqual(canonicalizeCelebRelation(left), right)
  assert.equal(celebRelationFactKey(left), celebRelationFactKey(right))
  assert.equal(celebRelationTypeForViewer(left, 'zeus'), 'counterpart')
  assert.equal(celebRelationTypeForViewer(left, 'jupiter'), 'counterpart')
  assert.equal(celebRelationAxis('counterpart'), null)
})

test('different relationship kinds between the same people stay separate', () => {
  const friend = { fromId: 'a', toId: 'b', relType: 'friend' }
  const rival = { fromId: 'a', toId: 'b', relType: 'rival' }

  assert.notEqual(celebRelationFactKey(friend), celebRelationFactKey(rival))
})

test('사회 관계는 네 축이고 화면 정렬에는 가족 유형도 포함한다', () => {
  assert.deepEqual(CELEB_RELATION_AXES, ['influence', 'influenced', 'colleague', 'rival'])
  assert.deepEqual(CELEB_RELATION_TYPE_ORDER, [...CELEB_RELATION_AXES, ...CELEB_FAMILY_RELATION_TYPES])
  assert.deepEqual(canonicalizeCelebRelationAxis({ fromId: 'a', toId: 'b', relType: 'student' }), { fromId: 'b', toId: 'a', relType: 'influence' })
  assert.deepEqual(canonicalizeCelebRelationAxis({ fromId: 'z', toId: 'a', relType: 'cofounder' }), { fromId: 'a', toId: 'z', relType: 'colleague' })
  assert.equal(canonicalizeCelebRelationAxis({ fromId: 'a', toId: 'b', relType: 'friend' }), null)
})

test('가족은 사회 축으로 바꾸지 않고 가족 유형과 묶음으로 표시한다', () => {
  for (const type of CELEB_FAMILY_RELATION_TYPES) {
    assert.equal(celebRelationAxis(type), null)
    assert.equal(celebRelationDisplayType(type), type)
    assert.equal(celebRelationDisplayGroup(type), 'family')
  }
  assert.equal(celebRelationDisplayType('teacher'), 'influence')
  assert.equal(celebRelationDisplayGroup('teacher'), 'thought')
  assert.equal(celebRelationDisplayType('friend'), null)
})
