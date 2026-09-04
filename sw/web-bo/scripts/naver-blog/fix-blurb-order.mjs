/**
 * 소개가 「감상배경」 라벨 뒤로 들어간 글을 바로잡는다.
 *
 * apply-blurbs 초판이 감상 단락 자리에 소개를 넣어, 라벨 → 소개 → 감상 순서가 됐다.
 * 라벨은 감상의 출처를 가리키므로 그 뒤에 소개가 오면 출처가 소개를 가리키는 것처럼 읽힌다.
 * 두 단락의 글을 맞바꿔 소개 → 라벨 → 감상으로 되돌린다.
 *
 * 사용: node scripts/naver-blog/fix-blurb-order.mjs <logNo> [--dry]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';

const DRAFTS = path.join(path.resolve(import.meta.dirname, '../../../..'), 'data/naver-blog/celeb-drafts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const useAll = args.includes('--all');
const one = args.find((a) => /^\d{9,}$/.test(a));
if (!one && !useAll) { console.log('글 번호를 넘기거나 --all 을 써라'); process.exit(1); }
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

async function replacePara(page, idx, text) {
  if (!(await selectPara(page, idx))) throw new Error(`단락 선택 실패 ${idx}`);
  for (let z = 0; z < 500; z++) {
    if (!((await paras(page))[idx]?.t ?? '')) break;
    await page.keyboard.press('Backspace'); await wait(15);
  }
  for (let j = 0; j < text.length; j += 60) { await page.keyboard.type(text.slice(j, j + 60), { delay: 12 }); await wait(120); }
  await wait(400);
  const got = (await paras(page))[idx]?.t ?? '';
  if (got !== text) throw new Error(`확인 실패: ${JSON.stringify(got.slice(0, 30))} ≠ ${JSON.stringify(text.slice(0, 30))}`);
}

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rowsAll = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const targets = one ? rowsAll.filter((r) => String(r.logNo) === String(one)) : rowsAll.filter((r) => r.logNo && r.applied);
if (!targets.length) { console.log('대상 없음'); process.exit(0); }
console.log(`대상 ${targets.length}편`);

/** 그 글의 책 소개 문장들 */
const blurbsOf = (row) => new Set(
  row.body.split(/\n(?=\*\*『)/).slice(1).map((b) => {
    const lines = b.split('\n').map((l) => l.trim());
    const imgAt = lines.findIndex((l) => l.startsWith('[img:'));
    if (imgAt < 0) return null;
    return lines.slice(imgAt + 1).find((l) => l && !l.startsWith('**감상배경:**') && !l.startsWith('---') && !l.startsWith('[c]'));
  }).filter(Boolean)
);

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

let fixed = 0, clean = 0, failed = 0;
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  try {
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${row.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
    await wait(4500);

    // 「감상배경: …」 바로 뒤 단락이 **그 글의 소개**일 때만 뒤바뀐 것이다.
    // 정상 구조에서도 감상배경 다음에는 감상이 오므로, 초안의 소개와 대조해야 오탐을 막는다.
    const blurbSet = blurbsOf(row);
    const list = await paras(page);
    const swaps = [];
    for (const p of list) {
      if (!/^감상배경:/.test(p.t)) continue;
      const next = list[p.i + 1];
      if (!next || !blurbSet.has(next.t)) continue;
      swaps.push({ labelIdx: p.i, label: p.t, blurbIdx: next.i, blurb: next.t });
    }
    if (!swaps.length) { clean++; console.log(`정상 ${slug}`); continue; }
    console.log(`${slug} — 뒤바뀐 자리 ${swaps.length}곳`);
    if (dry) { swaps.forEach((s) => console.log(`   [${s.labelIdx}] ${s.label.slice(0, 26)} ↔ ${s.blurb.slice(0, 30)}…`)); fixed++; continue; }

    for (const s of [...swaps].reverse()) {
      await replacePara(page, s.labelIdx, s.blurb);
      await replacePara(page, s.blurbIdx, s.label);
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
    console.log(`OK ${slug} — ${swaps.length}곳 맞바꿈`);
  } catch (e) {
    failed++;
    console.log(`실패 ${slug}: ${String(e).split('\n')[0].slice(0, 160)}`);
  }
}
console.log(`\n완료 — 바로잡음 ${fixed} / 정상 ${clean} / 실패 ${failed}`);
if (launched) await browser.close(); else browser.disconnect();
