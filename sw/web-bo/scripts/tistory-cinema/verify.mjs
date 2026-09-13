/** 실제 ID로 저장 본문을 확인한 뒤, 예약글은 편집기에서, 발행글은 공개 페이지에서 레이아웃을 잰다. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn } from './lib/browser.mjs';
import { loadPosts } from './lib/post-state.mjs';
import { auditOne, selectAuditPosts } from './audit-posted.mjs';
import { loadEditor } from './lib/post-integrity.mjs';

export async function main(args = process.argv.slice(2)) {
  if (!args.length) throw new Error('실제 글 번호 또는 --all이 필요하다');
  const posts = selectAuditPosts(loadPosts(path.join(ASSETS, 'tistory-cinema/_posts.json')), args);
  const { browser } = await getBrowser();
  try {
    const page = await getTistoryPage(browser); await ensureLoggedIn(page);
    for (const post of posts) {
      const audit = await auditOne(page, post);
      if (!audit.ok) { console.log(`#${post.id} 저장 내용 불일치: ${JSON.stringify(audit.issues)}`); process.exitCode = 1; }
      const scheduled = audit.actual.at && new Date(`${audit.actual.at.replace(' ', 'T')}:00+09:00`).getTime() > Date.now();
      if (scheduled) await loadEditor(page, post.id);
      else {
        if (!audit.actual.url) throw new Error(`#${post.id} 공개 주소를 읽지 못했다`);
        await page.goto(audit.actual.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.area-view, .tt_article_useless_p_margin, .entry-content', { timeout: 20000 });
      }
      const layout = await page.evaluate((inEditor) => {
        const view = inEditor ? document.querySelector('#editor-tistory_ifr')?.contentDocument?.body : document.querySelector('.area-view, .tt_article_useless_p_margin, .entry-content');
        if (!view) throw new Error('실제 본문 영역이 없다');
        const ownerWindow = view.ownerDocument.defaultView;
        const width = (el) => Math.round(el.getBoundingClientRect().width);
        return {
          width: width(view),
          images: [...view.querySelectorAll('img')].map((el) => ({ width: width(el), loaded: el.complete && el.naturalWidth > 0 })),
          headings: [...view.querySelectorAll('h2,h3')].map((el) => ({ text: el.textContent.trim().slice(0, 35), align: ownerWindow.getComputedStyle(el).textAlign })),
          videos: [...view.querySelectorAll('iframe')].map((el) => ({ width: width(el), height: Math.round(el.getBoundingClientRect().height) })),
          paragraphPadding: [...new Set([...view.querySelectorAll('p')].slice(0, 6).map((el) => ownerWindow.getComputedStyle(el).paddingBottom))],
        };
      }, Boolean(scheduled));
      const warnings = [];
      if (!scheduled && layout.width < 600) warnings.push(`본문 폭 ${layout.width}px`);
      if (layout.videos.some((video) => video.width === 300)) warnings.push('예고편 폭이 300px이다');
      console.log(`#${post.id} ${post.name} · ${scheduled ? '예약글 편집기 측정: 공개 스킨은 발행 후 검증' : '공개 페이지 측정'}\n${JSON.stringify(layout)}${warnings.length ? '\n확인 필요: ' + warnings.join(', ') : ''}`);
      if (warnings.length) process.exitCode = 1;
    }
  } finally { browser.disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
