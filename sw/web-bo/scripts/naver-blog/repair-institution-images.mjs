// 기존 기관 글에 검수된 서비스 이미지 한 장을 넣고 대표사진으로 지정한다.
// node scripts/naver-blog/repair-institution-images.mjs --log=글번호[,글번호] --dry
// --prepare-only: 파일·대상 검사만. --apply: 저장한 뒤 재열어 검증한다.
// --replace-map=JSON: [{ logNo, curator_slug, component_id, source_url,
//   naturalWidth, naturalHeight, draft_image_url? }]의 정확한 기관 사진 한 장을 교체한다.
// 규칙: docs/continuous/blog-naver-book.md. 기존 책표지에는 사진 편집기·액자를 적용하지 않는다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { ASSETS } from '../blog-assets.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';
import { assertPublishOptions } from './lib/publish-options.mjs';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const ROOT = path.join(ASSETS, 'naver-blog');

export function parseOptions(args) {
  const values = new Map();
  for (const arg of args) {
    const match = arg.match(/^--(log|inventory|replace-map)=(.+)$/);
    const key = match?.[1] ?? arg;
    if (values.has(key)) throw new Error(`옵션 중복: ${key}`);
    if (!match && !['--dry', '--apply', '--prepare-only'].includes(arg)) throw new Error(`알 수 없는 옵션: ${arg}`);
    values.set(key, match?.[2] ?? true);
  }
  const ids = String(values.get('log') ?? '').split(',');
  if (!ids.every(id => /^\d+$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('--log=글번호[,글번호]로 중복 없이 대상을 지정한다');
  if (values.has('--apply') && (values.has('--dry') || values.has('--prepare-only'))) throw new Error('--apply는 --dry/--prepare-only와 함께 쓰지 않는다');
  return { ids, apply: values.has('--apply'), prepareOnly: values.has('--prepare-only'), inventory: values.get('inventory') ?? path.join(ROOT, '_service-institution-images.json'), replaceMap: values.get('replace-map') ?? null };
}

export function validateReplacements(entries, ids) {
  if (!Array.isArray(entries) || entries.length !== ids.length) throw new Error('교체표는 지정한 글마다 정확히 한 행이어야 한다');
  const seen = new Set();
  for (const row of entries) {
    if (!row || !ids.includes(String(row.logNo)) || seen.has(String(row.logNo))) throw new Error('교체표에 다른 글 또는 중복 글이 있다');
    seen.add(String(row.logNo));
    if (!/^[a-z0-9-]+$/.test(row.curator_slug ?? '') || !/^[A-Za-z0-9_-]+$/.test(row.component_id ?? '')
      || !/^https?:\/\//.test(row.source_url ?? '') || /\.svg(?:[?#]|$)/i.test(row.source_url)
      || !Number.isInteger(row.naturalWidth) || row.naturalWidth <= 0 || !Number.isInteger(row.naturalHeight) || row.naturalHeight <= 0) {
      throw new Error(`교체 사진의 기관·컴포넌트·원본 주소·자연크기가 불완전하다: ${row.logNo}`);
    }
    canonicalImageSource(row.source_url);
  }
  return entries;
}

export function selectTargets(ids, posts, drafts, inventory, blogInventory, replacements = null) {
  if (replacements) validateReplacements(replacements, ids);
  return ids.map(logNo => {
    const matches = posts.filter(p => String(p.logNo) === logNo);
    if (matches.length !== 1 || matches[0].kind !== 'curated' || !['ok', 'check'].includes(matches[0].link)) throw new Error(`활성 기관 글이 아니다: ${logNo}`);
    const post = matches[0];
    const replacement = replacements?.find(row => String(row.logNo) === logNo) ?? null;
    const draftMatches = drafts.filter(d => String(d.logNo) === logNo);
    const blogPost = blogInventory.posts.find(p => String(p.logNo) === logNo);
    if (draftMatches.length > 1 || (!draftMatches.length && !(replacement && blogPost?.source_bundle === 'legacy'))) throw new Error(`원고가 없거나 중복이다: ${logNo}`);
    if (!blogPost || (!replacement && (blogPost.source_bundle !== 'new' || blogPost.reusable_institution_images?.some(i => i.preferred)))) throw new Error(`기존 기관사진이 있는 글은 추가하지 않는다: ${logNo}`);
    const curators = inventory.curators.filter(c => c.prepared_image?.logNos?.map(String).includes(logNo));
    if (curators.length !== 1) throw new Error(`준비된 기관 이미지가 없거나 중복이다: ${logNo}`);
    const curator = curators[0];
    const asset = curator.prepared_image;
    const route = (post.url ?? draftMatches[0]?.target ?? '').match(/\/library\/curated\/([^/]+)\/([^/?#]+)/);
    if (!route || route[1] !== curator.slug || curator.slug !== blogPost.curator_slug
      || !curator.blog_posts?.some(p => String(p.logNo) === logNo && p.list_slug === route[2])) throw new Error(`서비스 기관과 블로그 주소가 다르다: ${logNo}`);
    if (curator.image_check?.visually_checked !== true || curator.image_check?.reusable_as_institution_image !== true
      || asset.naver_raster_compatible !== true || asset.white_background_legible === false) throw new Error(`기관 이미지 검수 또는 흰 배경 가독성 확인 실패: ${curator.slug}`);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256 ?? '') || !asset.original_url || !asset.local_file) throw new Error(`이미지 출처·파일·해시 누락: ${curator.slug}`);
    const target = { post: { ...post, body: undefined }, draftBody: draftMatches[0]?.body ?? null, curator, asset, replacement, marker: `institution-${curator.slug}-${asset.sha256.slice(0, 12)}` };
    if (replacement) {
      if (replacement.curator_slug !== curator.slug) throw new Error(`교체표와 서비스 기관이 다르다: ${logNo}`);
      const source = canonicalImageSource(replacement.source_url);
      const knownLogo = blogPost.live_blog?.images?.some(i => /institution.*logo/.test(i.role ?? '') && i.visual_checked === true && canonicalImageSource(i.src) === source)
        || blogPost.reusable_institution_images?.some(i => /logo/.test(i.role ?? '') && canonicalImageSource(i.url) === source);
      const insertedLogo = replacement.source_url.includes(`institution-${curator.slug}-`) && target.draftBody?.includes(`[img:${replacement.draft_image_url}|`);
      if (!knownLogo && !insertedLogo) throw new Error(`교체 원본을 검수된 기관 로고로 확인하지 못했다: ${logNo}`);
      if (target.draftBody !== null) replaceDraftImage(target.draftBody, target, Math.min(asset.width, 400));
    }
    return target;
  });
}

export function canonicalImageSource(src) {
  const url = new URL(src);
  // 같은 네이버 원본에 붙는 편집/표시 크기와 CDN 호스트만 정규화한다.
  if (/(?:^|\.)pstatic\.net$/.test(url.hostname)) {
    url.hostname = 'pstatic.net';
    url.searchParams.delete('type');
  }
  return url.href;
}

function imageIdentity(image) {
  return { source: canonicalImageSource(image.src), componentKind: image.componentKind, width: image.width, height: image.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, align: image.align, caption: image.caption };
}

function assertLoadedImages(images) {
  for (const image of images) {
    if (!/^https?:\/\//.test(image.src) || /\.svg(?:[?#]|$)/i.test(image.src)
      || !(image.naturalWidth > 0) || !(image.naturalHeight > 0)) throw new Error('사진 원본이 아직 로딩되지 않아 변경을 검증할 수 없다');
  }
}

export function findReplacementImage(before, replacement, marker) {
  assertLoadedImages(before.images);
  if (before.images.some(image => image.src.includes(marker))) throw new Error('새 기관 로고가 이미 있다. 교체로 중복시키지 않는다');
  const source = canonicalImageSource(replacement.source_url);
  const bySource = before.images.filter(image => canonicalImageSource(image.src) === source);
  const byId = before.images.filter(image => image.id === replacement.component_id);
  if (bySource.length !== 1 || byId.length !== 1 || bySource[0] !== byId[0]) throw new Error('교체할 원본 주소와 컴포넌트가 단일 사진으로 일치하지 않는다');
  const image = bySource[0];
  if (image.naturalWidth !== replacement.naturalWidth || image.naturalHeight !== replacement.naturalHeight) throw new Error('교체할 기관 사진의 자연크기가 달라졌다');
  return image;
}

export function assertImageChange(before, after, marker, { added = true, replacement = null } = {}) {
  assertLoadedImages([...before.images, ...after.images]);
  if (!equal(before.text, after.text) || before.title !== after.title || before.dividers !== after.dividers || !equal(before.links, after.links)) throw new Error('제목·본문·링크·구분선이 바뀌었다');
  const isLogo = image => image.src.includes(marker);
  const logos = after.images.filter(isLogo);
  if (logos.length !== 1 || !logos[0].representative || after.images.filter(i => i.representative).length !== 1) throw new Error('새 기관 이미지 한 장만 대표로 지정되어야 한다');
  const replaced = replacement ? findReplacementImage(before, replacement, marker) : null;
  const oldBefore = replaced ? before.images.filter(i => i !== replaced) : added ? before.images : before.images.filter(i => !isLogo(i));
  const oldAfter = after.images.filter(i => !isLogo(i));
  if (after.images.length !== before.images.length + Number(!replacement && added) || !equal(oldBefore.map(imageIdentity), oldAfter.map(imageIdentity))) throw new Error('기존 사진의 수·순서·원본·자연크기·표시크기·정렬·설명이 바뀌었다');
  if (replaced) {
    if (before.images.indexOf(replaced) !== after.images.indexOf(logos[0]) || !equal(replaced.caption, logos[0].caption)) throw new Error('교체 사진의 위치 또는 설명이 바뀌었다');
    if (!Array.isArray(before.flow) || !Array.isArray(after.flow)) throw new Error('사진 교체 전후의 본문 컴포넌트 순서를 확인하지 못했다');
    const expected = before.flow.map(c => c.kind === 'image' && canonicalImageSource(c.src) === canonicalImageSource(replaced.src) ? { ...c, src: logos[0].src } : c);
    const flowIdentity = flow => flow.map(c => c.kind === 'image' ? { ...c, src: canonicalImageSource(c.src) }
      : c.kind === 'imageStrip' ? { ...c, sources: c.sources.map(canonicalImageSource) } : c);
    if (!equal(flowIdentity(expected), flowIdentity(after.flow))) throw new Error('사진과 본문 컴포넌트의 배치가 바뀌었다');
  }
  return logos[0];
}

async function readSnapshot(page, { waitForImages = true } = {}) {
  const imageSelector = '.se-component.se-image img.se-image-resource, .se-component.se-imageStrip img.se-image-resource';
  const count = await page.$$eval(imageSelector, images => images.length);
  for (let index = 0; waitForImages && index < count; index++) {
    await page.$$eval(imageSelector, (images, i) => images[i].scrollIntoView({ block: 'center', behavior: 'instant' }), index);
    try {
      await page.waitForFunction(({ selector, index }) => {
        const image = document.querySelectorAll(selector)[index];
        return image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0 && /^https?:\/\//.test(image.src) && !/\.svg(?:[?#]|$)/i.test(image.src);
      }, { timeout: 15000 }, { selector: imageSelector, index });
    } catch (error) {
      const state = await page.$$eval(imageSelector, (images, i) => {
        const image = images[i];
        if (!image) return { missing: true };
        const rect = image.getBoundingClientRect();
        return { src: image.getAttribute('src'), lazySrc: image.getAttribute('data-lazy-src'), complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight };
      }, index).catch(stateError => ({ stateError: String(stateError) }));
      throw new Error(`사진 ${index + 1}/${count} 로딩 확인 실패: ${JSON.stringify(state)}`, { cause: error });
    }
  }
  return page.evaluate(() => {
    const text = e => e.textContent.replace(/\u200b/g, '').trim();
    return {
      title: text(document.querySelector('.se-documentTitle .se-text-paragraph')),
      text: [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')].map(text).filter(Boolean),
      links: [...document.querySelectorAll('.se-component:not(.se-documentTitle) a[href], .se-component:not(.se-documentTitle) .se-link[data-href]')].map(a => ({ text: text(a), href: a.getAttribute('href') ?? a.getAttribute('data-href') })),
      dividers: document.querySelectorAll('.se-component.se-horizontalLine').length,
      flow: [...document.querySelectorAll('.se-component:not(.se-documentTitle)')].map(c => {
        if (c.classList.contains('se-image')) {
          const image = c.querySelector('img.se-image-resource');
          return { kind: 'image', src: image?.getAttribute('data-lazy-src') || image?.getAttribute('src') || '' };
        }
        if (c.classList.contains('se-imageStrip')) return { kind: 'imageStrip', sources: [...c.querySelectorAll('img.se-image-resource')].map(image => image.getAttribute('data-lazy-src') || image.getAttribute('src') || ''),
          captions: [...c.querySelectorAll('.se-caption .se-text-paragraph')].map(text).filter(Boolean) };
        return { kind: [...c.classList].filter(name => name !== 'se-component' && !/^(se-is-|se-l-)/.test(name)).sort().join(' '),
          paragraphs: [...c.querySelectorAll('.se-text-paragraph')].map(text).filter(Boolean),
          links: [...c.querySelectorAll('a[href], .se-link[data-href]')].map(a => ({ text: text(a), href: a.getAttribute('href') ?? a.getAttribute('data-href') })) };
      }),
      images: [...document.querySelectorAll('.se-component.se-image, .se-component.se-imageStrip')].flatMap(c => [...c.querySelectorAll('img.se-image-resource')].map((img, index) => {
        const strip = c.classList.contains('se-imageStrip');
        const rect = img.getBoundingClientRect();
        return { id: strip ? `${c.id}::${index}` : c.id, componentKind: strip ? 'imageStrip' : 'image', src: img?.getAttribute('data-lazy-src') || img?.getAttribute('src') || '', width: img?.getAttribute('width'), height: img?.getAttribute('height'), displayWidth: rect.width, displayHeight: rect.height, naturalWidth: img?.naturalWidth, naturalHeight: img?.naturalHeight, align: c.querySelector('.se-section')?.className.match(/se-section-align-\w+/)?.[0] ?? null,
          caption: [...c.querySelectorAll('.se-caption .se-text-paragraph')].map(p => { const clone = p.cloneNode(true); clone.querySelectorAll('.se-placeholder').forEach(e => e.remove()); return text(clone); }).filter(Boolean),
          representative: Boolean(c.querySelector('button.se-set-rep-image-button.se-is-selected')) };
      })),
    };
  });
}

async function validateFile(target) {
  const bytes = fs.readFileSync(target.asset.local_file);
  if (hash(bytes) !== target.asset.sha256) throw new Error(`검수 후 이미지 파일이 달라졌다: ${target.curator.slug}`);
  const meta = await sharp(bytes).metadata();
  if (!['png', 'jpeg', 'webp'].includes(meta.format) || meta.pages > 1 || meta.width !== target.asset.width || meta.height !== target.asset.height) throw new Error(`업로드 이미지 형식·크기가 다르다: ${target.curator.slug}`);
  return bytes;
}

export async function uploadFile(target, dir) {
  const bytes = await validateFile(target);
  const { format } = await sharp(bytes).metadata();
  const name = `${target.curator.name} 로고-${target.marker}`.replace(/[\\/:*?"<>|]/g, '');
  const file = path.join(dir, `${name}.${format === 'png' ? 'png' : 'jpg'}`);
  if (format === 'png' || format === 'jpeg') {
    // 검수된 PNG/JPEG는 확장자만 실제 형식에 맞추고 원본 바이트를 그대로 올린다.
    if (!fs.existsSync(file)) fs.writeFileSync(file, bytes, { flag: 'wx' });
    if (hash(fs.readFileSync(file)) !== target.asset.sha256) throw new Error('업로드 복사본이 검수 원본과 다르다');
  } else if (!fs.existsSync(file)) {
    // 기존 WebP 자산의 호환 경로. 사용자 개선본 PNG/JPEG에는 적용되지 않는다.
    await sharp(bytes).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toFile(file);
  }
  return file;
}

async function chooseImageFile(page, file, selector, uploaded, args) {
  const cdp = await page.createCDPSession();
  let chooser;
  try {
    await cdp.send('Page.enable');
    cdp.on('Page.fileChooserOpened', value => { chooser = value; });
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
    await page.click(selector);
    for (let i = 0; i < 40 && !chooser; i++) await wait(200);
    if (!chooser?.backendNodeId) throw new Error('사진 파일 선택창이 열리지 않았다');
    await cdp.send('DOM.setFileInputFiles', { files: [file], backendNodeId: chooser.backendNodeId });
    await page.waitForFunction(uploaded, { timeout: 45000 }, args);
  } finally {
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {});
    await cdp.detach().catch(() => {});
  }
}

async function replaceLogo(page, target, file, before) {
  const replaced = findReplacementImage(before, target.replacement, target.marker);
  await selectImage(page, replaced.id);
  // Booker 편집기에서 실측한 사진 교체 버튼. 없으면 삭제·재삽입으로 우회하지 않는다.
  const selector = 'button.se-image-replacement-toolbar-button[data-name="image-replacement"]';
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  const visible = await page.$$eval(selector, buttons => buttons.filter(b => b.offsetParent && !b.disabled).length);
  if (visible !== 1) throw new Error('선택한 사진의 교체 버튼이 하나가 아니다');
  await chooseImageFile(page, file, selector, ({ count, marker }) => {
    const images = [...document.querySelectorAll('.se-component.se-image img.se-image-resource, .se-component.se-imageStrip img.se-image-resource')];
    const added = images.filter(image => image.src.includes(marker));
    return images.length === count && added.length === 1 && added[0].complete && added[0].naturalWidth > 0 && added[0].naturalHeight > 0;
  }, { count: before.images.length, marker: target.marker });
  const snapshot = await readSnapshot(page);
  const added = snapshot.images.filter(image => image.src.includes(target.marker));
  if (added.length !== 1 || !added[0].id || snapshot.images.some(image => canonicalImageSource(image.src) === canonicalImageSource(replaced.src))) throw new Error('기존 로고가 새 로고 한 장으로 교체되지 않았다');
  await configureLogo(page, target, added[0].id);
  return added[0].id;
}

async function insertLogo(page, target, file, beforeIds) {
  const paragraph = '.se-component.se-text:not(.se-documentTitle) .se-text-paragraph';
  const first = await page.$(paragraph);
  if (!first) throw new Error('본문 첫 단락이 없다');
  const expected = await first.evaluate(p => p.textContent);
  const attempts = [];
  const readPoint = () => first.evaluate(p => {
    const point = { text: p.textContent, scrollX: window.scrollX, scrollY: window.scrollY, x: null, y: null, rect: null, hitInside: false };
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes.reverse()) {
      for (let offset = node.textContent.length - 1; offset >= 0; offset--) {
        if (/[\s\u200b]/.test(node.textContent[offset])) continue;
        // Range는 마지막 글자의 위치만 읽는다. 편집기 선택 상태를 직접 바꾸지 않는다.
        const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          point.x = rect.right - 0.1; point.y = rect.top + rect.height / 2;
          point.rect = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
          const hit = document.elementFromPoint(point.x, point.y);
          point.hitInside = Boolean(hit && p.contains(hit));
          point.hit = hit ? { tag: hit.tagName, className: hit.className } : null;
          return point;
        }
      }
    }
    return point;
  });
  const readCaret = () => page.evaluate(selector => {
    const p = document.querySelector(selector), selection = getSelection();
    const inside = Boolean(p && selection?.anchorNode && selection?.focusNode && p.contains(selection.anchorNode) && p.contains(selection.focusNode));
    const state = { text: p?.textContent, inside, collapsed: selection?.isCollapsed, head: null, tail: null };
    if (inside && selection.isCollapsed) {
      const head = document.createRange(); head.selectNodeContents(p); head.setEnd(selection.anchorNode, selection.anchorOffset);
      const tail = document.createRange(); tail.selectNodeContents(p); tail.setStart(selection.anchorNode, selection.anchorOffset);
      state.head = head.toString(); state.tail = tail.toString();
    }
    return state;
  }, paragraph);
  try {
    let placed = false;
    for (let attempt = 1; attempt <= 3 && !placed; attempt++) {
      const observed = { attempt, points: [], point: null, caretState: null };
      attempts.push(observed);
      await first.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
      let previous = null;
      for (let sample = 0; sample < 6; sample++) {
        const current = await readPoint(); observed.points.push(current);
        if (current.text !== expected) throw new Error('캐럿 위치를 확인하는 동안 첫 단락 본문이 바뀌었다. 이미지를 삽입하지 않는다');
        if (caretPointsStable(previous, current)) { observed.point = current; break; }
        previous = current;
        await wait(100);
      }
      if (observed.point) {
        await page.mouse.click(observed.point.x, observed.point.y);
        await wait(100);
      }
      observed.caretState = await readCaret();
      if (observed.caretState.text !== expected) throw new Error('실제 클릭 뒤 첫 단락 본문이 바뀌었다. 이미지를 삽입하지 않는다');
      if (!observed.point) continue;
      try { assertCaretAtParagraphEnd(expected, observed.caretState); placed = true; }
      catch (error) { observed.error = error.message; }
    }
    if (!placed) throw new Error('안정된 좌표로 3회 확인했으나 첫 단락 끝 캐럿을 확인하지 못했다. 이미지를 삽입하지 않는다');
  } catch (error) {
    const evidence = path.join(path.dirname(file), `caret-${target.post.logNo}.json`);
    const last = attempts.at(-1);
    if (last && !last.caretState) last.caretState = await readCaret().catch(() => null);
    fs.writeFileSync(evidence, JSON.stringify({ expected, attempts, error: error.message }, null, 2));
    throw new Error(`${error.message} (${evidence})`);
  } finally { await first.dispose(); }
  await chooseImageFile(page, file, '.se-toolbar-item-image button, .se-toolbar-item-image',
    count => document.querySelectorAll('.se-component.se-image').length === count + 1, beforeIds.length);
  const added = await page.$$eval('.se-component.se-image', (cs, ids) => cs.filter(c => !ids.includes(c.id)).map(c => c.id), beforeIds);
  if (added.length !== 1 || !added[0]) throw new Error('추가된 이미지 한 장을 식별하지 못했다');
  const id = added[0];
  await page.waitForFunction(({ id, marker }) => {
    const img = document.querySelector(`.se-component.se-image[id="${id}"] img.se-image-resource`);
    return img?.complete && img.naturalWidth > 0 && img.src.includes(marker);
  }, { timeout: 30000 }, { id, marker: target.marker });
  await configureLogo(page, target, id);
  return id;
}

export function caretPointsStable(previous, current) {
  if (!previous || !current || previous.hitInside !== true || current.hitInside !== true || previous.text !== current.text) return false;
  const coordinates = point => [point.x, point.y, point.scrollX, point.scrollY, point.rect?.left, point.rect?.right, point.rect?.top, point.rect?.bottom];
  const before = coordinates(previous), after = coordinates(current);
  return before.every((value, i) => Number.isFinite(value) && Number.isFinite(after[i]) && Math.abs(value - after[i]) <= 0.5);
}

export function assertCaretAtParagraphEnd(expected, state) {
  const clean = value => String(value ?? '').replace(/\u200b/g, '').trim();
  if (!clean(expected) || state?.inside !== true || state.collapsed !== true
    || clean(state.text) !== clean(expected) || clean(state.head) !== clean(expected) || clean(state.tail) !== '') {
    throw new Error('실제 클릭 뒤 캐럿이 첫 단락 끝에 있지 않다. 이미지를 삽입하지 않는다');
  }
}

async function configureLogo(page, target, id) {
  await selectImage(page, id);
  const width = Math.min(target.asset.width, 400);
  const size = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(e => e.offsetParent && /크기 변경 열기/.test(e.getAttribute('aria-label') || e.textContent)) ?? null);
  if (size.asElement()) {
    await size.asElement().click();
    const input = await page.waitForSelector('[class*=resizing-input] input, input[class*=resizing-input]', { visible: true, timeout: 5000 });
    await input.click({ clickCount: 3 }); await page.keyboard.type(String(width)); await page.keyboard.press('Enter');
  }
  await size.dispose();
  for (let i = 0; i < 4; i++) {
    if ((await readSnapshot(page)).images.find(image => image.id === id)?.align === 'se-section-align-center') break;
    await selectImage(page, id);
    const toggled = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button.se-context-toolbar-cycle-toggle-button')].find(e => e.offsetParent && /se-align-center/.test(e.className));
      if (!b) return false; b.click(); return true;
    });
    if (!toggled) throw new Error('사진 가운데 정렬 단추를 찾지 못했다');
    await wait(500);
  }
  const actual = (await readSnapshot(page)).images.find(image => image.id === id);
  assertLogoGeometry(actual, target.asset);
}

