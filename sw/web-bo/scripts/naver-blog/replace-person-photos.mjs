// 올라간 글·예약 글의 인물 사진을 서비스 대표사진(portrait_url)으로 같은 자리에서 교체한다.
// 본문·제목·링크·구분선·다른 사진·발행 설정·예약 시각은 저장 전후로 대조한다.
// 대상·자산은 D:/blog-assets/naver-blog/portrait-images/{targets,assets}.json 이 쥔다.
//
// 사용: node scripts/naver-blog/replace-person-photos.mjs [--log=글번호[,글번호]] [--dry] [--apply] [--limit=N]
//   기본은 --dry(저장하지 않는다). --apply 는 저장 후 재열어 검증하고 results.jsonl 에 기록한다.
//   완료된 logNo 는 건너뛰므로 재실행에 안전하다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { createClient } from '@feelandnote/db';
import { getBrowser } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';
import { assertPublishOptions } from './lib/publish-options.mjs';
import { readSnapshot, closePublishPanel, canonicalImageSource } from './repair-institution-images.mjs';
import { planPersonPhotos, assertPersonPhotoFlow, publishedImageSources, assetsForPost, assertPublicRepresentative, publishedImageNodes } from './lib/person-photo-plan.mjs';

const args = process.argv.slice(2);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const ROOT = opt('root') ?? 'D:/blog-assets/naver-blog/portrait-images';
const apply = args.includes('--apply');
const liveMatch = args.includes('--live-match');
const serviceDb = liveMatch ? createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY) : null;
async function assertCurrentPortraits(changes) {
  if (!serviceDb || !changes.length) return;
  const { data, error } = await serviceDb.from('celebs').select('slug,portrait_url,avatar_url,publication_status').in('slug', [...new Set(changes.map(c => c.slug))]);
  if (error) throw new Error(error.message);
  for (const c of changes) {
    const current = data.find(p => p.slug === c.slug);
    const field = c.asset.sourceField ?? 'portrait_url';
    if (current?.publication_status !== 'active' || current?.[field] !== (c.asset.sourceUrl ?? c.asset.portrait_url)) throw new Error(`서비스 사진이 준비 후 변경됨: ${c.slug} ${field}`);
  }
}
// --dedupe: 같은 인물 사진이 반복되는 자리는 첫 자리만 새 이미지로 두고 나머지를 삭제한다.
// 대상 자리는 인덱스가 아니라 현재 src의 portrait-/local- 파일명 마커로 찾는다 — 이미 손으로 고친 글은 마커가 안 맞아 건너뛴다.
const dedupe = args.includes('--dedupe');
const limit = Number(opt('limit') ?? Infinity);
const onlyLogs = opt('log')?.split(',') ?? null;
const wait = ms => new Promise(r => setTimeout(r, ms));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const targetsFile = opt('targets') ?? path.join(ROOT, 'targets.json');
const stopFile = liveMatch ? path.join(path.dirname(targetsFile), 'stop') : null;
const assetsFile = opt('assets') ?? path.join(ROOT, 'assets.json');
const workDir = path.join(ROOT, `run-${Date.now()}`);
fs.mkdirSync(workDir, { recursive: true });
const resultsFile = path.join(ROOT, 'results.jsonl');
// results.jsonl 에 saved-and-reopened 만 완료로 인정한다. dry 는 재실행 대상이다.
// dedupe 모드는 deduped-and-saved 와 안전 건너뜀(state-mismatch·no-marker)만 완료로 본다 — saved-and-reopened 는 중복 정리 전 상태일 수 있다.
const DONE_RESULTS = dedupe ? ['deduped-and-saved', 'already-deduped', 'state-mismatch', 'no-marker'] : ['saved-and-reopened'];
// --retry: 이전 실행의 건너뜀 기록을 무시하고 대상을 다시 처리한다(안전 건너뜀 재판정용).
const retry = args.includes('--retry');
const doneLogs = new Set(fs.existsSync(resultsFile)
  ? fs.readFileSync(resultsFile, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(r => DONE_RESULTS.includes(r?.result)).map(r => String(r.logNo))
  : []);

const targets = JSON.parse(fs.readFileSync(targetsFile, 'utf8'));
const { assets, auditMap } = JSON.parse(fs.readFileSync(assetsFile, 'utf8'));
const assetBySlug = new Map(assets.map(a => [a.slug, a]));
const queue = targets
  .filter(t => !liveMatch || ['celeb', 'curated'].includes(t.kind))
  .filter(t => !onlyLogs || onlyLogs.includes(String(t.logNo)))
  .filter(t => apply && !retry ? !doneLogs.has(String(t.logNo)) : true)
  .slice(0, limit);

if (onlyLogs) {
  const missing = onlyLogs.filter(id => !targets.some(t => String(t.logNo) === id));
  if (missing.length) throw new Error(`대상에 없는 글번호: ${missing.join(', ')}`);
}
for (const t of targets) {
  if (t.audit) continue;
  for (const c of t.changes) {
    const asset = assetBySlug.get(c.slug);
    if (!asset || asset.uploadFile !== c.asset?.uploadFile) throw new Error(`자산 불일치: ${t.logNo} ${c.slug}`);
    const meta = await sharp(c.asset.uploadFile).metadata();
    if (!meta.width || !meta.height || hash(fs.readFileSync(c.asset.uploadFile)) !== c.asset.uploadSha256) throw new Error(`업로드 파일 검증 실패: ${c.slug}`);
  }
}

const basename = src => { try { return decodeURIComponent(new URL(src).pathname.split('/').pop()); } catch { return ''; } };

// 기관 감사 글: 파일명으로 인물을 찾는다. reframe-<slug>- 접두 또는 <닉네임>- 시작.
function auditChanges(before, ambiguous) {
  const changes = [], unmatched = [];
  before.images.forEach((image, index) => {
    const name = basename(image.src);
    let slug = null;
    if (name.startsWith('reframe-')) slug = auditMap.reframe[Object.keys(auditMap.reframe).find(k => name.startsWith(k)) ?? ''];
    else {
      const nick = Object.keys(auditMap.nicknames).find(n => name.startsWith(`${n}-`) || name === `${n}.jpg` || name === `${n}.png`);
      if (nick) slug = auditMap.nicknames[nick];
      else if (auditMap.ambiguousNicknames.some(n => name.startsWith(`${n}-`))) { unmatched.push({ index, name, reason: 'ambiguous-nickname' }); return; }
    }
    if (!slug) { if (/[가-힣]/.test(name)) unmatched.push({ index, name, reason: 'no-match' }); return; }
    const asset = assetBySlug.get(slug);
    if (!asset) { unmatched.push({ index, name, reason: `no-asset:${slug}` }); return; }
    const w = Number(image.width) || Math.round(image.displayWidth);
    changes.push({ index, slug, nickname: asset.nickname, asset, marker: path.basename(asset.uploadFile), width: w <= 100 ? 200 : w });
  });
  return { changes, unmatched };
}

async function chooseImageFile(page, file, uploaded, args_) {
  const cdp = await page.createCDPSession();
  let chooser;
  try {
    await cdp.send('Page.enable');
    cdp.on('Page.fileChooserOpened', v => { chooser = v; });
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
    const selector = 'button.se-image-replacement-toolbar-button[data-name="image-replacement"]';
    await page.waitForSelector(selector, { visible: true, timeout: 10000 });
    const visible = await page.$$eval(selector, bs => bs.filter(b => b.offsetParent && !b.disabled).length);
    if (visible !== 1) throw new Error('사진 교체 버튼이 하나가 아니다');
    await page.click(selector);
    for (let i = 0; i < 40 && !chooser; i++) await wait(200);
    if (!chooser?.backendNodeId) throw new Error('사진 파일 선택창이 열리지 않았다');
    await cdp.send('DOM.setFileInputFiles', { files: [file], backendNodeId: chooser.backendNodeId });
    await page.waitForFunction(uploaded, { timeout: 45000 }, args_);
  } finally {
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {});
    await cdp.detach().catch(() => {});
  }
}

