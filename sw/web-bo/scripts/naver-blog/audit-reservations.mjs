/**
 * 네이버 「예약 발행」 목록을 읽어 posts.json 의 scheduledAt 과 대조한다. 읽기만 하고 저장하지 않는다.
 *
 * 예약은 시간이 지나면 발행되므로 다음 예약을 잡기 전에 실제 목록으로 남은 예약·마지막 예약일·빈 요일을 다시 잰다.
 * 결과는 blog-assets(D:)/naver-blog/_reservations.json 에 남긴다(제목·예약 시각).
 *
 * 사용: node scripts/naver-blog/audit-reservations.mjs   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getNaverPage } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';

const POSTS = path.join(ASSETS, 'naver-blog/posts.json');
const OUT = path.join(ASSETS, 'naver-blog/_reservations.json');
const EXCLUDED = ['deleted', 'to-delete', 'private', 'replaced', 'skip'];
const norm = (s) => String(s ?? '').replace(/\s+/g, '');
const ymd = (when) => { const m = String(when).match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

const { browser, launched } = await getBrowser({ protocolTimeout: 120000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
const editor = createExistingEditor(page);
await editor.blankEditor();
await page.waitForSelector('button[class*=reserve_btn]', { timeout: 15000 }).catch(() => {});
let list = [];
if (await page.$('button[class*=reserve_btn]')) {
  await editor.click('button[class*=reserve_btn]');
  await page.waitForSelector('button[class*=article_button]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1500));
  const rows = await page.$$eval('button[class*=article_button]', (bs) => bs.map((b) => b.innerText.replace(/​/g, '').trim()));
  list = rows.map((t) => { const i = t.lastIndexOf('\n'); return { title: t.slice(0, i).trim(), when: t.slice(i + 1).trim() }; });
} else console.log('예약 발행 단추가 없다 — 예약 글이 0편이다');
fs.writeFileSync(OUT, JSON.stringify(list, null, 1));

const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
const live = posts.filter((p) => p.scheduledAt && !EXCLUDED.includes(p.link));
const byTitle = new Map(live.map((p) => [norm(p.title), p]));
const today = new Date().toISOString().slice(0, 10);
let matched = 0; const onlyActual = [], mismatch = [], kinds = {}, dows = {};
for (const r of list) {
  const p = byTitle.get(norm(r.title));
  kinds[p?.kind ?? '?'] = (kinds[p?.kind ?? '?'] ?? 0) + 1;
  const d = ymd(r.when); if (d) dows[DOW[new Date(d).getDay()]] = (dows[DOW[new Date(d).getDay()]] ?? 0) + 1;
  if (!p) { onlyActual.push(r); continue; }
  matched++;
  if (norm(p.scheduledAt) !== norm(r.when)) mismatch.push({ title: r.title, actual: r.when, recorded: p.scheduledAt });
  byTitle.delete(norm(r.title));
}
const onlyRecorded = [...byTitle.values()].filter((p) => (ymd(p.scheduledAt) ?? '') >= today);
const dates = list.map((r) => r.when).sort();
console.log(`실제 예약 ${list.length}편 ${JSON.stringify(kinds)} / 요일별 ${JSON.stringify(dows)}`);
console.log(`첫 예약 ${dates[0] ?? '-'} / 마지막 예약 ${dates.at(-1) ?? '-'}`);
console.log(`대조 일치 ${matched} / 실제에만 있음 ${onlyActual.length} / 기록에만 있음(오늘 이후) ${onlyRecorded.length} / 시각 불일치 ${mismatch.length}`);
for (const r of onlyActual) console.log('  실제에만:', r.when, r.title.slice(0, 50));
for (const p of onlyRecorded) console.log('  기록에만:', p.scheduledAt, p.logNo, p.link, p.title.slice(0, 50), '(발행됐으면 정상)');
for (const m of mismatch) console.log('  시각 불일치:', m.actual, '≠', m.recorded, m.title.slice(0, 40));
console.log(`저장: ${OUT}`);
if (launched) await browser.close(); else browser.disconnect();
