// 인물·기관 글의 검색·공유 설정을 점검·복구한다. 예약글은 반드시 예약 목록에서 불러온다.
// node scripts/naver-blog/repair-search.mjs --celeb-drafts [--share-links] [--apply]
// node scripts/naver-blog/repair-search.mjs --ids=글번호,글번호 [--share-links] [--apply]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const shareLinks = args.includes('--share-links');
const desiredIds = ['publish-option-search', ...(shareLinks ? ['publish-option-scrap', 'publish-option-outside'] : [])];
const idArg = args.find(a => a.startsWith('--ids='))?.slice(6);
if (args.includes('--celeb-drafts') === Boolean(idArg)) {
  throw new Error('--celeb-drafts 또는 --ids=글번호,글번호 중 하나로 대상을 지정한다');
}
const posts = JSON.parse(fs.readFileSync(path.join(ASSETS, 'naver-blog/posts.json'), 'utf8'));
const drafts = JSON.parse(fs.readFileSync(path.join(ASSETS, 'naver-blog/celeb-drafts.json'), 'utf8'));
const curatedDrafts = idArg ? JSON.parse(fs.readFileSync(path.join(ASSETS, 'naver-blog/drafts.json'), 'utf8')) : [];
const ids = idArg?.split(',');
if (ids && ids.some(id => !/^\d+$/.test(id))) throw new Error('글 번호 형식 오류');
const targets = ids
  ? ids.map(id => {
    const p = posts.find(p => String(p.logNo) === id && ['celeb', 'curated'].includes(p.kind));
    if (!p || ['private', 'deleted', 'to-delete', 'replaced', 'skip'].includes(p.link)) throw new Error(`복구 대상 인물·기관 글이 아니다: ${id}`);
    const sourceDrafts = p.kind === 'curated' ? curatedDrafts : drafts;
    // 초안의 본문은 로딩 확인에 쓰고, 현재 제목·예약 시각 등 발행 기록을 우선한다.
    return { ...sourceDrafts.find(d => String(d.logNo) === id), ...p };
  })
  : drafts.map(d => ({ ...posts.find(p => String(p.logNo) === String(d.logNo)), ...d }));
if (new Set(targets.map(d => String(d.logNo))).size !== targets.length) throw new Error('대상 글 번호 중복');

const wait = ms => new Promise(r => setTimeout(r, ms));
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report = path.join(os.tmpdir(), 'naver-blog', `${shareLinks ? 'sharing' : 'search'}-settings-${Date.now()}.jsonl`);
fs.mkdirSync(path.dirname(report), { recursive: true });
const log = row => { fs.appendFileSync(report, JSON.stringify(row) + '\n'); console.log(JSON.stringify(row)); };
const { browser, launched } = await getBrowser({ protocolTimeout: 45000 });
const page = await browser.newPage();
page.on('dialog', dialog => {
  // 이 탭에서는 지정한 설정 외에는 편집하지 않으며 다음 이동 전에 저장·재열기 검증을 마친다.
  if (dialog.type() === 'beforeunload') dialog.accept().catch(() => {});
  else {
    log({ dialog: dialog.type(), message: dialog.message() });
    dialog.dismiss().catch(() => {});
  }
});
let changed = 0, correct = 0;
let currentTarget = null;
let step = '';

const { click, openTarget, content, settings } = createExistingEditor(page, { onStep: value => { step = value; } });

function protectedOptions(s) {
  const result = { ...s, inputs: s.inputs.filter(x => !desiredIds.includes(x.id)) };
  if (shareLinks) delete result.shareMode;
  return result;
}

function configured(s) {
  return desiredIds.every(id => s.inputs.some(x => x.id === id && x.checked && !x.disabled))
    && (!shareLinks || s.shareMode === '링크허용');
}

function optionSummary(s) {
  return {
    searchEnabled: s.inputs.find(x => x.id === 'publish-option-search')?.checked,
    linkSharingEnabled: s.inputs.find(x => x.id === 'publish-option-scrap')?.checked,
    outsideSharingEnabled: s.inputs.find(x => x.id === 'publish-option-outside')?.checked,
    shareMode: s.shareMode,
  };
}

