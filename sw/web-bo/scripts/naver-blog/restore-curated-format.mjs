/**
 * 기관 글의 제목과 도입문을 원래 원고로 되돌린다. 그 밖의 본문·사진·표·링크·발행 설정·예약은 바꾸지 않는다.
 * 계획 행: { logNo, title, intro, expectedBefore: 현재 도입 문단 배열, keepTail?: 도입 끝에 유지할 생성기 고정 문단, requireText?: 본문에 있어야 할 문구 }
 *
 * 사용: node scripts/naver-blog/restore-curated-format.mjs --plan=<절대경로> --work=<임시 작업 절대경로> [--log=글번호[,글번호]] [--apply]
 *   --apply 없이는 편집기에서 대조만 하고 고치지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';
import { editorialReservation } from './apply-editorial-changes.mjs';
import { replaceTitle } from './apply-institution-revisions.mjs';
import { getBrowser } from './lib/browser.mjs';
import { createEditorialEditor } from './lib/editorial-editor.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';
import { preserveNativeTags } from './lib/preserve-native-tags.mjs';
import { assertPublishOptions } from './lib/publish-options.mjs';
import { readEditorParagraphs } from './lib/review-paragraph-gaps.mjs';
import { closePublishPanel, readSnapshot } from './repair-institution-images.mjs';

const opt = key => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const apply = process.argv.includes('--apply');
const work = opt('work');
if (!opt('plan') || !work) throw new Error('--plan 과 --work 가 필요하다');
fs.mkdirSync(work, { recursive: true });
const only = opt('log')?.split(',');
const plan = JSON.parse(fs.readFileSync(opt('plan'), 'utf8')).filter(row => !only || only.includes(row.logNo));
const registry = path.join(ASSETS, 'naver-blog/posts.json');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const paragraphsOf = intro => intro.split(/\n+/).map(p => p.trim()).filter(Boolean);
const record = row => { fs.appendFileSync(path.join(work, 'results.jsonl'), JSON.stringify(row) + '\n'); console.log(JSON.stringify(row)); };
const stable = ({ images, ...rest }) => ({ ...rest, images: images.map(({ displayWidth, displayHeight, ...image }) => image) });

// 로고 아래 기관명 다음부터 첫 구분선 전까지가 도입이다.
function introRange(flow) {
  const first = flow.findIndex(p => p.text);
  if (first < 0 || flow[first].align !== 'center') throw new Error('기관명 문단을 찾지 못했다');
  return flow.filter((p, i) => i > first && p.component === flow[first].component && p.text).map(p => p.text);
}

// 도입 교체 뒤 기대되는 스냅샷. 도입 문단 외의 글자·구성은 그대로여야 한다.
function expectedSnapshot(before, row, beforeIntro) {
  const after = [...paragraphsOf(row.intro), ...(row.keepTail ? [row.keepTail] : [])];
  const swap = list => {
    const at = list.indexOf(beforeIntro[0]);
    if (at < 0 || !same(list.slice(at, at + beforeIntro.length), beforeIntro)) throw new Error('도입 문단 위치를 찾지 못했다');
    return [...list.slice(0, at), ...after, ...list.slice(at + beforeIntro.length)];
  };
  return { ...before, title: row.title, text: swap(before.text), flow: before.flow.map(f => (f.paragraphs?.includes(beforeIntro[0]) ? { ...f, paragraphs: swap(f.paragraphs) } : f)) };
}

function assertSnapshot(expected, actual, label) {
  const a = stable(expected), b = stable(actual);
  const changed = Object.keys(a).filter(key => !same(a[key], b[key]));
  if (changed.length) throw new Error(`${label}: 계획 밖 변경 (${changed.join(', ')})`);
}

function saveLedger(row) {
  const posts = JSON.parse(fs.readFileSync(registry, 'utf8'));
  const post = posts.find(p => String(p.logNo) === row.logNo);
  post.title = row.title;
  post.curatedIntro = row.intro;
  delete post.unified;
  fs.writeFileSync(registry + '.tmp', JSON.stringify(posts, null, 2));
  JSON.parse(fs.readFileSync(registry + '.tmp', 'utf8'));
  fs.renameSync(registry + '.tmp', registry);
}

const { browser, launched } = await getBrowser({ protocolTimeout: 300000, background: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const focus = await page.createCDPSession();
await focus.send('Emulation.setFocusEmulationEnabled', { enabled: true });
await focus.detach();
page.on('dialog', d => (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}));
const editor = createExistingEditor(page, {});
const native = createEditorialEditor(page);
let current = null, step = '', saved = false;
try {
  for (const row of plan) {
    current = row.logNo; saved = false; step = 'open';
    const post = JSON.parse(fs.readFileSync(registry, 'utf8')).find(p => String(p.logNo) === row.logNo);
    if (post?.kind !== 'curated') throw new Error(`기관 글이 아니다: ${row.logNo}`);
    if (post.curatedIntro === row.intro && post.title === row.title) { record({ logNo: row.logNo, result: 'already-restored' }); continue; }
    const target = { logNo: post.logNo, title: post.title, scheduledAt: post.scheduledAt };
    const opened = await editor.openTarget(target);
    await assertPublishOptions(page, { preserve: opened.state });
    await closePublishPanel(page, editor);
    step = 'inspect';
    const before = await readSnapshot(page, { tolerateBroken: true });
    const beforeIntro = introRange(await readEditorParagraphs(page));
    fs.writeFileSync(path.join(work, `before-${row.logNo}.json`), JSON.stringify({ post, state: opened.state, reservation: opened.reservation, snapshot: before, beforeIntro }, null, 2));
    if (!same(beforeIntro, row.expectedBefore)) {
      if (!apply) { record({ logNo: row.logNo, result: 'intro-differs', beforeIntro }); continue; }
      throw new Error(`현재 도입문이 계획과 다르다: ${JSON.stringify(beforeIntro).slice(0, 80)}`);
    }
    const body = before.text.join('\n');
    const missing = (row.requireText ?? []).filter(text => !body.includes(text));
    if (missing.length) throw new Error(`제목이 내건 인물이 본문에 없다: ${missing.join(', ')}`);
    if (!apply) { record({ logNo: row.logNo, result: 'dry', paragraphs: beforeIntro.length }); continue; }
    step = 'edit';
    const expected = expectedSnapshot(before, row, beforeIntro);
    const titleAlign = () => page.$eval('.se-documentTitle .se-text-paragraph', p => getComputedStyle(p).textAlign);
    const align = await titleAlign();
    // 뒤 문단부터 지워 앞 문단 위치를 유지하고, 첫 문단에 복원문을 넣는다.
    const replaced = row.keepTail ? beforeIntro.slice(0, -1) : beforeIntro;
    if (row.keepTail && beforeIntro.at(-1) !== row.keepTail) throw new Error('유지할 도입 문단이 다르다');
    if (!same(replaced, paragraphsOf(row.intro))) {
      for (const extra of replaced.slice(1).reverse()) await native.clearParagraph(extra);
      await native.replaceParagraph(replaced[0], paragraphsOf(row.intro).join('\n\n'));
    }
    await page.keyboard.press('Escape');
    if (before.title !== row.title) await replaceTitle(page, before.title, row.title);
    if (await titleAlign() !== align) throw new Error('제목 정렬이 달라졌다');
    step = 'verify-ready';
    assertSnapshot(expected, await readSnapshot(page, { tolerateBroken: true }), '저장 전');
    await page.evaluate(() => document.querySelector('.se-documentTitle')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: path.join(work, `ready-${row.logNo}.png`) });
    step = 'save';
    await editor.click('button[class*=publish_btn]');
    await assertPublishOptions(page, { preserve: opened.state });
    if (!same(await preserveNativeTags(page, editor, opened.state), opened.state)) throw new Error('발행 설정이 달라졌다');
    await editor.click('button[class*=confirm_btn]');
    await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly'), { timeout: 30000 }, row.logNo);
    saved = true;
    saveLedger(row);
    step = 'reopen';
    const verified = await editor.openTarget({ ...target, title: row.title });
    if (!same(verified.state, opened.state) || !same(verified.reservation, editorialReservation(opened.reservation, before.title, row.title))) throw new Error('저장 후 발행 설정 또는 예약이 달라졌다');
    await closePublishPanel(page, editor);
    assertSnapshot(expected, await readSnapshot(page, { tolerateBroken: true }), '저장 후');
    await page.evaluate(() => document.querySelector('.se-documentTitle')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: path.join(work, `saved-${row.logNo}.png`) });
    record({ logNo: row.logNo, result: 'saved-and-reopened', titleChanged: before.title !== row.title });
  }
} catch (error) {
  await page.screenshot({ path: path.join(work, `failure-${current}.png`) }).catch(() => {});
  record({ logNo: current, step, saved, error: String(error) });
  throw error;
} finally {
  await page.close().catch(() => {});
  if (launched) await browser.close(); else await browser.disconnect();
}
