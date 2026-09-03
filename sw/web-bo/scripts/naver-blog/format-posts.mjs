// 이미 올린 글의 본문에 서식만 입힌다. 글을 다시 쓰지 않고 수정 발행한다.
// 사용: node scripts/naver-blog/format-posts.mjs <logNo> [logNo...] [--dry]   (sw/web-bo 에서)
// 규칙: 『제목』 — 저자 줄과 「학과 · 『제목』 — 저자」 줄은 굵게, ━ 로만 된 줄은 진짜 구분선으로 바꾼다.
import { getBrowser, getNaverPage } from './lib/browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const POSTS = path.join(ROOT, 'data/naver-blog/posts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const ids = args.filter((a) => /^\d{9,}$/.test(a));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (ids.length === 0) { console.log('글 번호를 하나 이상 넘겨라'); process.exit(1); }

const BOLD = [/^『[^』]+』\s+—\s+\S/, /^[가-힣]+\s+·\s+『[^』]+』\s+—\s+\S/];
const isRule = (t) => t.replace(/[\s​]/g, '').length > 0 && /^[━─—–\-]{3,}$/.test(t.replace(/\s/g, ''));

const paras = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')]
    .map((e, i) => ({ i, t: e.textContent.replace(/​/g, '').trim(), bold: !!e.querySelector('b,strong,[style*="font-weight"]') })));

// 제목 글자(플레이스홀더는 빈 값)
const titleText = (page) => page.evaluate(() => { const q = document.querySelector('.se-documentTitle .se-text-paragraph'); if (!q || q.querySelector('.se-placeholder')) return ''; return q.textContent.replace(/​/g, '').trim(); });

// 제목을 새 제목으로 갈아 끼운다.
async function replaceTitle(page, next) {
  if ((await titleText(page)) === next) return false;
  const g = await page.evaluate(() => {
    const q = document.querySelector('.se-documentTitle .se-text-paragraph'); q.scrollIntoView({ block: 'center', behavior: 'instant' });
    const w = document.createTreeWalker(q, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode()) && !n.textContent.replace(/​/g, ''));
    if (!n) { const r = q.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; }
    const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, 1); const b = r.getBoundingClientRect();
    return { x: b.left - 2, y: b.top + b.height / 2 };
  });
  await page.mouse.click(g.x, g.y); await wait(400);
  for (let z = 0; z < 300 && (await titleText(page)) !== ''; z++) { await page.keyboard.press('Delete'); await wait(20); }
  if ((await titleText(page)) !== '') throw new Error('제목을 비우지 못했다');
  for (let a = 0; a < 3; a++) {
    for (let i = 0; i < next.length; i += 30) { await page.keyboard.type(next.slice(i, i + 30), { delay: 15 }); await wait(150); }
    await wait(400);
    if ((await titleText(page)) === next) return true;
    for (let z = 0; z < 300 && (await titleText(page)) !== ''; z++) { await page.keyboard.press('Backspace'); await wait(20); }
  }
  throw new Error('제목 입력 실패');
}

