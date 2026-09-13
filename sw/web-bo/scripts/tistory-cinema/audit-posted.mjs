/** 저장된 편집기 본문·제목·예약시각·주소를 읽기 전용으로 원고/대장과 대조한다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn, BLOG } from './lib/browser.mjs';
import { loadPosts, requirePostId, assertPostIdentity } from './lib/post-state.mjs';
import { readPost, compareHtml, sameTags } from './lib/post-integrity.mjs';
import { kindOf } from './lib/schedule.mjs';
import { categoryForMeta } from './lib/categories.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');

export function selectAuditPosts(posts, args) {
  if (args.some((arg) => arg !== '--all' && !/^\d+$/.test(arg))) throw new Error('실제 글 번호 또는 --all만 지정한다');
  const ids = args.filter((arg) => /^\d+$/.test(arg)).map(Number);
  const selected = ids.length ? ids.map((id) => {
    const row = posts.find((post) => post.id === id);
    if (!row) throw new Error(`실제 글 번호 ${id}가 대장에 없다`);
    return row;
  }) : posts;
  selected.forEach(requirePostId);
  return selected;
}

export async function auditOne(page, post, { dir = DIR } = {}) {
  const id = requirePostId(post);
  const local = fs.readFileSync(path.join(dir, `_body-${post.name}.html`), 'utf8');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, `_meta-${post.name}.json`), 'utf8'));
  const actual = await readPost(page, id);
  const comparison = await compareHtml(page, local, actual.html);
  const issues = [...comparison.issues];
  try { assertPostIdentity(post, actual.title, meta.title); } catch (error) { issues.push({ field: 'identity', actual: error.message }); }
  if (actual.title.trim() !== meta.title?.trim()) issues.push({ field: 'title', expected: meta.title, actual: actual.title });
  if (!sameTags(meta.tags ?? [], actual.tags)) issues.push({ field: 'tags', expected: meta.tags ?? [], actual: actual.tags });
  const expected = expectedPublication(post);
  if (actual.at !== expected.at) issues.push({ field: 'at', expected: expected.at, actual: actual.at });
  const expectedCategory = categoryForMeta(meta, kindOf(post.name));
  if (actual.category !== expectedCategory) issues.push({ field: 'category', expected: expectedCategory, actual: actual.category });
  if (actual.visibility !== expected.visibility) issues.push({ field: 'visibility', expected: expected.visibility, actual: actual.visibility });
  if (!actual.url || !actual.slug) issues.push({ field: 'url', expected: '실제 공개 주소', actual: actual.url });
  const publicRecorded = (() => { try { const url = new URL(post.url); return url.hostname === `${BLOG}.tistory.com` && !url.pathname.startsWith('/manage/') ? url : null; } catch { return null; } })();
  if (!publicRecorded) issues.push({ field: 'recordedUrl', expected: actual.url, actual: post.url ?? null });
  else if (decodeURI(publicRecorded.href) !== decodeURI(actual.url ?? '')) issues.push({ field: 'url', expected: post.url, actual: actual.url });
  return { id, name: post.name, ok: issues.length === 0, issues, comparison, actual };
}

export function expectedPublication(post) {
  const visibility = post.visibility ?? 'open20';
  return { visibility, at: visibility === 'open0' ? null : post.at ?? null };
}

export async function main(args = process.argv.slice(2)) {
  const posts = selectAuditPosts(loadPosts(path.join(DIR, '_posts.json')), args);
  const { browser } = await getBrowser(); const results = [];
  try {
    const page = await getTistoryPage(browser); await ensureLoggedIn(page);
    for (const post of posts) {
      const result = await auditOne(page, post); results.push(result);
      console.log(`${result.ok ? '통과' : '확인 필요'} #${post.id} ${post.name} · ${result.actual.at ?? '예약 없음'} · ${result.actual.url}`);
      for (const issue of result.issues) console.log(`  ${JSON.stringify(issue)}`);
    }
  } finally { browser.disconnect(); }
  const failed = results.filter((result) => !result.ok).length;
  console.log(`실제 ID로 검사 ${results.length}편 · 불일치 ${failed}편. 저장/입력하지 않았다.`);
  if (failed) process.exitCode = 1;
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
