/**
 * 티스토리 「필앤노트 시네마」에 글을 올린다.
 *
 *   node scripts/tistory-cinema/publish.mjs --file "대부" --at "2026-09-07 09:00"
 *   위 명령은 미리보기다. --run 을 붙일 때만 예약한다. 즉시 공개는 --now --run 으로 명시한다.
 *
 * 본문은 **HTML 모드**로 통째로 넣는다. 네이버처럼 한 줄씩 치지 않으므로 글자가 빠지거나
 * 정렬이 어긋날 자리가 없다. 대신 모드 전환에 `confirm` 이 붙어 있어 대화상자 핸들러가
 * 필수다(`lib/browser.mjs`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn, BLOG, takeDialog } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic, assertScheduleUnique, hasActiveSchedule } from './lib/post-state.mjs';
import { validateAt, kindOf } from './lib/schedule.mjs';
import { categoryForMeta } from './lib/categories.mjs';
import { readPost, compareHtml, listManagedPosts, findManagedPost, writeEditorTags, sameTags } from './lib/post-integrity.mjs';
import { PUBLICATION_REQUESTS, assertPageAvailable, pauseRequests, waitForAvailablePage } from './lib/publication-requests.mjs';
import { setReservation } from './fill-body.mjs';
import { startChallengeSession, throwIfChallengeFailed } from './lib/challenge-session.mjs';
import { fileAnswerStream, challengeLogger } from './lib/challenge-file.mjs';
import { prepareRepresentativeImage, uploadRepresentativeImage, assertRepresentativeImage } from './lib/representative-image.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const STATE = path.join(DIR, '_posts.json');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** 티스토리 카테고리 이름. 관리 화면의 글자와 **정확히** 같아야 발행기가 고른다. */
const load = () => loadPosts(STATE);
const save = (v) => savePostsAtomic(STATE, v);

