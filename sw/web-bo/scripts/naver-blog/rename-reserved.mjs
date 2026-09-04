/**
 * 예약글의 제목 앞에 표를 붙인다.
 *
 *   node scripts/naver-blog/rename-reserved.mjs --tag "[삭제]" [--yes]
 *
 * 예약글은 스크립트로 지울 수 없다(`hide-reserved.mjs` 머리말 참고). 사람이 네이버 앱이나
 * PC 글 관리에서 지워야 하는데, 94건이 늘어선 목록에서 여덟 건을 골라내기가 번거롭다.
 * 제목 앞에 표를 붙여 두면 눈으로 바로 찾는다. 대상은 `posts.json` 의 `link: to-delete` 다.
 */
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const POSTS = path.join(ROOT, 'data/naver-blog/posts.json');
const args = process.argv.slice(2);
const go = args.includes('--yes');
// 🔴 `indexOf` 가 -1 이면 `args[0]` 을 집는다. 26.09.05에 제목 앞에 「--yes」가 붙었다.
const tagIdx = args.indexOf('--tag');
const TAG = tagIdx >= 0 ? args[tagIdx + 1] : '[삭제]';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
const save = () => fs.writeFileSync(POSTS, JSON.stringify(posts, null, 1));
const targets = posts.filter((p) => p.link === 'to-delete' && !(p.title ?? '').startsWith(TAG));
if (!targets.length) { console.log('대상 없음'); process.exit(0); }
console.log(`제목 앞에 「${TAG}」를 붙일 글 ${targets.length}건`);
targets.forEach((t) => console.log(`  ${t.logNo}  ${(t.title ?? '').slice(0, 54)}`));
if (!go) { console.log('\n미리보기다. 실제로 바꾸려면 --yes 를 붙인다.'); process.exit(0); }

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);

let ok = 0, fail = 0;
for (const t of targets) {
  const want = `${TAG} ${t.title}`;
  try {
    await page.bringToFront();
    await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${t.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.se-documentTitle', { timeout: 40000 });
    await wait(4500);

    /**
     * 제목은 SmartEditor 의 문서 제목 블록이다. 값을 넣는 것이 아니라 **캐럿을 맨 앞에 놓고
     * 타이핑**해야 편집기 모델이 따라온다. 긴 글은 한 번에 치면 글자가 빠지므로 표만 짧게 친다.
     */
    // 🔴 Home·Ctrl+Home 이 먹지 않는다. **첫 글자의 실제 좌표 왼쪽 바깥**을 눌러 캐럿을 맨 앞에
    //    놓는다(`link-existing.mjs` 가 쓰는 것과 같은 방법). 그 뒤 캐럿 앞 글자 수가 0인지 확인한다.
    const pos = await page.evaluate(() => {
      const p = document.querySelector('.se-documentTitle .se-text-paragraph');
      if (!p) return null;
      p.scrollIntoView({ block: 'center', behavior: 'instant' });
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode()) && !n.textContent.replace(/​/g, ''));
      if (!n) return null;
      const r = document.createRange();
      r.setStart(n, 0); r.setEnd(n, 1);
      const b = r.getBoundingClientRect();
      return { x: b.left - 2, y: b.top + b.height / 2 };
    });
    if (!pos) throw new Error('제목 칸을 찾지 못했다');
    await page.mouse.click(pos.x, pos.y);
    await wait(700);
    const head = await page.evaluate(() => {
      const sel = getSelection();
      if (!sel.rangeCount) return -1;
      const p = document.querySelector('.se-documentTitle .se-text-paragraph');
      const r = sel.getRangeAt(0).cloneRange();
      r.selectNodeContents(p); r.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
      return r.toString().replace(/​/g, '').length;
    });
    if (head !== 0) throw new Error(`캐럿이 맨 앞이 아니다(앞 글자 ${head}개)`);

    // 앞선 실행이 잘못 붙인 접두어가 있으면 먼저 걷는다
    const junk = (t.title ?? '').match(/^(--\S+\s)/)?.[1];
    if (junk) { for (let i = 0; i < junk.length; i++) { await page.keyboard.press('Delete'); await wait(80); } await wait(500); }
    await page.keyboard.type(`${TAG} `, { delay: 30 });
    await wait(1200);

    const got = await page.evaluate(() => document.querySelector('.se-documentTitle')?.textContent.replace(/​/g, '').trim() ?? '');
    if (!got.startsWith(TAG)) throw new Error(`제목이 안 바뀌었다(${got.slice(0, 30)})`);

    // 발행 패널 — 공개 설정은 비공개로 두고 확인
    const pub = await page.$('button[class*=publish_btn]');
    const pb = await pub.boundingBox();
    await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await wait(2500);
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('input[type=radio], label, span')].find((x) => x.offsetParent && /비공개/.test(x.textContent ?? ''));
      (el?.closest('label') ?? el)?.click();
    });
    await wait(1000);
    const cb = await page.$('button[class*=confirm_btn]');
    const box = await cb.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await wait(7000);

    t.title = want;
    save(); ok++;
    console.log(`  바꿈 ${t.logNo}  ${want.slice(0, 46)}`);
  } catch (e) {
    fail++;
    console.log(`  실패 ${t.logNo}: ${String(e).split(String.fromCharCode(10))[0].slice(0, 90)}`);
  }
}
console.log(`\n완료 — 바꿈 ${ok} / 실패 ${fail}`);
if (launched) await browser.close(); else browser.disconnect();
