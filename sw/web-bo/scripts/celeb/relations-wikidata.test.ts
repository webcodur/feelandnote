import assert from 'node:assert/strict'
import test from 'node:test'
import { WIKIDATA_RELATION_PROPS, canCollectExternalRelation } from './relations-wikidata'

test('가족 명시 속성은 사회 네 축으로 변환하거나 누락하지 않는다', () => {
  assert.deepEqual(['P22','P25','P40','P26','P451','P3373'].map(p => WIKIDATA_RELATION_PROPS[p]),
    ['father','mother','child','spouse','partner','sibling'])
  assert.equal(WIKIDATA_RELATION_PROPS.P1038, undefined)
  assert.equal(WIKIDATA_RELATION_PROPS.P1066, 'influence')
})

test('외부 가족을 수집하되 사회 관계와 이미 등록된 신원은 자동 확장하지 않는다', () => {
  assert.equal(canCollectExternalRelation('spouse', false), true)
  assert.equal(canCollectExternalRelation('father', false), true)
  assert.equal(canCollectExternalRelation('spouse', true), false)
  assert.equal(canCollectExternalRelation('influence', false), false)
  assert.equal(canCollectExternalRelation('colleague', false), false)
})
