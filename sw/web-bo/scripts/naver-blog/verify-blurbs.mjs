/**
 * 소개를 반영한 글이 온전한지 검사한다. 고치지 않고 읽기만 한다.
 *
 * 26.09.04에 반영 스크립트의 재시도 정리 코드가 첫 시도에도 돌아 **감상 단락을 지웠다.**
 * 소개와 라벨만 남고 그 사람의 이야기가 통째로 사라진 글이 나왔다. 그 피해를 찾는다.
 *
 * 사용: node scripts/naver-blog/verify-blurbs.mjs [logNo] [--all]   (sw/web-bo 에서)
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
    .map((e, i) => ({ i, t: e.textContent.replace(/​/g, '').trim() })));

const strip = (s) => s.replace(/\*\*/g, '').trim();

/** 초안에서 책마다 (소개, 라벨, 감상)을 뽑는다 */
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
console.log(`검사 대상 ${targets.length}편\n`);

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

const broken = [];
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  try {
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${row.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
    await wait(4000);
    const list = await paras(page);
    const text = list.map((p) => p.t);
    const miss = [];
    for (const w of want(row)) {
      if (w.review && !text.includes(w.review)) miss.push(`감상없음:${w.title}`);
      if (!text.includes(w.blurb)) miss.push(`소개없음:${w.title}`);
      if (w.label && !text.includes(w.label)) miss.push(`라벨없음:${w.title}`);
    }
    if (miss.length) { broken.push({ slug, logNo: row.logNo, miss }); console.log(`손상 ${slug} — ${miss.join(' · ')}`); }
    else console.log(`정상 ${slug}`);
  } catch (e) {
    console.log(`확인실패 ${slug}: ${String(e).split('\n')[0].slice(0, 100)}`);
  }
}

console.log(`\n손상 ${broken.length}편 / 검사 ${targets.length}편`);
if (broken.length) console.log(broken.map((b) => `${b.logNo} ${b.slug}`).join('\n'));
if (launched) await browser.close(); else browser.disconnect();