export function assertLogoGeometry(image, asset) {
  const maxWidth = Math.min(asset.width, 400);
  // height 속성은 auto일 때 없다. 실제 표시 높이는 레이아웃 사각형에서 읽어 검사한다.
  const dimensions = [Number(image?.width), image?.displayWidth, image?.displayHeight, image?.naturalWidth, image?.naturalHeight];
  if (dimensions.some(value => !Number.isFinite(value) || value <= 0)
    || !Number.isFinite(asset.width) || !Number.isFinite(asset.height) || asset.width <= 0 || asset.height <= 0
    || image.align !== 'se-section-align-center' || Number(image.width) > maxWidth + 1 || image.displayWidth > maxWidth + 1) throw new Error('새 사진의 가운데 정렬·유효한 표시 크기를 확인하지 못했다');
  const ratio = asset.width / asset.height;
  if (Math.abs(image.displayWidth - image.displayHeight * ratio) > 1
    || Math.abs(image.naturalWidth - image.naturalHeight * ratio) > 1) throw new Error('새 사진의 표시 또는 원본 비율이 제공 이미지와 다르다');
  return image;
}

async function selectImage(page, id) {
  const image = await page.$(`.se-component.se-image[id="${id}"] img.se-image-resource`);
  if (!image) throw new Error(`사진 컴포넌트가 없다: ${id}`);
  await image.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await image.click(); await wait(500); await image.dispose();
}

