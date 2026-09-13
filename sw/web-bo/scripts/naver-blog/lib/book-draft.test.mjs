import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBookDraft } from './book-draft.mjs';

const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
function fixture() {
  const id = uuid(1), url = `https://feelandnote.com/content/${id}?category=book`;
  const book = { content_id: id, id, type: 'BOOK', locale: 'ko', title: '테스트 책', creator: '저자', thumbnail_url: 'https://example.com/book.jpg', url };
  const dbReviews = [2, 3].map(n => ({ relation_id: uuid(n + 10), celeb_id: uuid(n), content_id: id,
    nickname: '같은 이름', slug: `reader-${n}`, headline: `소개 ${n}`, avatar_url: `https://example.com/avatar-${n}.jpg`,
    review: `독자 ${n}의 **감상 원문** ${'가'.repeat(80)}\n\n다음 문단 https://example.com/source-${n}`,
    url: `https://feelandnote.com/celeb/reader-${n}` }));
  const body = [`[c]**『${book.title}』 · ${book.creator}**[/c]`, `[img:${book.thumbnail_url}|240|${book.title} 표지]`,
    '책 소개입니다.', '━━━━━━',
    ...dbReviews.flatMap(r => [`[avatar:${r.avatar_url}|80|${r.nickname}]`, `[c]**${r.nickname}**[/c]`, `[c]${r.headline}[/c]`,
      `[q]${r.review}[/q]`, `${r.nickname}의 다른 독서 기록 → ${r.url}`, '━━━━━━']),
    '책과 감상을 더 확인하세요.', `『${book.title}』의 감상과 책 정보 보기 → ${url}`, '이 글에 나온 사람들',
    ...dbReviews.map(r => `${r.nickname} → ${r.url}`)].join('\n\n');
  return { kind: 'book', target: `/content/${id}?category=book`, title: '읽은 사람들', body, book, dbReviews };
}

test('책편을 기존 operations로 변환하고 동명이인·멀티라인 원문·DB URL을 보존한다', () => {
  const draft = fixture(), before = structuredClone(draft), plan = parseBookDraft(draft);
  assert.deepEqual(draft, before);
  assert.equal(plan.covers.length, 1);
  assert.deepEqual(plan.avatars.map(a => a.width), [80, 80]);
  assert.deepEqual(plan.quotes.map(q => q.text), draft.dbReviews.map(r => r.review));
  assert.deepEqual(plan.operations.filter(op => op.kind === 'quote').map(op => op.text), draft.dbReviews.map(r => r.review));
  assert.equal(plan.links.length, 7);
  assert.deepEqual([...new Set(plan.operations.map(op => op.kind))].sort(), ['divider', 'image', 'quote', 'text']);
  assert.ok(plan.operations.every(op => Number.isInteger(op.lineIndex)));
});

for (const [name, mutate] of [
  ['다른 글 유형', d => { d.kind = 'celeb'; }],
  ['다른 책 target', d => { d.target = d.target.replace(uuid(1), uuid(9)); }],
  ['다른 책 메타 ID', d => { d.book.id = uuid(9); }],
  ['다른 책의 감상', d => { d.dbReviews[0].content_id = uuid(9); }],
  ['다른 인물 URL', d => { d.dbReviews[0].url = d.dbReviews[1].url; }],
  ['중복 관계 ID', d => { d.dbReviews[0].relation_id = d.dbReviews[1].relation_id; }],
  ['중복 인물 ID', d => { d.dbReviews[0].celeb_id = d.dbReviews[1].celeb_id; }],
  ['다른 표지', d => { d.body = d.body.replace('book.jpg|240', 'other.jpg|240'); }],
  ['다른 아바타', d => { d.body = d.body.replace('avatar-2.jpg|80', 'wrong.jpg|80'); }],
  ['다른 아바타 폭', d => { d.body = d.body.replace('|80|', '|100|'); }],
  ['추가 이미지', d => { d.body += '\n[img:https://example.com/other.jpg|240|추가]'; }],
  ['인물 이름 교체', d => { d.body = d.body.replace('[c]**같은 이름**[/c]', '[c]**다른 이름**[/c]'); }],
  ['headline 교체', d => { d.body = d.body.replace('[c]소개 2[/c]', '[c]다른 소개[/c]'); }],
  ['감상 수정', d => { d.body = d.body.replace(d.dbReviews[0].review, '수정된 감상'); }],
  ['감상 누락', d => { d.body = d.body.replace(`[q]${d.dbReviews[0].review}[/q]`, ''); }],
  ['감상 중복', d => { d.body += `\n[q]${d.dbReviews[0].review}[/q]`; }],
  ['감상 순서 변경', d => { d.dbReviews.reverse(); }],
  ['다른 인물의 중간 링크', d => { d.body = d.body.replace('독서 기록 → ' + d.dbReviews[0].url, '독서 기록 → ' + d.dbReviews[1].url); }],
  ['임의 외부 링크', d => { d.body = d.body.replace('책 소개입니다.', '책 소개입니다. https://example.com/extra'); }],
  ['직접 구매 링크', d => { d.body = d.body.replace('책 소개입니다.', 'https://link.coupang.com/a/extra'); }],
  ['다른 마지막 책 링크', d => { d.body = d.body.replace('정보 보기 → ' + d.book.url, '정보 보기 → ' + d.book.url + '&wrong=1'); }],
  ['마지막 인물 목록 누락', d => { d.body = d.body.slice(0, d.body.lastIndexOf('\n')); }],
  ['마지막 인물 목록 중복', d => { d.body += '\n같은 이름 → ' + d.dbReviews[0].url; }],
  ['마지막 인물 목록 다른 순서', d => { d.body = d.body.replace('이 글에 나온 사람들\n\n같은 이름 → ' + d.dbReviews[0].url, '이 글에 나온 사람들\n\n같은 이름 → ' + d.dbReviews[1].url); }],
]) test('책편 오류 차단: ' + name, () => {
  const draft = fixture(); mutate(draft); assert.throws(() => parseBookDraft(draft));
});
