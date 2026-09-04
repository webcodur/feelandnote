/**
 * 초안에서 감상을 다듬었을 때 이미 올라간 글의 감상을 그 값으로 맞춘다.
 *
 * `trim-dup-lead.mjs` 가 소개와 겹치는 첫 문장을 걷어내면 초안과 네이버가 어긋난다.
 * 네이버 쪽 단락이 초안 감상으로 **끝나면** 앞에 걷어낸 문장이 남아 있는 것이므로 갈아 끼운다.
 * 단락 수는 그대로라 다른 자리를 건드리지 않는다.
 *
 * 사용: node scripts/naver-blog/sync-reviews.mjs [logNo] [--dry]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';

const DRAFTS = path.join(path.resolve(import.meta.dirname, '../../../..'), 'data/naver-blog/celeb-drafts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const one = args.find((a) => /^\d{9,}$/.test(a));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const paras = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')]
    .map((e, i) => ({ i, t: e.textContent.replace(/​/g, '').trim() })));

async function selectPara(page, idx) {
  await page.evaluate((k) => {
    const q = [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')][k];
    q?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, idx);
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

/** 단락 하나를 그 글로 갈아 끼운다. 빠진 글자가 있으면 다시 친다. */
async function replacePara(page, idx, text) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!(await selectPara(page, idx))) throw new Error(`단락 선택 실패 ${idx}`);
    for (let z = 0; z < 500 && ((await paras(page))[idx]?.t ?? ''); z++) { await page.keyboard.press('Backspace'); await wait(15); }
    for (let j = 0; j < text.length; j += 60) { await page.keyboard.type(text.slice(j, j + 60), { delay: 12 }); await wait(120); }
    await wait(450);
    if (((await paras(page))[idx]?.t ?? '') === text) return;
  }
  throw new Error(`갈아 끼우기 실패 ${idx}`);
}

function reviewsOf(row) {
  const out = [];
  for (const b of row.body.split(/\n(?=\*\*『)/).slice(1)) {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    const imgAt = lines.findIndex((l) => l.startsWith('[img:'));
    if (imgAt < 0) continue;
    const rest = lines.slice(imgAt + 1).filter((l) => !l.startsWith('---') && !l.startsWith('[c]'));
    const blurb = rest.find((l) => !l.startsWith('**감상배경:**'));
    if (!blurb) continue;
    const review = rest.slice(rest.indexOf(blurb) + 1).find((l) => !l.startsWith('**감상배경:**'));
    if (review) out.push({ title: b.match(/『([^』]+)』/)?.[1] ?? '?', review });
  }
  return out;
}

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const targets = one ? rows.filter((r) => String(r.logNo) === String(one)) : rows.filter((r) => r.logNo && r.applied && r.trimmed);
console.log(`대상 ${targets.length}편`);

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

let done = 0, clean = 0, failed = 0;
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  try {
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${row.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
    await wait(4000);

    const list = await paras(page);
    const jobs = [];
    for (const w of reviewsOf(row)) {
      if (list.some((p) => p.t === w.review)) continue;                       // 이미 같다
      const hit = list.find((p) => p.t.endsWith(w.review) && p.t.length > w.review.length);
      if (hit) jobs.push({ idx: hit.i, ...w });
    }
    if (!jobs.length) { clean++; console.log(`정상 ${slug}`); continue; }

    console.log(`${slug} — 갈아 끼울 감상 ${jobs.length}곳: ${jobs.map((j) => j.title).join(', ')}`);
    if (dry) { done++; continue; }

    for (const j of [...jobs].sort((a, b) => b.idx - a.idx)) await replacePara(page, j.idx, j.review);

    await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
    const cb = await page.$('button[class*=confirm_btn]'); const box = await cb.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(6000);
    const okPos = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.se-popup button')].find((x) => x.textContent.trim() === '확인');
      if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (okPos) { await page.mouse.click(okPos.x, okPos.y); await wait(4000); }
    done++;
    console.log(`OK ${slug} — ${jobs.length}곳`);
  } catch (e) {
    failed++;
    console.log(`실패 ${slug}: ${String(e).split('\n')[0].slice(0, 160)}`);
  }
}
console.log(`\n완료 — 갱신 ${done} / 정상 ${clean} / 실패 ${failed}`);
if (launched) await browser.close(); else browser.disconnect();