async function setRepresentative(page, id) {
  await selectImage(page, id);
  const selector = `.se-component.se-image[id="${id}"] button.se-set-rep-image-button`;
  // 선택 후 이 버튼이 나타나는지는 최초 --dry에서 실측한다. 없으면 저장하지 않는다.
  const button = await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  if (!(await button.evaluate(e => e.classList.contains('se-is-selected')))) await button.click();
  await page.waitForFunction(selector => document.querySelector(selector)?.classList.contains('se-is-selected')
    && document.querySelectorAll('.se-component.se-image button.se-set-rep-image-button.se-is-selected').length === 1, { timeout: 10000 }, selector);
  await button.dispose();
}

async function closePublishPanel(page, editor) {
  // publish_fold_btn은 설정만 접는다. publish_btn을 다시 눌러 사진 도구를 가리는 패널 전체를 닫는다.
  await page.waitForSelector('button[class*=confirm_btn]', { visible: true, timeout: 10000 });
  await editor.click('button[class*=publish_btn]');
  await page.waitForSelector('button[class*=confirm_btn]', { hidden: true, timeout: 10000 });
}

async function captureLogo(page, id, file) {
  await selectImage(page, id);
  await page.evaluate(() => window.scrollTo({ left: 0, top: window.scrollY, behavior: 'instant' }));
  await page.screenshot({ path: file });
}

