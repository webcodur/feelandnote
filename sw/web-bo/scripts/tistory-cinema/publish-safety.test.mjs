import test from 'node:test';
import { parseChallengeCommand } from './lib/challenge-session.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { runJobs, readyNames } from './publish-batch.mjs';
import { parsePublishArgs, assertRemoteInventory, assertPublishedPost, createPublisher } from './publish.mjs';
import { listManagedPosts, findManagedPost, compareHtml } from './lib/post-integrity.mjs';
import { PUBLICATION_REQUESTS, waitForAvailablePage } from './lib/publication-requests.mjs';
import { planReconciliation } from './reconcile-posts.mjs';
import { repairSchedule, planSchedule } from './lib/schedule.mjs';
import { nextStart } from './fill-schedule.mjs';
import { acquireBrowserLock } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic, assertPostIdentity, hasActiveSchedule, assertScheduleUnique, applyVerifiedPost } from './lib/post-state.mjs';
import { parseArgs as parseVisibilityArgs, planChanges } from './set-visibility.mjs';
import { expectedPublication } from './audit-posted.mjs';

const now = new Date('2026-09-06T00:00:00Z').getTime();
const jobs = ['a', 'b', 'c'].map((name, i) => ({ name, at: '2026-09-25 ' + ['09:00', '12:00', '18:00'][i] }));

test('missing server reservations and incomplete management lists cannot be adopted as success', () => {
  const record = { id: 1, name: 'a', title: 'A', at: '2026-09-07 09:00' };
  const audit = { id: 1, name: 'a', actual: { id: 1, title: 'A', at: null }, comparison: { ok: true }, issues: [{ field: 'at' }] };
  assert.throws(() => planReconciliation([record], [audit], { now }), /예약이 서버에서 사라졌다/);
  assert.throws(() => assertRemoteInventory([record], []), /확인하지 못했다/);
  assert.throws(() => assertRemoteInventory([record], [{ id: 1, title: '수정' }]), /완전히 읽지 못했다/);
  assert.throws(() => assertRemoteInventory([record], [{ id: 1, title: 'Different' }]), /확인하지 못했다/);
  assert.doesNotThrow(() => assertRemoteInventory([record], [{ id: 1, title: 'A' }]));
});

test('recovered posts must be public and in the intended category with a public address', () => {
  const meta = { title: 'A', categoryPath: ['이 영화를 감상한 셀럽', '드라마'], category: '드라마' };
  const actual = { id: 55, title: 'A', at: null, visibility: 'open20', category: '드라마', url: 'https://feelandnote-cinema.tistory.com/entry/a' };
  assert.doesNotThrow(() => assertPublishedPost(actual, meta, 'a', null));
  assert.throws(() => assertPublishedPost({ ...actual, visibility: 'open0' }, meta, 'a', null), /공개 상태/);
  assert.throws(() => assertPublishedPost({ ...actual, category: 'wrong' }, meta, 'a', null), /카테고리/);
  assert.throws(() => assertPublishedPost({ ...actual, category: meta.categoryPath[0] }, meta, 'a', null), /카테고리/);
  assert.throws(() => assertPublishedPost(actual, { title: 'A' }, 'a', null), /카테고리 메타/);
  assert.throws(() => assertPublishedPost({ ...actual, url: 'https://feelandnote-cinema.tistory.com/manage/posts/' }, meta, 'a', null), /공개 주소/);
});

test('first editor failure reports the original error and stops without a counter ReferenceError', async () => {
  let attempts = 0;
  const result = await runJobs(jobs, { state: [], save: () => assert.fail('must not save'), log: () => {}, publish: async () => { attempts++; throw new Error('editor failure'); } });
  assert.equal(attempts, 1);
  assert.equal(result.done, 0);
  assert.equal(result.failed.message, 'editor failure');
});

