/**
 * 예약글의 비공개 전환을 시도하는 구도구.
 *
 *   node scripts/naver-blog/hide-reserved.mjs [--yes]
 *
 * 예약 해제·삭제에는 `delete-posts.mjs`를 쓴다. 비공개 전환으로 삭제됐다고 판단하지 않는다.
 */
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';

const POSTS = path.join(ASSETS, 'naver-blog/posts.json');
const args = process.argv.slice(2);
const go = args.includes('--yes');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
const save = () => fs.writeFileSync(POSTS, JSON.stringify(posts, null, 1));
const targets = posts.filter((p) => p.link === 'to-delete');
if (!targets.length) { console.log('대상 없음'); process.exit(0); }
console.log(`비공개로 돌릴 글 ${targets.length}건`);
targets.forEach((t) => console.log(`  ${t.logNo}  ${(t.title ?? '').slice(0, 56)}`));
if (!go) { console.log('\n미리보기다. 실제로 바꾸려면 --yes 를 붙인다.'); process.exit(0); }

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

const hit = async (sel, label) => {
  const pos = await page.evaluate((q) => {
    const b = [...document.querySelectorAll(q)].find((x) => x.offsetParent);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!pos) throw new Error(`${label}을 찾지 못했다`);
  await page.mouse.click(pos.x, pos.y);
};

let ok = 0, fail = 0;
for (const t of targets) {
  try {
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${t.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('button[class*=publish_btn]', { timeout: 40000 });

    await wait(4500);

    await hit('button[class*=publish_btn]', '발행 단추');
    await wait(2500);

    // 공개 설정에서 「비공개」
    const priv = await page.evaluate(() => {
      const el = [...document.querySelectorAll('input[type=radio], label, span')]
        .find((x) => x.offsetParent && /비공개/.test(x.textContent ?? x.value ?? ''));
      if (!el) return false;
      (el.closest('label') ?? el).click();
      return true;
    });
    if (!priv) throw new Error('비공개 선택지를 찾지 못했다');
    await wait(1200);

    const cb = await page.$('button[class*=confirm_btn]');
    if (!cb) throw new Error('확인 단추를 찾지 못했다');
    const box = await cb.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await wait(7000);

    t.link = 'private';
    t.note = `${t.note ? t.note + ' / ' : ''}26.09.05 비공개 전환(예약 해제)`;
    save(); ok++;
    console.log(`  비공개 ${t.logNo}`);
  } catch (e) {
    fail++;
    console.log(`  실패 ${t.logNo}: ${String(e).split(String.fromCharCode(10))[0].slice(0, 90)}`);
  }
}
console.log(`\n완료 — 비공개 ${ok} / 실패 ${fail}`);
if (launched) await browser.close(); else browser.disconnect();
