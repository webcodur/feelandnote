import test from 'node:test';
import assert from 'node:assert/strict';
import { koreanListLabels } from './korean-list-labels.mjs';

test('Korean publication labels replace foreign source labels, including numeric titles', () => {
  assert.deepEqual(koreanListLabels({ raw_title: 'Things Fall Apart', raw_creator: 'Chinua Achebe' }, { title: '모든 것이 산산이 부서지다', creator: '치누아 아체베' }), ['모든 것이 산산이 부서지다', '치누아 아체베']);
  assert.deepEqual(koreanListLabels({ raw_title: 'Nineteen Eighty-Four', raw_creator: 'George Orwell' }, { title: '1984', creator: '조지 오웰' }), ['1984', '조지 오웰']);
});
test('an existing Korean work label is not replaced with an edition or bundle', () => {
  assert.deepEqual(koreanListLabels({ raw_title: '전쟁과 평화', raw_creator: '톨스토이' }, { title: '전쟁과 평화 1', creator: '레프 톨스토이' }), ['전쟁과 평화', '톨스토이']);
});
test('a trilogy and a collection cannot silently become one constituent work', () => {
  assert.equal(koreanListLabels({ raw_title: 'Trilogy: Molloy, Malone Dies, The Unnamable', raw_creator: 'Samuel Beckett' }, { title: '몰로이', creator: '사뮈엘 베케트' })[0], 'Trilogy: Molloy, Malone Dies, The Unnamable');
  assert.equal(koreanListLabels({ raw_title: 'Stories', raw_creator: 'Franz Kafka' }, { title: '변신', creator: '프란츠 카프카' })[0], 'Stories');
});
test('unverified translations and multi-author anthology metadata are not invented or copied', () => {
  assert.deepEqual(koreanListLabels({ raw_title: 'Untranslated Work', raw_creator: 'Original Author' }, { title: 'Untranslated Work', creator: '다른 작가^원저자' }), ['Untranslated Work', 'Original Author']);
});
