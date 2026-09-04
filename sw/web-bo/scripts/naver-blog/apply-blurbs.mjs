/**
 * 이미 올라간 글의 감상 단락에 책 소개를 끼워 넣는다.
 *
 * `enrich-blurbs.mjs` 가 초안(celeb-drafts.json)의 본문을 고쳐 두면, 이 스크립트가
 * 그 결과를 네이버의 실제 글에 반영한다. 감상 단락 하나를 「소개 단락 + 감상 단락」 둘로 가른다.
 * 글 전체를 다시 쓰지 않는다 — 이미지 재업로드와 예약 재설정을 피하려면 이 방법뿐이다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/naver-blog/apply-blurbs.mjs 224399635555 --dry
 *   node scripts/naver-blog/apply-blurbs.mjs 224399635555
 *   node scripts/naver-blog/apply-blurbs.mjs --all [최대건수]
 *
 * 재실행 안전 — 이미 소개가 들어간 글은 건너뛴다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DRAFTS = path.join(ROOT, 'data/naver-blog/celeb-drafts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const useAll = args.includes('--all');
const ids = args.filter((a) => /^\d{9,}$/.test(a));
const limit = Number(args.find((a) => /^\d{1,3}$/.test(a)) ?? 999);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const strip = (s) => s.replace(/\*\*/g, '').replace(/^\[c\]/, '').replace(/\[\/c\]$/, '').trim();

// 본문 텍스트 단락 (제목 제외)
const paras = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')]
    .map((e, i) => ({ i, t: e.textContent.replace(/​/g, '').trim() })));

/** 단락 하나를 통째로 고른다. 첫 글자를 클릭하고 끝 글자를 Shift+클릭한다. (format-posts 와 같은 방식) */
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

/** 나눠 친다. 한 번에 길게 치면 글자가 빠진다. */
async function typeChunked(page, text) {
  for (let j = 0; j < text.length; j += 60) { await page.keyboard.type(text.slice(j, j + 60), { delay: 12 }); await wait(120); }
}

/**
 * 보강본에서 책마다 (소개, 감상배경 라벨, 감상)을 뽑는다.
 *
 * 순서가 중요하다 — 소개는 라벨 **앞**에 와야 한다. 라벨은 감상의 출처를 가리키므로
 * 라벨 뒤에 소개가 오면 그 출처가 소개를 가리키는 것처럼 읽힌다.
 */
function pairs(body) {
  const out = [];
  const blocks = body.split(/\n(?=\*\*『)/).slice(1);
  for (const b of blocks) {
    const lines = b.split('\n').map((l) => l.trim());
    const imgAt = lines.findIndex((l) => l.startsWith('[img:'));
    if (imgAt < 0) continue;
    const rest = lines.slice(imgAt + 1).filter((l) => l && !l.startsWith('---') && !l.startsWith('[c]'));
    const blurb = rest.find((l) => !l.startsWith('**감상배경:**'));
    if (!blurb) continue;
    const after = rest.slice(rest.indexOf(blurb) + 1);
    const label = after.find((l) => l.startsWith('**감상배경:**')) ?? null;
    const review = after.find((l) => !l.startsWith('**감상배경:**'));
    if (!review) continue;
    out.push({ blurb, label: label ? strip(label) : null, review, title: b.match(/^\*\*『([^』]+)』/)?.[1] ?? '?' });
  }
  return out;
}

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const targets = (ids.length ? rows.filter((r) => ids.includes(String(r.logNo))) : useAll ? rows.filter((r) => r.logNo && r.blurbed && !r.applied) : [])
  .slice(0, limit);
if (!targets.length) { console.log('대상 없음 — 글번호를 주거나 --all 을 써라'); process.exit(0); }
console.log(`대상 ${targets.length}편`);

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

