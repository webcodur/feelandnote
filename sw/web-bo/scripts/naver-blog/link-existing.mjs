// 네이버 블로그 기존 글 본문 첫 줄에 필앤노트 페이지 링크를 넣고 발행한다. 대상·상태는 data/naver-blog/posts.json 이 쥔다.
// 사용: node scripts/naver-blog/link-existing.mjs [최대건수] [--dry] [--only=logNo]   (sw/web-bo 에서)
// 규칙과 편집기 제약은 docs/continuous/naver-blog.md 를 따른다.
//   --dry : 삽입까지만 하고 발행하지 않는다(스크린샷 저장). 디버그 포트 9222 크롬에 네이버 로그인 상태여야 한다.
import { getBrowser, getNaverPage } from './lib/browser.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const POSTS = path.join(ROOT, 'data/naver-blog/posts.json');
const SC = path.join(os.tmpdir(), 'naver-blog'); fs.mkdirSync(SC, { recursive: true });
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const limit = Number(args.find((a) => /^\d+$/.test(a)) ?? 999);

const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
const map = posts;
const done = Object.fromEntries(posts.filter((p) => p.link === 'ok' || p.link === 'private').map((p) => [p.logNo, { status: 'ok', note: p.link === 'private' ? 'private' : undefined }]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { headers: { 'user-agent': 'Mozilla/5.0' } };
const save = () => {
  for (const p of posts) { const st = done[p.logNo]; if (!st) continue; p.link = st.status === 'ok' ? (st.note === 'private' ? 'private' : 'ok') : 'failed'; if (st.name) p.name = st.name; if (st.why) p.why = st.why; else delete p.why; }
  fs.writeFileSync(POSTS, JSON.stringify(posts, null, 1));
};

async function celebName(slug) {
  const html = await (await fetch(`https://feelandnote.com/celeb/${slug}`, UA)).text();
  return html.match(/"@type":"Person","@id":"[^"]+","name":"([^"]+)"/)?.[1] ?? null;
}
// 본문 첫 텍스트 컴포넌트(제목 제외)의 단락 텍스트 목록
const FIRST_TEXT = `([...document.querySelectorAll('.se-component.se-text')].filter(c => !c.classList.contains('se-documentTitle')).find(c => c.textContent.replace(/\u200b/g, '').trim().length > 0) ?? [...document.querySelectorAll('.se-component.se-text')].find(c => !c.classList.contains('se-documentTitle')))`;
const paraTexts = (page) => page.evaluate((sel) => {
  const c = eval(sel); if (!c) return [];
  return [...c.querySelectorAll('.se-text-paragraph')].map((p) => p.textContent.replace(/​/g, '').trim());
}, FIRST_TEXT);

async function clickPara(page, idx) {
  const box = await page.evaluate((sel, i) => {
    const c = eval(sel); const p = c && [...c.querySelectorAll('.se-text-paragraph')][i];
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + Math.min(12, r.height / 2) };
  }, FIRST_TEXT, idx);
  if (!box) return false;
  await page.evaluate((sel, i) => eval(sel).querySelectorAll('.se-text-paragraph')[i].scrollIntoView({ block: 'center' }), FIRST_TEXT, idx);
  await wait(300);
  const box2 = await page.evaluate((sel, i) => { const r = eval(sel).querySelectorAll('.se-text-paragraph')[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(12, r.height / 2) }; }, FIRST_TEXT, idx);
  await page.mouse.click(box2.x, box2.y); await wait(300);
  return true;
}

// 커서가 들어 있는 첫 텍스트 블록의 단락 번호(-1: 블록 밖)
const selParaIdx = (page) => page.evaluate((sel) => {
  const c = eval(sel); const sl = getSelection(); if (!c || !sl.anchorNode) return -1;
  return [...c.querySelectorAll('.se-text-paragraph')].findIndex((p) => p.contains(sl.anchorNode));
}, FIRST_TEXT);

// 본문 텍스트 블록 전부의 단락(제목 제외). URL 뒤 자동 링크 카드가 블록을 갈라도 순서대로 모인다.
const allParas = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.se-component.se-text')].filter((c) => !c.classList.contains('se-documentTitle'))
    .flatMap((c) => [...c.querySelectorAll('.se-text-paragraph')].map((p) => p.textContent.replace(/​/g, '').trim())));
// FIRST_TEXT 블록 앞에 있는 본문 단락 수
const parasBeforeFirst = (page) => page.evaluate((sel) => {
  const first = eval(sel); let n = 0;
  for (const c of [...document.querySelectorAll('.se-component.se-text')].filter((c) => !c.classList.contains('se-documentTitle'))) { if (c === first) break; n += c.querySelectorAll('.se-text-paragraph').length; }
  return n;
}, FIRST_TEXT);

// 첫 텍스트 블록 idx 단락에서 캐럿 앞 텍스트 길이(-1: 캐럿이 그 단락 밖)
const preLen = (page, idx) => page.evaluate((sel, i) => {
  const c = eval(sel); const p = c && c.querySelectorAll('.se-text-paragraph')[i]; const sl = getSelection();
  if (!p || !sl.rangeCount) return -1;
  const r = sl.getRangeAt(0); if (!p.contains(r.startContainer)) return -1;
  const pre = document.createRange(); pre.setStart(p, 0); pre.setEnd(r.startContainer, r.startOffset);
  return pre.toString().replace(/​/g, '').length;
}, FIRST_TEXT, idx);

// idx 단락 첫 글자의 화면 좌표(왼쪽 가장자리). 스크롤을 먼저 맞추고 잠시 뒤 다시 잰다(부드러운 스크롤 대비).
async function firstGlyph(page, idx) {
  const measure = (scroll) => page.evaluate((sel, i, sc) => {
    const p = eval(sel).querySelectorAll('.se-text-paragraph')[i]; if (!p) return null;
    if (sc) p.scrollIntoView({ block: 'center', behavior: 'instant' });
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode()) && (!n.textContent.replace(/​/g, '') || n.parentElement.closest('.se-emoji')));
    if (!n) return null;
    const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, 1);
    const b = r.getBoundingClientRect(); return { x: b.left - 2, y: b.top + b.height / 2 };
  }, FIRST_TEXT, idx, scroll);
  await measure(true); await wait(500);
  return measure(false);
}