test('partial success then quota failure never publishes the third job', async () => {
  let attempts = 0; const saved = []; const state = [];
  const result = await runJobs(jobs, { state, save: (next) => saved.push([...next]), log: () => {}, publish: async (job) => {
    if (++attempts === 2) throw new Error('daily quota');
    return { ...job, id: 51 };
  } });
  assert.equal(attempts, 2);
  assert.equal(result.done, 1);
  assert.equal(result.failed.message, 'daily quota');
  assert.equal(state.length, 1);
  assert.equal(saved.length, 1);
});

test('missing remote ID or local save failure stops without adding a successful record', async () => {
  const first = await runJobs(jobs, { state: [], save: () => assert.fail('unverified result'), log: () => {}, publish: async (job) => job });
  assert.equal(first.done, 0);
  assert.match(first.failed.message, /글 번호/);
  const state = [];
  const second = await runJobs(jobs, { state, log: () => {}, publish: async (job) => ({ ...job, id: 10 }), save: () => { throw new Error('disk failure'); } });
  assert.equal(second.failed.message, 'disk failure');
  assert.equal(state.length, 0);
});

test('draft and unrecognized CLI options are rejected before browser startup', () => {
  assert.throws(() => parsePublishArgs(['--file', 'a', '--draft']), /--draft/);
  const result = spawnSync(process.execPath, [path.join(import.meta.dirname, 'publish.mjs'), '--file', 'a', '--draft'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--draft/);
  assert.doesNotMatch(result.stdout, /크롬/);
});

test('three colliding posts are moved into the two vacant slots without moving valid reservations', () => {
  const posts = [];
  for (let day = 7; day <= 24; day++) for (const time of ['09:00', '12:00', '18:00']) {
    if (day >= 23 && time === '18:00') continue;
    posts.push({ id: posts.length + 1, name: 'p' + posts.length, at: '2026-09-' + String(day).padStart(2, '0') + ' ' + time });
  }
  posts.push({ id: 53, name: 'duplicate-a', at: '2026-09-24 09:00' }, { id: 54, name: 'duplicate-b', at: '2026-09-24 09:00' });
  const changes = repairSchedule(posts, { now });
  assert.deepEqual(changes.map((p) => p.at), ['2026-09-23 18:00', '2026-09-24 18:00']);
  assert.deepEqual(changes.map((p) => p.name), ['duplicate-a', 'duplicate-b']);
  const fixed = posts.map((p) => ({ ...p, at: changes.find((c) => c.id === p.id)?.at ?? p.at }));
  assert.equal(nextStart(fixed, now), '2026-09-25');
  assert.equal(new Set(fixed.map((p) => p.at)).size, 54);
});

test('overlapping start skips occupied slots and fills a partial day', () => {
  const posts = [{ id: 1, name: 'existing', at: '2026-09-25 09:00' }];
  const plan = planSchedule(['a', 'b'], posts, { start: '2026-09-25', days: 1, now });
  assert.deepEqual(plan.map((p) => p.at), ['2026-09-25 12:00', '2026-09-25 18:00']);
  assert.throws(() => planSchedule(['c'], [...posts, { id: 2, name: 'other', at: posts[0].at }], { start: '2026-09-25', now }), /중복/);
});

test('state saves keep an original backup and identity cannot fall back to position or title prefix', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-state-test-'));
  try {
    const file = path.join(dir, '_posts.json');
    const posts = [{ id: 53, name: 'p', title: 'Exact | subtitle', at: '2026-09-25 09:00' }];
    savePostsAtomic(file, posts);
    savePostsAtomic(file, [...posts, { id: 54, name: 'q' }]);
    assert.equal(loadPosts(file).length, 2);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, '_backup', fs.readdirSync(path.join(dir, '_backup'))[0]), 'utf8')), posts);
    assert.throws(() => assertPostIdentity({ name: 'p', title: 'Exact' }, 'Exact'), /글 번호/);
    assert.throws(() => assertPostIdentity(posts[0], 'Exact | other'), /신원 불일치/);
  } finally {
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-state-test-'));
    fs.rmSync(dir, { recursive: true });
  }
});

