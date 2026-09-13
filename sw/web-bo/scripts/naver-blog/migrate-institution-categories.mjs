// 서비스 기관 유형으로 기존 네이버 기관 글의 카테고리만 맞춘다.
// --inspect-menu / --setup [--apply]
// --ids=글번호,글번호 --service=실서비스기관조회JSON [--apply]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const base = path.join(ASSETS, 'naver-blog');
const runId = Date.now();
const backedUp = new Set();
const read = name => JSON.parse(fs.readFileSync(path.join(base, name), 'utf8'));
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const labels = JSON.parse(fs.readFileSync(new URL('../../../web/messages/ko/library.json', import.meta.url), 'utf8')).library.curated;
const kindOrder = ['university', 'media', 'award', 'festival', 'community', 'bookstore', 'library', 'organization'];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const { browser } = await getBrowser({ protocolTimeout: 45000 });
const page = await browser.newPage();
page.on('dialog', d => {
  console.log(JSON.stringify({ dialog: d.type(), message: d.message() }));
  if (d.type() === 'beforeunload' || d.type() === 'alert') d.accept().catch(() => {});
  else d.dismiss().catch(() => {});
});

async function menu() {
  await page.goto('https://admin.blog.naver.com/dmx777/config/blog', { waitUntil: 'domcontentloaded' });
  const frame = page.frames().find(f => f.name() === 'papermain');
  if (!frame) throw new Error('카테고리 관리 화면을 찾지 못했다');
  await frame.waitForSelector('#tree');
  return frame;
}

async function categoryNames(frame) {
  return frame.$$eval('#tree ._categoryName', es => es.map(e => ({
    name: e.textContent.replace(/\s/g, ' '),
    count: e.nextElementSibling?.textContent,
    parent: e.closest('li').parentElement.closest('li')?.querySelector(':scope > div ._categoryName')?.textContent.replace(/\s/g, ' ') ?? null,
  })));
}

async function clickName(frame, name) {
  const element = await frame.evaluateHandle(n => [...document.querySelectorAll('#tree ._categoryName')].find(e => e.textContent.replace(/\s/g, ' ') === n), name);
  if (!element.asElement()) throw new Error(`카테고리를 찾지 못했다: ${name}`);
  await element.asElement().click();
  await element.dispose();
}

async function rename(frame, from, to) {
  const names = await categoryNames(frame);
  if (names.some(c => c.name === to)) return;
  await clickName(frame, from);
  await frame.click('#category_name', { clickCount: 3 });
  await frame.type('#category_name', to);
  // 이 관리 폼은 한글 input 뒤 keyup이 있어야 트리에 반영한다.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Tab');
  if (!(await categoryNames(frame)).some(c => c.name === to)) throw new Error(`이름 입력 실패: ${to}`);
}

const normalizeCategory = text => String(text ?? '').replace(/하위 카테고리/g, '').replace(/\s+/g, ' ').trim();
async function selectCategory(name) {
  await page.click('[class*=option_category] [class*=selectbox_button]');
  await page.waitForFunction(() => [...document.querySelectorAll('[class*=option_category] li')].some(e => e.offsetParent));
  const item = await page.evaluateHandle(name => [...document.querySelectorAll('[class*=option_category] li')].find(e => e.textContent.replace(/하위 카테고리/g, '').replace(/\s+/g, ' ').trim() === name), name);
  if (!item.asElement()) throw new Error(`카테고리 선택지 없음: ${name}`);
  await item.asElement().evaluate(e => e.scrollIntoView({ block: 'center' }));
  await wait(300);
  await item.asElement().click();
  await item.dispose();
  await page.waitForFunction(name => document.querySelector('[class*=option_category] [class*=selectbox_button]')?.textContent.replace(/하위 카테고리/g, '').replace(/\s+/g, ' ').trim() === name, { timeout: 5000 }, name);
}

