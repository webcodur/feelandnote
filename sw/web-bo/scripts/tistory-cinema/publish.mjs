/**
 * 티스토리 「필앤노트 시네마」에 글을 올린다.
 *
 *   node scripts/tistory-cinema/publish.mjs --file "목록-AFI 선정 100대 영화" --at "2026-09-07 09:00"
 *   node scripts/tistory-cinema/publish.mjs --all --start 2026-09-07 --dow 1,4 --time 09:00
 *
 * 본문은 **HTML 모드**로 통째로 넣는다. 네이버처럼 한 줄씩 치지 않으므로 글자가 빠지거나
 * 정렬이 어긋날 자리가 없다. 대신 HTML 모드 전환에 `confirm` 이 붙어 있어 대화상자
 * 핸들러가 필수다(`lib/browser.mjs` 참고).
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBrowser, getTistoryPage, ensureLoggedIn, BLOG } from './lib/browser.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DIR = path.join(ROOT, 'data/tistory-cinema');
const STATE = path.join(DIR, '_posts.json');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };

const CATEGORY = {
  work: '이 영화를 꼽은 사람들',
  person: '인물이 꼽은 영화',
  list: '영화제와 선정 목록',
};

const load = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : []);
const save = (v) => fs.writeFileSync(STATE, JSON.stringify(v, null, 2));

/** 재료 파일명 → 종류 */
const kindOf = (name) => (name.startsWith('목록-') ? 'list' : name.startsWith('인물-') ? 'person' : 'work');

async function publishOne(page, name, at) {
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, `_meta-${name}.json`), 'utf8'));
  const html = fs.readFileSync(path.join(DIR, `_body-${name}.html`), 'utf8');
  const kind = kindOf(name);

  await page.bringToFront();
  await page.goto(`https://${BLOG}.tistory.com/manage/newpost/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#post-title-inp, textarea#markdown-source, .textarea_tit', { timeout: 40000 }).catch(() => {});
  await wait(4000);

  // 1) 카테고리
  const catOk = await page.evaluate((label) => {
    const btn = [...document.querySelectorAll('button, a')].find((b) => /카테고리/.test(b.textContent) && b.offsetParent);
    if (btn) btn.click();
    return !!btn;
  }, CATEGORY[kind]);
  await wait(1200);
  const catSet = await page.evaluate((label) => {
    const item = [...document.querySelectorAll('li, button, a, span')].find((e) => e.offsetParent && e.textContent.trim() === label);
    if (!item) return false;
    item.click();
    return true;
  }, CATEGORY[kind]);
  if (!catSet) throw new Error(`카테고리를 고르지 못했다: ${CATEGORY[kind]}`);
  await wait(1000);

  // 2) 제목
  const titleOk = await page.evaluate((t) => {
    const el = document.querySelector('#post-title-inp') ?? [...document.querySelectorAll('textarea, input')].find((e) => /제목/.test(e.placeholder ?? ''));
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
    setter ? setter.call(el, t) : (el.value = t);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, meta.title);
  if (!titleOk) throw new Error('제목 칸을 찾지 못했다');
  await wait(800);

  // 3) HTML 모드로 바꾼다 — confirm 이 뜨므로 dialog 핸들러가 받아 준다
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a')].find((x) => x.offsetParent && /기본모드|마크다운|HTML/.test(x.textContent) && x.closest('[class*=mce], header, .header, #editor') !== null);
    (b ?? [...document.querySelectorAll('button')].find((x) => x.offsetParent && /기본모드|HTML/.test(x.textContent)))?.click();
  });
  await wait(1200);
  const toHtml = await page.evaluate(() => {
    const item = [...document.querySelectorAll('li, button, a, span')].find((e) => e.offsetParent && e.textContent.trim() === 'HTML');
    if (!item) return false;
    item.click();
    return true;
  });
  if (!toHtml) throw new Error('HTML 모드로 바꾸지 못했다');
  await wait(3000);

  // 4) 본문 — CodeMirror 든 textarea 든 값을 넣고 이벤트를 쏜다
  const bodyOk = await page.evaluate((h) => {
    const cm = document.querySelector('.CodeMirror')?.CodeMirror;
    if (cm) { cm.setValue(h); return 'codemirror'; }
    const ta = document.querySelector('textarea#html-source, textarea.textarea_code, #editor textarea, textarea');
    if (!ta) return '';
    const setter = Object.getOwnPropertyDescriptor(ta.constructor.prototype, 'value')?.set;
    setter ? setter.call(ta, h) : (ta.value = h);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    return 'textarea';
  }, html);
  if (!bodyOk) throw new Error('본문 칸을 찾지 못했다');
  await wait(2500);

  // 5) 태그
  for (const tag of meta.tags) {
    await page.evaluate((t) => {
      const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent && /태그/.test(e.placeholder ?? ''));
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
      setter ? setter.call(el, t) : (el.value = t);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, tag);
    await page.keyboard.press('Enter');
    await wait(350);
  }

  // 6) 완료 → 발행 패널
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.offsetParent && /^완료$/.test(b.textContent.trim()))?.click());
  await wait(2500);

  const state = { name, kind, title: meta.title, at: at ?? null, publishedAt: new Date().toISOString() };
  return { page, state };
}

// 이 파일은 아래에서 이어 붙인다(발행 패널 조작은 화면을 보고 확정한다)
export { publishOne, CATEGORY, kindOf, load, save, DIR, STATE };

if (process.argv[1] && process.argv[1].includes('publish.mjs')) {
  const name = argOf('--file');
  if (!name) throw new Error('--file 이 필요하다');
  const { browser, launched } = await getBrowser();
  const page = await getTistoryPage(browser);
  await ensureLoggedIn(page);
  const { state } = await publishOne(page, name, argOf('--at'));
  console.log('본문까지 넣었다. 발행 패널은 화면에서 확인한다:', state.title);
  if (launched) console.log('(이 크롬은 스크립트가 띄웠다)');
  browser.disconnect();
}
