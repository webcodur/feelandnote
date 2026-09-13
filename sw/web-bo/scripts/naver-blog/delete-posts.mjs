// 네이버 블로그 글을 삭제한다. 대상은 blog-assets(D:)/naver-blog/posts.json 의 link === 'to-delete' 행이다.
// 사용: node scripts/naver-blog/delete-posts.mjs [최대건수] [--yes]   (sw/web-bo 에서)
//   --yes 를 붙이지 않으면 대상만 보여 주고 지우지 않는다. 삭제는 되돌릴 수 없다.
// 규칙은 docs/continuous/blog-naver-book.md 를 따른다. 디버그 포트 9222 크롬에 네이버 로그인 상태여야 한다.
import { getBrowser } from './lib/browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ASSETS } from '../blog-assets.mjs';

const POSTS = path.join(ASSETS, 'naver-blog/posts.json');
const args = process.argv.slice(2);
const go = args.includes('--yes');
const limit = Number(args.find((a) => /^\d+$/.test(a)) ?? 999);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { headers: { 'user-agent': 'Mozilla/5.0' } };

const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
const saveDeleted = (target) => {
  const current = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
  const matches = current.filter(p => String(p.logNo) === String(target.logNo));
  if (matches.length !== 1 || matches[0].link !== 'to-delete' || matches[0].title !== target.title) throw new Error('삭제 대상 기록이 실행 중 바뀌었다');
  matches[0].link = 'deleted';
  fs.writeFileSync(POSTS, JSON.stringify(current, null, 1));
  target.link = 'deleted';
};
const targets = posts.filter((p) => p.link === 'to-delete').slice(0, limit);

if (targets.length === 0) { console.log('삭제 대상 없음'); process.exit(0); }
console.log(`삭제 대상 ${targets.length}건`);
for (const t of targets) console.log(`  ${t.logNo}  ${t.title}`);
if (!go) { console.log('\n미리보기다. 실제로 지우려면 --yes 를 붙인다.'); process.exit(0); }

const live = async (logNo) => {
  const response = await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${logNo}`, UA);
  if (!response.ok) throw new Error(`공개 글 조회 실패: HTTP ${response.status}`);
  const html = await response.text();
  return html.includes('se-main-container');
};

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await browser.newPage();
let accepted = false;
let expectedDialog = null;
page.on('dialog', async (d) => {           // "삭제된 글은 복구할 수 없습니다. 삭제하시겠습니까?"
  if (d.type() === 'beforeunload') { await d.accept().catch(() => {}); return; }   // 편집기 이탈 경고는 그냥 통과
  const ok = d.type() === 'confirm' && (expectedDialog === 'reserved'
    ? d.message() === '선택된 1개의 예약발행 글을 삭제하시겠습니까?\n삭제된 글은 복구되지 않습니다.'
    : expectedDialog === 'published' && /삭제/.test(d.message()));
  console.log(`  확인창: ${d.message().replace(/\s+/g, ' ').slice(0, 60)} → ${ok ? '수락' : '취소'}`);
  accepted = ok;
  await (ok ? d.accept() : d.dismiss()).catch(() => {});
});

async function reservations(expectNonempty = false) {
  const response = await page.goto('https://blog.naver.com/dmx777/postwrite', { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response?.ok()) throw new Error('예약 목록 조회 실패');
  await page.waitForSelector('button[class*=publish_btn]', { visible: true, timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('글을 불러오고 있습니다'));
  if (expectNonempty) await page.waitForSelector('button[class*=reserve_btn]', { visible: true, timeout: 15000 });
  const button = await page.$('button[class*=reserve_btn]');
  if (!button) return [];
  await button.click();
  await page.waitForSelector('button[class*=article_button]', { timeout: 15000 });
  return page.$$eval('button[class*=article_button]', bs => bs.map(b => ({
    title: b.querySelector('strong')?.textContent.replace(/\u200b/g, '').trim(),
    date: b.querySelector('span[class*=date]')?.textContent.trim(),
  })));
}

async function deleteReserved(target) {
  const before = await reservations(Boolean(target.scheduledAt));
  const matches = before.filter(r => r.title === target.title.trim());
  if (matches.length > 1) throw new Error('같은 제목의 예약글이 여러 개다');
  if (!matches.length) return false;
  const row = await page.evaluateHandle(title => [...document.querySelectorAll('button[class*=article_button]')]
    .find(b => b.querySelector('strong')?.textContent.replace(/\u200b/g, '').trim() === title)?.closest('li'), target.title.trim());
  await row.asElement().hover(); // 삭제 버튼은 해당 행에 마우스를 올려야 나타난다.
  const button = await row.asElement().$('button#post_delete_button');
  if (!button) throw new Error('예약글 삭제 버튼이 없다');
  accepted = false;
  expectedDialog = 'reserved';
  try { await button.click(); } finally { expectedDialog = null; }
  await button.dispose(); await row.dispose();
  if (!accepted) throw new Error('예약글 1편 삭제 확인창을 확인하지 못했다');
  await page.waitForFunction(title => ![...document.querySelectorAll('button[class*=article_button]')]
    .some(b => b.querySelector('strong')?.textContent.replace(/\u200b/g, '').trim() === title), { timeout: 15000 }, target.title.trim());
  const after = await reservations(before.length > 1); // 서버에서 다시 불러온 목록으로 삭제와 나머지 예약 보존을 확인한다.
  assert.deepEqual(after, before.filter(r => r.title !== target.title.trim()), '삭제 대상 외 예약 목록이 바뀌었다');
  console.log(JSON.stringify({ logNo: target.logNo, title: target.title, deleted: true, reservationsBefore: before.length, reservationsAfter: after.length, otherReservationsUnchanged: true }));
  return true;
}

let done = 0, fails = 0;
const backupDir = path.join(path.dirname(POSTS), '_backup');
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(POSTS, path.join(backupDir, `posts-before-delete-${Date.now()}.json`), fs.constants.COPYFILE_EXCL);
for (const t of targets) {
  try {
    if (await deleteReserved(t)) { saveDeleted(t); done++; await wait(1500); continue; }
    if (!(await live(t.logNo))) throw new Error('예약 목록과 공개 페이지에서 글을 확인하지 못했다. 삭제 완료로 기록하지 않는다');
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
    expectedDialog = 'published';
    try { await page.mouse.click(box.x, box.y); } finally { expectedDialog = null; }
    await wait(1500);
    if (!accepted) throw new Error('확인창이 뜨지 않았다');
    await wait(5000);

    if (await live(t.logNo)) throw new Error('삭제 뒤에도 글이 남아 있다');
    console.log('OK    삭제', t.logNo, t.title.slice(0, 40));
    saveDeleted(t); done++;
    await wait(5000);
  } catch (e) {
    console.log('실패', t.logNo, String(e).split(String.fromCharCode(10))[0].slice(0, 120));
    fails++; process.exitCode = 1;
    console.log('삭제 확인 실패, 다음 글을 처리하지 않고 중단'); break;
  }
}
console.log(`완료 — 삭제 ${done} / 남은 대상 ${posts.filter((p) => p.link === 'to-delete').length}`);
await page.close().catch(() => {});
if (launched) await browser.close(); else browser.disconnect();   // 사용자 창은 끄지 않는다