test('old live lock is not stolen and release never removes a replacement owner', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-lock-test-'));
  try {
    const file = path.join(dir, 'browser.lock');
    fs.writeFileSync(file, 'worker pid=' + process.pid);
    fs.utimesSync(file, new Date(0), new Date(0));
    assert.throws(() => acquireBrowserLock(file), /다른 티스토리 작업/);
    fs.unlinkSync(file);
    const release = acquireBrowserLock(file);
    fs.writeFileSync(file, 'new owner');
    release();
    assert.equal(fs.readFileSync(file, 'utf8'), 'new owner');
  } finally {
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-lock-test-'));
    fs.rmSync(dir, { recursive: true });
  }
});
test('interactive challenge input rejects missing or stale screen identities', () => {
  assert.deepEqual(parseChallengeCommand('{"challenge":3,"answer":"가"}', 3), { challenge: 3, answer: '가' });
  assert.throws(() => parseChallengeCommand('{"challenge":2,"answer":"가"}', 3), /현재 화면/);
  assert.throws(() => parseChallengeCommand('{"answer":"가"}', 3), /현재 화면/);
  assert.throws(() => parseChallengeCommand('{"challenge":3,"answer":""}', 3), /답변/);
  assert.deepEqual(parseChallengeCommand('{"capture":true}', undefined), { capture: true });
});

test('private historical dates occupy no slot, while legacy public dates still do', () => {
  const posts = [
    { id: 1, name: 'private-a', visibility: 'open0', at: '2026-09-25 09:00' },
    { id: 2, name: 'private-b', visibility: 'open0', at: '2026-09-25 09:00' },
    { id: 3, name: 'legacy', at: '2026-09-25 12:00' },
  ];
  assert.doesNotThrow(() => assertScheduleUnique(posts));
  assert.equal(hasActiveSchedule(posts[0]), false);
  assert.equal(hasActiveSchedule(posts[2]), true);
  assert.equal(hasActiveSchedule({ at: '2026-02-30 09:00' }), false);
  assert.equal(hasActiveSchedule({ at: '2026-09-25 25:00' }), false);
  assert.equal(nextStart(posts.slice(0, 2), now), '2026-09-07');
  assert.deepEqual(repairSchedule(posts, { now }), []);
  assert.deepEqual(planSchedule(['new-a', 'new-b'], posts, { start: '2026-09-25', days: 1, now }).map((p) => p.at), ['2026-09-25 09:00', '2026-09-25 18:00']);
});

test('restore rebases in memory and a resumed run skips verified public posts', () => {
  const posts = [
    { id: 1, name: 'a', title: 'A', visibility: 'open0', at: '2026-01-01 09:00' },
    { id: 2, name: '인물-b', title: 'B', visibility: 'open0', at: '2026-01-01 09:00' },
    { id: 3, name: 'already-public', visibility: 'open20', at: '2026-09-09 09:00' },
  ];
  const snapshot = JSON.stringify(posts);
  const options = parseVisibilityArgs(['--restore', '--all', '--start', '2026-09-09', '--refresh-body', '--limit', '1']);
  const first = planChanges(posts, options, now);
  assert.equal(first.length, 1);
  assert.equal(first[0].name, '인물-b');
  assert.equal(first[0].plannedAt, '2026-09-09 12:00');
  assert.equal(JSON.stringify(posts), snapshot);
  const resumed = posts.map((post) => post.id === first[0].id ? applyVerifiedPost(post, { ...post, title: 'Latest B', visibility: 'open20', at: first[0].plannedAt }) : post);
  const next = planChanges(resumed, options, now);
  assert.deepEqual(next.map((post) => [post.id, post.plannedAt]), [[1, '2026-09-09 18:00']]);
  assert.throws(() => planChanges(posts, { ...options, start: undefined }, now), /과거 시각/);
  assert.throws(() => parseVisibilityArgs(['--private', '--all', '--refresh-body']), /--restore/);
  assert.throws(() => parseVisibilityArgs(['--restore', '--all', '--limit', '0']), /양의 정수/);
});