async function imageElement(page, image) {
  if (!image.id.includes('::')) return page.$(`.se-component.se-image[id="${image.id}"] img.se-image-resource`);
  const [cid, i] = image.id.split('::');
  const els = await page.$$(`.se-component.se-imageStrip[id="${cid}"] img.se-image-resource`);
  return els[Number(i)] ?? null;
}

async function selectImage(page, image) {
  // 가상화된 본문은 img가 늦게 마운트된다. 컴포넌트를 보이게 한 뒤 노드를 기다린다.
  const compSel = `.se-component[id="${image.id.split('::')[0]}"]`;
  const comp = await page.$(compSel);
  if (comp) { await comp.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await comp.dispose(); }
  await page.waitForSelector(compSel + ' img.se-image-resource', { timeout: 8000 }).catch(() => {});
  const el = await imageElement(page, image);
  if (!el) throw new Error(`사진 요소가 없다: ${image.id}`);
  await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await el.click(); await wait(500);
  if (image.id.includes('::')) { await el.click(); await wait(500); }
  await el.dispose();
}

// 공개 본문을 읽어 이미지 순서·단락·제목·og:image를 만든다. 가상화로 편집기 DOM이 불안정한 글의 검증 기준이다.
async function publicPost(logNo) {
  const res = await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${logNo}`, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`공개 글 조회 실패: ${logNo} HTTP ${res.status}`);
  const html = await res.text();
  const i = html.indexOf('se-main-container');
  const body = html.slice(i >= 0 ? i : 0);
  const images = publishedImageSources(body);
  const texts = [...body.matchAll(/<p[^>]*class="[^"]*se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/​/g, '').trim()).filter(Boolean);
  return {
    title: html.match(/property="og:title"\s+content="([^"]+)"/)?.[1] ?? '',
    og: html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] ?? '',
    images, texts, imageNodes: publishedImageNodes(body),
  };
}

async function replaceOne(page, before, change) {
  const image = before.images[change.index];
  if (!image) throw new Error(`사진 ${change.index} 가 없다`);
  // 원본 백업: 같은 자리 사진의 블로그 원본을 저장한다. 편집기가 플레이스홀더만 보여줄 때는 공개 본문의 주소를 쓴다.
  const backupSrc = /pstatic\.net/.test(image.src) ? image.src : change.backupUrl;
  if (!/pstatic\.net/.test(backupSrc ?? '')) throw new Error(`원본 주소가 없다: ${image.src.slice(0, 80)}`);
  const backupPath = path.join(workDir, `original-${change.logNo}-${change.index}.bin`);
  if (!fs.existsSync(backupPath)) {
    const res = await fetch(backupSrc, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`원본 내려받기 실패 ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 1000) throw new Error('원본이 너무 작다');
    fs.writeFileSync(backupPath + (/png/i.test(res.headers.get('content-type') ?? '') ? '.png' : '.jpg'), bytes, { flag: 'wx' });
  }
  await selectImage(page, image);
  await chooseImageFile(page, change.asset.uploadFile, ({ id, inner, marker }) => {
    const comp = document.querySelector(`.se-component[id="${CSS.escape(id.split('::')[0])}"]`);
    const img = comp?.querySelectorAll('img.se-image-resource')[inner || 0];
    return img?.src.includes(marker) && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
  }, { id: image.id, inner: image.id.includes('::') ? Number(image.id.split('::')[1]) : 0, marker: change.marker });
  // 표시 폭: 자유 이미지만 크기 입력칸으로 맞춘다. 스트립 사진은 폭을 바꾸지 않는다.
  if (!image.id.includes('::')) {
    await selectImage(page, image);
    const opened = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(e => e.offsetParent && /크기 변경 열기/.test(e.getAttribute('aria-label') || e.textContent));
      if (!b) return false; b.click(); return true;
    });
    if (opened) {
      const input = await page.waitForSelector('[class*=resizing-input] input, input[class*=resizing-input]', { visible: true, timeout: 5000 });
      await input.click({ clickCount: 3 });
      await page.keyboard.type(String(change.width));
      await page.keyboard.press('Enter');
      await wait(1200);
    } else {
      console.log(`  경고: 크기 입력을 열지 못했다 ${change.logNo}:${change.index}`);
    }
  }
}

