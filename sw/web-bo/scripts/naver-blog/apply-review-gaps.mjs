/**
 * 지정한 인물·기관 글의 감상 배경에서 붙은 문단 앞에 빈 문단을 넣는다. 글자·사진·링크는 바꾸지 않는다.
 * 저장 전후로 제목·본문·사진·링크·발행 설정·예약을 대조하고 첫 오류에서 멈춘다.
 *
 * 사용: node scripts/naver-blog/apply-review-gaps.mjs --log=글번호[,글번호] --work=<임시 작업 절대경로> [--apply]
 *   --apply 없이는 편집기에서 대상 자리만 세고 저장하지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';
import { assertPublishOptions } from './lib/publish-options.mjs';
import { publicParagraphs, readEditorParagraphs, reviewGapTargets } from './lib/review-paragraph-gaps.mjs';
import { closePublishPanel, readSnapshot } from './repair-institution-images.mjs';
import { restyleAfterSave } from './lib/restyle-after-save.mjs';

const opt = key => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const apply = process.argv.includes('--apply');
const logs = opt('log')?.split(',');
const work = opt('work');
if (!logs?.length || !work) throw new Error('--log 와 --work 가 필요하다');
fs.mkdirSync(work, { recursive: true });
const posts = JSON.parse(fs.readFileSync(path.join(ASSETS, 'naver-blog/posts.json'), 'utf8'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SELECTOR = '.se-component.se-text:not(.se-documentTitle) .se-text-paragraph';
const record = row => { fs.appendFileSync(path.join(work, 'results.jsonl'), JSON.stringify(row) + '\n'); console.log(JSON.stringify(row)); };

// 화면 표시 크기는 스크롤에 따라 흔들리므로 대조하지 않는다. 사진의 원본·폭·정렬·설명·대표 지정은 대조한다.
function snapshotDifference(a, b) {
  const stable = ({ images, ...rest }) => ({ ...rest, images: images.map(({ displayWidth, displayHeight, ...image }) => image) });
  const x = stable(a), y = stable(b);
  return Object.keys(x).filter(key => !same(x[key], y[key]));
}

// 문단 맨 앞에 커서를 놓았는지 확인한 뒤에만 Enter를 친다. Enter는 그 위에 빈 문단을 만든다.
async function insertGapBefore(page, index, text) {
  const point = await page.$$eval(SELECTOR, (nodes, { index, text }) => {
    const p = nodes[index];
    if (p?.textContent.replace(/​/g, '').trim() !== text) throw new Error('대상 문단이 달라졌다');
    p.scrollIntoView({ block: 'center', behavior: 'instant' });
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    let first;
    while (walker.nextNode()) if (walker.currentNode.textContent.replace(/​/g, '').length) { first = walker.currentNode; break; }
    if (!first) throw new Error('대상 문단에 글자가 없다');
    let start = 0;
    while (first.textContent[start] === '​') start++;
    const range = document.createRange();
    range.setStart(first, start);
    range.setEnd(first, start + 1);
    const rect = range.getBoundingClientRect();
    if (rect.top < 125 || rect.bottom > innerHeight - 20) throw new Error('대상 문단이 안전한 화면 범위 밖이다');
    return { x: rect.left - 2, y: rect.top + rect.height / 2 };
  }, { index, text });
  // 줄 수가 같은 문단은 가운데로 옮기면 클릭 좌표가 같아진다. 연속 클릭으로 읽혀 첫 단어가 선택되면 Enter가 그 단어를 지운다.
  await page.mouse.move(5, 5);
  await wait(900);
  await page.mouse.click(point.x, point.y);
  await wait(150);
  const atStart = await page.evaluate(text => {
    const s = getSelection(), a = s?.anchorNode, e = a?.nodeType === 1 ? a : a?.parentElement, p = e?.closest('.se-text-paragraph');
    if (!s?.isCollapsed || p?.textContent.replace(/​/g, '').trim() !== text) return false;
    const r = document.createRange();
    r.selectNodeContents(p);
    r.setEnd(a, s.anchorOffset);
    return !r.toString().replace(/​/g, '');
  }, text);
  if (!atStart) throw new Error(`커서가 문단 맨 앞이 아니다: ${text.slice(0, 30)}`);
  await page.keyboard.press('Enter');
  await wait(200);
  const inserted = await page.$$eval(SELECTOR, (nodes, { index, text }) => {
    const clean = n => n?.textContent.replace(/​/g, '').trim();
    return clean(nodes[index]) === '' && clean(nodes[index + 1]) === text;
  }, { index, text });
  if (!inserted) throw new Error(`빈 문단 삽입 직후 대조 실패: ${text.slice(0, 30)}`);
}

async function publicState(logNo) {
  const res = await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${logNo}`, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
  const html = await res.text();
  const flow = publicParagraphs(html);
  if (!flow) throw new Error('공개 본문이 없다');
  const body = html.slice(html.indexOf('se-main-container'));
  return {
    texts: flow.map(p => p.text).filter(Boolean),
    gaps: reviewGapTargets(flow).length,
    images: [...body.matchAll(/se-image-resource[^>]*data-lazy-src="([^"?]+)/g)].map(m => m[1]),
    og: (html.match(/property="og:image"\s+content="([^"?]+)/)?.[1] ?? '').split('/').slice(-2).join('/'),
  };
}

const { browser, launched } = await getBrowser({ protocolTimeout: 300000, background: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const focus = await page.createCDPSession();
await focus.send('Emulation.setFocusEmulationEnabled', { enabled: true });
await focus.detach();
page.on('dialog', d => (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}));
const editor = createExistingEditor(page, {});
let current = null, step = '', saved = false;
const savedLogs = [];
try {
  for (const logNo of logs) {
    current = logNo; saved = false; step = 'open';
    const row = posts.find(p => String(p.logNo) === logNo);
    if (!['celeb', 'curated'].includes(row?.kind)) throw new Error(`인물·기관 글이 아니다: ${logNo}`);
    const post = { logNo: row.logNo, title: row.title, scheduledAt: row.scheduledAt };
    const opened = await editor.openTarget(post);
    await assertPublishOptions(page, { preserve: opened.state });
    await closePublishPanel(page, editor);
    step = 'snapshot';
    const before = await readSnapshot(page, { tolerateBroken: true });
    const flow = await readEditorParagraphs(page);
    const targets = reviewGapTargets(flow);
    fs.writeFileSync(path.join(work, `before-${logNo}.json`), JSON.stringify({ state: opened.state, reservation: opened.reservation, snapshot: before, flow }, null, 2));
    if (!targets.length) { record({ logNo, result: 'no-gap-needed' }); continue; }
    if (!apply) { record({ logNo, result: 'dry', gaps: targets.length, sample: flow[targets[0]].text.slice(0, 30) }); continue; }
    const published = !opened.reservation;
    const publicBefore = published ? await publicState(logNo) : null;
    step = 'insert-gaps';
    // 뒤에서부터 넣어 앞 문단의 위치가 밀리지 않게 한다.
    for (const index of [...targets].reverse()) await insertGapBefore(page, index, flow[index].text);
    step = 'verify-ready';
    const assertBody = async label => {
      const snapshot = await readSnapshot(page, { tolerateBroken: true });
      const after = await readEditorParagraphs(page);
      const changed = snapshotDifference(before, snapshot);
      if (changed.length) {
        fs.writeFileSync(path.join(work, `mismatch-${logNo}.json`), JSON.stringify({ label, changed, snapshot }, null, 2));
        throw new Error(`${label}: 제목·본문·사진·링크가 달라졌다 (${changed.join(', ')})`);
      }
      if (!same(after.map(p => p.text).filter(Boolean), flow.map(p => p.text).filter(Boolean))) throw new Error(`${label}: 문단 글자가 달라졌다`);
      if (reviewGapTargets(after).length) throw new Error(`${label}: 붙은 문단이 남았다`);
      if (after.length !== flow.length + targets.length) throw new Error(`${label}: 빈 문단 수가 계획과 다르다 ${after.length - flow.length}/${targets.length}`);
    };
    await assertBody('저장 전');
    await page.screenshot({ path: path.join(work, `ready-${logNo}.png`) });
    step = 'save';
    await editor.click('button[class*=publish_btn]');
    await assertPublishOptions(page, { preserve: opened.state });
    if (!same(await editor.settings(), opened.state)) throw new Error('발행 설정이 달라졌다');
    await editor.click('button[class*=confirm_btn]');
    await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly'), { timeout: 30000 }, logNo);
    saved = true;
    step = 'reopen';
    if (published) {
      const publicAfter = await publicState(logNo);
      if (!same(publicAfter.texts, publicBefore.texts) || !same(publicAfter.images, publicBefore.images) || publicAfter.og !== publicBefore.og || publicAfter.gaps) throw new Error('공개 본문 대조 실패');
    }
    const verified = await editor.openTarget(post);
    if (!same(verified.state, opened.state) || !same(verified.reservation, opened.reservation)) throw new Error('저장 후 발행 설정 또는 예약이 달라졌다');
    await closePublishPanel(page, editor);
    await assertBody('저장 후');
    record({ logNo, result: 'saved-and-reopened', gaps: targets.length });
    savedLogs.push(logNo);
  }
} catch (error) {
  await page.screenshot({ path: path.join(work, `failure-${current}.png`) }).catch(() => {});
  record({ logNo: current, step, saved, error: String(error) });
  throw error;
} finally {
  await page.close().catch(() => {});
  if (launched) await browser.close(); else await browser.disconnect();
}
// 빈 문단을 넣은 글의 서식을 같은 작업 안에서 되돌린다(blog-naver-book.md 본문 서식 정책).
restyleAfterSave(savedLogs);
