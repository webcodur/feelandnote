/** 관리 목록의 실제 편집 링크와 전체 제목으로 글 번호를 대응한다. --yes일 때만 대장을 저장한다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic } from './lib/post-state.mjs';
import { listManagedPosts, mapPostIdentities, readPost } from './lib/post-integrity.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
export async function main(args = process.argv.slice(2)) {
  if (args.some((arg) => !['--yes'].includes(arg))) throw new Error('지원 옵션은 --yes뿐이다. 글 번호 범위를 추측해 순회하지 않는다');
  const statePath = path.join(DIR, '_posts.json'); const posts = loadPosts(statePath);
  const metaTitles = Object.fromEntries(posts.map((post) => [post.name, JSON.parse(fs.readFileSync(path.join(DIR, `_meta-${post.name}.json`), 'utf8')).title]));
  const { browser } = await getBrowser();
  try {
    const page = await getTistoryPage(browser); await ensureLoggedIn(page);
    const listed = await listManagedPosts(page);
    // List titles can be truncated. Confirm the full title only for IDs from actual edit links.
    const found = [];
    for (const row of listed) {
      const actual = await readPost(page, row.id);
      found.push({ ...row, ...actual });
      console.log(`#${actual.id} ${actual.title} · ${actual.at ?? '예약 없음'}`);
    }
    const mapped = mapPostIdentities(posts, found, metaTitles);
    const used = new Set(mapped.map((post) => post.id));
    const extra = found.filter((row) => !used.has(row.id));
    console.log(`원고 ${mapped.length}편의 실제 번호가 유일하게 대응한다. 대장 밖 글 ${extra.length}편`);
    for (const row of extra) console.log(`대장 밖 #${row.id} ${row.title}`);
    for (let index = 0; index < mapped.length; index++) if (mapped[index].id !== posts[index].id) console.log(`${mapped[index].name}: ${posts[index].id ?? '없음'} → ${mapped[index].id}`);
    if (args.includes('--yes')) { savePostsAtomic(statePath, mapped); console.log('기존 대장을 백업하고 실제 번호를 원자적으로 저장했다'); }
    else console.log('미리보기다. --yes를 붙이면 실제 번호를 대장에 반영한다');
  } finally { browser.disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
