// 「셀럽의 책추천」 하위 카테고리를 서비스 직군과 맞춘다. 이름·순서는 lib/celeb-categories.mjs 의 CELEB_CATEGORY(직군 시드 label)가 쥔다.
// 사용(sw/web-bo): node scripts/naver-blog/add-celeb-categories.mjs [--rename=옛이름:새이름,…] [--apply]   --apply 없으면 화면에서만 바꿔 보고 저장하지 않는다.
// --rename은 기존 칸의 이름만 바꾼다(글 번호·글은 그대로). 없는 직군 칸을 만들고 하위 칸을 직군 순서로 정렬한다. 구분선 같은 직군 밖 칸은 맨 끝에 둔다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser } from './lib/browser.mjs';
import { CELEB_CATEGORY } from './lib/celeb-categories.mjs';
const apply = process.argv.includes('--apply'), PARENT = '셀럽의 책추천', ORDER = Object.values(CELEB_CATEGORY);
const RENAME = (process.argv.find(a => a.startsWith('--rename='))?.slice(9).split(',') ?? []).map(p => p.split(':'));
if (RENAME.some(([from, to]) => !from || !ORDER.includes(to))) throw new Error('--rename=옛이름:직군이름 형식이어야 한다');
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
// 선택한 칸은 이름이 입력창으로 바뀌어 빈 값으로 읽힌다. 트리를 읽기 전에 늘 직군 밖 칸(공지사항)을 눌러 선택을 푼다.
const settle = async frame => { await clickName(frame, '공지사항'); await wait(500); };
try {
  const frame = await menu(), before = await names(frame);
  for (const [from, to] of RENAME) {
    if (!before.some(c => c.name === from && c.parent === PARENT) || before.some(c => c.name === to)) throw new Error(`이름 바꾸기 불가: ${from} → ${to}`);
    await clickName(frame, from);
    await frame.click('#category_name', { clickCount: 3 });
    await frame.type('#category_name', to);
    // 이 관리 폼은 한글 입력 뒤 keyup이 있어야 트리에 반영한다.
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Tab'); await wait(500);
    await settle(frame);
    if (!(await names(frame)).some(c => c.name === to && c.parent === PARENT)) throw new Error(`이름 입력 실패: ${to}`);
  }
  const want = ORDER.filter(n => !before.some(c => c.name === n && c.parent === PARENT) && !RENAME.some(([, to]) => to === n));
  console.log(JSON.stringify({ want }));
  for (const name of want) {
    await clickName(frame, PARENT);
    await frame.click('img._addCategoryView');
    await frame.waitForSelector('#tree input.cat_input');
    await frame.click('#tree input.cat_input', { clickCount: 3 });
    await frame.type('#tree input.cat_input', name);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Tab'); await wait(500);
    await settle(frame);
    if (!(await names(frame)).some(c => c.name === name && c.parent === PARENT)) throw new Error(`하위 카테고리 생성 실패: ${name}`);
  }
  // 직군 순서대로 하나씩, 제자리(i번째)에 올 때까지 위로 올린다.
  for (const [slot, name] of ORDER.entries()) for (let i = 0; i < 30; i++) {
    const kids = (await names(frame)).filter(c => c.parent === PARENT).map(c => c.name), at = kids.indexOf(name);
    if (at < 0) throw new Error(`카테고리가 없다: ${name}`);
    if (at <= slot) break;
    await clickName(frame, name); await wait(400); await frame.click('img._moveUp'); await wait(700); await settle(frame);
  }
  await settle(frame);
  const ready = await names(frame);
  const renamed = n => RENAME.find(([from]) => from === n)?.[1] ?? n;
  for (const old of before) if (!ready.some(c => c.name === renamed(old.name) && c.parent === old.parent && c.count === old.count)) throw new Error(`기존 카테고리가 변했다: ${old.name}`);
  const kids = ready.filter(c => c.parent === PARENT).map(c => c.name);
  if (kids.slice(0, ORDER.length).join() !== ORDER.join()) throw new Error(`직군 순서가 아니다: ${kids.join()}`);
  console.log(JSON.stringify({ ready: ready.filter(c => c.parent === PARENT).map(c => c.name), apply }));
  if (apply) {
    fs.writeFileSync(path.join(ASSETS, 'naver-blog', `_category-menu-before-${Date.now()}.json`), JSON.stringify(before, null, 2));
    await frame.click('#submit_button'); await wait(1500);
    const verified = await names(await menu());
    if (hash(verified.map(c => [c.name, c.parent])) !== hash(ready.map(c => [c.name, c.parent]))) throw new Error('저장 후 카테고리 트리가 다르다');
    console.log(JSON.stringify({ result: 'menu-saved-and-reopened', children: verified.filter(c => c.parent === PARENT).map(c => c.name) }));
  }
} finally { if (launched) await browser.close(); else browser.disconnect(); }