// 첫 텍스트 블록의 첫 내용 단락 위에 [링크 줄][빈 줄]을 만든다. 검증은 본문 전체 단락으로 한다.
async function insertLine(page, line) {
  const before = await paraTexts(page);
  const f = before.findIndex((t) => t.length > 0);
  if (f < 0) return { ok: false, why: 'no-filled-para' };
  const allBefore = await allParas(page);
  const g0 = (await parasBeforeFirst(page)) + f;
  let g, pre = -1;
  for (let attempt = 0; attempt < 3 && pre !== 0; attempt++) {
    g = await firstGlyph(page, f); if (!g) return { ok: false, why: 'no-glyph' };
    await page.mouse.click(g.x - attempt * 2, g.y); await wait(400);
    pre = await preLen(page, f);
    if (pre !== 0) await wait(800);
  }
  if (pre < 0) return { ok: false, why: 'focus-miss' };
  if (pre !== 0) return { ok: false, why: 'caret ' + pre };
  await page.keyboard.press('Enter'); await wait(300);   // 단락 시작에서 Enter → 위에 빈 단락
  let t = await allParas(page);
  if (t.length !== allBefore.length + 1 || t[g0 + 1] !== allBefore[g0]) return { ok: false, why: 'split ' + JSON.stringify(t.slice(g0, g0 + 2).map((x) => x.slice(0, 30))) };
  await page.keyboard.press('ArrowUp'); await wait(250);
  if ((await preLen(page, f)) < 0) return { ok: false, why: 'arrowup-miss' };
  await page.keyboard.type(line, { delay: 10 });
  await page.keyboard.press('Enter'); await wait(1500);
  let after = await allParas(page);
  for (let k = 0; k < 2 && after[g0 + 1] !== ''; k++) { await page.keyboard.press('Enter'); await wait(900); after = await allParas(page); }
  const expect = [...allBefore.slice(0, g0), line, '', ...allBefore.slice(g0)];
  const good = JSON.stringify(after) === JSON.stringify(expect);
  return { ok: good, why: good ? '' : `layout: ${JSON.stringify(after.slice(g0, g0 + 3).map((x) => x.slice(0, 40)))}` };
}

