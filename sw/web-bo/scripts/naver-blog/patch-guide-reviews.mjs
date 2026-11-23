// 기관 안내서 글에서 바뀐 감상 문단만 갈아 끼운다. 본문을 비우고 다시 쓰지 않는다(26.11.17 사용자 지시).
// 조립해 둔 글(<글번호>-article.json)과 편집기의 현재 글을 「…의 감상」~「감상 근거」 구획끼리 견주어, 감상 문단이 다른 구획만 바꾼다.
// 감상자가 바뀐 구획(이름 줄·합친 사진·근거 링크가 달라진다)은 다루지 않는다. 그런 글은 apply-unified-article.mjs로 통째로 다시 쓴다.
// 제목·사진·링크·다른 글·예약·발행 설정은 그대로여야 저장한다. 방식은 인물 글의 replace-reviews.mjs와 같다.
// --article=<조립본 JSON 절대경로> [--apply]   (sw/web-bo에서. --apply가 없으면 편집기에서 바꿔 보기만 하고 저장하지 않는다)
import fs from 'node:fs'; import path from 'node:path';
import {ASSETS} from '../blog-assets.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';
import {readSnapshot, closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {formattedPlainText, quoteCarries, BODY_STYLE_VERSION, NAVER_REVIEW_INLINE_COLOR} from './lib/formatted-text.mjs';
import {UNIFIED_ARTICLE} from './lib/unified-article.mjs';
import {fragment} from './apply-unified-article.mjs';
import {EDITOR_SELECTOR, openTarget} from './restyle-body.mjs';
import {textsDigest, articleTexts} from './lib/body-baseline.mjs';

const REGISTRY = path.join(ASSETS, 'naver-blog/posts.json');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8')), same = (a, b) => JSON.stringify(a) === JSON.stringify(b), sleep = ms => new Promise(r => setTimeout(r, ms));
// 서식 목록은 본문 문단만 읽는다. EDITOR_SELECTOR는 사진 설명문(표지 밑 「YES24에서 보기」, 관련 이미지 설명)까지 담아 글줄 목록과 어긋난다.
const BODY_SELECTOR = '.se-component.se-text:not(.se-documentTitle) .se-text-paragraph';
const flow = s => s.flow.flatMap(f => f.kind === 'se-text' ? f.paragraphs.map(text => ({kind: 'text', text})) : f.kind === 'se-horizontalLine' ? [{kind: 'divider'}] : f.kind === 'image' ? [{kind: 'image', src: f.src}] : [{kind: f.kind}]);
const stable = ps => ps.map(({text, align, sizes, weights, colors, backgrounds}) => ({text, align, sizes, weights, colors, backgrounds}));
const HEAD = t => t.endsWith('의 감상'), END = t => t === '감상 근거';
// 글줄 목록에서 감상 구획을 찾는다: 「…의 감상」 다음 줄부터 「감상 근거」 앞까지.
// isReview(줄 번호별 참·거짓)를 주면 구획의 시작을 「감상 근거」 바로 위로 이어진 감상 문단(초록·왼쪽 정렬)의 첫 줄로 잡는다.
// 이름 줄이 제목 아래로 올라가 감상 글 바로 앞에 머리 줄이 없는 글(26.11.18 배치)과 예전 배치를 함께 읽는다.
export function guideSections(texts, isReview = null) {
  const out = [];
  for (let i = 0; i < texts.length; i++) { if (!HEAD(texts[i])) continue; const end = texts.findIndex((t, j) => j > i && END(t)); if (end < 0) throw Error('감상 구획에 근거 링크가 없다: ' + texts[i]);
    // 제목 아래에도 같은 「…의 감상」 줄이 있다(26.11.18). 근거 링크 앞에 머리 줄이 또 나오면 뒤쪽이 감상 구획의 머리다.
    if (texts.some((t, j) => j > i && j < end && HEAD(t))) continue;
    let start = i + 1; if (isReview) { start = end; while (start - 1 > i && isReview[start - 1]) start--; if (start === end) throw Error('감상 문단을 찾지 못했다: ' + texts[i]); }
    out.push({head: texts[i], start, end, paragraphs: texts.slice(start, end)}); }
  return out;
}

export async function patchGuideReviews(file, {apply = false} = {}) {
  const article = read(file), dir = path.join(path.dirname(file), article.logNo + '-patch-' + Date.now());
  const ops = article.operations.filter(o => ['text', 'link'].includes(o.kind) && !o.quote).map(o => ({...o, plain: o.formattedText ? formattedPlainText(o.text) : o.text}));
  const GREEN = UNIFIED_ARTICLE.reviewColor.toLowerCase(), toRgb = hex => 'rgb(' + hex.toLowerCase().slice(1).match(/../g).map(v => parseInt(v, 16)).join(', ') + ')', rgb = toRgb(GREEN);
  // 감상 문단 안의 책 제목은 더 짙은 초록으로 칠한다(service-inline-bold-1). 그 색이 섞여도 감상 문단이다.
  const reviewRgb = new Set([rgb, toRgb(NAVER_REVIEW_INLINE_COLOR)]);
  const want = guideSections(ops.map(o => o.plain), ops.map(o => o.kind === 'text' && String(o.color ?? '').toLowerCase() === GREEN && o.align === 'left')).map(s => ({...s, ops: ops.slice(s.start, s.end), href: ops[s.end].href}));
  const posts = read(REGISTRY), post = posts.find(p => String(p.logNo) === String(article.logNo) && p.kind === 'curated' && ['ok', 'check'].includes(p.link)); if (!post) throw Error('기관 글을 원장에서 못 찾았다: ' + article.logNo);
  fs.mkdirSync(dir, {recursive: true});
  const {browser, launched} = await getBrowser({background: true, protocolTimeout: 60000});
  await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com', ['clipboard-read', 'clipboard-sanitized-write']);
  const page = await browser.newPage(); page.on('dialog', d => (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}));
  const focus = await page.createCDPSession(); await focus.send('Emulation.setFocusEmulationEnabled', {enabled: true});
  let saved = false;
  try {
    await page.setViewport({width: 1440, height: 1700}); const editor = createExistingEditor(page), native = createEditorialEditor(page);
    const opened = await openTarget(page, post); await closePublishPanel(page, editor);
    const before = await readSnapshot(page), beforeStyle = await page.evaluate(readParagraphPresentation, BODY_SELECTOR), texts = flow(before).filter(o => o.kind === 'text').map(o => o.text);
    if (!same(beforeStyle.map(p => p.text), texts)) return {changed: false, needsFullRewrite: true, why: ['편집기 글줄과 서식 목록이 어긋난다']};
    const have = guideSections(texts, beforeStyle.map(p => p.align === 'left' && p.colors.length > 0 && p.colors.every(c => reviewRgb.has(c)))), sources = before.links.filter(l => l.text === '감상 근거').map(l => l.href);
    // 구획 수·이름 줄·근거 링크가 조립본과 같아야 부분 교체로 끝낼 수 있다. 다르면 감상자가 바뀐 것이다.
    const differ = have.length !== want.length ? ['구획 수 ' + have.length + ' → ' + want.length] : have.flatMap((s, k) => [s.head !== want[k].head && `이름 줄: ${s.head} → ${want[k].head}`, sources[k] !== want[k].href && `근거 링크(${s.head})`].filter(Boolean));
    if (differ.length) return {changed: false, needsFullRewrite: true, why: differ};
    const plan = have.map((s, k) => ({...s, next: want[k].ops.map(o => o.plain), ops: want[k].ops})).filter(s => !same(s.next, s.paragraphs));
    fs.writeFileSync(path.join(dir, 'before.json'), JSON.stringify({post, snapshot: before, style: beforeStyle, plan}, null, 2));
    if (!plan.length) return {changed: false};
    const replaced = new Set(plan.flatMap(s => s.paragraphs)), nth = (index, text) => texts.slice(0, index).filter(x => x === text).length;
    const copied = async () => { await page.evaluate(() => navigator.clipboard.writeText('')); await page.keyboard.down('Control'); await page.keyboard.press('KeyC'); await page.keyboard.up('Control'); await sleep(300); return (await page.evaluate(() => navigator.clipboard.readText())).replace(/​/g, '').trim(); };
    // 아래 구획부터 바꿔야 위 구획의 위치가 밀리지 않는다.
    for (const s of [...plan].reverse()) {
      await native.selectParagraph(s.paragraphs[0], {occurrence: nth(s.start, s.paragraphs[0])});
      if (s.paragraphs.length > 1) {
        const tail = await page.evaluate(({selector, text, occurrence}) => {
          const ps = [...document.querySelectorAll(selector)].filter(p => p.textContent.replace(/​/g, '').trim() === text); if (!ps[occurrence]) throw Error('Last review paragraph missing');
          const p = ps[occurrence]; p.scrollIntoView({block: 'center', behavior: 'instant'}); const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), ns = []; while (w.nextNode()) if (w.currentNode.textContent.replace(/​/g, '').length) ns.push(w.currentNode);
          const n = ns.at(-1); let end = n.length; while (n.textContent[end - 1] === '​') end--; const r = document.createRange(); r.setStart(n, end - 1); r.setEnd(n, end); const b = r.getBoundingClientRect(); if (b.top < 125 || b.bottom > innerHeight - 20) throw Error('Review end is outside viewport'); return {x: b.right - 1, y: b.top + b.height / 2};
        }, {selector: EDITOR_SELECTOR, text: s.paragraphs.at(-1), occurrence: nth(s.start + s.paragraphs.length - 1, s.paragraphs.at(-1))});
        await page.keyboard.down('Shift'); try { await page.mouse.click(tail.x, tail.y); } finally { await page.keyboard.up('Shift'); } await sleep(200);
      }
      const selected = (await copied()).split(/\r?\n/).map(t => t.trim()).filter(Boolean);
      if (!same(selected, s.paragraphs)) throw Error('고른 범위가 옛 감상 구획과 다르다: ' + s.head);
      // 첫 문단 앞의 빈 줄은 편집기에 그대로 남으므로 붙여 넣는 쪽에서는 둘째 문단부터 빈 줄을 둔다.
      const carries = quoteCarries(s.ops.map(o => o.text)), paste = s.ops.map((o, i) => ({...o, gapBefore: i > 0, ...(carries[i] && !o.quoteCarry ? {quoteCarry: carries[i]} : {})}));
      const html = fragment(paste); await page.evaluate(async html => { const text = new DOMParser().parseFromString(html, 'text/html').body.textContent; await navigator.clipboard.write([new ClipboardItem({'text/html': new Blob([html], {type: 'text/html'}), 'text/plain': new Blob([text], {type: 'text/plain'})})]); }, html);
      await page.keyboard.down('Control'); await page.keyboard.press('KeyV'); await page.keyboard.up('Control'); await sleep(500);
      for (const text of s.next) await native.alignLeft(text);
    }
    await page.keyboard.press('Escape');
    const expected = [...texts]; for (const s of [...plan].reverse()) expected.splice(s.start, s.end - s.start, ...s.next);
    const added = new Set(plan.flatMap(s => s.next));
    const check = async () => {
      const current = await readSnapshot(page), style = await page.evaluate(readParagraphPresentation, BODY_SELECTOR), now = flow(current).filter(o => o.kind === 'text').map(o => o.text);
      if (current.title !== before.title || !same(current.links, before.links) || current.dividers !== before.dividers || !same(now, expected)) throw Error('제목·글 순서·링크·구분선이 달라졌다');
      const identity = images => images.map(({displayWidth, displayHeight, ...im}) => im); if (!same(identity(current.images), identity(before.images))) throw Error('사진이 달라졌다');
      if (!same(stable(style.filter(p => !added.has(p.text))), stable(beforeStyle.filter(p => !replaced.has(p.text))))) throw Error('바꾼 감상 밖의 글 모양이 달라졌다');
      // 새 감상 문단은 옛 감상 문단과 같은 모양(크기·굵기·색·정렬)이어야 한다.
      const model = beforeStyle.find(p => replaced.has(p.text)), shape = p => ({align: p.align, sizes: [...new Set(p.sizes)].sort(), weights: [...new Set(p.weights.map(w => w >= 600 ? 'bold' : 'normal'))]});
      for (const sec of plan) for (const [i, text] of sec.next.entries()) { const p = style.find(x => x.text === text); if (!p || p.align !== 'left' || (i > 0 && !p.separated)) throw Error('감상 문단 배치가 다르다: ' + text.slice(0, 40)); if (model && (!same(shape(p).sizes, shape(model).sizes) || !same(shape(p).weights, shape(model).weights))) throw Error('감상 문단 글자 크기·굵기가 옛 감상과 다르다: ' + text.slice(0, 40) + ' ' + JSON.stringify({now: {sizes: p.sizes, weights: p.weights, colors: p.colors}, model: {text: model.text.slice(0, 20), sizes: model.sizes, weights: model.weights, colors: model.colors}})); }
      return style;
    };
    await check(); await page.screenshot({path: path.join(dir, 'editor-ready.png')});
    if (!apply) return {changed: false, dryRun: true, sections: plan.map(s => s.head)};
    await editor.click('button[class*=publish_btn]'); await assertPublishOptions(page, {preserve: opened.state}); if (!same(await editor.settings(), opened.state)) throw Error('발행 설정이 달라졌다');
    await editor.click('button[class*=confirm_btn]'); await page.waitForFunction(id => location.href.includes('logNo=' + id) && location.href.includes('isAfterUpdateOnly=true'), {timeout: 30000}, post.logNo); saved = true;
    const reopened = await openTarget(page, post); await assertPublishOptions(page, {preserve: opened.state}); if (!same(reopened.state, opened.state) || !same(reopened.reservation, opened.reservation)) throw Error('저장 뒤 설정이나 예약이 달라졌다');
    await closePublishPanel(page, editor); await check();
    const all = read(REGISTRY), p = all.find(x => x.logNo === post.logNo); if (!p || p.title !== post.title) throw Error('원장의 글이 달라졌다');
    p.curatedGuide = {...p.curatedGuide, articleHash: article.articleHash, version: article.version, verifiedAt: new Date().toISOString(), reserved: !!reopened.reservation, via: 'patch-guide-reviews'};
    p.bodyStyle = {version: BODY_STYLE_VERSION, verifiedAt: new Date().toISOString(), ...textsDigest(articleTexts(article))};
    fs.writeFileSync(REGISTRY + '.tmp', JSON.stringify(all, null, 2)); fs.renameSync(REGISTRY + '.tmp', REGISTRY);
    return {changed: true, sections: plan.map(s => s.head), reserved: Boolean(reopened.reservation)};
  } catch (error) { await page.screenshot({path: path.join(dir, 'failure.png')}).catch(() => {}); error.saved = saved; throw error; }
  finally { await focus.detach().catch(() => {}); await page.close().catch(() => {}); await browser.defaultBrowserContext().clearPermissionOverrides().catch(() => {}); if (launched) await browser.close(); else await browser.disconnect(); }
}

if (process.argv[1]?.endsWith('patch-guide-reviews.mjs')) {
  const args = process.argv.slice(2), file = args.find(a => a.startsWith('--article='))?.slice(10), apply = args.includes('--apply');
  if (!file || !path.isAbsolute(file) || args.some(a => !a.startsWith('--article=') && a !== '--apply')) throw Error('사용: patch-guide-reviews.mjs --article=<조립본 JSON 절대경로> [--apply]');
  const result = await patchGuideReviews(file, {apply});
  console.log(JSON.stringify({event: 'done', logNo: read(file).logNo, ...result}));
}
