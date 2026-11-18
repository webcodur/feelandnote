import test from 'node:test';
import assert from 'node:assert/strict';
import { koreanListLabels, workTitle } from './korean-list-labels.mjs';

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
test('volume, set and edition marks are removed from a linked Korean edition of the same work', () => {
  for (const [raw, ko, want] of [
    ['The Sea, the Sea', '바다여 바다여 1', '바다여 바다여'],
    ['Possession', '소유(상)', '소유'],
    ['A Brief History of Seven Killings', '일곱 건의 살인에 대한 간략한 역사 (세트)', '일곱 건의 살인에 대한 간략한 역사'],
    ['American Pastoral', '미국의 목가. 1(세계문학전집 117)', '미국의 목가'],
    ['Falconer', '팔코너(2판)(세계문학전집 61)(양장본 HardCover)', '팔코너'],
    ['Catch-22', '캐치-22 1', '캐치-22'],
    ['The Grapes of Wrath', '분노의 포도 1', '분노의 포도'],
    ['The Forty Rules of Love', '40가지 사랑의 법칙. 1', '40가지 사랑의 법칙'],
    ['Why Nations Fail', '국가는 왜 실패하는가(리커버:K)', '국가는 왜 실패하는가'],
  ]) assert.equal(koreanListLabels({ raw_title: raw, raw_creator: 'x' }, { title: ko, creator: '가' })[0], want);
});
test('numbers that belong to a title survive', () => {
  assert.equal(workTitle('화씨 451'), '화씨 451');
  assert.equal(koreanListLabels({ raw_title: 'Nineteen Eighty-Four', raw_creator: 'x' }, { title: '1984', creator: '가' })[0], '1984');
  assert.equal(koreanListLabels({ raw_title: 'The Picture of Dorian Gray', raw_creator: 'x' }, { title: '도리언 그레이의 초상 1890', creator: '가' })[0], 'The Picture of Dorian Gray');
});