// idx 단락 캐럿을 앞 텍스트 길이 target 위치로 옮긴다(첫 글자 클릭 → 화살표). 성공 시 true.
async function caretTo(page, idx, target) {
  const g = await firstGlyph(page, idx); if (!g) return false;
  await page.mouse.click(g.x, g.y); await wait(300);
  let pre = await preLen(page, idx); if (pre < 0) return false;
  for (let k = 0; k < 60 && pre > 0; k++) { await page.keyboard.press('ArrowLeft'); await wait(30); pre = await preLen(page, idx); }
  for (let k = 0; k < 200 && pre >= 0 && pre < target; k++) { await page.keyboard.press('ArrowRight'); await wait(30); pre = await preLen(page, idx); }
  return pre === target;
}

// 우리 줄과 다른 텍스트가 한 단락에 붙은 경우(1차 배치 결함): 링크 span 바로 뒤 텍스트의 첫 글자를 클릭해 갈라 주고 빈 줄을 둔다.
async function repairMerged(page, slug) {
  const texts = await paraTexts(page);
  const idx = texts.findIndex((t) => t.includes(`feelandnote.com/celeb/${slug}`) && !t.endsWith(`/celeb/${slug}`));
  if (idx < 0) return false;
  const g = await page.evaluate((sel, i) => {
    const p = eval(sel).querySelectorAll('.se-text-paragraph')[i]; p.scrollIntoView({ block: 'center', behavior: 'instant' });
    const link = [...p.querySelectorAll('.se-link')].find((a) => a.textContent.includes('feelandnote.com/celeb/'));
    if (!link) return null;
    let n = link.nextSibling; while (n && !n.textContent.replace(/​/g, '')) n = n.nextSibling;
    if (!n) return null;
    const t = n.nodeType === 3 ? n : document.createTreeWalker(n, NodeFilter.SHOW_TEXT).nextNode();
    const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 1);
    const b = r.getBoundingClientRect();
    const pre = document.createRange(); pre.setStart(p, 0); pre.setEnd(t, 0);
    return { x: b.left - 2, y: b.top + b.height / 2, target: pre.toString().replace(/​/g, '').length, tail: n.textContent.replace(/​/g, '').trim() };
  }, FIRST_TEXT, idx);
  if (!g) return false;
  await page.mouse.click(g.x, g.y); await wait(300);
  if ((await preLen(page, idx)) !== g.target) return false;
  await page.keyboard.press('Enter'); await wait(300);   // 링크 뒤에서 분리 → 꼬리가 idx+1
  await page.keyboard.press('Enter'); await wait(600);   // 꼬리 시작에서 Enter → 빈 줄이 idx+1
  const t2 = await paraTexts(page);
  return t2[idx]?.endsWith(`/celeb/${slug}`) && t2[idx + 1] === '' && (t2[idx + 2] ?? '').startsWith(g.tail.slice(0, 20));
}

// 잘못된 링크 줄(다른 slug)을 지우고 올바른 줄로 다시 쓴다.
async function replaceWrongLine(page, line) {
  const texts = await paraTexts(page);
  const idx = texts.findIndex((t) => t.includes('feelandnote.com/'));
  if (idx < 0) return { ok: false, why: 'no-wrong-line' };
  let g, pre = -1;
  for (let attempt = 0; attempt < 3 && pre !== 0; attempt++) {
    g = await firstGlyph(page, idx); if (!g) return { ok: false, why: 'no-glyph' };
    await page.mouse.click(g.x - attempt * 2, g.y); await wait(400); pre = await preLen(page, idx);
  }
  const keep = texts[idx].slice(0, pre);               // 캐럿 앞에 남는 부분(보통 이모지)
  if (pre < 0 || keep !== line.slice(0, pre)) return { ok: false, why: 'caret ' + pre };
  for (let k = 0; k < 150; k++) {
    const t = (await paraTexts(page))[idx];
    if (t === keep) break;
    await page.keyboard.press('Delete'); await wait(40);
  }
  let t = await paraTexts(page);
  if (t[idx] !== keep || t.length !== texts.length) return { ok: false, why: 'delete ' + JSON.stringify(t.slice(idx, idx + 2).map((x) => x.slice(0, 30))) };
  await page.keyboard.type(line.slice(pre), { delay: 10 }); await wait(900);
  t = await paraTexts(page);
  const expect = texts.map((x, i) => (i === idx ? line : x));
  const good = JSON.stringify(t) === JSON.stringify(expect);
  return { ok: good, why: good ? 'replaced' : 'layout ' + JSON.stringify(t.slice(idx, idx + 2).map((x) => x.slice(0, 40))) };
}