test('private body-only verification preserves historical at and auditing expects no server reservation', () => {
  const post = { id: 7, name: 'a', title: 'old', visibility: 'open0', at: '2026-09-07 09:00' };
  const result = applyVerifiedPost(post, { id: 7, title: 'latest', visibility: 'open0', at: null, url: 'https://feelandnote-cinema.tistory.com/entry/a' });
  assert.equal(result.title, 'latest');
  assert.equal(result.at, post.at);
  assert.deepEqual(expectedPublication(result), { visibility: 'open0', at: null });
  assert.deepEqual(expectedPublication({ at: post.at }), { visibility: 'open20', at: post.at });
  const restored = applyVerifiedPost(result, { id: 7, visibility: 'open20', at: '2026-09-09 09:00' });
  assert.equal(restored.at, '2026-09-09 09:00');
  assert.deepEqual(expectedPublication(restored), { visibility: 'open20', at: restored.at });
  assert.throws(() => applyVerifiedPost(post, { id: 8 }), /대응/);
});

test('ready drafts are discovered from files and invalid or duplicate metadata stops planning', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-ready-test-'));
  try {
    fs.writeFileSync(path.join(dir, '_body-a.html'), '<p>A</p>');
    assert.throws(() => readyNames(dir), /ENOENT/);
    fs.writeFileSync(path.join(dir, '_meta-a.json'), JSON.stringify({ title: 'A', tags: ['film'] }));
    assert.deepEqual(readyNames(dir), ['a']);
    fs.writeFileSync(path.join(dir, '_body-b.html'), '<p>B</p>');
    fs.writeFileSync(path.join(dir, '_meta-b.json'), JSON.stringify({ title: 'A', tags: [] }));
    assert.throws(() => readyNames(dir), /제목 중복/);
    fs.writeFileSync(path.join(dir, '_meta-b.json'), JSON.stringify({ title: ' ', tags: [] }));
    assert.throws(() => readyNames(dir), /불완전/);
  } finally {
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-ready-test-'));
    fs.rmSync(dir, { recursive: true });
  }
});

test('a full backlog can span beyond the old 62-day snapshot without a target ledger', () => {
  const names = Array.from({ length: 952 }, (_, i) => '인물-' + i);
  const plan = planSchedule(names, [], { start: '2026-09-09', days: 366, now });
  assert.equal(plan.length, 952);
  assert.equal(new Set(plan.map((job) => job.at.slice(0, 10))).size, 318);
  assert.equal(new Set(plan.map((job) => job.at)).size, 952);
});

function publisherFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-publisher-test-'));
  t.after(() => {
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-publisher-test-'));
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  });
  for (const { name } of jobs) {
    fs.writeFileSync(path.join(dir, `_meta-${name}.json`), JSON.stringify({ title: name.toUpperCase(), tags: ['film'], categoryPath: ['이 영화를 감상한 셀럽', '드라마'], category: '드라마' }));
    fs.writeFileSync(path.join(dir, `_body-${name}.html`), `<p>${name}</p>`);
  }
  const remote = new Map(); const calls = { list: 0, compose: 0, save: 0, find: 0, read: [], pause: [] };
  const actual = (name, at, id) => ({ id, title: name.toUpperCase(), at, visibility: 'open20', category: '드라마', tags: ['film'], url: 'https://feelandnote-cinema.tistory.com/entry/' + name, html: `<p>${name}</p>`, representativeImage: 'https://blog.kakaocdn.net/fixture/' + name });
  const options = {
    dir, recorded: [], log: () => {},
    prepareCover: async (name) => ({ source: 'https://fixture.invalid/' + name, file: 'fixture.jpg' }),
    list: async () => { calls.list++; return [...remote.values()]; },
    compose: async () => { calls.compose++; },
    publish: async (_page, title, at) => { calls.save++; const id = [88, 104, 139][calls.save - 1]; const row = actual(title.toLowerCase(), at, id); remote.set(id, row); return { representativeImage: row.representativeImage }; },
    findSaved: async (_page, title) => { calls.find++; return [...remote.values()].find((row) => row.title === title); },
    read: async (_page, id) => { calls.read.push(id); return remote.get(id); },
    compare: async () => ({ ok: true }), pause: async (ms) => { calls.pause.push(ms); },
  };
  return { options, remote, calls, actual };
}

