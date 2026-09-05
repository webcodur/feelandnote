/**
 * 이미 올라간 글에 **본문만** 채운다.
 *
 *   node scripts/tistory-cinema/fill-body.mjs --id 1 --file "대부"
 *
 * 26.09.05에 `CodeMirror.setValue` 로 본문을 넣었다가 9편이 제목·카테고리·예약만 남고
 * 본문이 통째로 비어 나갔다. 예약 시각과 카테고리는 멀쩡하므로 지우고 다시 올리지 않고
 * 본문만 넣어 덮는다. 주입은 CDP `Input.insertText` — 진짜 입력이라야 React state 가 따라온다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBrowser, getTistoryPage, ensureLoggedIn, BLOG } from './lib/browser.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DIR = path.join(ROOT, 'data/tistory-cinema');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };

const hit = async (page, sel, label) => {
  const pos = await page.evaluate((q) => {
    const b = [...document.querySelectorAll(q)].find((x) => x.offsetParent);
    if (!b) return null;
    b.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!pos) throw new Error(`${label}을 찾지 못했다`);
  await page.mouse.click(pos.x, pos.y);
};
const pickMenu = async (page, text, label) => {
  const pos = await page.evaluate((t) => {
    const e = [...document.querySelectorAll('span.mce-text, span.mce-txt, li, a, button')]
      .find((x) => x.offsetParent && x.textContent.trim() === t);
    if (!e) return null;
    const r = (e.closest('li, button, a') ?? e).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, text);
  if (!pos) throw new Error(`${label}에서 「${text}」를 찾지 못했다`);
  await page.mouse.click(pos.x, pos.y);
};

export async function fillOne(page, cdp, id, name) {
  const html = fs.readFileSync(path.join(DIR, `_body-${name}.html`), 'utf8');
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, `_meta-${name}.json`), 'utf8'));
  await page.bringToFront();
  await page.goto(`https://${BLOG}.tistory.com/manage/post/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#post-title-inp', { timeout: 40000 });
  await wait(6000);

  // 제목도 함께 덮는다 — 양식을 고치면 제목 형식이 바뀐다
  await page.evaluate((t) => {
    const el = document.querySelector('#post-title-inp');
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
    setter ? setter.call(el, t) : (el.value = t);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, meta.title);
  await wait(800);

  await hit(page, '#editor-mode-layer-btn-open', '모드 단추');
  await wait(1600);
  await pickMenu(page, 'HTML', '모드 목록');
  await wait(4000);

  // 기존 내용을 비우고(빈 글이지만 자리표시가 있을 수 있다) 새로 넣는다
  const cmPos = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.CodeMirror')].find((e) => e.offsetParent);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + Math.min(14, r.height / 2) };
  });
  if (!cmPos) throw new Error('HTML 편집기를 찾지 못했다');
  await page.mouse.click(cmPos.x, cmPos.y);
  await wait(700);
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await wait(400);
  await page.keyboard.press('Backspace');
  await wait(600);
  await cdp.send('Input.insertText', { text: html });
  await wait(2500);

  const got = await page.evaluate(() => [...document.querySelectorAll('.CodeMirror')].find((e) => e.offsetParent)?.CodeMirror?.getValue()?.length ?? 0);
  if (got < html.length * 0.9) throw new Error(`본문이 덜 들어갔다(${got}/${html.length})`);

  // 완료 → 발행 패널. 예약은 이미 잡혀 있으므로 그대로 두고 발행만 누른다.
  await hit(page, '#publish-layer-btn', '완료 단추');
  await wait(3000);

  /**
   * 주소도 제목을 따라가게 한다. 제목을 고쳐도 `urlPublish` 는 처음 값이 남아
   * 「아카데미 작품상 수상작 98편」이라는 글이 `…-전체-목록` 주소를 쓰게 된다(26.09.05).
   * 주소에 든 말이 검색어와 맞아야 하므로 함께 갱신한다.
   */
  const slug = meta.title
    .split('|')[0]
    // 대괄호 태그는 주소에서 뺀다. 목록명과 겹쳐 「AFI-AFI-선정…」이 된다.
    .replace(/^\s*\[[^\]]+\]\s*/, '')
    .replace(/[『』「」《》\[\]()·,.!?"'`~@#$%^&*+=/\:;<>{}]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  await page.evaluate((v) => {
    const el = document.querySelector('#urlPublish');
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
    setter ? setter.call(el, v) : (el.value = v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, slug);
  await wait(800);
  const before = await page.evaluate(() => ({
    btn: document.querySelector('#publish-btn')?.textContent.trim(),
    date: [...document.querySelectorAll('button.btn_reserve')].find((b) => b.offsetParent)?.textContent.trim(),
    h: document.querySelector('#dateHour')?.value, m: document.querySelector('#dateMinute')?.value,
  }));
  await hit(page, '#publish-btn', '발행 단추');
  await wait(6000);
  return { got, before, title: meta.title };
}

if (process.argv[1] && process.argv[1].includes('fill-body.mjs')) {
  const id = argOf('--id'); const name = argOf('--file');
  if (!id || !name) throw new Error('--id 와 --file 이 필요하다');
  const { browser } = await getBrowser();
  const page = await getTistoryPage(browser);
  await ensureLoggedIn(page);
  const cdp = await page.createCDPSession();
  const { got, before, title } = await fillOne(page, cdp, id, name);
  console.log(`#${id} 본문 ${got}자 · ${before.btn} ${before.date ?? ''} ${before.h ?? ''}:${before.m ?? ''}
   ${title}`);
  browser.disconnect();
}