// 본문에서 match 를 포함한 첫 단락을 찾아 내용을 text 로 바꾼다(첫 글자 클릭 → Delete 로 비우고 → 입력). 성공 시 true.
async function replacePara(page, match, text) {
  const gi = (await allParas(page)).findIndex((t) => t.includes(match));
  if (gi < 0) return false;
  const glyph = await page.evaluate((i) => {
    const ps = [...document.querySelectorAll('.se-component.se-text')].filter((c) => !c.classList.contains('se-documentTitle')).flatMap((c) => [...c.querySelectorAll('.se-text-paragraph')]);
    const p = ps[i]; p.scrollIntoView({ block: 'center', behavior: 'instant' });
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode()) && (!n.textContent.replace(/​/g, '') || n.parentElement.closest('.se-emoji')));
    if (!n) return null; const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, 1); const b = r.getBoundingClientRect(); return { x: b.left - 2, y: b.top + b.height / 2 };
  }, gi);
  if (!glyph) return false;
  await wait(400);
  const glyph2 = await page.evaluate((i) => { const ps = [...document.querySelectorAll('.se-component.se-text')].filter((c) => !c.classList.contains('se-documentTitle')).flatMap((c) => [...c.querySelectorAll('.se-text-paragraph')]); const p = ps[i]; const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode()) && (!n.textContent.replace(/​/g, '') || n.parentElement.closest('.se-emoji'))); const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, 1); const b = r.getBoundingClientRect(); return { x: b.left - 2, y: b.top + b.height / 2 }; }, gi);
  await page.mouse.click(glyph2.x, glyph2.y); await wait(300);
  const paraText = () => page.evaluate((i) => { const ps = [...document.querySelectorAll('.se-component.se-text')].filter((c) => !c.classList.contains('se-documentTitle')).flatMap((c) => [...c.querySelectorAll('.se-text-paragraph')]); return ps[i]?.textContent.replace(/​/g, '').trim() ?? null; }, gi);
  for (let k = 0; k < 400 && (await paraText()) !== ''; k++) { await page.keyboard.press('Delete'); await wait(20); }
  if ((await paraText()) !== '') return false;
  await page.keyboard.type(text, { delay: 8 }); await wait(400);
  return (await paraText()) === text;
}

async function publish(page) {
  await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
  const cb = await page.$('button[class*=confirm_btn]');
  const box = await cb.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(6000);
  return page.url().includes('PostView') && page.url().includes('isAfterUpdateOnly');
}

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
// 창이 최소화·가려짐이면 편집기가 클릭을 처리하지 않는다. 창을 복원하고 탭을 앞으로 가져온다.
async function ensureVisible(page) {
  const cdp = await page.createCDPSession();
  try {
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
  } catch {}
  await cdp.detach().catch(() => {});
  await page.bringToFront();
  await wait(500);
  const vis = await page.evaluate(() => document.visibilityState);
  if (vis !== 'visible') console.log('경고: 탭이 보이지 않는 상태(' + vis + '). 크롬 창을 화면에 띄워야 한다.');
  return vis === 'visible';
}
await ensureVisible(page);
page.on('dialog', (d) => { d.accept().catch(() => {}); }); // 미저장 이탈 확인창 자동 수락
let n = 0, fails = 0;