test('missing child-category metadata stops before composing or saving and poisons that batch session', async (t) => {
  const { options, calls } = publisherFixture(t);
  const file = path.join(options.dir, '_meta-a.json');
  const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
  delete meta.categoryPath;
  fs.writeFileSync(file, JSON.stringify(meta));
  const publish = await createPublisher({}, {}, options);
  await assert.rejects(() => publish(jobs[0].name, jobs[0].at), /카테고리 메타/);
  assert.equal(calls.compose, 0);
  assert.equal(calls.save, 0);
  await assert.rejects(() => publish(jobs[1].name, jobs[1].at), /실패한 발행 세션/);
});

test('three posts read the full four-page inventory once, then reuse the landed list and verify actual IDs', async (t) => {
  const fixture = publisherFixture(t); const { remote, options, calls } = fixture;
  for (let id = 1; id <= 16; id++) remote.set(id, { id, title: 'Existing ' + id });
  options.recorded = [...remote.values()];
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-background-networking'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const origin = 'https://feelandnote-cinema.tistory.com'; const requests = []; const pagePauses = [];
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith('/manage/posts')) return request.abort();
    requests.push(url.href);
    const rows = [...remote.values()].reverse(); const pageNumber = Number(url.searchParams.get('page') ?? 1);
    const links = rows.slice((pageNumber - 1) * 5, pageNumber * 5).map((row) => `<li><a class="link_title" href="${origin}/${row.id}">${row.title}</a><a href="${origin}/manage/post/${row.id}">수정</a></li>`).join('');
    const paging = Array.from({ length: Math.ceil(rows.length / 5) }, (_, i) => `<a href="${origin}/manage/posts/?category=-3&page=${i + 1}&searchKeyword=&searchType=title&visibility=all">${i + 1}</a>`).join('');
    return request.respond({ status: 200, contentType: 'text/html', body: `<ul>${links}</ul><div class="wrap_paging">${paging}</div>` });
  });
  const noDelay = { pause: async (ms) => { pagePauses.push(ms); } };
  options.list = async (target) => { calls.list++; return listManagedPosts(target, { ...noDelay, fromCurrent: true }); };
  options.findSaved = async (target, title) => { calls.find++; return findManagedPost(target, title, noDelay); };
  const save = options.publish;
  options.publish = async (...args) => { const result = await save(...args); await page.goto(origin + '/manage/posts/'); return result; };
  options.compare = compareHtml;
  await page.goto(origin + '/manage/posts/?searchKeyword=filtered');
  requests.length = 0;
  const publish = await createPublisher(page, {}, options);
  const state = [];
  const result = await runJobs(jobs, { state, save: () => {}, log: () => {}, publish: (job) => publish(job.name, job.at) });
  assert.equal(result.done, 3);
  assert.equal(calls.list, 1);
  assert.equal(calls.find, 3);
  assert.deepEqual(calls.read, [88, 104, 139]);
  assert.equal(requests.length, 7); // Four initial pages plus three normal post-save list landings.
  assert.equal(requests[0], origin + '/manage/posts/');
  assert.deepEqual(pagePauses, Array(3).fill(PUBLICATION_REQUESTS.listPageMs));
  assert.deepEqual(calls.pause, Array(2).fill(PUBLICATION_REQUESTS.betweenPostsMs));
  await publish('a', jobs[0].at);
  assert.equal(calls.save, 3); // Verified in-memory ID prevents a second creation.
  assert.equal(calls.list, 1);
  const beforeMissing = requests.length;
  await assert.rejects(findManagedPost(page, 'Absent title', noDelay), /실제 서버 글 번호/);
  assert.equal(requests.length - beforeMissing, 3); // Current page plus all remaining actual pagination links.
  remote.set(200, { id: 200, title: 'Duplicate' }); remote.set(201, { id: 201, title: 'Duplicate | other' });
  await page.goto(origin + '/manage/posts/');
  await assert.rejects(findManagedPost(page, 'Duplicate', noDelay), /같은 제목/);
});