async function pictures() {
  return page.$$eval('.se-component.se-image', es => es.map((e, index) => {
    const image = e.querySelector('img.se-image-resource');
    return { index, src: image?.getAttribute('src'), alt: image?.alt, width: image?.naturalWidth, height: image?.naturalHeight,
      attributes: image ? Object.fromEntries([...image.attributes].map(a => [a.name, a.value])) : {},
      representative: Boolean(e.querySelector('.se-set-rep-image-button.se-is-selected')),
      context: e.innerText, html: e.outerHTML.slice(0,4500) };
  }));
}

function recordCategory(id, category) {
  for (const name of ['posts.json', 'drafts.json']) {
    const file = path.join(base, name);
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    const row = rows.find(r => String(r.logNo) === id);
    if (!row || row.category === category) continue;
    if (!backedUp.has(name)) {
      const backup = path.join(base, '_backup', `category-${runId}-${name}`);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.copyFileSync(file, backup);
      backedUp.add(name);
    }
    row.category = category;
    fs.writeFileSync(file, JSON.stringify(rows, null, 1));
  }
}

try {
  if (args.includes('--inspect-menu')) {
    const frame = await menu();
    console.log(JSON.stringify({ categories: await categoryNames(frame) }));
  } else if (args.includes('--setup')) {
    const frame = await menu();
    const before = await categoryNames(frame);
    console.log(JSON.stringify({ before }));
    await rename(frame, '매체별 책추천', '기관 선정');
    await rename(frame, '대학별 추천', '교육 기관');
    await rename(frame, '언론사별 추천', '언론·매체');
    for (const kind of kindOrder) {
      const name = labels.kind[kind];
      if ((await categoryNames(frame)).some(c => c.name === name && c.parent === labels.title)) continue;
      await clickName(frame, labels.title);
      await frame.click('img._addCategoryView');
      await frame.waitForSelector('#tree input.cat_input');
      await frame.click('#tree input.cat_input', { clickCount: 3 });
      await frame.type('#tree input.cat_input', name);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Tab');
      await clickName(frame, labels.title);
      if (!(await categoryNames(frame)).some(c => c.name === name && c.parent === labels.title)) throw new Error(`하위 카테고리 생성 실패: ${name} ${JSON.stringify(await categoryNames(frame))}`);
    }
    const ready = await categoryNames(frame);
    const renameMap = { '매체별 책추천': labels.title, '대학별 추천': labels.kind.university, '언론사별 추천': labels.kind.media };
    for (const old of before) {
      const name = renameMap[old.name] ?? old.name;
      const parent = renameMap[old.parent] ?? old.parent;
      if (!ready.some(c => c.name === name && c.parent === parent && c.count === old.count)) throw new Error(`기존 카테고리가 변했다: ${old.name}`);
    }
    console.log(JSON.stringify({ ready, apply }));
    if (apply) {
      fs.writeFileSync(path.join(base, `_category-menu-before-${Date.now()}.json`), JSON.stringify(before, null, 2));
      await frame.click('#submit_button');
      await wait(1500);
      const verified = await categoryNames(await menu());
      if (hash(verified) !== hash(ready)) throw new Error('저장 후 카테고리 트리가 다르다');
      console.log(JSON.stringify({ result: 'menu-saved-and-reopened', categories: verified }));
    }
  } else if (args.some(a => a.startsWith('--ids='))) {
    const ids = args.find(a => a.startsWith('--ids=')).slice(6).split(',');
    if (ids.some(id => !/^\d{9,}$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('글 번호 누락·중복·형식 오류');
    const servicePath = args.find(a => a.startsWith('--service='))?.slice(10);
    if (!servicePath) throw new Error('--service=경로로 실제 서비스 기관 조회 JSON을 지정한다');
    const service = JSON.parse(fs.readFileSync(servicePath, 'utf8'));
    if (service.source !== 'live_readonly_database' || !Array.isArray(service.curators)) throw new Error('실제 서비스 기관 조회 자료가 아니다');
    const posts = read('posts.json');
    const drafts = read('drafts.json');
    const targets = ids.map(id => {
      const post = posts.find(p => String(p.logNo) === id && p.kind === 'curated');
      if (!post || ['private', 'deleted', 'to-delete', 'replaced', 'skip'].includes(post.link)) throw new Error(`기관 글 대상 아님: ${id}`);
      const curator = service.curators.find(c => c.blog_posts.some(p => String(p.logNo) === id));
      if (!curator || !labels.kind[curator.kind]) throw new Error(`서비스 기관 유형 없음: ${id}`);
      const draft = drafts.find(d => String(d.logNo) === id);
      if (draft && ['private', 'deleted', 'to-delete', 'replaced', 'skip'].includes(draft.status)) throw new Error(`제외 상태 초안: ${id}`);
      return { ...draft, ...post, wanted: labels.kind[curator.kind], curator: curator.slug };
    });
    const editor = createExistingEditor(page);
    const protectedSettings = state => { const value = { ...state }; delete value.category; return value; };
    const report = path.join(base, `_category-posts-${Date.now()}.jsonl`);
    const log = row => {
      fs.appendFileSync(report, JSON.stringify(row) + '\n');
      console.log(JSON.stringify(row.stage === 'before' ? { logNo: row.logNo, stage: row.stage, from: row.from, to: row.to, images: row.content.images, reservation: row.reservation?.row.split('\n').at(-1) ?? null } : row));
    };
    for (const [index, target] of targets.entries()) {
      log({ index: index + 1, total: targets.length, logNo: target.logNo, title: target.title, stage: 'opening' });
      const before = await editor.openTarget(target);
      const beforeSizes = await editor.imageSizes(before.content.images);
      const imageDom = await pictures();
      const domFile = path.join(base, '_blog-institution-image-dom.json');
      const dom = fs.existsSync(domFile) ? JSON.parse(fs.readFileSync(domFile, 'utf8')) : { posts: [] };
      const domRow = dom.posts.find(row => String(row.logNo) === String(target.logNo));
      const selected = imageDom.filter(image => image.representative);
      const editorImages = { checked_at: new Date().toISOString(), images: imageDom, representative: { status: selected.length ? 'selected' : 'not-selected', indices: selected.map(image => image.index) } };
      if (domRow) domRow.editor = editorImages;
      else dom.posts.push({ logNo: String(target.logNo), title: target.title, editor: editorImages });
      fs.writeFileSync(domFile, JSON.stringify(dom, null, 2));
      const current = normalizeCategory(before.state.category);
      log({ logNo: target.logNo, stage: 'before', from: current, to: target.wanted, content: before.content, state: before.state, reservation: before.reservation, sizes: beforeSizes });
      if (!apply) { log({ logNo: target.logNo, result: 'inspection', images: imageDom }); continue; }
      if (current === target.wanted) {
        recordCategory(String(target.logNo), target.wanted);
        log({ logNo: target.logNo, result: 'already-correct', category: target.wanted });
        continue;
      }
      await selectCategory(target.wanted);
      const ready = await editor.settings();
      if (hash(protectedSettings(ready)) !== hash(protectedSettings(before.state)) || hash(await editor.content()) !== hash(before.content)) throw new Error('카테고리 외 본문 또는 설정이 달라졌다');
      await editor.imageSizes(before.content.images, beforeSizes);
      await editor.click('button[class*=confirm_btn]');
      await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly=true'), { timeout: 30000 }, String(target.logNo));
      const after = await editor.openTarget(target);
      await editor.imageSizes(before.content.images, beforeSizes);
      if (normalizeCategory(after.state.category) !== target.wanted || hash(protectedSettings(after.state)) !== hash(protectedSettings(before.state)) || hash(after.content) !== hash(before.content) || hash(after.reservation) !== hash(before.reservation)) throw new Error('저장 후 카테고리·본문·설정·예약 검증 실패');
      recordCategory(String(target.logNo), target.wanted);
      log({ logNo: target.logNo, result: 'changed-and-reopened', category: target.wanted, contentUnchanged: true, settingsUnchanged: true, reservationUnchanged: true, sizesUnchanged: true });
    }
    log({ complete: true, targets: targets.length, apply, report });
  } else {
    throw new Error('--inspect-menu / --setup / --ids=글번호,글번호 중 하나를 지정한다');
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await page.close({ runBeforeUnload: false }).catch(() => {});
  await browser.disconnect();
  process.exit(process.exitCode ?? 0);
}
