/**
 * 티스토리 「필앤노트 시네마」에 글을 올린다.
 *
 *   node scripts/tistory-cinema/publish.mjs --file "대부" --at "2026-09-07 09:00"
 *   node scripts/tistory-cinema/publish.mjs --all --start 2026-09-07 --dow 1,4 --time 09:00
 *   node scripts/tistory-cinema/publish.mjs --file "대부" --draft      # 임시저장만
 *
 * 본문은 **HTML 모드**로 통째로 넣는다. 네이버처럼 한 줄씩 치지 않으므로 글자가 빠지거나
 * 정렬이 어긋날 자리가 없다. 대신 모드 전환에 `confirm` 이 붙어 있어 대화상자 핸들러가
 * 필수다(`lib/browser.mjs`).
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

const CATEGORY = { work: '이 영화를 꼽은 사람들', person: '인물이 꼽은 영화', list: '영화제와 선정 목록' };
const kindOf = (n) => (n.startsWith('목록-') ? 'list' : n.startsWith('인물-') ? 'person' : 'work');
const load = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : []);
const save = (v) => fs.writeFileSync(STATE, JSON.stringify(v, null, 2));

/** 보이는 요소를 좌표로 누른다. 숨은 click() 은 레이어가 안 열리는 일이 있다. */
async function hit(page, sel, label) {
  const pos = await page.evaluate((q) => {
    const b = [...document.querySelectorAll(q)].find((x) => x.offsetParent);
    if (!b) return null;
    b.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!pos) throw new Error(`${label}을 찾지 못했다`);
  await page.mouse.click(pos.x, pos.y);
}

/** 열린 메뉴에서 글자가 정확히 맞는 항목을 누른다(TinyMCE 메뉴는 span.mce-text 다). */
async function pickMenu(page, text, label) {
  const pos = await page.evaluate((t) => {
    const e = [...document.querySelectorAll('span.mce-text, span.mce-txt, li, a, button')]
      .find((x) => x.offsetParent && x.textContent.trim() === t);
    if (!e) return null;
    const r = (e.closest('li, button, a') ?? e).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, text);
  if (!pos) throw new Error(`${label}에서 「${text}」를 찾지 못했다`);
  await page.mouse.click(pos.x, pos.y);
}

export async function composeOne(page, cdp, name) {
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, `_meta-${name}.json`), 'utf8'));
  const html = fs.readFileSync(path.join(DIR, `_body-${name}.html`), 'utf8');
  const kind = kindOf(name);

  await page.bringToFront();
  await page.goto(`https://${BLOG}.tistory.com/manage/newpost/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#post-title-inp', { timeout: 40000 });
  await wait(4500);

  // 1) 카테고리
  await hit(page, '#category-btn', '카테고리 단추');
  await wait(1600);
  await pickMenu(page, CATEGORY[kind], '카테고리 목록');
  await wait(1200);
  const cat = await page.evaluate(() => document.querySelector('#category-btn')?.textContent.trim() ?? '');
  if (!cat.includes(CATEGORY[kind])) throw new Error(`카테고리가 안 잡혔다(현재 ${cat})`);

  // 2) 제목
  await page.evaluate((t) => {
    const el = document.querySelector('#post-title-inp');
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
    setter ? setter.call(el, t) : (el.value = t);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, meta.title);
  await wait(700);

  // 3) HTML 모드 — confirm 이 뜨고 dialog 핸들러가 받는다
  await hit(page, '#editor-mode-layer-btn-open', '모드 단추');
  await wait(1600);
  await pickMenu(page, 'HTML', '모드 목록');
  await wait(3500);

  /**
   * 4) 본문 — 🔴 **CodeMirror.setValue 로는 저장되지 않는다.**
   *
   *    티스토리 HTML 편집기는 `ReactCodemirror` 다. `setValue` 는 화면만 바꾸고 React state 를
   *    건드리지 않아, 저장할 때 빈 본문이 나간다. 26.09.05에 9편을 올렸는데 제목·카테고리·예약만
   *    남고 본문이 통째로 비어 있었다(getValue 로는 값이 보여서 성공한 줄 알았다).
   *    CodeMirror 안을 눌러 포커스를 준 뒤 CDP `Input.insertText` 로 **진짜 입력**을 넣는다.
   */
  const cmPos = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.CodeMirror')].find((e) => e.offsetParent);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + Math.min(14, r.height / 2) };
  });
  if (!cmPos) throw new Error('HTML 편집기를 찾지 못했다');
  await page.mouse.click(cmPos.x, cmPos.y);
  await wait(900);
  await cdp.send('Input.insertText', { text: html });
  await wait(2500);
  const got = await page.evaluate(() => [...document.querySelectorAll('.CodeMirror')].find((e) => e.offsetParent)?.CodeMirror?.getValue()?.length ?? 0);
  if (got < html.length * 0.9) throw new Error(`본문이 덜 들어갔다(${got}/${html.length})`);
  const how = `insertText ${got}자`;

  // 5) 태그
  for (const tag of meta.tags) {
    await page.evaluate((t) => {
      const el = document.querySelector('#tagText');
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
      setter ? setter.call(el, t) : (el.value = t);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, tag);
    await page.keyboard.press('Enter');
    await wait(400);
  }
  return { meta, kind, how };
}

/**
 * URL 슬러그. 제목을 그대로 쓰면 `|`·`·`·『』 가 주소에 박혀 지저분하고 공유할 때 깨진다.
 * 파이프 뒤 부제를 버리고 특수문자를 걷어 짧게 만든다. 한글 주소는 검색엔진이 디코드해 읽는다.
 */
function slugOf(title) {
  return title
    .split('|')[0]
    .replace(/[『』「」《》\[\]()·,.!?"'`~@#$%^&*+=/\:;<>{}]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** 발행 패널을 열고 공개·예약·주소를 잡은 뒤 발행한다. `at` 이 없으면 바로 낸다. */
export async function publishNow(page, title, at) {
  await hit(page, '#publish-layer-btn', '완료 단추')
  await wait(3000)

  // 공개
  await page.evaluate(() => {
    const el = document.querySelector('#open20')
    ;(el?.closest('label') ?? el)?.click()
  })
  await wait(1200)
  const open = await page.evaluate(() => document.querySelector('#open20')?.checked)
  if (!open) throw new Error('공개를 고르지 못했다')

  // 주소
  await page.evaluate((s) => {
    const el = document.querySelector('#urlPublish')
    if (!el) return
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set
    setter ? setter.call(el, s) : (el.value = s)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, slugOf(title))
  await wait(600)

  if (at) {
    const [ymd, hm] = at.split(' ')
    const [Y, M, D] = ymd.split('-').map(Number)
    const [h, mi] = (hm ?? '09:00').split(':').map(Number)

    await page.evaluate(() => [...document.querySelectorAll('button.btn_date')].find((b) => b.offsetParent && b.textContent.trim() === '예약')?.click())
    await wait(1500)
    await hit(page, 'button.btn_reserve', '날짜 단추')
    await wait(1800)

    // 달이 다르면 화살표로 옮긴다
    for (let i = 0; i < 14; i++) {
      const cur = await page.evaluate(() => document.querySelector('.txt_calendar')?.textContent.trim() ?? '')
      const m = cur.match(/(\d{4})년\s*(\d{1,2})월/)
      if (!m) break
      const [cy, cm] = [Number(m[1]), Number(m[2])]
      if (cy === Y && cm === M) break
      const next = cy < Y || (cy === Y && cm < M)
      const moved = await page.evaluate((n) => {
        const b = [...document.querySelectorAll('.box_calendar button')].find((x) => x.offsetParent && new RegExp(n ? '다음|next' : '이전|prev', 'i').test(x.className + x.textContent + (x.getAttribute('aria-label') ?? '')))
        if (!b) return false
        b.click(); return true
      }, next)
      if (!moved) throw new Error(`달력을 ${Y}-${M} 로 옮기지 못했다(현재 ${cur})`)
      await wait(900)
    }

    const dayOk = await page.evaluate((d) => {
      const b = [...document.querySelectorAll('button.btn_day')].find((x) => x.offsetParent && Number(x.textContent.trim()) === d && !x.disabled)
      if (!b) return false
      b.click(); return true
    }, D)
    if (!dayOk) throw new Error(`${D}일을 고르지 못했다`)
    await wait(1200)

    await page.evaluate(({ h, mi }) => {
      const set = (sel, v) => {
        const el = document.querySelector(sel); if (!el) return
        const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set
        setter ? setter.call(el, String(v).padStart(2, '0')) : (el.value = String(v))
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }
      set('#dateHour', h); set('#dateMinute', mi)
    }, { h, mi })
    await wait(900)

    const shown = await page.evaluate(() => ({
      date: document.querySelector('button.btn_reserve')?.textContent.trim(),
      h: document.querySelector('#dateHour')?.value, m: document.querySelector('#dateMinute')?.value,
    }))
    const want = `${Y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`
    if (shown.date !== want) throw new Error(`예약 날짜가 어긋났다(원한 ${want}, 화면 ${shown.date})`)
    console.log(`   예약 ${shown.date} ${shown.h}:${shown.m}`)
  }

  await hit(page, '#publish-btn', '발행 단추')
  await wait(6000)
  const url = page.url()
  return url
}

if (process.argv[1] && process.argv[1].includes('publish.mjs')) {
  const name = argOf('--file')
  const at = argOf('--at')
  if (!name) throw new Error('--file 이 필요하다')
  const { browser } = await getBrowser()
  const page = await getTistoryPage(browser)
  await ensureLoggedIn(page)
  const cdp = await page.createCDPSession()
  const { meta } = await composeOne(page, cdp, name)
  const url = await publishNow(page, meta.title, at)
  const state = load()
  state.push({ name, kind: kindOf(name), title: meta.title, at: at ?? null, url, at_iso: new Date().toISOString() })
  save(state)
  console.log(`올림: ${meta.title}`)
  browser.disconnect()
}