test('incomplete initial inventory and duplicate titles stop before composing any draft', async (t) => {
  const { options, remote, calls } = publisherFixture(t);
  await assert.rejects(createPublisher({}, {}, { ...options, recorded: [{ id: 7, title: 'Missing' }] }), /확인하지 못했다/);
  remote.set(8, { id: 8, title: 'A' }); remote.set(9, { id: 9, title: 'A | other' });
  const publish = await createPublisher({}, {}, options);
  await assert.rejects(publish('a', jobs[0].at), /같은 제목/);
  assert.equal(calls.compose, 0);
});

test('a failed save poisons only that session and a fresh run recovers a real ID without saving twice', async (t) => {
  const { options, remote, calls, actual } = publisherFixture(t);
  const publish = await createPublisher({}, {}, { ...options, publish: async (_page, _title, at) => {
    calls.save++; remote.set(81, actual('a', at, 81)); throw new Error('save result unresolved');
  } });
  const state = [];
  const result = await runJobs(jobs, { state, save: () => assert.fail('unverified write'), log: () => {}, publish: (job) => publish(job.name, job.at) });
  assert.equal(result.done, 0); assert.equal(calls.save, 1); assert.equal(state.length, 0);
  await assert.rejects(publish('b', jobs[1].at), /실패한 발행 세션/);
  const fresh = await createPublisher({}, {}, options);
  const recovered = await fresh('a', jobs[0].at);
  assert.equal(calls.list, 2); assert.equal(calls.save, 1); assert.equal(recovered.id, 81);
  assert.deepEqual(calls.read, [81]);
  assert.equal(recovered.representativeSource, null); // Existing preview alone does not prove its original source.
});

test('missing, conflicting and reopened wrong IDs cannot become saved records', async (t) => {
  for (const failure of ['missing', 'conflict', 'reopened', 'body']) {
    const { options, remote, actual } = publisherFixture(t);
    remote.set(7, { id: 7, title: 'Existing' });
    const publish = await createPublisher({}, {}, {
      ...options,
      findSaved: async () => failure === 'missing' ? { title: 'A' } : { id: failure === 'conflict' ? 7 : 81, title: 'A' },
      read: async () => actual('a', jobs[0].at, failure === 'reopened' ? 82 : 81),
      compare: async () => ({ ok: failure !== 'body', issues: [{ field: 'text' }] }),
    });
    const result = await runJobs(jobs, { state: [], save: () => assert.fail('bad identity written'), log: () => {}, publish: (job) => publish(job.name, job.at) });
    assert.equal(result.done, 0, failure); assert.equal(result.failed.name, 'a', failure);
  }
});

test('displayed access restriction and quota interrupt UI readiness immediately without navigation or retries', async (t) => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-background-networking'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setRequestInterception(true); page.on('request', (request) => request.abort());
  for (const [message, code] of [
    ['과도한 접근 요청으로 블로그 사용이 잠시 중단되었습니다.', 'TISTORY_ACCESS_RESTRICTED'],
    ['하루에 작성할 수 있는 글은 최대 5개까지입니다.', 'TISTORY_POST_LIMIT'],
  ]) {
    await page.setContent('<p id="message"></p>');
    await page.evaluate((message) => setTimeout(() => { document.querySelector('#message').textContent = message; }, 50), message);
    const start = Date.now();
    await assert.rejects(waitForAvailablePage(page, () => false, { timeout: 30000 }), (error) => error.code === code);
    assert.ok(Date.now() - start < 2000);
  }
});