let done = 0, skipped = 0, failed = 0;
const fails = [];
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  try {
    const want = pairs(row.body);
    if (want.length === 0) { skipped++; console.log(`건너뜀 ${slug} — 소개를 찾지 못했다`); continue; }

    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${row.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
    await wait(4500);

    // 감상 단락을 찾는다. 보강본의 감상은 첫 문장이 걷힌 상태라 현재 단락의 끝과 맞물린다.
    const list = await paras(page);
    const jobs = [];
    for (const w of want) {
      const hit = list.find((p) => p.t === w.review || (p.t.endsWith(w.review) && p.t.length > w.review.length));
      if (!hit) continue;
      if (list.some((p) => p.t === w.blurb)) continue;   // 이미 들어간 소개
      // 감상 바로 앞이 라벨이면 소개는 그 라벨 앞자리에 들어간다
      const prev = list[hit.i - 1];
      const labelIdx = w.label && prev && prev.t === w.label ? prev.i : null;
      jobs.push({ idx: hit.i, labelIdx, ...w });
    }
    if (!jobs.length) { skipped++; console.log(`건너뜀 ${slug} — 고칠 단락이 없다(이미 반영됐거나 본문이 다르다)`); continue; }

    console.log(`${slug} — 책 ${want.length}권 중 ${jobs.length}곳 반영`);
    if (dry) { jobs.forEach((j) => console.log(`   [${j.idx}] ${j.title}: ${j.blurb.slice(0, 40)}…`)); done++; continue; }

    /**
     * 단락 하나를 지우고 준 줄들을 친다. 여러 줄이면 그만큼 단락이 늘어난다.
     * 긴 줄은 치는 도중 글자가 빠진다. 결과가 다르면 그 자리를 비우고 다시 친다.
     */
    async function rewrite(idx, lines) {
      for (let attempt = 0; attempt < 3; attempt++) {
        // 🔴 앞선 시도가 만든 단락만 걷어낸다. 첫 시도에 손대면 idx+1 은 아직 **원래 있던 감상**이라
        //    그것을 지워 버린다. 26.09.04에 그렇게 감상이 통째로 날아간 글이 나왔다.
        if (attempt > 0) {
          for (let k = lines.length - 1; k >= 1; k--) {
            const cur = await paras(page);
            if ((cur[idx + k]?.t ?? '') === '') continue;
            if (!(await selectPara(page, idx + k))) continue;
            for (let z = 0; z < 500 && ((await paras(page))[idx + k]?.t ?? ''); z++) { await page.keyboard.press('Backspace'); await wait(15); }
            await page.keyboard.press('Backspace'); await wait(60);
          }
        }
        if (!(await selectPara(page, idx))) throw new Error(`단락 선택 실패 ${idx}`);
        for (let z = 0; z < 500; z++) {
          if (!((await paras(page))[idx]?.t ?? '')) break;
          await page.keyboard.press('Backspace'); await wait(15);
        }
        for (const [k, line] of lines.entries()) {
          if (k) { await page.keyboard.press('Enter'); await wait(400); }
          if (line) await typeChunked(page, line);
          await wait(300);
        }
        await wait(500);
        const now = await paras(page);
        const bad = lines.findIndex((line, k) => (now[idx + k]?.t ?? '') !== line);
        if (bad < 0) return;
        if (attempt === 2) {
          const got = now[idx + bad]?.t ?? '';
          const at = [...lines[bad]].findIndex((ch, i) => got[i] !== ch);
          throw new Error(`반영 확인 실패(${at}번째 글자부터 어긋남): ${JSON.stringify(got.slice(Math.max(0, at - 10), at + 20))} ≠ ${JSON.stringify(lines[bad].slice(Math.max(0, at - 10), at + 20))}`);
        }
      }
    }

    // 뒤에서부터 고친다. 앞을 먼저 고치면 뒤 단락 번호가 밀린다.
    for (const j of [...jobs].sort((a, b) => b.idx - a.idx)) {
      // 감상을 먼저 손본다 — 여기서는 단락 수가 늘지 않아 앞 번호가 그대로다.
      await rewrite(j.idx, [j.review]);
      // 소개는 라벨 **앞**에 세우고 빈 줄로 떼어 놓는다. 붙여 두면 소개·라벨·감상이 한 덩어리로 보인다.
      if (j.labelIdx != null) await rewrite(j.labelIdx, [j.blurb, '', j.label]);
      else await rewrite(j.idx, [j.blurb, '', j.review]);
    }

    // 수정 발행. 예약된 글은 예약 시각이 그대로 유지된다.
    await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
    const cb = await page.$('button[class*=confirm_btn]'); const box = await cb.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(6000);
    const okPos = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.se-popup button')].find((x) => x.textContent.trim() === '확인');
      if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (okPos) { await page.mouse.click(okPos.x, okPos.y); await wait(4000); }

    row.applied = true;
    fs.writeFileSync(DRAFTS, JSON.stringify(rows, null, 1));
    done++;
    console.log(`OK ${slug} — ${jobs.length}곳 반영`);
    await wait(3000);
  } catch (e) {
    failed++;
    fails.push(slug);
    console.log(`실패 ${slug}: ${String(e).split('\n')[0].slice(0, 220)}`);
    // 실패한 글은 발행하지 않았으므로 네이버 쪽은 원문 그대로다. 다음 글로 넘어가고 끝에 모아 보고한다.
  }
}
console.log(`\n완료 — 반영 ${done} / 건너뜀 ${skipped} / 실패 ${failed}`);
if (fails.length) console.log(`실패한 글: ${fails.join(', ')}`);
if (launched) await browser.close(); else browser.disconnect();
