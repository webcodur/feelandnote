import assert from 'node:assert/strict'
import test from 'node:test'
import { rankRelatedFigures, type RelatedCandidate } from './relatedFigures'

test('가족은 유사 인물이 아니라 근거 있는 관계로 추천한다', () => {
  const anna: RelatedCandidate = { id: 'anna', slug: 'anna-anderson', nickname: '애나 앤더슨', nickname_en: 'Anna Anderson', avatar_url: null, profession: 'other', nationality: 'PL', birthYear: 1896, influence: 0, isFiction: false }
  const [result] = rankRelatedFigures({ self: { id: 'felix', profession: 'other', nationality: 'PL', birthYear: null, isFiction: false }, relations: [{ id: 'anna', slug: 'anna-anderson', relType: 'sibling', relGroup: 'family', note: '신원 확인 대면', noteEn: 'Identification meeting' }], candidates: [anna], limit: 1 })
  assert.equal(result.kind, 'relation')
  assert.equal(result.relGroup, 'family')
  assert.equal(result.note, '신원 확인 대면')
})