// 단락 전체를 선택한다. 첫 글자를 클릭하고 끝 글자를 Shift+클릭한다.
async function selectPara(page, idx) {
  await page.evaluate((k) => { const q = [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')][k]; q?.scrollIntoView({ block: 'center', behavior: 'instant' }); }, idx);
  await wait(500);
  const g = await page.evaluate((k) => {
    const q = [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')][k];
    if (!q) return null;
    const w = document.createTreeWalker(q, NodeFilter.SHOW_TEXT); let f = null, l = null;
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.replace(/​/g, '')) continue; if (!f) f = n; l = n; }
    if (!f) return null;
    const r1 = document.createRange(); r1.setStart(f, 0); r1.setEnd(f, 1); const b1 = r1.getBoundingClientRect();
    const r2 = document.createRange(); r2.setStart(l, Math.max(0, l.textContent.length - 1)); r2.setEnd(l, l.textContent.length); const b2 = r2.getBoundingClientRect();
    return { sx: b1.left + 1, sy: b1.top + b1.height / 2, ex: b2.right - 1, ey: b2.top + b2.height / 2 };
  }, idx);
  if (!g) return false;
  await page.mouse.click(g.sx, g.sy); await wait(250);
  await page.keyboard.down('Shift'); await page.mouse.click(g.ex, g.ey); await page.keyboard.up('Shift'); await wait(400);
  return true;
}

async function insertDivider(page) {
  const before = await page.evaluate(() => document.querySelectorAll('.se-component.se-horizontalLine').length);
  const pos = await page.evaluate(() => { const e = document.querySelector('[class*=se-toolbar-item-insert-h] button, [class*=se-toolbar-item-insert-h]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (!pos) throw new Error('구분선 단추를 찾지 못했다');
  await page.mouse.click(pos.x, pos.y); await wait(1200);
  if ((await page.evaluate(() => document.querySelectorAll('.se-component.se-horizontalLine').length)) <= before) throw new Error('구분선이 들어가지 않았다');
}

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });

const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
let done = 0;
for (const logNo of ids) {
  try {
    const row = posts.find((p) => p.logNo === logNo);
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${logNo}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 30000 }); await wait(4500);

    let titleChanged = false;
    if (row?.newTitle) { if (dry) console.log('   제목 →', row.newTitle); else titleChanged = await replaceTitle(page, row.newTitle); }
    const list = await paras(page);
    const toBold = list.filter((p) => !p.bold && BOLD.some((re) => re.test(p.t)));
    const toRule = list.filter((p) => isRule(p.t));
    console.log(`${logNo} ${(row?.title ?? '').slice(0, 34)} — 굵게 ${toBold.length}줄, 구분선 ${toRule.length}줄`);
    if (dry) { for (const b of toBold.slice(0, 2)) console.log('   굵게:', b.t.slice(0, 40)); continue; }
    if (!titleChanged && toBold.length === 0 && toRule.length === 0) { console.log('   바꿀 것 없음'); continue; }

    for (const b of toBold) {
      if (!(await selectPara(page, b.i))) throw new Error(`단락 선택 실패 ${b.i}`);
      await page.keyboard.down('Control'); await page.keyboard.press('KeyB'); await page.keyboard.up('Control'); await wait(500);
      const ok = await page.evaluate((k) => { const q = [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')][k]; const bs = [...q.querySelectorAll('b,strong,[style*="font-weight"]')].map((e) => e.textContent.replace(/​/g, '').trim()).join(''); return bs.length >= q.textContent.replace(/​/g, '').trim().length - 2; }, b.i);
      if (!ok) throw new Error(`굵게 실패: ${b.t.slice(0, 24)}`);
    }
    // ━ 줄을 지우고 그 자리에 구분선을 넣는다. 뒤에서부터 처리해 번호가 밀리지 않게 한다.
    for (const r of [...toRule].reverse()) {
      if (!(await selectPara(page, r.i))) throw new Error(`단락 선택 실패 ${r.i}`);
      for (let z = 0; z < 40; z++) { const now = (await paras(page))[r.i]?.t ?? ''; if (!now) break; await page.keyboard.press('Backspace'); await wait(40); }
      await insertDivider(page);
    }

    await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
    const cb = await page.$('button[class*=confirm_btn]'); const bx = await cb.boundingBox();
    await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(6000);
    const okPos = await page.evaluate(() => { const b = [...document.querySelectorAll('.se-popup button')].find((x) => x.textContent.trim() === '확인'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (okPos) { await page.mouse.click(okPos.x, okPos.y); await wait(5000); }
    if (row && titleChanged) { row.title = row.newTitle; delete row.newTitle; fs.writeFileSync(POSTS, JSON.stringify(posts, null, 1)); }
    console.log(page.url().includes('PostView') ? `OK    반영 ${logNo}` : `CHECK ${logNo} ${page.url().slice(0, 60)}`);
    done++; await wait(5000);
  } catch (e) {
    console.log('실패', logNo, String(e).split(String.fromCharCode(10))[0].slice(0, 120));
    break;
  }
}
console.log(`완료 — ${done}/${ids.length}`);
if (launched) await browser.close(); else browser.disconnect();   // 사용자 창은 끄지 않는다