async function selectLinkSharing() {
  if ((await settings()).shareMode === '링크허용') return;
  const anchor = await page.evaluateHandle(() => document.querySelector('#publish-option-scrap')?.closest('li')?.querySelector('a'));
  if (!anchor.asElement()) throw new Error('공유 방식을 선택할 수 없다');
  await anchor.asElement().click();
  await click('label[for="publish-option-allow-link"]');
  if (await page.$('#publish-option-allow-link')) await anchor.asElement().click();
  await anchor.dispose();
  await page.waitForSelector('#publish-option-allow-link', { hidden: true, timeout: 5000 });
  if ((await settings()).shareMode !== '링크허용') throw new Error('링크 공유 방식이 선택되지 않았다');
}

try {
  for (const [index, d] of targets.entries()) {
    currentTarget = { logNo: d.logNo, title: d.title };
    if (index) await wait(2000);
    const initial = await openTarget(d);
    for (const id of desiredIds) {
      const option = initial.state.inputs.find(x => x.id === id);
      if (!option || option.disabled) throw new Error(`설정을 수정할 수 없다: ${id}, ${d.title}`);
    }
    if (configured(initial.state) || !apply) {
      if (configured(initial.state)) correct++;
      log({ index: index + 1, total: targets.length, logNo: d.logNo, title: d.title, result: configured(initial.state) ? 'already-enabled' : 'disabled', reservation: initial.reservation?.row.split('\n').at(-1) ?? null, ...optionSummary(initial.state) });
      continue;
    }
    step = 'enable-options';
    for (const id of desiredIds) {
      if (!(await settings()).inputs.find(x => x.id === id)?.checked) await click(`label[for="${id}"]`);
    }
    if (shareLinks) await selectLinkSharing();
    const ready = await settings();
    if (!configured(ready) || hash(protectedOptions(ready)) !== hash(protectedOptions(initial.state))) throw new Error('지정한 항목 외의 설정이 바뀌었다');
    if (hash(await content()) !== hash(initial.content)) throw new Error('저장 전 본문이 바뀌었다');
    step = 'save';
    await click('button[class*=confirm_btn]');
    await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly=true'), { timeout: 30000 }, String(d.logNo));
    const verified = await openTarget(d);
    if (!configured(verified.state)) throw new Error('저장 후 지정한 검색·공유 설정이 유지되지 않았다');
    if (hash(protectedOptions(verified.state)) !== hash(protectedOptions(initial.state))) throw new Error('저장 후 다른 설정이 바뀌었다');
    if (hash(verified.content) !== hash(initial.content)) throw new Error('저장 후 본문이 바뀌었다');
    if (hash(verified.reservation) !== hash(initial.reservation)) throw new Error('예약 목록이나 예약 시간이 바뀌었다');
    let robots = null;
    if (!initial.reservation) {
      const html = await (await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${d.logNo}`)).text();
      robots = html.match(/<meta name="robots"[^>]*>/)?.[0];
      if (!robots || /noindex|nofollow/.test(robots)) throw new Error('공개 페이지가 아직 검색 차단 상태다');
    }
    changed++;
    log({ index: index + 1, total: targets.length, logNo: d.logNo, title: d.title, result: 'repaired-and-reopened', reservation: initial.reservation?.row.split('\n').at(-1) ?? null, contentUnchanged: true, otherOptionsUnchanged: true, before: optionSummary(initial.state), ...optionSummary(verified.state), robots });
  }
  log({ complete: true, changed, alreadyEnabled: correct, targets: targets.length, report });
} catch (e) {
  log({ complete: false, changed, alreadyEnabled: correct, currentTarget, step, error: String(e), stack: e.stack, report });
  process.exitCode = 1;
} finally {
  await page.close().catch(() => {});
  if (launched) await browser.close(); else await browser.disconnect();
}