for (const post of map) {
  if (n >= limit) break;
  if (!post.slug && !post.url && post.action !== 'private') continue;
  if (['manual', 'skip', 'excluded', 'replaced', 'deleted', 'to-delete'].includes(post.link)) continue; // 사람이 처리하거나 대상이 아닌 글은 열지 않는다
  if (only ? post.logNo !== only : done[post.logNo]?.status === 'ok') continue;
  try {
  if (post.action === 'reopen') { // 비공개였던 글: 제목 교체(선택) + 첫 줄 링크 + 전체공개로 재발행
    await ensureVisible(page);
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${post.logNo}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 30000 }); await wait(4000);
    const titleSel = '.se-documentTitle .se-text-paragraph';
    const titleText = () => page.evaluate((q) => { const p = document.querySelector(q); if (p.querySelector('.se-placeholder')) return ''; return p.textContent.replace(/​/g, '').trim(); }, titleSel);
    if (post.newTitle && (await titleText()) !== post.newTitle) {
      const g = await page.evaluate((q) => { const p = document.querySelector(q); const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode()) && !n.textContent.replace(/​/g, '')); const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, 1); const b = r.getBoundingClientRect(); return { x: b.left - 2, y: b.top + b.height / 2 }; }, titleSel);
      await page.mouse.click(g.x, g.y); await wait(300);
      for (let k = 0; k < 200 && (await titleText()) !== ''; k++) { await page.keyboard.press('Delete'); await wait(25); }
      if ((await titleText()) !== '') throw new Error('제목 삭제 실패: ' + (await titleText()).slice(0, 30));
      await page.keyboard.type(post.newTitle, { delay: 10 }); await wait(300);
      if ((await titleText()) !== post.newTitle) throw new Error('제목 입력 불일치: ' + (await titleText()).slice(0, 40));
    }
    for (const e of post.edits ?? []) { if (!(await replacePara(page, e.match, e.text))) throw new Error('단락 교체 실패: ' + e.match.slice(0, 20)); }
    const key = post.url.replace('https://feelandnote.com', '');
    let result = { ok: true, why: 'already' };
    if (!(await allParas(page)).some((t) => t.includes(key))) result = await insertLine(page, post.line);
    if (!result.ok) throw new Error('링크 삽입 실패: ' + result.why);
    await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
    const pub0 = await page.evaluate(() => { const l = [...document.querySelectorAll('[class*=option_open_type] label')].find((l) => l.textContent.trim() === '전체공개'); const r = l.getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 }; });
    await page.mouse.click(pub0.x, pub0.y); await wait(500);
    const state = await page.evaluate(() => { const rs = [...document.querySelectorAll('[class*=option_open_type] input[type=radio]')]; const r = rs.find((x) => x.checked); return r ? document.querySelector(`label[for="${r.id}"]`)?.textContent.trim() : null; });
    const searchOn = await page.evaluate(() => document.querySelector('#publish-option-search')?.checked);
    if (state !== '전체공개' || !searchOn) throw new Error(`공개 설정 이상 state=${state} search=${searchOn}`);
    for (const tg of post.tagsRemove ?? []) { // 태그 칩의 삭제 버튼을 누른다
      const pos = await page.evaluate((t) => { const chip = document.getElementById('tag-item-' + t); if (!chip) return null; const r = chip.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, tg);
      if (!pos) { console.log('  태그 없음(건너뜀):', tg); continue; }
      await page.mouse.click(pos.x, pos.y); await wait(300); await page.keyboard.press('Backspace'); await wait(300);
      if (await page.evaluate((t) => !!document.getElementById('tag-item-' + t), tg)) { await page.keyboard.press('Delete'); await wait(300); }
    }
    if (post.tagsAdd?.length) { const inp = await page.$('input[class*=tag_input]'); await inp.click(); for (const t of post.tagsAdd) { await page.keyboard.type(t, { delay: 8 }); await page.keyboard.press('Enter'); await wait(250); } }
    const tagsNow = await page.evaluate(() => [...document.querySelectorAll('[class*=option_tag] [id^=tag-item-]')].map((e) => e.textContent.trim()));
    for (const tg of post.tagsRemove ?? []) if (tagsNow.includes('#' + tg)) throw new Error('태그 삭제 안 됨: ' + tg);
    if (process.env.NB_STEP || dry) console.log('  태그:', tagsNow.join(' '));
    if (dry) { await page.screenshot({ path: `${SC}/nb-reopen-${post.logNo}.png` }); console.log('DRY-OK 재공개 준비', post.logNo, '| 제목', await titleText()); break; }
    const cbr = await page.$('button[class*=confirm_btn]'); const bxr = await cbr.boundingBox();
    await page.mouse.click(bxr.x + bxr.width / 2, bxr.y + bxr.height / 2); await wait(2500);
    // "비공개 글을 전체공개로 변경합니다. 발행하시겠습니까?" 확인창
    const okPos = await page.evaluate(() => { const b = [...document.querySelectorAll('.se-popup button')].find((b) => b.textContent.trim() === '확인'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (okPos) { await page.mouse.click(okPos.x, okPos.y); }
    await wait(6000);
    const html = await (await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${post.logNo}`, UA)).text();
    const ok = page.url().includes('PostView') && html.includes(key);
    const date = html.match(/se_publishDate[^>]*>([^<]+)</)?.[1];
    console.log(ok ? 'OK    재공개' : 'CHECK 재공개', post.logNo, post.newTitle ?? post.title.slice(0, 30), '| 날짜', date);
    done[post.logNo] = { status: ok ? 'ok' : 'check' }; if (ok) { post.title = post.newTitle ?? post.title; post.kind = 'curated'; delete post.action; delete post.newTitle; }
    save(); n++; await wait(8000); continue;
  }
  if (post.action === 'private') { // 사이트에 대응 페이지가 없는 글은 비공개로 닫는다
    await ensureVisible(page);
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${post.logNo}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 30000 }); await wait(4000);
    await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
    const current = await page.evaluate(() => { const rs = [...document.querySelectorAll('[class*=option_open_type] input[type=radio]')]; const r = rs.find((x) => x.checked); return r ? document.querySelector(`label[for="${r.id}"]`)?.textContent.trim() : null; });
    if (current === '비공개') { console.log('이미 비공개', post.logNo, post.title.slice(0, 30)); done[post.logNo] = { status: 'ok', note: 'private' }; save(); continue; }
    if (process.env.NB_STEP) console.log('  현재 공개 상태:', current, '→ 비공개로 바꾼다', post.logNo, post.title.slice(0, 30));
    const picked = await page.evaluate(() => {
      const lbl = [...document.querySelectorAll('[class*=option_open_type] label')].find((l) => l.textContent.trim() === '비공개');
      if (!lbl) return false; const r = lbl.getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 };
    });
    if (!picked) throw new Error('비공개 라디오를 찾지 못함');
    await page.mouse.click(picked.x, picked.y); await wait(500);
    const isPrivate = await page.evaluate(() => { const rs = [...document.querySelectorAll('[class*=option_open_type] input[type=radio]')]; const i = rs.findIndex((r) => r.checked); return rs[i] && document.querySelector(`label[for="${rs[i].id}"]`)?.textContent.trim() === '비공개'; });
    if (!isPrivate) throw new Error('비공개 선택이 반영되지 않음');
    if (dry) { console.log('DRY-OK 비공개 준비', post.logNo, post.title.slice(0, 30)); break; }
    const cbp = await page.$('button[class*=confirm_btn]'); const bxp = await cbp.boundingBox();
    await page.mouse.click(bxp.x + bxp.width / 2, bxp.y + bxp.height / 2); await wait(6000);
    const pub = page.url().includes('PostView');
    const html = await (await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${post.logNo}`, UA)).text();
    const closed = !html.includes('se-main-container') || /비공개|권한이 없|존재하지 않/.test(html);
    console.log(pub && closed ? 'OK    비공개' : 'CHECK 비공개', post.logNo, post.title.slice(0, 30));
    done[post.logNo] = { status: pub && closed ? 'ok' : 'check', note: 'private' }; save();
    n++; await wait(8000); continue;
  }
  if (post.url) { // 인물 아닌 페이지: 문구와 URL을 대응표에서 직접 받는다
    const line = post.line; const key = post.url.replace('https://feelandnote.com', '');
    await ensureVisible(page);
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${post.logNo}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 30000 }); await wait(4000);
    const texts0 = await paraTexts(page);
    let result;
    if (texts0.some((t) => t === line)) { console.log('이미 있음', post.logNo); done[post.logNo] = { status: 'ok', url: post.url, note: 'already' }; save(); continue; }
    if (!post.forceLine && texts0.some((t) => t.includes(key))) { console.log('이미 있음', post.logNo); done[post.logNo] = { status: 'ok', url: post.url, note: 'already' }; save(); continue; }
    if (texts0.some((t) => t.includes('feelandnote.com/'))) result = await replaceWrongLine(page, line); // 다른 주소의 우리 링크 줄이 있으면 교체
    else result = await insertLine(page, line);
    if (dry) { await page.screenshot({ path: `${SC}/nb-dry-${post.logNo}.png` }); console.log(result.ok ? 'DRY-OK ' : 'DRY-BAD', post.logNo, post.url, result.why); console.log('   단락:', JSON.stringify((await paraTexts(page)).slice(0, 4).map((t) => t.slice(0, 60)))); break; }
    if (!result.ok) { console.log('삽입 검증 실패, 발행 안 함', post.logNo, result.why); done[post.logNo] = { status: 'insert-failed', url: post.url, why: result.why }; save(); if (++fails >= 3) break; continue; }
    const pub = await publish(page);
    const html = await (await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${post.logNo}`, UA)).text();
    const ok = pub && html.includes(key);
    const date = html.match(/se_publishDate[^>]*>([^<]+)</)?.[1];
    console.log(ok ? 'OK   ' : 'CHECK', post.logNo, post.url, '| 날짜', date);
    done[post.logNo] = { status: ok ? 'ok' : 'check', url: post.url, date }; save();
    if (ok) fails = 0; else if (++fails >= 3) break;
    n++; await wait(8000); continue;
  }

  const name = await celebName(post.slug);
  if (!name) { console.log('skip 이름 없음', post.logNo, post.slug); done[post.logNo] = { status: 'no-name', slug: post.slug }; save(); continue; }
  const line = `📚 ${name}의 독서 목록 전체 보기 → https://feelandnote.com/celeb/${post.slug}`;

  await ensureVisible(page);
  await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${post.logNo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 30000 });
  await wait(10000); // 편집기 초기화 여유
  const help = await page.$('.se-help-panel-close-button, button[class*=help][class*=close]');
  if (help) { await help.click(); await wait(400); }

  let result;
  const texts = await paraTexts(page);
  if (texts.some((t) => t.includes('feelandnote.com/celeb/') && !t.includes(`feelandnote.com/celeb/${post.slug}`))) {
    result = await replaceWrongLine(page, line);
  } else if (texts.some((t) => t.includes(`feelandnote.com/celeb/${post.slug}`))) {
    const merged = texts.some((t) => t.includes(`/celeb/${post.slug}`) && !t.endsWith(`/celeb/${post.slug}`));
    const li = texts.findIndex((t) => t.endsWith(`/celeb/${post.slug}`));
    if (!merged && li >= 0 && (texts[li + 1] === '' || li === texts.length - 1)) { console.log('이미 정상', post.logNo); done[post.logNo] = { status: 'ok', slug: post.slug, name, note: 'already' }; save(); continue; }
    if (!merged) { // 링크 줄 뒤 빈 줄만 없음 → 빈 줄 추가
      const nextFilled = texts.findIndex((t, i) => i > li && t.length > 0);
      let ok2 = false;
      if (nextFilled === li + 1 && (await caretTo(page, nextFilled, 0))) {
        await page.keyboard.press('Enter'); await wait(800);
        const t2 = await paraTexts(page);
        ok2 = t2[li]?.endsWith(`/celeb/${post.slug}`) && t2[li + 1] === '' && t2[li + 2] === texts[li + 1];
      }
      result = { ok: ok2, why: 'blank-line' };
    } else {
      result = { ok: await repairMerged(page, post.slug), why: 'repair' };
    }
  } else {
    result = await insertLine(page, line);
  }

  if (dry) {
    await page.screenshot({ path: `${SC}/nb-dry-${post.logNo}.png` });
    console.log(result.ok ? 'DRY-OK ' : 'DRY-BAD', post.logNo, post.slug, name, result.why);
    console.log('   단락:', JSON.stringify((await paraTexts(page)).slice(0, 4).map((t) => t.slice(0, 60))));
    break;
  }
  if (!result.ok) {
    console.log('삽입 검증 실패, 발행 안 함', post.logNo, result.why);
    done[post.logNo] = { status: 'insert-failed', slug: post.slug, why: result.why }; save();
    if (++fails >= 3) { console.log('연속 실패 3건, 중단'); break; }
    continue;
  }

  const pub = await publish(page);
  const html = await (await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${post.logNo}`, UA)).text();
  const live = html.includes(`feelandnote.com/celeb/${post.slug}`);
  const date = html.match(/se_publishDate[^>]*>([^<]+)</)?.[1];
  const ok = pub && live;
  console.log(ok ? 'OK   ' : 'CHECK', post.logNo, post.slug, name, '| 날짜', date);
  done[post.logNo] = { status: ok ? 'ok' : 'check', slug: post.slug, name, date }; save();
  if (ok) fails = 0; else if (++fails >= 3) { console.log('연속 실패 3건, 중단'); break; }
  n++; await wait(8000);
  } catch (e) {
    console.log('예외', post.logNo, post.slug, String(e).split(String.fromCharCode(10))[0].slice(0, 120));
    done[post.logNo] = { status: 'error', slug: post.slug, why: String(e).slice(0, 200) }; save();
    if (++fails >= 3) { console.log('연속 실패 3건, 중단'); break; }
  }
}
const s = Object.values(done);
console.log(`집계: ok ${s.filter((x) => x.status === 'ok').length} / 실패·확인 ${s.filter((x) => x.status !== 'ok').length}`);
if (launched) await browser.close(); else browser.disconnect();   // 사용자 창은 끄지 않는다
