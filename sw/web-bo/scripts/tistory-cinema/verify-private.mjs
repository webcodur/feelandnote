/**
 * 글이 실제로 비공개인지 **서버에서** 확인한다. 대장을 믿지 않는다.
 *
 *   node scripts/tistory-cinema/verify-private.mjs
 *
 * 두 곳을 함께 본다.
 * 1. **관리 목록** — 제목 앞의 `[예약]` 표가 남아 있으면 아직 공개 예정이다.
 * 2. **공개 주소** — 비공개 글은 남이 열 수 없어야 한다. 200 이 돌아오면 열려 있다는 뜻이다.
 *
 * 목록만 보면 화면 표시가 늦게 갱신된 것을 성공으로 오해할 수 있고, 주소만 보면 로그인한
 * 브라우저에서는 자기 글이 열려 실패를 놓친다. 그래서 주소는 **로그인 없는 요청**으로 본다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn, BLOG } from './lib/browser.mjs';
import { loadPosts } from './lib/post-state.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normUrl = (u) => { try { return decodeURI(new URL(u).pathname); } catch { return String(u ?? ''); } };

/** 관리 목록을 끝까지 훑어 제목 앞의 상태 표를 모은다. */
async function readAllPages(page, maxSheets = 12) {
  const seen = new Map();
  for (let sheet = 1; sheet <= maxSheets; sheet += 1) {
    await page.goto(`https://${BLOG}.tistory.com/manage/posts/?page=${sheet}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(2000);
    const rows = await page.evaluate(() => [...document.querySelectorAll('a.link_cont')]
      .map((el) => ({ url: el.href, title: el.textContent.trim() })));
    if (!rows.length) break;
    let fresh = 0;
    for (const row of rows) {
      const key = normUrl(row.url);
      if (!seen.has(key)) { seen.set(key, row); fresh += 1; }
    }
    if (!fresh) break;   // 같은 쪽이 반복되면 끝이다
  }
  return seen;
}

/** 로그인 없는 요청으로 공개 주소를 두드린다. 비공개면 열리지 않아야 한다. */
async function publiclyOpen(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
    if (!res.ok) return { open: false, status: res.status };
    const html = await res.text();
    // 티스토리는 비공개 글에 200 과 함께 안내 화면을 주기도 한다. 본문 표지로 가른다.
    const hasArticle = /property="og:title"/i.test(html) && /entry|article/i.test(html);
    return { open: hasArticle, status: res.status };
  } catch (error) {
    return { open: false, status: `요청 실패: ${error.message}` };
  }
}

export async function main() {
  const posts = loadPosts(path.join(DIR, '_posts.json'));
  const { browser } = await getBrowser();
  const problems = [];
  try {
    const page = await getTistoryPage(browser);
    await ensureLoggedIn(page);
    const seen = await readAllPages(page);
    console.log(`관리 목록에서 ${seen.size}편을 읽었다. 대장 ${posts.length}편과 대조한다.`);

    for (const post of posts) {
      const row = post.url ? seen.get(normUrl(post.url)) : null;
      if (!row) { problems.push({ post, why: '관리 목록에서 찾지 못했다' }); continue; }
      if (/^\[예약\]/.test(row.title)) problems.push({ post, why: `목록에 아직 [예약]로 보인다: ${row.title.slice(0, 40)}` });
    }
    console.log(`목록 확인 — 문제 ${problems.length}건`);

    console.log('공개 주소를 로그인 없이 두드린다…');
    let openCount = 0;
    for (const post of posts) {
      if (!post.url) continue;
      const { open, status } = await publiclyOpen(post.url);
      if (open) { openCount += 1; problems.push({ post, why: `공개 주소가 열린다(HTTP ${status})` }); }
      await wait(300);
    }
    console.log(`주소 확인 — 열리는 글 ${openCount}편`);

    if (problems.length) {
      console.log('\n확인이 필요한 글:');
      problems.forEach(({ post, why }) => console.log(` #${post.id} ${post.name} — ${why}`));
      process.exitCode = 1;
    } else {
      console.log(`\n${posts.length}편 모두 비공개다. 목록에 [예약]이 없고 공개 주소도 열리지 않는다.`);
    }
  } finally { browser.disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
