/**
 * 올라간 글의 본문을 초안과 **순서까지** 대조한다. 고치지 않고 읽기만 한다.
 *
 * `verify-blurbs.mjs` 는 소개·라벨·감상이 「있는가」만 봤다. 그래서 다른 책의 감상이
 * 끼어들거나 라벨이 두 번 나오는 사고를 놓쳤다(26.09.04 한강 편). 여기서는 초안의
 * 텍스트 단락 순서를 그대로 늘어놓고 편집기 단락과 한 줄씩 맞춰 본다.
 *
 * 사용: node scripts/naver-blog/verify-body.mjs [logNo] [--all]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';

const DRAFTS = path.join(path.resolve(import.meta.dirname, '../../../..'), 'data/naver-blog/celeb-drafts.json');
const args = process.argv.slice(2);
const one = args.find((a) => /^\d{9,}$/.test(a));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const paras = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')]
    .map((e) => e.textContent.replace(/​/g, '').trim()).filter(Boolean));

/** 초안 본문에서 글자 있는 줄만 순서대로 뽑는다(이미지·구분선·빈 줄 제외). */
const wantLines = (row) => row.body.split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('[img:') && !l.startsWith('---'))
  .map((l) => l.replace(/\*\*/g, '').replace(/^\[c\]/, '').replace(/\[\/c\]$/, '').trim());

const BROKEN = /[�]/;

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const targets = one ? rows.filter((r) => String(r.logNo) === String(one)) : rows.filter((r) => r.logNo);
console.log(`검사 대상 ${targets.length}편\n`);

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

const bad = [];
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  try {
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${row.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
    await wait(4000);

    const got = await paras(page);
    const want = wantLines(row);
    const problems = [];

    // 글자가 깨진 줄
    got.forEach((t, i) => { if (BROKEN.test(t)) problems.push(`깨진 글자 [${i}] ${t.slice(0, 30)}`); });

    // 초안보다 더 많이 나오는 줄 — 라벨 중복·감상 끼어듦이 여기서 잡힌다.
    // 초안 자체에 같은 줄이 여럿일 수 있다(세 권이 같은 자리에서 온 감상이면 라벨이 세 번이다).
    const count = (arr) => arr.reduce((m, t) => (t.length > 12 ? m.set(t, (m.get(t) ?? 0) + 1) : m), new Map());
    const gotN = count(got), wantN = count(want);
    for (const [t, n] of gotN) {
      const w = wantN.get(t) ?? 0;
      if (n > w) problems.push(`${n}번 나옴(초안은 ${w}번): ${t.slice(0, 30)}`);
    }

    // 초안에 없는 줄이 끼어 있는지 (다른 책의 감상이 들어온 경우)
    const wantSet = new Set(want);
    const stray = got.filter((t) => t.length > 20 && !wantSet.has(t));
    for (const t of stray.slice(0, 4)) problems.push(`초안에 없는 줄: ${t.slice(0, 34)}`);

    // 초안에 있는데 글에 없는 줄
    const gotSet = new Set(got);
    const missing = want.filter((t) => t.length > 20 && !gotSet.has(t));
    for (const t of missing.slice(0, 4)) problems.push(`빠진 줄: ${t.slice(0, 34)}`);

    if (problems.length) { bad.push({ slug, logNo: row.logNo, problems }); console.log(`손상 ${slug} (${row.logNo})`); problems.forEach((p) => console.log(`   · ${p}`)); }
    else console.log(`정상 ${slug}`);
  } catch (e) {
    console.log(`확인실패 ${slug}: ${String(e).split('\n')[0].slice(0, 100)}`);
  }
}

console.log(`\n손상 ${bad.length}편 / 검사 ${targets.length}편`);
if (bad.length) console.log(bad.map((b) => `${b.logNo} ${b.slug}`).join('\n'));
if (launched) await browser.close(); else browser.disconnect();