async function deleteImage(page, image) {
  // 단독 사진은 se-delete-toolbar-button, 스트립 셀은 사진 위 오버레이의 se-image-delete-button.
  // 오버레이는 셀마다 하나씩 있고 선택된 것만 보인다 — 안 뜨면 다시 선택해 재시도한다.
  for (let attempt = 0; attempt < 3; attempt++) {
    await selectImage(page, image);
    const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button.se-delete-toolbar-button, button.se-image-delete-button')].find(b => b.offsetParent));
    if (btn.asElement()) { await btn.asElement().click(); await btn.dispose(); await wait(600); return; }
    await btn.dispose();
    await wait(600);
  }
  throw new Error('삭제 버튼이 나타나지 않았다');
}

// 인물 사진이 반복되는 자리: 생존 자리(대표 배지가 있으면 그 자리, 없으면 첫 자리)만 남기고 나머지를 삭제한다.
// 대조 기준은 인덱스가 아니라 마커 — 삭제로 앞 자리가 밀려도 비교가 어긋나지 않게, 생존 자리 순서를 먼저 고정해 둔다.
function dedupePlan(before, targetSlugs, assetBySlug) {
  const slots = [];   // { index, slug }
  before.images.forEach((img, i) => {
    const name = basename(img.src).toLowerCase();
    const slug = targetSlugs.find(s => name.includes(`portrait-${s}`) || name.includes(`local-${s}`));
    if (slug) slots.push({ index: i, slug });
  });
  const keep = [], drop = [];
  for (const slug of targetSlugs) {
    const mine = slots.filter(s => s.slug === slug);
    if (!mine.length) continue;
    // 사용자 규칙: 첫 자리만 남긴다. 대표 배지가 뒤 자리에 있으면 생존 자리로 옮겨야 한다.
    keep.push({ ...mine[0], needRep: !before.images[mine[0].index].representative && mine.some(s => before.images[s.index].representative) });
    drop.push(...mine.slice(1));
  }
  return { keep, drop: drop.sort((a, b) => b.index - a.index) };
}

// 삭제 후 스냅샷 대조: 살린 자리는 원본 순서 그대로 남아야 하고, 생존 자리만 새 마커로 바뀐다.
function verifyDedupe(before, after, keepIdx, dropIdx, markers) {
  if (!equal(before.title, after.title) || !equal(before.text, after.text) || before.dividers !== after.dividers || !equal(before.links, after.links)) throw new Error('제목·본문·링크·구분선이 바뀌었다');
  if (after.images.length !== before.images.length - dropIdx.size) throw new Error(`사진 수가 어긋난다: ${before.images.length} - ${dropIdx.size} ≠ ${after.images.length}`);
  if (before.images.filter(i => i.representative).length !== after.images.filter(i => i.representative).length) throw new Error('대표사진 수가 바뀌었다');
  const surviving = before.images.map((im, i) => ({ im, i })).filter(x => !dropIdx.has(x.i));
  for (let k = 0; k < surviving.length; k++) {
    const { im: a, i } = surviving[k], b = after.images[k];
    if (keepIdx.has(i)) {
      if (!markers.some(m => b.src.includes(m))) throw new Error(`사진 ${k} 가 새 원본으로 바뀌지 않았다`);
      continue;
    }
    if (!srcEquivalent(a.src, b.src) || a.width !== b.width || a.align !== b.align || !equal(a.caption, b.caption) || a.representative !== b.representative) throw new Error(`대상이 아닌 사진 ${k} 가 바뀌었다`);
  }
}

// 네이버에서 삭제된 원본은 스냅샷마다 data: 플레이스홀더와 실제 src가 번갈아 나온다. 그 자리의 표현 차이는 변경으로 보지 않는다.
const brokenSrc = s => /^data:image\/svg/.test(s || '');
const srcEquivalent = (a, b) => a === b || brokenSrc(a) || brokenSrc(b);

// 공개 본문 이미지 URL 목록으로 인물 사진 반복 자리를 잰다 — 편집기 DOM 가상화가 심한 발행글의 기준이다.
function dedupePlanFromUrls(images, targetSlugs) {
  const slots = [];
  images.forEach((u, i) => {
    const name = basename(u).toLowerCase();
    const slug = targetSlugs.find(s => name.includes(`portrait-${s}`) || name.includes(`local-${s}`));
    if (slug) slots.push({ index: i, slug });
  });
  const keep = [], drop = [];
  for (const slug of targetSlugs) {
    const mine = slots.filter(s => s.slug === slug);
    if (!mine.length) continue;
    keep.push({ ...mine[0] });
    drop.push(...mine.slice(1));
  }
  return { keep, drop: drop.sort((a, b) => b.index - a.index), slots };
}

