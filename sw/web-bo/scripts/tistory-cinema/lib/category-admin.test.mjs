import test from 'node:test';
import assert from 'node:assert/strict';
import { missingCategories, assertCategoryOnly } from './category-admin.mjs';

test('category creation adds only absent branches and never deletes existing branches', () => {
  const before = [{ name: '인물', children: ['배우', '기존 분류'] }];
  const wanted = [{ name: '인물', children: ['배우', '감독'] }, { name: '작품', children: ['SF'] }];
  assert.deepEqual(missingCategories(before, wanted), [{ parent: '인물', name: '감독' }, { parent: null, name: '작품' }, { parent: '작품', name: 'SF' }]);
  assert.deepEqual(missingCategories([...before, { name: '작품', children: ['SF'] }], before), []);
  assert.deepEqual(missingCategories(wanted, wanted), []);
});

test('bulk classification permits only requested categories and preserves identity and scheduling', () => {
  const before = [{ id: 60, title: '원고', url: 'https://example.invalid/entry/a', status: '[예약]', at: '2026-09-28 12:00', category: '인물' },
    { id: 59, title: '다른 원고', url: 'https://example.invalid/entry/b', status: '', at: '2026-09-09 09:00', category: '작품' }];
  const after = before.map(row => ({ ...row, category: row.id === 60 ? '배우' : row.category }));
  assert.doesNotThrow(() => assertCategoryOnly(before, after, [60], '배우'));
  for (const key of ['title', 'url', 'status', 'at']) assert.throws(() => assertCategoryOnly(before, [{ ...after[0], [key]: 'changed' }, after[1]], [60], '배우'));
  assert.throws(() => assertCategoryOnly(before, [{ ...after[0] }, { ...after[1], category: '배우' }], [60], '배우'));
  assert.throws(() => assertCategoryOnly(before, after.slice(1), [60], '배우'));
});