export function replaceDraftImage(body, target, width) {
  const oldUrl = target.replacement?.draft_image_url;
  if (!oldUrl || !/^https?:\/\//.test(oldUrl)) throw new Error('로컬 원고의 교체할 이미지 URL을 지정해야 한다');
  const tokens = [...body.matchAll(/\[img:([^|\r\n]+)\|\d+\|([^\]\r\n]*)\]/g)];
  if (tokens.some(match => canonicalImageSource(match[1]) === canonicalImageSource(target.asset.original_url))) throw new Error('로컬 원고에 새 로고가 이미 있다. 중복 교체하지 않는다');
  const matches = tokens.filter(match => canonicalImageSource(match[1]) === canonicalImageSource(oldUrl));
  if (matches.length !== 1 || !/로고|logo/i.test(matches[0][2])) throw new Error('로컬 원고의 기존 로고 한 장을 확인하지 못했다');
  return body.replace(matches[0][0], `[img:${target.asset.original_url}|${width}|${target.curator.name} 로고]`);
}

function recordDraft(target, width, dir) {
  // 옛 블로그 글은 로컬 원고가 없다. 검증한 사진 교체 때문에 원고를 새로 만들지 않는다.
  if (target.draftBody === null && target.replacement) return;
  const file = path.join(ROOT, 'drafts.json');
  const raw = fs.readFileSync(file, 'utf8');
  const drafts = JSON.parse(raw);
  const matches = drafts.filter(d => String(d.logNo) === String(target.post.logNo));
  if (matches.length !== 1) throw new Error('저장은 됐으나 원고 기록이 없거나 중복이다');
  const draft = matches[0];
  const token = `[img:${target.asset.original_url}|${width}|${target.curator.name} 로고]`;
  if (!target.replacement && draft.body.includes(token)) return;
  if (draft.body !== target.draftBody) throw new Error('저장은 됐으나 작업 도중 로컬 원고가 바뀌었다. 원고 기록을 덮어쓰지 않는다');
  fs.writeFileSync(path.join(dir, `drafts-before-${target.post.logNo}.json`), raw, { flag: 'wx' });
  if (target.replacement) draft.body = replaceDraftImage(draft.body, target, width);
  else { const lines = draft.body.split('\n'); lines.splice(1, 0, token); draft.body = lines.join('\n'); }
  fs.writeFileSync(file, JSON.stringify(drafts, null, 2) + '\n');
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
  const replacements = options.replaceMap ? JSON.parse(fs.readFileSync(options.replaceMap, 'utf8')) : null;
  const targets = selectTargets(options.ids, read('posts.json'), read('drafts.json'), JSON.parse(fs.readFileSync(options.inventory, 'utf8')), read('_blog-institution-images.json'), replacements);
  for (const target of targets) await validateFile(target);
  if (options.prepareOnly) {
    console.log(JSON.stringify({ result: 'files-and-targets-checked', browserOpened: false, targets: targets.map(t => ({ logNo: t.post.logNo, curator: t.curator.slug, file: t.asset.local_file, marker: t.marker, replacement: t.replacement })) }));
    return;
  }
  const dir = path.join(os.tmpdir(), 'naver-blog', `images_awards-${Date.now()}`); fs.mkdirSync(dir, { recursive: true });
  const report = path.join(dir, 'results.jsonl');
  const log = row => { fs.appendFileSync(report, JSON.stringify(row) + '\n'); console.log(JSON.stringify(row)); };
  // 모듈 import / --prepare-only / 순수 검증 테스트는 브라우저를 열지 않는다.
  const { getBrowser } = await import('./lib/browser.mjs');
  const { browser, launched } = await getBrowser({ protocolTimeout: 45000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  let step = '', current, saved = false;
  page.on('dialog', d => { if (d.type() === 'beforeunload') d.accept().catch(() => {}); else { log({ dialog: d.type(), message: d.message() }); d.dismiss().catch(() => {}); } });
  const editor = createExistingEditor(page, { onStep: s => { step = s; } });
  try {
    for (const target of targets) {
      current = target.post.logNo; saved = false;
      const initial = await editor.openTarget(target.post);
      await assertPublishOptions(page);
      await closePublishPanel(page, editor);
      const before = await readSnapshot(page);
      assertLoadedImages(before.images);
      fs.writeFileSync(path.join(dir, `before-${current}.json`), JSON.stringify({ ...initial, snapshot: before }, null, 2));
      const existing = before.images.filter(i => i.src.includes(target.marker));
      if (existing.length > 1) throw new Error('동일 기관 이미지가 이미 두 장 이상 있다');
      if (!existing.length && target.draftBody?.includes(`[img:${target.asset.original_url}|`)) throw new Error('로컬 원고에는 기관 이미지가 있는데 실제 원본을 찾지 못했다. 중복 삽입하지 않는다');
      const replaced = target.replacement ? findReplacementImage(before, target.replacement, target.marker) : null;
      step = replaced ? 'replace-institution-image' : 'insert-institution-image';
      const imageId = replaced ? await replaceLogo(page, target, await uploadFile(target, dir), before)
        : existing[0]?.id ?? await insertLogo(page, target, await uploadFile(target, dir), before.images.filter(i => i.componentKind === 'image').map(i => i.id));
      step = 'select-representative';
      await setRepresentative(page, imageId);
      const ready = await readSnapshot(page);
      const readySnapshot = path.join(dir, `ready-${current}.json`);
      fs.writeFileSync(readySnapshot, JSON.stringify({ snapshot: ready, state: initial.state, reservation: initial.reservation, sourceSha256: target.asset.sha256 }, null, 2));
      const change = { added: !existing.length, replacement: target.replacement };
      const logo = assertImageChange(before, ready, target.marker, change);
      assertLogoGeometry(logo, target.asset);
      await editor.click('button[class*=publish_btn]');
      await assertPublishOptions(page);
      if (!equal(initial.state, await editor.settings())) throw new Error('카테고리·예약·검색·공유 등 발행 설정이 바뀌었다');
      log({ logNo: current, stage: 'ready', added: !replaced && !existing.length, replaced: replaced?.src ?? null, contentPreserved: true, optionsPreserved: true, representative: logo.src, readySnapshot });
      if (!options.apply) {
        await closePublishPanel(page, editor);
        const screenshot = path.join(dir, `dry-${current}.png`); await captureLogo(page, imageId, screenshot);
        log({ logNo: current, result: 'dry-unsaved', screenshot });
        continue;
      }
      step = 'save';
      await editor.click('button[class*=confirm_btn]');
      await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly=true'), { timeout: 30000 }, String(current));
      saved = true;
      const verified = await editor.openTarget(target.post);
      await assertPublishOptions(page);
      if (!equal(initial.state, verified.state) || !equal(initial.reservation, verified.reservation)) throw new Error('저장 후 발행 설정 또는 예약 목록이 달라졌다');
      await closePublishPanel(page, editor);
      const after = await readSnapshot(page);
      const reopenedLogo = assertImageChange(before, after, target.marker, change);
      assertLogoGeometry(reopenedLogo, target.asset);
      if (!equal(ready.images.map(imageIdentity), after.images.map(imageIdentity))) throw new Error('저장 전후 사진 원본·표시 상태가 달라졌다');
      const screenshot = path.join(dir, `saved-${current}.png`); await captureLogo(page, reopenedLogo.id, screenshot);
      step = 'record-local-draft'; recordDraft(target, Number(reopenedLogo.width), dir);
      log({ logNo: current, result: 'saved-and-reopened', representative: reopenedLogo.src, contentPreserved: true, originalImagesPreserved: true, optionsPreserved: true, reservation: verified.reservation, screenshot });
    }
    log({ complete: true, mode: options.apply ? 'apply' : 'dry', targets: targets.length, report });
  } catch (error) {
    const screenshot = path.join(dir, `failure-${current}.png`); await page.screenshot({ path: screenshot }).catch(() => {});
    log({ complete: false, logNo: current, step, saved, error: String(error), screenshot, report });
    throw error;
  } finally {
    await page.close().catch(() => {});
    if (launched) await browser.close(); else await browser.disconnect();
  }
}

export { readSnapshot, insertLogo, setRepresentative, captureLogo, closePublishPanel };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
