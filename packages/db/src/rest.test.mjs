import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from './index.mjs';

function fixture(response = () => Response.json([])) {
  const requests = [];
  const db = createClient('https://db.example.test', 'public-test-key', {
    global: { fetch: async (url, init) => { requests.push({ url: new URL(url), ...init }); return response(); } },
  });
  return { db, requests };
}

test('read filters, nested ordering and inclusive ranges follow the REST protocol', async () => {
  const { db, requests } = fixture(() => new Response('[{"id":"one"}]', { headers: { 'Content-Range': '20-39/87' } }));
  const result = await db.from('celebs').select('id, books(title, "display name")', { count: 'exact' })
    .eq('nationality', 'KR').not('slug', 'is', null).or('name.ilike.*김*,name_en.ilike.*Kim*')
    .order('id', { ascending: false }).order('title', { referencedTable: 'books', nullsFirst: true }).range(20, 39);
  const req = requests[0];
  assert.equal(req.method, 'GET');
  assert.equal(req.url.pathname, '/rest/v1/celebs');
  assert.equal(req.url.searchParams.get('select'), 'id,books(title,"display name")');
  assert.equal(req.url.searchParams.get('nationality'), 'eq.KR');
  assert.equal(req.url.searchParams.get('slug'), 'not.is.null');
  assert.equal(req.url.searchParams.get('or'), '(name.ilike.*김*,name_en.ilike.*Kim*)');
  assert.equal(req.url.searchParams.get('books.order'), 'title.asc.nullsfirst');
  assert.equal(req.url.searchParams.get('offset'), '20');
  assert.equal(req.url.searchParams.get('limit'), '20');
  assert.equal(req.headers.get('Prefer'), 'count=exact');
  assert.equal(result.count, 87);
  assert.deepEqual(result.data, [{ id: 'one' }]);
});

test('IN values quote reserved punctuation and preserve Unicode', async () => {
  const { db, requests } = fixture();
  await db.from('contents').select().in('title', ['향연', 'a,b', '(x)', 'say "yes"', 'a\\b', '향연']);
  assert.equal(requests[0].url.searchParams.get('title'), 'in.(향연,"a,b","(x)","say \\"yes\\"","a\\\\b")');
});

test('writes return no rows unless selected, and bulk upserts include all columns', async () => {
  const { db, requests } = fixture(() => Response.json([{ id: 'one' }]));
  await db.from('contents').upsert([{ id: 'one' }, { id: 'two', title: '향연' }], { onConflict: 'id', defaultToNull: false }).select('id');
  const req = requests[0];
  assert.equal(req.method, 'POST');
  assert.equal(req.url.searchParams.get('columns'), '"id","title"');
  assert.equal(req.url.searchParams.get('on_conflict'), 'id');
  assert.equal(req.headers.get('Prefer'), 'missing=default,resolution=merge-duplicates,return=representation');
  assert.equal(req.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(req.body), [{ id: 'one' }, { id: 'two', title: '향연' }]);
  await db.from('contents').update({ title: 'New' }).eq('id', 'one');
  assert.equal(requests[1].method, 'PATCH');
  assert.equal(requests[1].headers.get('Prefer'), null);
  await db.from('contents').delete().eq('id', 'one');
  assert.equal(requests[2].method, 'DELETE');
});

test('optional single accepts zero or one row but never hides duplicates', async () => {
  for (const rows of [[], [{ id: 'one' }], [{ id: 'one' }, { id: 'two' }]]) {
    const { db } = fixture(() => Response.json(rows));
    const result = await db.from('celebs').select('id').maybeSingle();
    if (rows.length === 2) { assert.equal(result.error.code, 'PGRST116'); assert.equal(result.data, null); }
    else { assert.equal(result.error, null); assert.deepEqual(result.data, rows[0] ?? null); }
  }
  const { db, requests } = fixture(() => new Response('{"code":"PGRST116","message":"no row"}', { status: 406 }));
  assert.equal((await db.from('celebs').select().single()).error.code, 'PGRST116');
  assert.equal(requests[0].headers.get('Accept'), 'application/vnd.pgrst.object+json');
});

test('RPC uses JSON POST by default and supports GET/head/count explicitly', async () => {
  const { db, requests } = fixture(() => Response.json(true));
  assert.equal((await db.rpc('is_admin', { id: 'one' })).data, true);
  assert.deepEqual(JSON.parse(requests[0].body), { id: 'one' });
  await db.rpc('list', { ids: ['one', 'two'], take: 10 }, { get: true, count: 'exact' });
  assert.equal(requests[1].method, 'GET');
  assert.equal(requests[1].url.searchParams.get('ids'), '{one,two}');
  const head = await db.from('celebs').select('id', { count: 'exact', head: true });
  assert.equal(requests[2].method, 'HEAD');
  assert.equal(head.data, null);
});

test('gateway and network errors are surfaced without replaying reads or writes', async () => {
  for (const operation of [db => db.from('celebs').select(), db => db.from('celebs').update({ name: 'x' }), db => db.rpc('write')]) {
    const { db, requests } = fixture(() => new Response('upstream failed', { status: 503 }));
    assert.match((await operation(db)).error.message, /upstream failed/);
    assert.equal(requests.length, 1);
  }
  const { db } = fixture(() => { throw new DOMException('timed out', 'TimeoutError'); });
  assert.match((await db.from('celebs').select()).error.message, /TimeoutError/);
});

test('session JWT accompanies RLS queries; stateless requests use the API key', async () => {
  const { db, requests } = fixture();
  await db.from('celebs').select();
  assert.equal(requests[0].headers.get('apikey'), 'public-test-key');
  assert.equal(requests[0].headers.get('Authorization'), 'Bearer public-test-key');
  await db.auth.saveSession({ access_token: 'jwt-test', refresh_token: 'refresh-test', expires_in: 3600, user: { id: 'one' } });
  await db.from('member_contents').select();
  assert.equal(requests[1].headers.get('Authorization'), 'Bearer jwt-test');
});
