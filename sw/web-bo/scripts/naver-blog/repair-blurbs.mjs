/**
 * 소개 반영이 망가뜨린 글을 고친다.
 *
 * 두 가지를 한 번에 바로잡는다.
 *   1) **사라진 감상을 되살린다.** 반영 스크립트의 재시도 정리 코드가 첫 시도에도 돌아
 *      idx+1(그때는 아직 원래 감상이던 자리)을 지웠다. 26.09.04에 7편 17곳이 날아갔다.
 *   2) **소개와 라벨 사이에 빈 줄을 넣는다.** 붙여 놓으면 소개·라벨·감상 세 줄이
 *      한 덩어리로 보인다.
 *
 * 라벨 단락 하나를 `[빈 줄, 라벨, 감상]` 으로 다시 써서 둘을 동시에 처리한다.
 *
 * 사용: node scripts/naver-blog/repair-blurbs.mjs [logNo] [--dry]   (sw/web-bo 에서)
 *       인자를 안 주면 반영된 글 전부를 본다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';

const DRAFTS = path.join(path.resolve(import.meta.dirname, '../../../..'), 'data/naver-blog/celeb-drafts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const one = args.find((a) => /^\d{9,}$/.test(a));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => s.replace(/\*\*/g, '').trim();

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
    if (!f) { const r = q.getBoundingClientRect(); return { sx: r.left + 5, sy: r.top + r.height / 2, ex: r.left + 5, ey: r.top + r.height / 2 }; }
    const r1 = document.createRange(); r1.setStart(f, 0); r1.setEnd(f, 1); const b1 = r1.getBoundingClientRect();
    const r2 = document.createRange(); r2.setStart(l, Math.max(0, l.textContent.length - 1)); r2.setEnd(l, l.textContent.length); const b2 = r2.getBoundingClientRect();
    return { sx: b1.left + 1, sy: b1.top + b1.height / 2, ex: b2.right - 1, ey: b2.top + b2.height / 2 };
  }, idx);
  if (!g) return false;
  await page.mouse.click(g.sx, g.sy); await wait(250);
  await page.keyboard.down('Shift'); await page.mouse.click(g.ex, g.ey); await page.keyboard.up('Shift'); await wait(400);
  return true;
}

async function typeChunked(page, text) {
  for (let j = 0; j < text.length; j += 60) { await page.keyboard.type(text.slice(j, j + 60), { delay: 12 }); await wait(120); }
}

function want(row) {
  const out = [];
  for (const b of row.body.split(/\n(?=\*\*『)/).slice(1)) {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    const imgAt = lines.findIndex((l) => l.startsWith('[img:'));
    if (imgAt < 0) continue;
    const rest = lines.slice(imgAt + 1).filter((l) => !l.startsWith('---') && !l.startsWith('[c]'));
    const blurb = rest.find((l) => !l.startsWith('**감상배경:**'));
    if (!blurb) continue;
    const after = rest.slice(rest.indexOf(blurb) + 1);
    const label = after.find((l) => l.startsWith('**감상배경:**'));
    const review = after.find((l) => !l.startsWith('**감상배경:**'));
    out.push({ title: b.match(/『([^』]+)』/)?.[1] ?? '?', blurb, label: label ? strip(label) : null, review });
  }
  return out;
}

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const targets = one ? rows.filter((r) => String(r.logNo) === String(one)) : rows.filter((r) => r.logNo && r.applied);
console.log(`대상 ${targets.length}편`);

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

let fixed = 0, clean = 0, failed = 0;
const fails = [];
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  try {
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${row.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
    await wait(4000);

    const list = await paras(page);
    const jobs = [];
    for (const w of want(row)) {
      if (!w.label) continue;                              // 라벨이 없는 책은 기준점이 없어 손대지 않는다
      const li = list.find((p) => p.t === w.label);
      if (!li) continue;
      const prev = list[li.i - 1];
      const next = list[li.i + 1];
      const needReview = w.review && (!next || next.t !== w.review);
      const needBlank = prev && prev.t === w.blurb;        // 소개가 라벨에 딱 붙어 있다
      if (!needReview && !needBlank) continue;
      jobs.push({ idx: li.i, label: w.label, review: w.review, title: w.title, needReview, needBlank });
    }
    if (!jobs.length) { clean++; console.log(`정상 ${slug}`); continue; }

    console.log(`${slug} — 고칠 곳 ${jobs.length}: ${jobs.map((j) => `${j.title}${j.needReview ? '(감상복구)' : ''}${j.needBlank ? '(빈줄)' : ''}`).join(', ')}`);
    if (dry) { fixed++; continue; }

    for (const j of [...jobs].sort((a, b) => b.idx - a.idx)) {
      // 라벨 자리를 [빈 줄, 라벨, 감상] 으로 다시 쓴다. 감상이 살아 있으면 그 줄은 빼고 쓴다.
      const lines = [];
      if (j.needBlank) lines.push('');
      lines.push(j.label);
      if (j.needReview) lines.push(j.review);
      if (lines.length === 1) continue;

      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        if (attempt > 0) {
          // 앞선 시도가 남긴 줄만 걷어낸다
          for (let k = lines.length - 1; k >= 1; k--) {
            if (!((await paras(page))[j.idx + k]?.t ?? '')) continue;
            if (!(await selectPara(page, j.idx + k))) continue;
            for (let z = 0; z < 500 && ((await paras(page))[j.idx + k]?.t ?? ''); z++) { await page.keyboard.press('Backspace'); await wait(15); }
            await page.keyboard.press('Backspace'); await wait(60);
          }
        }
        if (!(await selectPara(page, j.idx))) throw new Error(`단락 선택 실패 ${j.idx}`);
        for (let z = 0; z < 500 && ((await paras(page))[j.idx]?.t ?? ''); z++) { await page.keyboard.press('Backspace'); await wait(15); }
        for (const [k, line] of lines.entries()) {
          if (k) { await page.keyboard.press('Enter'); await wait(400); }
          if (line) await typeChunked(page, line);
          await wait(250);
        }
        await wait(500);
        const now = await paras(page);
        ok = lines.every((line, k) => (now[j.idx + k]?.t ?? '') === line);
        if (!ok && attempt === 2) throw new Error(`확인 실패 ${j.title}`);
      }
    }

    await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
    const cb = await page.$('button[class*=confirm_btn]'); const box = await cb.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(6000);
    const okPos = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.se-popup button')].find((x) => x.textContent.trim() === '확인');
      if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (okPos) { await page.mouse.click(okPos.x, okPos.y); await wait(4000); }
    fixed++;
    console.log(`OK ${slug} — ${jobs.length}곳`);
  } catch (e) {
    failed++; fails.push(slug);
    console.log(`실패 ${slug}: ${String(e).split('\n')[0].slice(0, 160)}`);
  }
}
console.log(`\n완료 — 고침 ${fixed} / 정상 ${clean} / 실패 ${failed}`);
if (fails.length) console.log(`실패한 글: ${fails.join(', ')}`);
if (launched) await browser.close(); else browser.disconnect();
