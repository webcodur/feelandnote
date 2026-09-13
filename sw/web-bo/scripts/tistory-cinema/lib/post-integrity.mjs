import { BLOG } from './browser.mjs';
import { requirePostId, assertPostIdentity } from './post-state.mjs';
import { PUBLICATION_REQUESTS, assertPageAvailable, pauseRequests, waitForAvailablePage } from './publication-requests.mjs';
import { readRepresentativeImage } from './representative-image.mjs';

const ORIGIN = `https://${BLOG}.tistory.com`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Tistory can reuse the spelling of an existing tag (e.g. "조지 C. 스콧" → "조지 c. 스콧").
const tagKey = (tag) => tag.normalize('NFC').trim().replace(/[A-Z]/g, (letter) => letter.toLowerCase());
export const sameTags = (expected, actual) => JSON.stringify(expected.map(tagKey).sort()) === JSON.stringify(actual.map(tagKey).sort());

export async function readEditorTags(page) {
  return page.evaluate(() => [...document.querySelectorAll('.editor_tag .txt_tag > a:not(.btn_delete)')].map((tag) => tag.textContent.trim().replace(/^#/, '')));
}

export async function writeEditorTags(page, expected) {
  if (!Array.isArray(expected) || expected.some((tag) => typeof tag !== 'string' || !tag.trim()) || new Set(expected.map(tagKey)).size !== expected.length) throw new Error('원고 태그가 비었거나 중복됐다.');
  const actual = await readEditorTags(page);
  const wantedKeys = new Set(expected.map(tagKey));
  const actualKeys = new Set(actual.map(tagKey));
  for (const tag of actual.filter((tag) => !wantedKeys.has(tagKey(tag)))) {
    await page.evaluate((wanted) => {
      const item = [...document.querySelectorAll('.editor_tag .txt_tag')].find((item) => item.querySelector('a:not(.btn_delete)')?.textContent.trim().replace(/^#/, '') === wanted);
      if (!item) throw new Error('제거할 태그를 찾지 못했다.');
      item.querySelector('.btn_delete').click();
    }, tag);
    await page.waitForFunction((removed) => ![...document.querySelectorAll('.editor_tag .txt_tag > a:not(.btn_delete)')].some((tag) => tag.textContent.trim().replace(/^#/, '') === removed), {}, tag);
  }
  for (const tag of expected.filter((tag) => !actualKeys.has(tagKey(tag)))) {
    await page.focus('#tagText');
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#tagText', tag);
    await page.keyboard.press('Enter');
    await page.waitForFunction((wanted) => [...document.querySelectorAll('.editor_tag .txt_tag > a:not(.btn_delete)')].some((tag) => tag.textContent.trim().replace(/^#/, '') === wanted), { timeout: 5000 }, tag);
  }
  const inserted = await readEditorTags(page);
  if (!sameTags(expected, inserted)) throw new Error(`태그 입력 불일치: ${JSON.stringify({ expected, actual: inserted })}`);
}

export async function hitVisible(page, selector, label) {
  const pos = await page.evaluate((q) => {
    const el = [...document.querySelectorAll(q)].find((node) => node.getClientRects().length);
    if (!el || el.disabled) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, selector);
  if (!pos) throw new Error(`${label}을 찾지 못했거나 비활성이다`);
  await page.mouse.click(pos.x, pos.y);
}

export async function loadEditor(page, postId) {
  const id = requirePostId({ id: postId });
  await page.goto(`${ORIGIN}/manage/post/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForAvailablePage(page, () => Boolean(document.querySelector('#post-title-inp')), { timeout: 40000, label: `#${id} 편집기` });
  const landedId = new URL(page.url()).pathname.match(/^\/manage\/(?:post|newpost)\/(\d+)\/?$/)?.[1];
  if (Number(landedId) !== id) throw new Error(`글 번호 ${id}의 편집기가 아니다: ${page.url()}`);
  await waitForAvailablePage(page, () => {
    const cm = [...document.querySelectorAll('.CodeMirror')].find((el) => el.getClientRects().length)?.CodeMirror;
    const body = document.querySelector('#editor-tistory_ifr')?.contentDocument?.body;
    const loaded = cm ? cm.getValue().trim() : body && (body.textContent.trim() || body.querySelector('img,iframe'));
    return Boolean(document.querySelector('#post-title-inp')?.value && loaded);
  }, { timeout: 30000, label: `#${id} 제목·본문` });
  return id;
}

export async function openPublishPanel(page) {
  const opened = await page.evaluate(() => Boolean(document.querySelector('#publish-btn')?.getClientRects().length));
  if (!opened) await hitVisible(page, '#publish-layer-btn', '완료 단추');
  await waitForAvailablePage(page, () => Boolean(document.querySelector('#publish-btn')?.getClientRects().length), { timeout: 15000, label: '발행 패널' });
  await wait(300);
}

export async function readPublishSettings(page) {
  const settings = await page.evaluate(() => {
    const visible = (selector) => [...document.querySelectorAll(selector)].find((el) => el.getClientRects().length);
    const date = visible('button.btn_reserve')?.textContent.trim() ?? null;
    const hour = visible('#dateHour')?.value ?? null;
    const minute = visible('#dateMinute')?.value ?? null;
    const address = document.querySelector('#urlPublish');
    const radios = [...document.querySelectorAll('input[type=radio]:checked')].filter((el) => /^open\d+$/.test(el.id));
    return {
      date, hour, minute, slug: address?.value ?? null,
      visibility: radios[0]?.id ?? null,
      category: (document.querySelector('#category-btn .mce-txt') ?? document.querySelector('#category-btn'))?.textContent.trim() ?? null,
      publishLabel: document.querySelector('#publish-btn')?.textContent.trim() ?? null,
    };
  });
  if (settings.slug === null) throw new Error('발행 패널의 글 주소를 읽지 못했다');
  if (!settings.visibility) throw new Error('발행 패널의 공개 상태를 읽지 못했다');
  let at = null;
  if (settings.date !== null || settings.hour !== null || settings.minute !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.date ?? '') || !/^\d{1,2}$/.test(settings.hour ?? '') || !/^\d{1,2}$/.test(settings.minute ?? '')) {
      throw new Error(`예약 시각을 완전히 읽지 못했다: ${JSON.stringify(settings)}`);
    }
    at = `${settings.date} ${settings.hour.padStart(2, '0')}:${settings.minute.padStart(2, '0')}`;
  }
  return { ...settings, at, status: at ? 'scheduled' : settings.visibility === 'open20' ? 'public' : 'private', url: settings.slug ? `${ORIGIN}/entry/${encodeURIComponent(settings.slug)}` : null };
}

/** Opens the saved editor and its settings panel without entering text or saving. */
export async function readPost(page, postId) {
  const id = await loadEditor(page, postId);
  const content = await page.evaluate(() => {
    const cm = [...document.querySelectorAll('.CodeMirror')].find((el) => el.getClientRects().length)?.CodeMirror;
    const body = document.querySelector('#editor-tistory_ifr')?.contentDocument?.body;
    return { title: document.querySelector('#post-title-inp')?.value ?? '', html: cm ? cm.getValue() : body?.innerHTML ?? null };
  });
  if (content.html === null) throw new Error(`#${id} 본문을 읽지 못했다`);
  await openPublishPanel(page);
  return { id, ...content, tags: await readEditorTags(page), ...await readPublishSettings(page), representativeImage: await readRepresentativeImage(page), editorUrl: page.url() };
}

/** Pure DOM extraction, also run in an isolated blank browser by regression tests. */
export function contentSnapshot(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript').forEach((el) => el.remove());
  const norm = (value) => (value ?? '').normalize('NFC').replace(/[\s\u200b\ufeff]+/g, '');
  const urlOf = (raw, image = false) => {
    if (!raw) return '';
    try {
      const url = new URL(raw, 'https://feelandnote-cinema.tistory.com');
      // The proxy itself declares the original URL. Unknown rehosting stays unequal.
      if (image && /(^|\.)daumcdn\.net$/.test(url.hostname) && /^\/thumb\//.test(url.pathname)) {
        const original = url.searchParams.get('fname');
        if (original && /^https?:\/\//.test(original)) return new URL(original).href;
      }
      return url.href;
    } catch { return raw.trim(); }
  };
  return {
    text: norm(doc.body.textContent),
    quotes: [...doc.querySelectorAll('blockquote')].map((el) => norm(el.textContent)).filter(Boolean),
    links: [...doc.querySelectorAll('a[href]')].map((el) => ({ text: norm(el.textContent), href: urlOf(el.getAttribute('href')) })),
    images: [...doc.querySelectorAll('img')].map((el) => ({ src: urlOf(el.getAttribute('src'), true), alt: norm(el.getAttribute('alt')) })),
    iframes: [...doc.querySelectorAll('iframe')].map((el) => ({ src: urlOf(el.getAttribute('src')), srcdoc: el.getAttribute('srcdoc') ?? '' })),
  };
}

export function compareSnapshots(expected, actual) {
  const issues = [];
  const preview = (value) => typeof value === 'string' ? value.slice(0, 180) : value ?? null;
  for (const field of ['text', 'quotes', 'links', 'images', 'iframes']) {
    if (JSON.stringify(expected[field]) === JSON.stringify(actual[field])) continue;
    if (field === 'text') {
      let index = 0;
      while (index < expected.text.length && expected.text[index] === actual.text[index]) index++;
      issues.push({ field, index, expected: expected.text.slice(Math.max(0, index - 40), index + 140), actual: actual.text.slice(Math.max(0, index - 40), index + 140) });
    } else {
      const length = Math.max(expected[field].length, actual[field].length);
      for (let index = 0; index < length; index++) {
        if (JSON.stringify(expected[field][index]) !== JSON.stringify(actual[field][index])) issues.push({ field, index, expected: preview(expected[field][index]), actual: preview(actual[field][index]) });
      }
    }
  }
  const count = (snapshot) => Object.fromEntries(Object.entries(snapshot).map(([key, value]) => [key, value.length]));
  return { ok: issues.length === 0, issues, counts: { expected: count(expected), actual: count(actual) } };
}

export async function compareHtml(page, expected, actual) {
  const snapshots = await Promise.all([page.evaluate(contentSnapshot, expected), page.evaluate(contentSnapshot, actual)]);
  return compareSnapshots(...snapshots);
}

export function mapPostIdentities(posts, found, metaTitles = {}) {
  const mapped = []; const used = new Set();
  for (const post of posts) {
    const titles = new Set([post.title, metaTitles[post.name]].filter(Boolean).map((title) => title.trim()));
    const matches = found.filter((row) => titles.has(row.title?.trim()));
    if (matches.length !== 1) throw new Error(`${post.name}: 전체 제목으로 유일하게 대응되지 않는다(${matches.length}건)`);
    const row = matches[0]; const id = requirePostId(row);
    if (used.has(id)) throw new Error(`실제 ID ${id}에 원고가 둘 이상 대응한다`);
    assertPostIdentity({ ...post, id }, row.title, metaTitles[post.name]);
    used.add(id); mapped.push({ ...post, id });
  }
  return mapped;
}

/** Read a page of real links; this result is never presented as a complete inventory. */
async function* managedPages(page, { fromCurrent = false, pause = (ms) => pauseRequests(page, ms) } = {}) {
  const isList = (value) => { const url = new URL(value); return url.origin === ORIGIN && /^\/manage\/posts\/?$/.test(url.pathname); };
  const pageKey = (value) => {
    const url = new URL(value); url.pathname = '/manage/posts/';
    for (const [key, defaultValue] of [['category', '-3'], ['visibility', 'all'], ['searchKeyword', ''], ['searchType', 'title']]) {
      if (url.searchParams.get(key) === defaultValue) url.searchParams.delete(key);
    }
    if (!url.searchParams.has('page')) url.searchParams.set('page', '1');
    url.searchParams.sort();
    return url.href;
  };
  const reuseCurrent = fromCurrent && isList(page.url());
  const queue = [reuseCurrent ? page.url() : `${ORIGIN}/manage/posts/`]; const visited = new Set();
  while (queue.length) {
    const url = queue.shift();
    if (visited.has(pageKey(url))) continue;
    if (visited.size >= 100) throw new Error('관리 목록이 100페이지를 넘는다. 전체 목록 확인을 중단했다');
    if (visited.size) await pause(PUBLICATION_REQUESTS.listPageMs);
    if (!(reuseCurrent && !visited.size)) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    visited.add(pageKey(url));
    await assertPageAvailable(page);
    if (!isList(page.url())) throw new Error(`관리 글 목록이 아니다: ${page.url()}`);
    await waitForAvailablePage(page, () => [...document.querySelectorAll('a[href]')].some((anchor) => /^\/manage\/post\/\d+\/?$/.test(new URL(anchor.href).pathname)), { timeout: 30000, label: '관리 글 목록의 실제 ID 링크' });
    if (!isList(page.url())) throw new Error(`관리 글 목록에서 다른 화면으로 이동했다: ${page.url()}`);
    const data = await page.evaluate(() => {
      const anchors = [...document.querySelectorAll('a[href]')];
      const rows = anchors.flatMap((anchor) => {
        const url = new URL(anchor.href); const match = url.pathname.match(/^\/manage\/post\/(\d+)\/?$/);
        if (!match || url.origin !== location.origin) return [];
        const row = anchor.closest('li, tr, .item_post') ?? anchor.parentElement;
        const titleLink = row?.querySelector('.link_title, .tit_post a, a.link_post, .title a');
        const titleNode = titleLink ?? row?.querySelector('.tit_post, .title') ?? anchor;
        const title = titleNode?.getAttribute('title') ?? titleNode?.textContent.trim() ?? '';
        const publicLink = [...(row?.querySelectorAll('a[href]') ?? [])].find((el) => {
          const u = new URL(el.href); return u.origin === location.origin && /^\/(entry\/|\d+\/?$)/.test(u.pathname);
        });
        return [{ id: Number(match[1]), title, editUrl: anchor.href, url: publicLink?.href ?? null, status: row?.querySelector('.info_status, .txt_state, .txt_status, .state_post')?.textContent.trim() ?? null, listText: row?.textContent.replace(/\s+/g, ' ').trim() ?? '' }];
      });
      const pages = [...document.querySelectorAll('.wrap_paging a[href]')].map((anchor) => new URL(anchor.href)).filter((url) => url.origin === location.origin && /^\/manage\/posts\/?$/.test(url.pathname) && /^\d+$/.test(url.searchParams.get('page') ?? '')).map((url) => url.href);
      return { rows, pages: [...new Set(pages)] };
    });
    yield data;
    for (const next of data.pages) if (!visited.has(pageKey(next))) queue.push(next);
  }
}

/** Exhaust every actual pagination link before returning a complete inventory. */
export async function listManagedPosts(page, options) {
  const found = new Map();
  for await (const data of managedPages(page, { ...options, fromCurrent: false })) {
    for (const row of data.rows) {
      const previous = found.get(row.id);
      if (previous && previous.title !== row.title) throw new Error(`관리 목록의 #${row.id} 제목이 페이지마다 다르다`);
      found.set(row.id, row);
    }
  }
  return [...found.values()].sort((left, right) => left.id - right.id);
}

/** After saving, locate the real ID in the landed list; read more pages only if needed. */
export async function findManagedPost(page, title, options = {}) {
  const head = (value) => String(value ?? '').split(' | ')[0].trim();
  for await (const data of managedPages(page, { ...options, fromCurrent: true })) {
    const matches = new Map();
    for (const row of data.rows.filter((row) => head(row.title) === head(title))) {
      const previous = matches.get(row.id);
      if (previous && previous.title !== row.title) throw new Error(`관리 목록의 #${row.id} 제목이 다르다`);
      matches.set(row.id, row);
    }
    if (matches.size > 1) throw new Error(`저장 후 같은 제목의 서버 글이 여러 개다: ${title}`);
    if (matches.size === 1) return [...matches.values()][0];
  }
  throw new Error(`저장 후 실제 서버 글 번호를 찾지 못했다: ${title}`);
}
