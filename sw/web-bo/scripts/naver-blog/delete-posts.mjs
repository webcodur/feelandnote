// 네이버 블로그 글을 삭제한다. 대상은 data/naver-blog/posts.json 의 link === 'to-delete' 행이다.
// 사용: node scripts/naver-blog/delete-posts.mjs [최대건수] [--yes]   (sw/web-bo 에서)
//   --yes 를 붙이지 않으면 대상만 보여 주고 지우지 않는다. 삭제는 되돌릴 수 없다.
// 규칙은 docs/continuous/naver-blog.md 를 따른다. 디버그 포트 9222 크롬에 네이버 로그인 상태여야 한다.
import { getBrowser, getNaverPage } from './lib/browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const POSTS = path.join(ROOT, 'data/naver-blog/posts.json');
const args = process.argv.slice(2);
const go = args.includes('--yes');
const limit = Number(args.find((a) => /^\d+$/.test(a)) ?? 999);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { headers: { 'user-agent': 'Mozilla/5.0' } };

const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
const save = () => fs.writeFileSync(POSTS, JSON.stringify(posts, null, 1));
const targets = posts.filter((p) => p.link === 'to-delete').slice(0, limit);

if (targets.length === 0) { console.log('삭제 대상 없음'); process.exit(0); }
console.log(`삭제 대상 ${targets.length}건`);
for (const t of targets) console.log(`  ${t.logNo}  ${t.title}`);
if (!go) { console.log('\n미리보기다. 실제로 지우려면 --yes 를 붙인다.'); process.exit(0); }

const live = async (logNo) => {
  const html = await (await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${logNo}`, UA)).text();
  return html.includes('se-main-container');
};

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
let accepted = false;
page.on('dialog', async (d) => {           // "삭제된 글은 복구할 수 없습니다. 삭제하시겠습니까?"
  if (d.type() === 'beforeunload') { await d.accept().catch(() => {}); return; }   // 편집기 이탈 경고는 그냥 통과
  const ok = /삭제/.test(d.message());
  console.log(`  확인창: ${d.message().replace(/\s+/g, ' ').slice(0, 60)} → ${ok ? '수락' : '취소'}`);
  accepted = ok;
  await (ok ? d.accept() : d.dismiss()).catch(() => {});
});

let done = 0, fails = 0;
for (const t of targets) {
  try {
    if (!(await live(t.logNo))) { console.log('이미 없음', t.logNo); t.link = 'deleted'; save(); continue; }
    const cdp = await page.createCDPSession();
    try { const { windowId } = await cdp.send('Browser.getWindowForTarget'); await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } }); } catch {}
    await cdp.detach().catch(() => {});
    await page.bringToFront();

    await page.goto(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${t.logNo}`, { waitUntil: 'domcontentloaded' });
    await wait(4000);
    const found = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find((e) => e.offsetParent && e.textContent.trim() === '삭제' && /_deletePost/.test(e.className));
      if (!a) return false; a.scrollIntoView({ block: 'center', behavior: 'instant' }); return true;
    });
    if (!found) throw new Error('삭제 링크를 찾지 못했다(소유자 로그인 상태인지 확인)');
    await wait(700);
    const box = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find((e) => e.offsetParent && e.textContent.trim() === '삭제' && /_deletePost/.test(e.className));
      const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    accepted = false;
    await page.mouse.click(box.x, box.y); await wait(1500);
    if (!accepted) throw new Error('확인창이 뜨지 않았다');
    await wait(5000);

    if (await live(t.logNo)) throw new Error('삭제 뒤에도 글이 남아 있다');
    console.log('OK    삭제', t.logNo, t.title.slice(0, 40));
    t.link = 'deleted'; save(); done++; fails = 0;
    await wait(5000);
  } catch (e) {
    console.log('실패', t.logNo, String(e).split(String.fromCharCode(10))[0].slice(0, 120));
    if (++fails >= 2) { console.log('연속 실패 2건, 중단'); break; }
  }
}
console.log(`완료 — 삭제 ${done} / 남은 대상 ${posts.filter((p) => p.link === 'to-delete').length}`);
if (launched) await browser.close(); else browser.disconnect();   // 사용자 창은 끄지 않는다
