import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveKeys, syncBestsellers, runCli } from './sync-bestsellers.mjs';
import { collectBooks } from './bestsellers/books.mjs';
import { collectMedia } from './bestsellers/media.mjs';

const oldDate = '2026-08-27T04:38:34.728Z';
const now = '2026-09-13T12:00:00.000Z';
const keys = ['ALL', 'HUMANITIES', 'BUSINESS', 'FICTION', 'STEADY', 'VIDEO', 'GAME', 'MUSIC'];
const items = title => Array.from({ length: 6 }, (_, i) => ({ id: `${title}-${i}`, title, rank: i + 1, type: 'BOOK' }));
function baseline() {
  return { updated_at: oldDate, ...Object.fromEntries(['ko', 'en'].map(locale => [locale, {
    categories: Object.fromEntries(keys.map(key => [key, items(`${locale}-${key}-old`)])),
  }])) };
}
test('process environment overrides quoted local fallback', () => {
  assert.deepEqual(resolveKeys({ KAKAO_REST_API_KEY: 'ci' }, 'KAKAO_REST_API_KEY="local"\nTMDB_API_KEY="movie"'),
    { kakaoKey: 'ci', tmdbKey: 'movie' });
});
test('partial failure retains old items and date, but advances successful categories', async () => {
  const result = await syncBestsellers({ existing: baseline(), now, collect: async (locale, key) => {
    if (locale === 'ko' && key === 'ALL') throw new Error('source unavailable');
    return items(`${locale}-${key}-new`);
  }, log: () => {} });
  assert.equal(result.failed.length, 1);
  assert.equal(result.data.updated_at, oldDate);
  assert.equal(result.data.ko.categories.ALL[0].title, 'ko-ALL-old');
  assert.equal(result.data.ko.category_updated_at.ALL, oldDate);
  assert.equal(result.data.en.category_updated_at.ALL, now);
  assert.equal(Object.keys(result.data.ko.categories).length, 8);
});
test('empty and malformed sources fail rather than replacing old rows', async () => {
  for (const rows of [[], [{ title: 'missing id/rank' }], items('short').slice(0, 5)]) {
    const result = await syncBestsellers({ existing: baseline(), now, collect: async () => rows, log: () => {} });
    assert.equal(result.failed.length, 16);
    assert.equal(result.data.updated_at, oldDate);
  }
});
test('CLI writes validated partial data to requested output and returns failure', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'library-sync-test-'));
  const input = path.join(dir, 'input.json');
  const output = path.join(dir, 'output.json');
  fs.writeFileSync(input, JSON.stringify(baseline()));
  const before = fs.readFileSync(input, 'utf8');
  try {
    const status = await runCli(['--output', output], { input, now, collect: async () => [], log: () => {} });
    assert.equal(status, 1);
    assert.equal(fs.readFileSync(input, 'utf8'), before);
    assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).updated_at, oldDate);
    const moduleUrl = new URL('./sync-bestsellers.mjs', import.meta.url).href;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e',
      `import { runCli } from ${JSON.stringify(moduleUrl)}; process.exitCode = await runCli([], { input: ${JSON.stringify(output)}, collect: async () => [], log: () => {} });`]);
    assert.equal(child.status, 1, child.stderr.toString());
    assert.deepEqual(fs.readdirSync(dir).sort(), ['input.json', 'output.json']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('all sources successful advances global date and returns success', async () => {
  const result = await syncBestsellers({ existing: baseline(), now, collect: async () => items('new'), log: () => {} });
  assert.equal(result.failed.length, 0);
  assert.equal(result.data.updated_at, now);
});
test('missing required API keys fail without contacting sources', async () => {
  await assert.rejects(collectBooks('ko', 'ALL', ''), /KAKAO_REST_API_KEY/);
  await assert.rejects(collectMedia('en', 'VIDEO', ''), /TMDB_API_KEY/);
});
test('unmatched Korean metadata is not attached to the chart book', async t => {
  t.mock.method(globalThis, 'fetch', async url => String(url).includes('aladin.co.kr')
    ? new Response('<div class="ss_book_box"><a class="bo3">Original Book</a></div>')
    : Response.json({ documents: [{ title: 'Other Book', authors: ['Wrong Author'], thumbnail: 'wrong.jpg' }] }));
  const result = await collectBooks('ko', 'ALL', 'test-key');
  assert.equal(result[0].title, 'Original Book');
  assert.equal(result[0].creator, '');
  assert.equal(result[0].title_en, null);
  assert.equal(result[0].thumbnail_url, null);
});
test('TMDB person rows are excluded and displayed language is retained', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ results: [
    { id: 1, media_type: 'person', name: 'Actor' },
    { id: 2, media_type: 'movie', title: 'English title', original_title: 'Original title' },
  ] }));
  const result = await collectMedia('en', 'VIDEO', 'test-key');
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'English title');
  assert.equal(result[0].rank, 1);
});
test('Steam duplicate rows keep their first occurrence, hardware is excluded and ranks are contiguous', async t => {
  const fixture = [
    { id: 10, type: 0, name: 'First game' },
    { id: 11, type: 1, name: 'Supporter edition' },
    { id: 20, type: 0, name: 'Device' },
    { id: 20, type: 0, name: 'Device repeated' },
    { id: 10, type: 0, name: 'Duplicate game' },
    ...[30, 40, 50, 60].map(id => ({ id, type: 0, name: `Game ${id}` })),
  ];
  const requested = [];
  t.mock.method(globalThis, 'fetch', async url => {
    const id = new URL(url).searchParams.get('appids');
    if (!id) return Response.json({ top_sellers: { items: fixture } });
    requested.push(Number(id));
    return Response.json({ [id]: { success: true, data: { type: id === '20' ? 'hardware' : 'game' } } });
  });
  const result = await collectMedia('en', 'GAME', '');
  assert.deepEqual(result.map(item => item.id), [10, 11, 30, 40, 50, 60].map(id => `steam-game-${id}`));
  assert.deepEqual(result.map(item => item.rank), [1, 2, 3, 4, 5, 6]);
  assert.equal(result[0].title, 'First game');
  assert.equal(requested.filter(id => id === 20).length, 1);
  assert.ok(!requested.includes(11));
});
