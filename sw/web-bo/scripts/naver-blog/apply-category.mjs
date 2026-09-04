/**
 * 이미 올라간 글의 블로그 카테고리를 초안 값으로 맞춘다.
 *
 * 조립기가 모르는 직군을 「인플루엔서」로 흘려, 철학자·역사학자가 그 칸에 들어간 채 예약됐다.
 * 본문은 건드리지 않고 발행 설정의 카테고리만 바꿔 다시 발행한다. 예약 시각은 유지된다.
 *
 * 사용: node scripts/naver-blog/apply-category.mjs <logNo…> [--dry]   (sw/web-bo 에서)
 *       글 번호를 안 주면 초안과 어긋난 글을 스스로 찾는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';

const DRAFTS = path.join(path.resolve(import.meta.dirname, '../../../..'), 'data/naver-blog/celeb-drafts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const ids = args.filter((a) => /^\d{9,}$/.test(a));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const targets = (ids.length ? rows.filter((r) => ids.includes(String(r.logNo))) : rows.filter((r) => r.logNo && r.category));
console.log(`대상 ${targets.length}편`);

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

/**
 * 카테고리 읽기·고르기. publish-drafts.mjs 의 `selectCategory` 와 같은 절차다.
 * 단추 글씨에 「하위 카테고리」 안내말이 붙어 나오므로 걷어내고 비교한다.
 * 목록 항목은 프로그래밍 클릭이 먹지 않아 좌표로 누른다.
 */
const norm = (t) => String(t ?? '').replace(/하위 카테고리/g, '').replace(/\s+/g, ' ').trim();
const currentCategory = () => page.evaluate(() =>
  document.querySelector('[class*=option_category] [class*=selectbox_button]')?.textContent ?? null).then(norm);

async function selectCategory(name) {
  const opened = () => page.evaluate(() => [...document.querySelectorAll('[class*=option_category] li')].filter((e) => e.offsetParent).length > 0);
  if (!(await opened())) { await (await page.$('[class*=option_category] [class*=selectbox_button]')).click(); await wait(800); }
  if (!(await opened())) return false;
  const at = (n) => page.evaluate((x) => {
    const li = [...document.querySelectorAll('[class*=option_category] li')].find((e) => e.textContent.replace(/하위 카테고리/g, '').trim() === x);
    if (!li) return null;
    li.scrollIntoView({ block: 'center' });
    const r = (li.querySelector('label') ?? li).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, n);
  if (!(await at(name))) return false;
  await wait(300);
  const pos = await at(name);            // 스크롤 뒤 좌표를 다시 잡는다
  await page.mouse.click(pos.x, pos.y);
  await wait(700);
  return (await currentCategory()) === name;
}

let done = 0, clean = 0, failed = 0;
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  try {
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${row.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
    await wait(4500);

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '') === '발행');
      b?.click();
    });
    await wait(3500);

    const now = await currentCategory();
    if (now === row.category) { clean++; console.log(`정상 ${slug} — ${now}`); await page.keyboard.press('Escape'); await wait(800); continue; }
    console.log(`${slug} — ${now} → ${row.category}`);
    if (dry) { done++; await page.keyboard.press('Escape'); await wait(800); continue; }

    if (!(await selectCategory(row.category))) throw new Error(`카테고리를 바꾸지 못했다 — 목록에 '${row.category}' 가 없다`);

    const cb = await page.$('button[class*=confirm_btn]'); const box = await cb.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(6000);
    const okPos = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.se-popup button')].find((x) => x.textContent.trim() === '확인');
      if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (okPos) { await page.mouse.click(okPos.x, okPos.y); await wait(4000); }
    done++;
    console.log(`OK ${slug} — ${row.category}`);
  } catch (e) {
    failed++;
    console.log(`실패 ${slug}: ${String(e).split('\n')[0].slice(0, 160)}`);
  }
}
console.log(`\n완료 — 바꿈 ${done} / 정상 ${clean} / 실패 ${failed}`);
if (launched) await browser.close(); else browser.disconnect();
