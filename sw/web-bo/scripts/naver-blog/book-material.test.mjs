import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assembleBookMaterial, saveBookMaterial } from './book-material.mjs';
import { MIN_REVIEW_LENGTH } from './lib/roster-data.mjs';

const content = { id: 'book', type: 'BOOK' };
const locale = { content_id: 'book', locale: 'ko', title: '1984', thumbnail_url: 'cover', affiliate_url: { coupang: 'original-url' } };
const celeb = (id, extra = {}) => ({ id, nickname: '동명이인', slug: id, publication_status: 'active', celeb_tier: 'full', avatar_url: null, ...extra });
const relation = (id, celeb_id, extra = {}) => ({ id, celeb_id, content_id: 'book', review: ` ${'가'.repeat(MIN_REVIEW_LENGTH)}\n`, source_url: 'original-source', ...extra });

test('감상 원문·관계ID·동명이인을 보존하고 비활성·짧은 감상을 제외한다', () => {
  const a = relation('r1', 'a'), b = relation('r2', 'b');
  const data = assembleBookMaterial({ content, locale,
    celebs: [celeb('a'), celeb('b'), celeb('hidden', { publication_status: 'draft' })],
    relations: [a, b, relation('r3', 'hidden'), relation('r4', 'a', { review: '짧음' }), relation('r5', 'a', { content_id: 'other' })],
  });
  assert.deepEqual(data.readers.map(r => [r.relation_id, r.celeb_id]), [['r1', 'a'], ['r2', 'b']]);
  assert.equal(data.readers[0].review, a.review);
  assert.equal(data.readers[0].source_url, a.source_url);
  assert.deepEqual(data.book.affiliate_url, locale.affiliate_url);
  assert.equal(data.book.creator, undefined, '없는 저자는 추측하지 않음');
  assert.throws(() => assembleBookMaterial({ content: { ...content, type: 'VIDEO' }, locale, relations: [], celebs: [] }), /BOOK/);
  assert.throws(() => assembleBookMaterial({ content, locale: { ...locale, thumbnail_url: '' }, relations: [], celebs: [] }), /표지/);
});

test('기존 재료 파일은 기본 보존하고 명시한 refresh만 갱신한다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-book-material-'));
  const dest = path.join(dir, 'book.material.json');
  try {
    saveBookMaterial(dest, { original: true });
    assert.throws(() => saveBookMaterial(dest, { original: false }), { code: 'EEXIST' });
    assert.deepEqual(JSON.parse(fs.readFileSync(dest, 'utf8')), { original: true });
    saveBookMaterial(dest, { refreshed: true }, { refresh: true });
    assert.deepEqual(JSON.parse(fs.readFileSync(dest, 'utf8')), { refreshed: true });
  } finally { fs.unlinkSync(dest); fs.rmdirSync(dir); }
});
