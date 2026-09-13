import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoster, renderRoster, celebSlug } from './roster-data.mjs';

const celeb = (id, extra = {}) => ({ id, slug: id, nickname: '같은 이름', celeb_tier: 'full', publication_status: 'active', ...extra });
const book = (id, extra = {}) => ({ id, type: 'BOOK', ...extra });
const ko = (id, extra = {}) => ({ content_id: id, locale: 'ko', title: '같은 제목', creator: id, thumbnail_url: 'https://example.com/cover.jpg', ...extra });
const review = (celeb_id, content_id, extra = {}) => ({ celeb_id, content_id, review: '가'.repeat(80), ...extra });
const fixture = extra => ({ celebs: [], relations: [], contents: [], locales: [], posts: [], drafts: [], ...extra });

test('BOOK·한국어 제목·ko 표지·80자 감상만 세고 비활성 인물은 후보에서 제외한다', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'video', 'music', 'short', 'empty-title', 'en-title', 'no-cover', 'en-locale'];
  const data = fixture({
    celebs: [celeb('ready'), celeb('inactive', { publication_status: 'draft' }), celeb('light', { celeb_tier: 'light' })],
    contents: ids.map(id => book(id, id === 'video' ? { type: 'VIDEO' } : id === 'music' ? { type: 'MUSIC' } : {})),
    locales: ids.map(id => ko(id, ({ 'empty-title': { title: ' ' }, 'en-title': { title: 'Original title' }, 'no-cover': { thumbnail_url: '' }, 'en-locale': { locale: 'en' } })[id])),
    relations: ['ready', 'inactive', 'light'].flatMap(c => ids.map(id => review(c, id, id === 'short' ? { review: '가'.repeat(79) } : {}))),
  });
  data.relations.push(review('ready', 'a'));
  const r = buildRoster(data);
  assert.deepEqual(r.candidates.map(c => [c.id, c.n]), [['ready', 5]]);
  assert.equal(r.books.length, 0, '비활성 독자와 중복 관계로 책 후보를 만들면 안 됨');
});

test('기존 동일 인물의 두 글과 5권 미만 글을 보존하고 URL·초안 인물을 신규 후보에서 뺀다', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const r = buildRoster(fixture({
    celebs: ['old', 'current', 'draft-only', 'new', 'few'].map(id => celeb(id)),
    contents: ids.map(id => book(id)), locales: ids.map(id => ko(id)),
    relations: ['old', 'current', 'draft-only', 'new'].flatMap(c => ids.map(id => review(c, id))).concat(review('few', 'a')),
    posts: [
      { kind: 'celeb', slug: 'old', logNo: '1', link: 'ok', title: '이전 글 1' },
      { kind: 'celeb', slug: 'old', logNo: '2', link: 'ok', title: '이전 글 2' },
      { kind: 'celeb', slug: 'few', logNo: '3', link: 'ok' },
      { kind: 'celeb', url: 'https://feelandnote.com/celeb/current#library', logNo: '4', link: 'check' },
      { kind: 'celeb', slug: 'new', logNo: '5', link: 'deleted' },
    ],
    drafts: [{ target: '/celeb/current', logNo: '4', status: 'check' }, { target: '/celeb/draft-only', status: 'check' }],
  }));
  assert.equal(r.existing.length, 3);
  assert.equal(r.existingPeople, 2);
  assert.equal(r.existing.find(p => p.slug === 'few').n, 1);
  assert.equal(r.current.length, 1);
  assert.equal(r.currentPeople, 1);
  assert.equal(r.unposted.length, 1);
  assert.deepEqual(r.candidates.map(c => c.slug), ['new']);
  const md = renderRoster(r);
  assert.match(md, /이전 글 1/);
  assert.match(md, /이전 글 2/);
});

test('동명 책은 content_id로 분리하고 동명 독자는 id로 보존하며 인물 5권 조건을 책 후보에 적용하지 않는다', () => {
  const r = buildRoster(fixture({
    celebs: [celeb('one'), celeb('two')],
    contents: [book('book-one'), book('book-two')],
    locales: [ko('book-one'), ko('book-two')],
    relations: [review('one', 'book-one'), review('one', 'book-one'), review('two', 'book-one'), review('one', 'book-two'), review('two', 'book-two')],
  }));
  assert.equal(r.candidates.length, 0);
  assert.equal(r.books.length, 2);
  assert.deepEqual(r.books.map(b => b.readers.length), [2, 2]);
  assert.notEqual(r.books[0].creator, r.books[1].creator);
});

test('같은 인물의 기존 글과 이번 글을 글 번호로 구별한다', () => {
  const r = buildRoster(fixture({
    celebs: [celeb('same')],
    posts: [{ kind: 'celeb', slug: 'same', logNo: 'old', link: 'ok' }, { kind: 'celeb', logNo: 'new', link: 'check' }],
    drafts: [{ target: '/celeb/same', logNo: 'new' }],
  }));
  assert.equal(r.existing[0].logNo, 'old');
  assert.equal(r.current[0].logNo, 'new');
  assert.equal(r.coveredPeople, 1);
  assert.equal(celebSlug('https://feelandnote.com/ko/celeb/same/?x=1#library'), 'same');
  assert.equal(celebSlug('/content/same'), '');
});

test('ko locale의 1984 같은 숫자 제목을 정상 책으로 센다', () => {
  const r = buildRoster(fixture({
    min: 1, celebs: [celeb('one'), celeb('two')],
    contents: [book('1984')], locales: [ko('1984', { title: '1984' })],
    relations: [review('one', '1984'), review('two', '1984')],
  }));
  assert.equal(r.candidates.length, 2);
  assert.equal(r.books[0].title, '1984');
});