/** 보이는 요소를 좌표로 누른다. 숨은 click() 은 레이어가 안 열리는 일이 있다. */
async function hit(page, sel, label) {
  const pos = await page.evaluate((q) => {
    const b = [...document.querySelectorAll(q)].find((x) => x.offsetParent);
    if (!b) return null;
    b.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!pos) throw new Error(`${label}을 찾지 못했다`);
  await page.mouse.click(pos.x, pos.y);
}

/** 열린 메뉴에서 글자가 정확히 맞는 항목을 누른다(TinyMCE 메뉴는 span.mce-text 다). */
async function pickMenu(page, text, label) {
  const pos = await page.evaluate((t) => {
    const e = [...document.querySelectorAll('span.mce-text, span.mce-txt, li, a, button')]
      .find((x) => x.offsetParent && x.textContent.trim() === t);
    if (!e) return null;
    // 41개짜리 카테고리 목록의 끝(「- 영화제」)은 화면 밖에 있어 좌표 클릭이 빗나간다. 보이게 한 뒤 잰다.
    const target = e.closest('li, button, a') ?? e;
    target.scrollIntoView({ block: 'center' });
    const r = target.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, text);
  if (!pos) throw new Error(`${label}에서 「${text}」를 찾지 못했다`);
  await page.mouse.click(pos.x, pos.y);
}

/** 하위 메뉴는 '- 이름', 선택된 버튼은 '이름'으로 표시된다. */
export async function selectEditorCategory(page, meta, kind) {
  const category = categoryForMeta(meta, kind);
  await hit(page, '#category-btn', '카테고리 단추');
  await wait(1600);
  await pickMenu(page, `- ${category}`, '카테고리 목록');
  await wait(1200);
  const cat = await page.evaluate(() => document.querySelector('#category-btn .mce-txt')?.textContent.trim() ?? '');
  if (cat !== category) throw new Error(`카테고리가 안 잡혔다(현재 ${cat} / 기대 ${category})`);
}

export async function composeOne(page, cdp, name) {
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, `_meta-${name}.json`), 'utf8'));
  const html = fs.readFileSync(path.join(DIR, `_body-${name}.html`), 'utf8');
  const kind = kindOf(name);
  categoryForMeta(meta, kind);

  await page.bringToFront();
  await page.goto(`https://${BLOG}.tistory.com/manage/newpost/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForAvailablePage(page, () => Boolean(document.querySelector('#post-title-inp')), { timeout: 40000, label: '새 글 편집기' });
  await wait(4500);

  // 1) 카테고리
  await selectEditorCategory(page, meta, kind);

  // 2) 제목
  await page.evaluate((t) => {
    const el = document.querySelector('#post-title-inp');
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
    setter ? setter.call(el, t) : (el.value = t);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, meta.title);
  await wait(700);

  // 3) HTML 모드 — confirm 이 뜨고 dialog 핸들러가 받는다
  await hit(page, '#editor-mode-layer-btn-open', '모드 단추');
  await wait(1600);
  await pickMenu(page, 'HTML', '모드 목록');
  await wait(3500);

  /**
   * 4) 본문 — 🔴 **CodeMirror.setValue 로는 저장되지 않는다.**
   *
   *    티스토리 HTML 편집기는 `ReactCodemirror` 다. `setValue` 는 화면만 바꾸고 React state 를
   *    건드리지 않아, 저장할 때 빈 본문이 나간다. 26.09.05에 9편을 올렸는데 제목·카테고리·예약만
   *    남고 본문이 통째로 비어 있었다(getValue 로는 값이 보여서 성공한 줄 알았다).
   *    CodeMirror 안을 눌러 포커스를 준 뒤 CDP `Input.insertText` 로 **진짜 입력**을 넣는다.
   */
  const cmPos = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.CodeMirror')].find((e) => e.offsetParent);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + Math.min(14, r.height / 2) };
  });
  if (!cmPos) throw new Error('HTML 편집기를 찾지 못했다');
  await page.mouse.click(cmPos.x, cmPos.y);
  await wait(900);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await cdp.send('Input.insertText', { text: html });
  await wait(2500);
  const inserted = await page.evaluate(() => [...document.querySelectorAll('.CodeMirror')].find((e) => e.offsetParent)?.CodeMirror?.getValue() ?? '');
  const got = inserted.length;
  if (inserted.replace(/\r\n/g, '\n').trim() !== html.replace(/\r\n/g, '\n').trim()) throw new Error(`입력 본문이 원고와 다르다(${got}/${html.length})`);
  const how = `insertText ${got}자`;

  // 5) 태그
  await writeEditorTags(page, meta.tags);
  return { meta, kind, how };
}

/**
 * URL 슬러그. 제목을 그대로 쓰면 `|`·`·`·『』 가 주소에 박혀 지저분하고 공유할 때 깨진다.
 * 파이프 뒤 부제를 버리고 특수문자를 걷어 짧게 만든다. 한글 주소는 검색엔진이 디코드해 읽는다.
 */
function slugOf(title) {
  return title
    .split('|')[0]
    .replace(/[『』「」《》\[\]()·,.!?"'`~@#$%^&*+=/\:;<>{}]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** 발행 패널을 열고 공개·예약·주소를 잡은 뒤 발행한다. `at` 이 없으면 바로 낸다. */
export async function publishNow(page, title, at, { cover } = {}) {
  if (at) validateAt(at);
  takeDialog();
  await hit(page, '#publish-layer-btn', '완료 단추')
  await wait(3000)

  // 공개
  await page.evaluate(() => {
    const el = document.querySelector('#open20')
    ;(el?.closest('label') ?? el)?.click()
  })
  await wait(1200)
  const open = await page.evaluate(() => document.querySelector('#open20')?.checked)
  if (!open) throw new Error('공개를 고르지 못했다')

  // 주소
  await page.evaluate((s) => {
    const el = document.querySelector('#urlPublish')
    if (!el) return
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set
    setter ? setter.call(el, s) : (el.value = s)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, slugOf(title))
  await wait(600)

  if (at) {
    // 기존 글 수정과 같은 절차를 쓴다: 현재→예약 전환, 달력 대기, 날짜·시각 입력, 화면 재확인.
    await setReservation(page, at)
    console.log(`   예약 ${at}`)
  }

  if (!cover?.file) throw new Error('새 글의 대표이미지 원본이 준비되지 않았다.');
  const representativeImage = await uploadRepresentativeImage(page, cover.file);
  throwIfChallengeFailed(page);
  await assertPageAvailable(page);
  await hit(page, '#publish-btn', '발행 단추')

  /**
   * 🔴 **발행 단추를 눌렀다고 발행된 것이 아니다.**
   *
   * 예전에는 6초 기다린 뒤 현재 주소를 그대로 돌려주었다. 발행이 막히면 주소가
   * `/manage/newpost/` 에 머무는데 그것을 성공으로 적어 두었고, `_posts.json` 에 「예약됨」으로
   * 남은 글이 티스토리에는 없는 상태가 됐다(26.09.05 51번 「인물-오즈 야스지로」). 그 글은
   * 나중에 본문을 다시 밀 때마다 편집기를 못 찾아 세 번 연속 실패했다.
   *
   * 발행이 끝나면 티스토리는 **글 목록으로 되돌린다.** 그것을 성공 조건으로 삼는다.
   */
  const landed = () => /\/manage\/(posts|entry)/.test(page.url())
  let captchaSeen = false;
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline) {
    await wait(1000)
    throwIfChallengeFailed(page);
    await assertPageAvailable(page, { navigationPending: true });
    if (landed()) return { url: page.url(), representativeImage }
    const dialog = takeDialog();
    if (dialog && /하루|한도|실패|오류|초과/.test(dialog)) throw new Error(dialog);
    if (!captchaSeen && page.frames().some((f) => /dkaptcha/.test(f.url()))) {
      captchaSeen = true;
      console.log('캡차가 나타났다. 현재 화면의 인증이 끝날 때까지 이 글에서 기다린다. 자동 재클릭은 하지 않는다.');
    }
  }
  throw new Error(`발행 결과 미확인${captchaSeen ? ' · 캡차 대기 종료' : ''}. 재발행 전에 관리 목록을 대조해야 한다: ${page.url()}`)
}

/** An inventory belongs to this batch only; another execution always loads it afresh. */
export async function createPublisher(page, cdp, {
  recorded = load(), dir = DIR, list = listManagedPosts, findSaved = findManagedPost,
  compose = composeOne, publish = publishNow, read = readPost, compare = compareHtml,
  prepareCover = (name) => prepareRepresentativeImage(name, { dir }),
  pause = (ms) => pauseRequests(page, ms), log = console.log,
} = {}) {
  const head = (title) => String(title ?? '').split(' | ')[0].trim();
  const remote = await list(page);
  assertRemoteInventory(recorded, remote);
  const inventory = new Map(remote.map((row) => [row.id, row]));
  let started = false; let failed = false;
  return async (name, at) => {
    if (failed) throw new Error('실패한 발행 세션이다. 새 실행에서 전체 목록을 다시 확인해야 한다.');
    try {
      if (started) {
        log(`다음 글 시작 전 ${PUBLICATION_REQUESTS.betweenPostsMs / 1000}초 대기: ${name}`);
        await pause(PUBLICATION_REQUESTS.betweenPostsMs);
      }
      started = true;
      const meta = JSON.parse(fs.readFileSync(path.join(dir, `_meta-${name}.json`), 'utf8'));
      categoryForMeta(meta, kindOf(name));
      const html = fs.readFileSync(path.join(dir, `_body-${name}.html`), 'utf8');
      const matches = [...inventory.values()].filter((row) => head(row.title) === head(meta.title));
      if (matches.length > 1) throw new Error(`같은 제목의 서버 글이 여러 개다: ${name}`);
      let row = matches[0];
      const cover = await prepareCover(name);
      let uploadedImage;
      if (!row) {
        await compose(page, cdp, name);
        uploadedImage = (await publish(page, meta.title, at, { cover }))?.representativeImage;
        if (!uploadedImage) throw new Error('발행 시 대표이미지 업로드 식별값을 확인하지 못했다.');
        row = await findSaved(page, meta.title);
        if (!row) throw new Error(`저장 후 실제 서버 글 번호를 찾지 못했다: ${name}`);
        assertRemoteInventory([], [row]);
        if (inventory.has(row.id)) throw new Error(`새 글이 기존 서버 ID #${row.id}와 충돌한다: ${name}`);
      }
      const actual = await read(page, row.id);
      if (actual.id !== row.id) throw new Error(`재개방한 글 ID가 다르다: ${actual.id} / ${row.id}`);
      assertPublishedPost(actual, meta, name, at);
      const compared = await compare(page, html, actual.html);
      if (!compared.ok) throw new Error(`#${actual.id} 저장 본문 불일치: ${compared.issues.map((x) => x.field).join(', ')}`);
      assertRepresentativeImage(actual.representativeImage, uploadedImage);
      const verifiedSource = uploadedImage ? cover.source : recorded.find((post) => post.id === actual.id && post.representativeImage === actual.representativeImage)?.representativeSource ?? null;
      inventory.set(actual.id, { ...row, title: actual.title, url: actual.url });
      return { name, kind: kindOf(name), title: actual.title, id: actual.id, at: actual.at ?? null,
        url: actual.url, visibility: actual.visibility, at_iso: new Date().toISOString(),
        // 저장 후 대조를 통과한 분류를 sync-categories.mjs와 같은 형태로 남긴다.
        category: actual.category, categoryPath: meta.categoryPath ?? null,
        representativeImage: actual.representativeImage, representativeSource: verifiedSource, representativeVerifiedAt: new Date().toISOString() };
    } catch (error) {
      failed = true;
      throw error;
    }
  };
}

/** Standalone calls retain the full initial inventory and exact saved-post verification. */
export async function publishOne(page, cdp, name, at) {
  return (await createPublisher(page, cdp))(name, at);
}

export function assertPublishedPost(actual, meta, name, at) {
  if (actual.title?.trim() !== meta.title.trim()) throw new Error(`#${actual.id} 저장 제목 불일치: ${name}`);
  if ((actual.at ?? null) !== (at ?? null)) throw new Error(`#${actual.id} 저장 예약시각 불일치: ${actual.at} / ${at}`);
  if (actual.visibility !== 'open20') throw new Error(`#${actual.id} 공개 상태가 아니다: ${actual.visibility}`);
  if (actual.category !== categoryForMeta(meta, kindOf(name))) throw new Error(`#${actual.id} 카테고리 불일치: ${actual.category}`);
  if (!sameTags(meta.tags ?? [], actual.tags ?? [])) throw new Error(`#${actual.id} 저장 태그 불일치: ${name}`);
  const url = actual.url ? new URL(actual.url) : null;
  if (!url || url.hostname !== `${BLOG}.tistory.com` || !/^\/(entry\/|\d+\/?$)/.test(url.pathname)) {
    throw new Error(`#${actual.id} 실제 공개 주소를 확인하지 못했다.`);
  }
}

export function assertRemoteInventory(recorded, remote) {
  const head = (title) => String(title ?? '').split(' | ')[0].trim();
  const ids = new Set();
  for (const post of remote) {
    if (!Number.isSafeInteger(post.id) || post.id < 1 || ids.has(post.id) || !post.title?.trim() || /^(수정|편집|edit)$/i.test(post.title.trim())) {
      throw new Error('관리 글 목록의 번호·제목을 완전히 읽지 못했다. 신규 발행을 중단한다.');
    }
    ids.add(post.id);
  }
  for (const post of recorded) {
    const row = remote.find((item) => item.id === post.id);
    if (!row || !head(post.title) || head(row.title) !== head(post.title)) {
      throw new Error(`관리 목록에서 기존 #${post.id} ${post.name}을 확인하지 못했다. 신규 발행을 중단한다.`);
    }
  }
}

export function parsePublishArgs(argv) {
  const values = new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (['--run', '--now'].includes(arg)) values.set(arg, true);
    else if (['--file', '--at'].includes(arg) && argv[i + 1] && !argv[i + 1].startsWith('--')) values.set(arg, argv[++i]);
    else throw new Error(`지원하지 않거나 값이 빠진 옵션: ${arg}. --draft는 발행하지 않고 거절한다.`);
  }
  if (!values.get('--file')) throw new Error('--file 이 필요하다');
  if (!!values.get('--at') === !!values.get('--now')) throw new Error('--at 예약시각 또는 --now 중 하나를 명시해야 한다');
  if (values.get('--at')) validateAt(values.get('--at'));
  return { name: values.get('--file'), at: values.get('--at') ?? null, run: !!values.get('--run') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let browser, answers, stopChallenge;
  try {
    const { name, at, run } = parsePublishArgs(process.argv.slice(2));
    const state = load();
    assertScheduleUnique(state);
    if (state.some((p) => p.name === name || at && hasActiveSchedule(p) && p.at === at)) throw new Error('이미 기록된 원고 또는 예약시각이다. 기존 글을 먼저 대조해야 한다.');
    console.log(`${run ? '실행' : '미리보기'}: ${name} / ${at ?? '즉시 공개'}`);
    if (run) {
      ({ browser } = await getBrowser());
      const page = await getTistoryPage(browser);
      await ensureLoggedIn(page);
      const challengeDir = path.join(DIR, '_challenge');
      answers = fileAnswerStream(challengeDir);
      stopChallenge = startChallengeSession(page, { directory: challengeDir, input: answers.stream,
        log: challengeLogger(challengeDir, { onSubmitted: () => answers.settle() }), current: () => ({ name, at }) });
      answers.useId(stopChallenge.pendingId);
      const result = await publishOne(page, await page.createCDPSession(), name, at);
      state.push(result);
      save(state);
      console.log(`#${result.id} 저장 후 검증 완료: ${result.title}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally { answers?.stop(); await stopChallenge?.(); answers?.stream.destroy(); await browser?.disconnect(); }
}
