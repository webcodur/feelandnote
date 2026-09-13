/** Add the required category hierarchy, then assign only recorded posts through list bulk changes. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { CATEGORY_TREE } from './lib/categories.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic, assertPostIdentity } from './lib/post-state.mjs';
import { PUBLICATION_REQUESTS, pauseRequests } from './lib/publication-requests.mjs';
import { ensureCategories, openCategoryPage, readCategoryRows, assertCategoryOnly, bulkCategory } from './lib/category-admin.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const STATE = path.join(DIR, '_posts.json');

export async function main(args = process.argv.slice(2)) {
  const allowed = new Set(['--plan', '--run', '--structure-only', '--id']);
  let id = null;
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw new Error(`지원하지 않는 옵션: ${args[i]}`);
    if (args[i] === '--id') { id = Number(args[++i]); if (!Number.isSafeInteger(id) || id < 1) throw new Error('실제 글 번호가 필요하다.'); }
  }
  if (args.includes('--plan') && args.includes('--run')) throw new Error('--plan과 --run을 함께 쓰지 않는다.');
  const posts = loadPosts(STATE);
  const targets = posts.filter(p => p.id && (id == null || p.id === id));
  if (id != null && !targets.length) throw new Error(`원장에 #${id}가 없다.`);
  const meta = new Map(targets.map(p => {
    const value = JSON.parse(fs.readFileSync(path.join(DIR, `_meta-${p.name}.json`), 'utf8'));
    if (!Array.isArray(value.categoryPath) || value.categoryPath.length !== 2 || !CATEGORY_TREE.some(c => c.name === value.categoryPath[0] && c.children.includes(value.categoryPath[1]))) throw new Error(`${p.name}: 분류 메타가 없다. 먼저 메타를 갱신해야 한다.`);
    return [p.id, value];
  }));
  const counts = {};
  for (const value of meta.values()) { const key = value.categoryPath.join(' / '); counts[key] = (counts[key] ?? 0) + 1; }
  console.log(JSON.stringify({ event: 'plan', posts: targets.length, categories: CATEGORY_TREE.reduce((n,c) => n + 1 + c.children.length, 0), counts }));
  if (!args.includes('--run')) return;

  const { browser } = await getBrowser();
  const backup = path.join(DIR, '_backup', `categories-${Date.now()}-${process.pid}.json`);
  const snapshot = { tree: null, posts: [] };
  const preserve = () => { fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.writeFileSync(backup, JSON.stringify(snapshot, null, 2) + '\n', 'utf8'); };
  try {
    const page = await getTistoryPage(browser); await ensureLoggedIn(page);
    const structure = await ensureCategories(page, CATEGORY_TREE, { beforeSave: (before) => { snapshot.tree = before; preserve(); } });
    snapshot.tree ??= structure.tree;
    console.log(JSON.stringify({ event: 'categories', added: structure.added, total: structure.tree.reduce((n,c) => n+1+c.children.length, 0) }));
    if (args.includes('--structure-only')) return;

    await pauseRequests(page, PUBLICATION_REQUESTS.listPageMs);
    await openCategoryPage(page, 1);
    const numbers = await page.evaluate(() => [...new Set([1, ...[...document.querySelectorAll('.wrap_paging a[href]')].map(a => Number(new URL(a.href).searchParams.get('page'))).filter(n => Number.isInteger(n) && n > 0)])].sort((a,b) => a-b));
    const pages = new Map(); const found = new Set();
    for (const number of numbers) {
      if (number !== 1) await pauseRequests(page, PUBLICATION_REQUESTS.listPageMs);
      const rows = number === 1 ? await readCategoryRows(page) : await openCategoryPage(page, number);
      pages.set(number, rows);
      for (const row of rows) {
        if (found.has(row.id)) throw new Error(`글 목록 ID 중복 #${row.id}`);
        found.add(row.id);
        const expected = targets.find(p => p.id === row.id);
        if (expected) assertPostIdentity(expected, row.title, meta.get(row.id).title);
      }
      const more = await page.evaluate(() => [...document.querySelectorAll('.wrap_paging a[href]')].map(a => Number(new URL(a.href).searchParams.get('page'))).filter(n => Number.isInteger(n) && n > 0));
      for (const next of more) if (!numbers.includes(next)) numbers.push(next);
      if (numbers.length > 100) throw new Error('관리 목록이 100쪽을 넘었다. 분류 변경을 중단한다.');
    }
    if (targets.some(p => !found.has(p.id))) throw new Error('대상 글이 전체 목록에서 누락됐다. 분류 변경을 중단한다.');
    snapshot.posts = [...pages.values()].flat(); preserve();

    let changed = 0; let verified = 0;
    for (const [number, original] of pages) {
      const here = original.filter(row => meta.has(row.id)); if (!here.length) continue;
      await pauseRequests(page, PUBLICATION_REQUESTS.listPageMs);
      const current = await openCategoryPage(page, number);
      assertCategoryOnly(original, current, [], '');
      const groups = new Map();
      for (const row of here) {
        const categoryPath = meta.get(row.id).categoryPath; const key = categoryPath.join('/');
        if (!groups.has(key)) groups.set(key, { categoryPath, ids: [] });
        if (row.category !== categoryPath.join('/')) groups.get(key).ids.push(row.id);
      }
      for (const group of groups.values()) {
        if (!group.ids.length) continue;
        const changedRows = await bulkCategory(page, group.ids, group.categoryPath);
        await pauseRequests(page, PUBLICATION_REQUESTS.listPageMs);
        const rows = await openCategoryPage(page, number);
        assertCategoryOnly(changedRows, rows, [], '');
        for (const id of group.ids) if (rows.find(r => r.id === id)?.category !== group.categoryPath.join('/')) throw new Error(`#${id}의 분류가 새 조회에 남지 않았다.`);
        const state = loadPosts(STATE);
        for (const id of group.ids) {
          const record = state.find(p => p.id === id); if (!record) throw new Error(`검증 후 원장에서 #${id}가 사라졌다.`);
          record.category = group.categoryPath[1]; record.categoryPath = group.categoryPath;
        }
        savePostsAtomic(STATE, state);
        changed += group.ids.length;
        console.log(JSON.stringify({ event: 'assigned', page: number, category: group.categoryPath.join(' / '), count: group.ids.length }));
      }
      const after = await readCategoryRows(page);
      const expected = original.map(row => meta.has(row.id) ? { ...row, category: meta.get(row.id).categoryPath.join('/') } : row);
      assertCategoryOnly(expected, after, [], '');
      const state = loadPosts(STATE); let repair = false;
      for (const row of here) {
        const record = state.find(p => p.id === row.id); if (!record) throw new Error(`원장에서 #${row.id}가 사라졌다.`);
        const value = meta.get(row.id);
        if (record.category !== value.categoryPath[1] || JSON.stringify(record.categoryPath) !== JSON.stringify(value.categoryPath)) {
          record.category = value.categoryPath[1]; record.categoryPath = value.categoryPath; repair = true;
        }
      }
      if (repair) savePostsAtomic(STATE, state);
      verified += here.length;
    }
    console.log(JSON.stringify({ event: 'finished', changed, verified, backup }));
  } finally { await browser.disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await main(); } catch (error) { console.error(`STOP: ${error.message}`); process.exitCode = 1; }
}
