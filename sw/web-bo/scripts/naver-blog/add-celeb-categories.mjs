// 「셀럽의 책추천」 아래에 인물 카테고리를 추가한다. 이름은 lib/celeb-categories.mjs 의 CELEB_CATEGORY 값 가운데 메뉴에 없는 것이다.
// 사용(sw/web-bo): node scripts/naver-blog/add-celeb-categories.mjs [--apply]   --apply 없으면 화면에서만 추가해 보고 저장하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser } from './lib/browser.mjs';
import { CELEB_CATEGORY } from './lib/celeb-categories.mjs';
const apply = process.argv.includes('--apply'), PARENT = '셀럽의 책추천';
const wait = ms => new Promise(r => setTimeout(r, ms));
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const { browser, launched } = await getBrowser({ protocolTimeout: 45000 });
const page = await browser.newPage();
page.on('dialog', d => { console.log(JSON.stringify({ dialog: d.type(), message: d.message() })); d.type() === 'alert' || d.type() === 'beforeunload' ? d.accept().catch(() => {}) : d.dismiss().catch(() => {}); });
async function menu() {
  await page.goto('https://admin.blog.naver.com/dmx777/config/blog', { waitUntil: 'domcontentloaded' });
  const frame = page.frames().find(f => f.name() === 'papermain');
  if (!frame) throw new Error('카테고리 관리 화면을 찾지 못했다');
  await frame.waitForSelector('#tree');
  return frame;
}
const names = frame => frame.$$eval('#tree ._categoryName', es => es.map(e => ({ name: e.textContent.replace(/\s/g, ' '), count: e.nextElementSibling?.textContent,
  parent: e.closest('li').parentElement.closest('li')?.querySelector(':scope > div ._categoryName')?.textContent.replace(/\s/g, ' ') ?? null })));
async function clickName(frame, name) {
  const el = await frame.evaluateHandle(n => [...document.querySelectorAll('#tree ._categoryName')].find(e => e.textContent.replace(/\s/g, ' ') === n), name);
  if (!el.asElement()) throw new Error(`카테고리를 찾지 못했다: ${name}`);
  await el.asElement().click(); await el.dispose();
}
try {
  const frame = await menu(), before = await names(frame);
  const want = [...new Set(Object.values(CELEB_CATEGORY))].filter(n => !before.some(c => c.name === n && c.parent === PARENT));
  console.log(JSON.stringify({ want }));
  for (const name of want) {
    await clickName(frame, PARENT);
    await frame.click('img._addCategoryView');
    await frame.waitForSelector('#tree input.cat_input');
    await frame.click('#tree input.cat_input', { clickCount: 3 });
    await frame.type('#tree input.cat_input', name);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Tab');
    await clickName(frame, PARENT);
    if (!(await names(frame)).some(c => c.name === name && c.parent === PARENT)) throw new Error(`하위 카테고리 생성 실패: ${name}`);
  }
  // 선택한 칸은 이름이 입력창으로 바뀌어 빈 값으로 읽히므로 상위 칸을 눌러 선택을 푼 뒤 읽는다. 새 칸은 맨 끝(구분선 아래)에 붙으므로 바로 앞 칸이 AFTER[name]이 될 때까지 위로 올린다.
  const AFTER = { 지도자: '정치인', 지휘관: '지도자' };
  for (const name of want.filter(n => AFTER[n])) for (let i = 0; i < 20; i++) {
    const kids = (await names(frame)).filter(c => c.parent === PARENT).map(c => c.name), at = kids.indexOf(name);
    if (kids[at - 1] === AFTER[name] || at <= 0) break;
    await clickName(frame, name); await wait(400); await frame.click('img._moveUp'); await wait(700); await clickName(frame, PARENT); await wait(500);
  }
  await clickName(frame, PARENT); await wait(500);
  const ready = await names(frame);
  for (const old of before) if (!ready.some(c => c.name === old.name && c.parent === old.parent && c.count === old.count)) throw new Error(`기존 카테고리가 변했다: ${old.name}`);
  console.log(JSON.stringify({ ready: ready.filter(c => c.parent === PARENT).map(c => c.name), apply }));
  if (apply && want.length) {
    fs.writeFileSync(path.join(ASSETS, 'naver-blog', `_category-menu-before-${Date.now()}.json`), JSON.stringify(before, null, 2));
    await frame.click('#submit_button'); await wait(1500);
    const verified = await names(await menu());
    if (hash(verified.map(c => [c.name, c.parent])) !== hash(ready.map(c => [c.name, c.parent]))) throw new Error('저장 후 카테고리 트리가 다르다');
    console.log(JSON.stringify({ result: 'menu-saved-and-reopened', children: verified.filter(c => c.parent === PARENT).map(c => c.name) }));
  }
} finally { if (launched) await browser.close(); else browser.disconnect(); }
