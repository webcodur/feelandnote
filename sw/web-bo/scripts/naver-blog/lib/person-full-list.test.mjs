import test from 'node:test';
import assert from 'node:assert/strict';
import {readableInKorean,personFullList,personFullListSection,personFullListTableHtml,PERSON_FULL_LIST} from './person-full-list.mjs';

const ko = (title, sources = {primary: 'kakao_book'}) => ({locale: 'ko', title, creator: '저자', sources});
const en = (title, sources = {primary: 'openlibrary'}) => ({locale: 'en', title, creator: 'Author', sources});

test('국내판 판정은 서비스 배지 기준을 따른다', () => {
  assert.equal(readableInKorean(ko('책')), true);
  assert.equal(readableInKorean(ko('번역 제목', {primary: 'none', title: 'translated'})), false);
  assert.equal(readableInKorean(ko('옛 책', {primary: 'kakao_book', availability: 'out_of_print'})), false);
  assert.equal(readableInKorean(undefined), false);
});

test('본문 책을 앞에 두고 국내판 없음·절판을 뒤 표로 나누며 번호를 잇는다', () => {
  const books = [
    {content_id: 'a', ko: ko('나')},
    {content_id: 'b', ko: ko('가')},
    {content_id: 'c', ko: ko('번역 제목', {primary: 'none', title: 'translated'}), en: en('Original')},
    {content_id: 'd', ko: ko('절판 책', {primary: 'none', title: 'original', availability: 'out_of_print'}), en: en('Jeolpan', {primary: 'none', title: 'romanized'})},
  ];
  const list = personFullList(books, ['a']);
  assert.deepEqual(list.available, [['1', '나', '저자'], ['2', '가', '저자']]);
  assert.deepEqual(list.unavailable, [['3', '절판 책', '저자'], ['4', 'Original', 'Author']]);
  const section = personFullListSection(list);
  assert.deepEqual(section.map(o => o.kind === 'table' ? [o.rows.length, o.muted] : o.text), [PERSON_FULL_LIST.heading, PERSON_FULL_LIST.legend, [4, 2]]);
  const html = personFullListTableHtml(section[2]);
  assert.equal((html.match(new RegExp('color:' + PERSON_FULL_LIST.mutedColor, 'g')) ?? []).length, 6);
});

test('국내판 없는 책이 없으면 안내 없이 표 하나만 싣는다', () => {
  const section = personFullListSection(personFullList([{content_id: 'a', ko: ko('가')}]));
  assert.deepEqual(section.map(o => o.kind), ['text', 'table']);
});