// 본문 전체를 스윕해 가상화로 언마운트된 사진까지 마운트한 뒤 현재 DOM의 사진 노드 목록을 읽는다.
async function scanMountedImages(page) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    const inner = document.querySelector('.se-content.__se-scroll-target');
    for (const scroller of [document.scrollingElement, inner].filter(Boolean)) {
      for (let y = 0; y < scroller.scrollHeight; y += step) { scroller.scrollTop = y; await new Promise(r => setTimeout(r, 150)); }
      scroller.scrollTop = 0;
    }
  });
  return page.evaluate(() => [...document.querySelectorAll('.se-component.se-image, .se-component.se-imageStrip')].flatMap(c => {
    const strip = c.classList.contains('se-imageStrip');
    return [...c.querySelectorAll('img.se-image-resource')].map((el, i) => ({ id: strip ? `${c.id}::${i}` : c.id, src: el.getAttribute('data-lazy-src') || el.src }));
  }));
}

// 마커 인물 사진이 두 번째 자리부터 반복되면 마지막 것부터 지운다. 스트립 셀 id는 삭제마다 리플로우되므로 매번 DOM을 다시 읽는다.
async function deleteMarkerDupes(page, targetSlugs) {
  let imgCount = await page.$$eval('.se-component.se-image img.se-image-resource, .se-component.se-imageStrip img.se-image-resource', els => els.length);
  for (let guard = 0; guard < 40; guard++) {
    const now = await scanMountedImages(page);
    let hit = null;
    for (const slug of targetSlugs) {
      const mine = now.filter(s => { const n = basename(s.src).toLowerCase(); return n.includes(`portrait-${slug}`) || n.includes(`local-${slug}`); });
      if (mine.length > 1) { hit = mine[mine.length - 1]; break; }
    }
    if (!hit) break;
    await deleteImage(page, { id: hit.id, src: hit.src });
    await page.waitForFunction(n => document.querySelectorAll('.se-component.se-image img.se-image-resource, .se-component.se-imageStrip img.se-image-resource').length < n, { timeout: 15000 }, imgCount)
      .catch(() => { throw new Error('사진 삭제가 반영되지 않았다'); });
    imgCount--;
  }
  // 스트립의 셀이 전부 사라지면 빈 껍데기가 남는다. 남아 있으면 통째로 지운다.
  for (let guard = 0; guard < 5; guard++) {
    const emptyId = await page.evaluate(() => [...document.querySelectorAll('.se-component.se-imageStrip')].find(e => !e.querySelector('img.se-image-resource'))?.id ?? null);
    if (!emptyId) break;
    const comp = await page.$(`.se-component[id="${emptyId}"]`);
    if (!comp) break;
    await comp.evaluate(e => { e.scrollIntoView({ block: 'center', behavior: 'instant' }); e.click(); });
    await wait(600);
    const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button.se-delete-toolbar-button, button.se-image-delete-button')].find(b => b.offsetParent));
    if (!btn.asElement()) { await btn.dispose(); break; }
    await btn.asElement().click(); await btn.dispose(); await wait(600);
  }
}

function verifyChange(before, after, changes, { preserveRep = true } = {}) {
  if (!equal(before.title, after.title) || !equal(before.text, after.text) || before.dividers !== after.dividers || !equal(before.links, after.links)) throw new Error('제목·본문·링크·구분선이 바뀌었다');
  if (before.images.length !== after.images.length) throw new Error('사진 수가 바뀌었다');
  if (before.images.filter(i => i.representative).length !== after.images.filter(i => i.representative).length) throw new Error('대표사진 수가 바뀌었다');
  const changed = new Map(changes.map(c => [c.index, c]));
  for (let i = 0; i < before.images.length; i++) {
    const a = before.images[i], b = after.images[i];
    const c = changed.get(i);
    if (!c) {
      const flaky = brokenSrc(a.src) || brokenSrc(b.src);
      const same = srcEquivalent(a.src, b.src) && a.width === b.width && (flaky || (a.naturalWidth === b.naturalWidth && a.naturalHeight === b.naturalHeight)) && a.align === b.align && equal(a.caption, b.caption) && a.representative === b.representative;
      if (!same) throw new Error(`대상이 아닌 사진 ${i} 가 바뀌었다`);
      continue;
    }
    if (!b.src.includes(c.marker)) throw new Error(`사진 ${i} 가 새 원본으로 바뀌지 않았다`);
    // 네이버가 큰 업로드를 자체 리사이즈하므로 자연크기 동일이 아니라 4:5 비율 유지로 본다.
    const ratio = c.asset.width / c.asset.height;
    if (!(b.naturalWidth > 0) || Math.abs(b.naturalWidth - b.naturalHeight * ratio) > 2) throw new Error(`사진 ${i} 의 원본 비율이 대표사진(4:5)과 다르다: ${b.naturalWidth}x${b.naturalHeight}`);
    c.servedNaturalWidth = b.naturalWidth; c.servedNaturalHeight = b.naturalHeight;
    if (a.align !== b.align || !equal(a.caption, b.caption)) throw new Error(`사진 ${i} 의 정렬·설명이 바뀌었다`);
    if (preserveRep && a.representative !== b.representative) throw new Error(`사진 ${i} 의 대표사진 지정이 바뀌었다`);
    if (!a.id.includes('::')) {
      const w = Number(b.width) || Math.round(b.displayWidth);
      if (Math.abs(w - c.width) > 30) throw new Error(`사진 ${i} 의 표시 폭 ${w} ≠ ${c.width}`);
    }
  }
}

const { browser, launched } = await getBrowser({ protocolTimeout: 300000, background: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const focusSession = await page.createCDPSession();
await focusSession.send('Emulation.setFocusEmulationEnabled', { enabled: true });
await focusSession.detach();
const log = row => { fs.appendFileSync(resultsFile, JSON.stringify(row) + '\n'); console.log(JSON.stringify(row)); };
let step = '', current = null, saved = false;
page.on('dialog', d => { if (d.type() === 'beforeunload') d.accept().catch(() => {}); else { log({ dialog: d.type(), message: d.message() }); d.dismiss().catch(() => {}); } });
const editor = createExistingEditor(page, { onStep: s => { step = s; } });

try {
  for (const target of queue) {
    if (stopFile && fs.existsSync(stopFile)) { log({ stopRequested: true }); break; }
    current = target.logNo; saved = false; step = 'open';
    const post = { logNo: target.logNo, title: target.title, scheduledAt: target.scheduledAt, allowPrivate: target.allowPrivate };
    const initial = await editor.openTarget(post);
    // 기존 발행 설정이 표준과 다른 글도 있다. 바꾸지 않고 경고만 기록하며, 보존은 저장 전후 설정 동일성 검사가 보장한다.
    let optionsWarning = null;
    try { await assertPublishOptions(page); } catch (error) { if (!/발행 중단/.test(error.message)) throw error; optionsWarning = error.message; }
    await closePublishPanel(page, editor);
    step = 'snapshot';

    if (target.publicVerified && !dedupe && (!liveMatch || (!initial.reservation && !target.allowPrivate))) {
      // 가상화·깨진 원본 때문에 편집기 DOM 스냅샷이 불안정한 글: 공개 본문 HTML을 전후 대조 기준으로 쓴다.
      const pubBefore = await publicPost(current);
      const publicImages = pubBefore.images.map(src => ({ src }));
      if (liveMatch) {
        const plan = planPersonPhotos(publicImages, assetsForPost(assets, target), auditMap, target.changes, target);
        if (plan.unmatched.length || (!plan.changes.length && target.kind === 'celeb')) throw new Error(`공개 본문의 인물 식별 확인 필요: ${JSON.stringify(plan.unmatched)}`);
        target.changes = plan.changes;
      }
      if (target.expectedImageCount && pubBefore.images.length !== target.expectedImageCount) throw new Error(`공개 본문 사진 수 ${pubBefore.images.length} ≠ ${target.expectedImageCount}`);
      fs.writeFileSync(path.join(workDir, `before-${current}.json`), JSON.stringify({ ...initial, public: pubBefore, snapshot: { images: publicImages } }, null, 2));
      // 인물 사진 자리는 공개 본문의 파일명으로 확인한다.
      for (const c of target.changes) {
        const pubName = basename(pubBefore.images[c.index] ?? '');
        const norm = s => String(s).toLowerCase().replace(/[\s_.\-]+/g, '');
        const tokens = [c.slug, c.asset?.slug, c.nickname].filter(Boolean).map(norm);
        if (!tokens.some(t => norm(pubName).includes(t))) throw new Error(`공개 본문 사진 ${c.index} 가 인물이 아니다: ${pubName}`);
        c.logNo = current; c.backupUrl = pubBefore.images[c.index];
      }
      const pending = target.changes.filter(c => !pubBefore.images[c.index].includes(c.marker));
      if (!pending.length) { log({ logNo: current, result: 'already-replaced', photos: target.changes.length }); continue; }
      // 편집기 컴포넌트를 순서대로 마운트해 공개 본문 순서와 맞춘다.
      const compHandles = await page.$$('.se-component.se-image, .se-component.se-imageStrip');
      let positions = [];
      for (const h of compHandles) {
        const meta = await h.evaluate(async e => {
          e.scrollIntoView({ block: 'center', behavior: 'instant' });
          await new Promise(r => setTimeout(r, 600));
          return { id: e.id, strip: e.classList.contains('se-imageStrip'), n: e.querySelectorAll('img.se-image-resource').length || 1 };
        });
        for (let j = 0; j < meta.n; j++) positions.push({ id: meta.strip ? `${meta.id}::${j}` : meta.id });
        await h.dispose();
      }
      if (liveMatch) {
        if (pubBefore.imageNodes.length !== pubBefore.images.length) throw new Error('공개 사진 컴포넌트와 원본 수가 다르다');
        positions = pubBefore.imageNodes;
        for (const position of positions) {
          const handle = await page.$(`.se-component[id="${position.id.split('::')[0]}"]`);
          if (!handle) throw new Error(`공개 사진 컴포넌트가 편집기에 없다: ${position.id}`);
          await handle.dispose();
        }
      }
      if (positions.length !== pubBefore.images.length) throw new Error(`편집기 사진 자리 ${positions.length} ≠ 공개 본문 ${pubBefore.images.length}`);
      const pseudo = { images: positions.map(p => ({ id: p.id, src: '' })) };
      step = 'replace';
      await assertCurrentPortraits(pending);
      for (const c of pending) {
        pseudo.images[c.index].src = pubBefore.images[c.index];
        if (liveMatch && target.kind !== 'curated' && !pseudo.images[c.index].id.includes('::')) {
          await selectImage(page, pseudo.images[c.index]);
          const el = await imageElement(page, pseudo.images[c.index]);
          c.width = await el.evaluate(e => Number(e.getAttribute('width')) || Math.round(e.getBoundingClientRect().width));
          await el.dispose();
          if (!(c.width > 0)) throw new Error('현재 인물 사진의 표시 폭을 확인하지 못했다');
        }
        await replaceOne(page, pseudo, c);
        if (liveMatch && !pseudo.images[c.index].id.includes('::')) {
          const el = await imageElement(page, pseudo.images[c.index]);
          const width = await el.evaluate(e => Number(e.getAttribute('width')) || Math.round(e.getBoundingClientRect().width));
          await el.dispose();
          if (Math.abs(width - c.width) > 1) throw new Error(`교체 사진 폭이 다르다: ${width}/${c.width}`);
        }
      }
      step = 'publish-options';
      await editor.click('button[class*=publish_btn]');
      if (!equal(initial.state, await editor.settings())) throw new Error('발행 설정이 바뀌었다');
      if (!apply) { log({ logNo: current, result: 'dry-unsaved', photos: pending.length }); continue; }
      step = 'save';
      await assertCurrentPortraits(pending);
      await editor.click('button[class*=confirm_btn]');
      await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly'), { timeout: 30000 }, String(current));
      saved = true;
      step = 'reopen';
      const pubAfter = await publicPost(current);
      const changedIdx = new Set(pending.map(c => c.index));
      if (!equal(pubBefore.texts, pubAfter.texts) || pubBefore.title !== pubAfter.title) throw new Error('공개 본문 제목·단락이 바뀌었다');
      if (pubAfter.images.length !== pubBefore.images.length) throw new Error('공개 본문 사진 수가 바뀌었다');
      for (let i = 0; i < pubBefore.images.length; i++) {
        if (changedIdx.has(i)) { if (!pubAfter.images[i].includes(pending.find(c => c.index === i).marker)) throw new Error(`공개 사진 ${i} 가 새 원본으로 바뀌지 않았다`); }
        else if (pubAfter.images[i] !== pubBefore.images[i]) throw new Error(`대상이 아닌 공개 사진 ${i} 가 바뀌었다`);
      }
      assertPublicRepresentative(pubBefore, pubAfter);
      const ogChanged = true;
      const verified = await editor.openTarget(post);
      if (!equal(initial.state, verified.state) || !equal(initial.reservation, verified.reservation)) throw new Error('저장 후 발행 설정 또는 예약이 달라졌다');
      await closePublishPanel(page, editor);
      const shot = path.join(workDir, `saved-${current}.png`);
      await page.screenshot({ path: shot });
      log({ logNo: current, result: 'saved-and-reopened', photos: pending.length, replaced: pending.map(c => c.slug), screenshot: shot, ogChanged, optionsWarning: optionsWarning ?? undefined });
      continue;
    }

    // 네이버에서 원본이 삭제된 사진은 플레이스홀더로 남는다. 자리·src가 전후 동일하면 보존으로 본다.
    if (liveMatch) await scanMountedImages(page);
    const before = await readSnapshot(page, { tolerateBroken: true });
    if (liveMatch && !initial.reservation && !target.allowPrivate) {
      const published = await publicPost(current);
      if (published.images.length !== before.images.length || published.images.some((src, i) => basename(src) !== basename(before.images[i].src))) {
        throw new Error(`공개 글과 편집기의 사진 목록이 다르다: ${published.images.length}/${before.images.length}`);
      }
    }
    if (before.title !== target.title.trim()) throw new Error(`제목이 다르다: ${before.title}`);
    if (!liveMatch && target.expectedImageCount && before.images.length !== target.expectedImageCount) {
      // dedupe: 예약글은 공개 본문이 없으니 손으로 고친 것으로 보고 건너뛴다. 발행글은 DOM 가상화 누락일 수 있어 아래에서 공개 본문으로 다시 판정한다.
      if (dedupe && target.scheduledAt) { log({ logNo: current, result: 'state-mismatch', images: before.images.length, expected: target.expectedImageCount }); continue; }
      if (!dedupe) throw new Error(`사진 수 ${before.images.length} ≠ ${target.expectedImageCount}`);
    }
    fs.writeFileSync(path.join(workDir, `before-${current}.json`), JSON.stringify({ ...initial, snapshot: before }, null, 2));

    if (dedupe) {
      // slug 앞부분이 겹치는 인물이 있을 수 있어 긴 slug부터 맞춘다.
      const targetSlugs = [...new Set(target.changes.map(c => c.slug))].sort((a, b) => b.length - a.length);
      // DOM 스냅샷이 기대 수와 다른 발행글: 가상화 누락일 수 있어 공개 본문을 기준으로 판정·검증한다.
      const pubPlan = !!(target.expectedImageCount && before.images.length !== target.expectedImageCount);
      const pub = pubPlan ? await publicPost(current) : null;
      const plan = pubPlan ? dedupePlanFromUrls(pub.images, targetSlugs) : dedupePlan(before, targetSlugs, assetBySlug);
      const missing = targetSlugs.filter(s => !plan.keep.some(k => k.slug === s));
      if (missing.length) { log({ logNo: current, result: 'no-marker', missing }); continue; }
      const dropIdx = new Set(plan.drop.map(d => d.index));
      if (!dropIdx.size) { log({ logNo: current, result: 'already-deduped', kept: plan.keep.length }); continue; }

      if (pubPlan) {
        // 인물 사진은 이미 마커 파일이므로 교체 없이 중복 삭제만 한다. 대표가 삭제될 자리면 먼저 생존 자리로 옮긴다.
        step = 'dedupe-rep';
        const ogC = pub.og.replace(/\?type=\w+.*$/, '').replace(/\?.*$/, '');
        const ogIdx = pub.images.indexOf(ogC);
        if (dropIdx.has(ogIdx)) {
          const slug = plan.slots.find(s => s.index === ogIdx).slug;
          const now = await scanMountedImages(page);
          const keep = now.find(s => { const n = basename(s.src).toLowerCase(); return n.includes(`portrait-${slug}`) || n.includes(`local-${slug}`); });
          if (!keep) throw new Error('대표 이동 대상 사진을 찾지 못했다');
          await selectImage(page, keep);
          const moved = await page.evaluate(() => {
            const b = [...document.querySelectorAll('button.se-set-rep-image-button')].find(e => e.offsetParent && !e.classList.contains('se-is-selected'));
            if (!b) return false; b.click(); return true;
          });
          if (moved) await page.waitForSelector('button.se-set-rep-image-button.se-is-selected', { timeout: 8000 });
        }
        step = 'dedupe-delete';
        await deleteMarkerDupes(page, targetSlugs);
        step = 'publish-options';
        await editor.click('button[class*=publish_btn]');
        if (!equal(initial.state, await editor.settings())) throw new Error('발행 설정이 바뀌었다');
        if (!apply) {
          await closePublishPanel(page, editor);
          log({ logNo: current, result: 'dry-unsaved', dedupe: true, pub: true, kept: plan.keep.length, dropped: plan.drop.length });
          continue;
        }
        step = 'save';
        await editor.click('button[class*=confirm_btn]');
        await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly'), { timeout: 30000 }, String(current));
        saved = true;
        step = 'reopen';
        const verified = await editor.openTarget(post);
        if (!equal(initial.state, verified.state) || !equal(initial.reservation, verified.reservation)) throw new Error('저장 후 발행 설정 또는 예약이 달라졌다');
        await closePublishPanel(page, editor);
        // 공개 본문 대조: 삭제한 자리만 빠지고 나머지 사진·단락·대표이미지가 그대로여야 한다.
        step = 'verify-public';
        const pubAfter = await publicPost(current);
        const surviving = pub.images.filter((_, i) => !dropIdx.has(i));
        if (!equal(surviving, pubAfter.images)) throw new Error('공개 본문 사진 목록이 계획과 다르다');
        if (!equal(pub.texts, pubAfter.texts) || pub.title !== pubAfter.title) throw new Error('공개 본문 제목·단락이 바뀌었다');
        // 썸네일 URL은 저장마다 재생성되므로 파일명으로 비교한다.
        const ogAfter = pubAfter.og.replace(/\?type=\w+.*$/, '').replace(/\?.*$/, '');
        const expectedOg = dropIdx.has(ogIdx) ? pub.images[plan.keep.find(k => k.slug === plan.slots.find(s => s.index === ogIdx).slug).index] : ogC;
        if (basename(ogAfter) !== basename(expectedOg)) throw new Error(`대표이미지가 바뀌었다: ${ogAfter}`);
        log({ logNo: current, result: 'deduped-and-saved', pub: true, kept: plan.keep.length, dropped: plan.drop.length, replaced: [], optionsWarning: optionsWarning ?? undefined });
        continue;
      }

      // 생존 자리에 portrait-/local- 어떤 인물 마커든 있으면 이미 대표사진이다 — 다시 갈아 끼우지 않는다.
      const markers = new Map(plan.keep.map(k => [k.index, [`portrait-${k.slug}-`, `local-${k.slug}-`, path.basename(assetBySlug.get(k.slug).uploadFile)]]));
      const replaced = [];
      step = 'replace';
      for (const k of plan.keep.sort((a, b) => a.index - b.index)) {
        const asset = assetBySlug.get(k.slug);
        const img = before.images[k.index];
        if (!markers.get(k.index).some(m => img.src.includes(m))) {
          const w = Number(img.width) || Math.round(img.displayWidth) || 200;
          await replaceOne(page, before, { index: k.index, slug: k.slug, nickname: asset.nickname, asset, marker: path.basename(asset.uploadFile), width: w, logNo: current });
          replaced.push(k.slug);
        }
        if (k.needRep) {
          // 대표 배지가 삭제될 자리에 있었다 — 생존 자리로 옮긴다. 버튼은 이미지마다 있어 보이는 것을 고른다.
          await selectImage(page, img);
          const moved = await page.evaluate(() => {
            const b = [...document.querySelectorAll('button.se-set-rep-image-button')].find(e => e.offsetParent && !e.classList.contains('se-is-selected'));
            if (!b) return false; b.click(); return true;
          });
          if (moved) await page.waitForSelector('button.se-set-rep-image-button.se-is-selected', { timeout: 8000 });
        }
      }
      step = 'dedupe-delete';
      await deleteMarkerDupes(page, targetSlugs);
      step = 'verify-ready';
      const ready = await readSnapshot(page, { tolerateBroken: true });
      fs.writeFileSync(path.join(workDir, `ready-${current}.json`), JSON.stringify({ snapshot: ready, state: initial.state, reservation: initial.reservation }, null, 2));
      verifyDedupe(before, ready, new Set(plan.keep.map(k => k.index)), dropIdx, [...markers.values()].flat());
      step = 'publish-options';
      await editor.click('button[class*=publish_btn]');
      if (!equal(initial.state, await editor.settings())) throw new Error('발행 설정이 바뀌었다');
      if (!apply) {
        await closePublishPanel(page, editor);
        log({ logNo: current, result: 'dry-unsaved', dedupe: true, kept: plan.keep.length, dropped: plan.drop.length, replaced });
        continue;
      }
      step = 'save';
      await editor.click('button[class*=confirm_btn]');
      await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly'), { timeout: 30000 }, String(current));
      saved = true;
      step = 'reopen';
      const verified = await editor.openTarget(post);
      if (!equal(initial.state, verified.state) || !equal(initial.reservation, verified.reservation)) throw new Error('저장 후 발행 설정 또는 예약이 달라졌다');
      await closePublishPanel(page, editor);
      const after = await readSnapshot(page, { tolerateBroken: true });
      fs.writeFileSync(path.join(workDir, `after-${current}.json`), JSON.stringify({ ...verified, snapshot: after }, null, 2));
      verifyDedupe(before, after, new Set(plan.keep.map(k => k.index)), dropIdx, [...markers.values()].flat());
      log({ logNo: current, result: 'deduped-and-saved', kept: plan.keep.length, dropped: plan.drop.length, replaced, optionsWarning: optionsWarning ?? undefined });
      continue;
    }

    // 이미 처리된 글은 사진 원본으로 판별해 건너뛴다.
    const livePlan = liveMatch ? planPersonPhotos(before.images, assetsForPost(assets, target), auditMap, target.changes, target) : null;
    if (livePlan?.unmatched.length) throw new Error(`인물 식별 확인 필요: ${JSON.stringify(livePlan.unmatched)}`);
    const changes = livePlan ? livePlan.changes : target.audit ? auditChanges(before).changes : target.changes.map(c => ({ ...c, logNo: target.logNo }));
    if (liveMatch && !changes.length && (target.kind === 'celeb' || target.changes.length)) throw new Error('기존 인물 사진을 식별하지 못했다. 위치로 추측하지 않는다');
    for (const c of changes) c.logNo ??= target.logNo;
    const auditUnmatched = target.audit ? auditChanges(before).unmatched : [];
    const pending = changes.filter(c => !before.images[c.index]?.src.includes(c.marker)
      || (liveMatch && target.kind === 'curated' && Number(before.images[c.index]?.width) !== c.width));
    if (!pending.length) {
      if (!changes.length) log({ logNo: current, result: 'no-person-photo', unmatched: auditUnmatched });
      else { verifyChange(before, before, changes); log({ logNo: current, result: 'already-replaced', photos: changes.length }); }
      continue;
    }
    for (const c of liveMatch ? [] : pending) {
      const image = before.images[c.index];
      const name = basename(image.src);
      // 과거 업로드 파일명은 reframe-/retry-/avatar- 등 접두사가 붙을 수 있어 slug·닉네임 포함 여부로 본다.
      const normalize = s => String(s).toLowerCase().replace(/[\s_.\-]+/g, '');
      const tokens = [c.slug, c.asset && c.asset.slug, c.nickname].filter(Boolean).map(normalize);
      // 신규 인물의 아바타는 kim-0.jpg 같은 범용 파일명으로 올라간다. 정사각 원본은 아바타의 시그니처다.
      // publicVerified: 인물 사진 위치를 공개 본문 HTML로 다시 확인한 글. 깨진 원본 자리는 파일명 대신 위치로 본다.
      const knownOld = (c.oldBasename && name.startsWith(c.oldBasename))
        || tokens.some(t => normalize(name).includes(t))
        || (image.naturalWidth === image.naturalHeight && image.naturalWidth > 0)
        || (target.publicVerified && brokenSrc(image.src));
      if (!knownOld) throw new Error(`사진 ${c.index} 의 기존 파일이 인물 사진으로 확인되지 않는다: ${name}`);
    }
    step = 'replace';
    await assertCurrentPortraits(pending);
    for (const c of pending) await replaceOne(page, before, c);
    step = 'verify-ready';
    const ready = await readSnapshot(page, { tolerateBroken: true });
    verifyChange(before, ready, pending);
    if (liveMatch) assertPersonPhotoFlow(before, ready, pending);
    fs.writeFileSync(path.join(workDir, `ready-${current}.json`), JSON.stringify({ snapshot: ready, state: initial.state, reservation: initial.reservation }, null, 2));
    step = 'publish-options';
    await editor.click('button[class*=publish_btn]');
    if (!equal(initial.state, await editor.settings())) throw new Error('발행 설정이 바뀌었다');
    if (!apply) {
      await closePublishPanel(page, editor);
      const shot = path.join(workDir, `dry-${current}.png`);
      await selectImage(page, ready.images[pending[0].index]).catch(() => {});
      await page.screenshot({ path: shot });
      log({ logNo: current, result: 'dry-unsaved', photos: pending.length, screenshot: shot });
      continue;
    }
    step = 'save';
    await assertCurrentPortraits(pending);
    await editor.click('button[class*=confirm_btn]');
    await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly'), { timeout: 30000 }, String(current));
    saved = true;
    step = 'reopen';
    const verified = await editor.openTarget(post);
    if (!equal(initial.state, verified.state) || !equal(initial.reservation, verified.reservation)) throw new Error('저장 후 발행 설정 또는 예약이 달라졌다');
    await closePublishPanel(page, editor);
    const after = await readSnapshot(page, { tolerateBroken: true });
    verifyChange(before, after, pending);
    if (liveMatch) assertPersonPhotoFlow(before, after, pending);
    const readySrc = ready.images.map(i => canonicalImageSource(i.src));
    const afterSrc = after.images.map(i => canonicalImageSource(i.src));
    if (!readySrc.every((s, i) => srcEquivalent(s, afterSrc[i]))) throw new Error('저장 전후 사진 원본이 달라졌다');
    fs.writeFileSync(path.join(workDir, `after-${current}.json`), JSON.stringify({ ...verified, snapshot: after }, null, 2));
    const shot = path.join(workDir, `saved-${current}.png`);
    await selectImage(page, after.images[pending[0].index]).catch(() => {});
    await page.screenshot({ path: shot });
    log({ logNo: current, result: 'saved-and-reopened', photos: pending.length, replaced: pending.map(c => c.slug), screenshot: shot, optionsWarning: optionsWarning ?? undefined });
  }
  log({ complete: true, mode: apply ? 'apply' : 'dry', queue: queue.length, workDir });
} catch (error) {
  const shot = path.join(workDir, `failure-${current}.png`);
  await page.screenshot({ path: shot }).catch(() => {});
  log({ complete: false, logNo: current, step, saved, error: String(error), screenshot: shot });
  throw error;
} finally {
  await page.close().catch(() => {});
  if (launched) await browser.close(); else await browser.disconnect();
}
