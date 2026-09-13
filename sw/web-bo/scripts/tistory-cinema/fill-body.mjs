/**
 * 기존 글의 제목·본문 또는 예약시각을 고친다. --run 없이는 계획만 출력한다.
 *   node scripts/tistory-cinema/fill-body.mjs --id 9 --file "목록-아카데미 작품상 수상작" --run
 *   node scripts/tistory-cinema/fill-body.mjs --id 52 --at "2026-09-23 18:00" --run
 * 실제 ID와 전체 제목을 먼저 확인하고, 저장 후 재열어 본문·주소·예약시각을 대조한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn, takeDialog } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic, requirePostId, assertPostIdentity, hasActiveSchedule, applyVerifiedPost } from './lib/post-state.mjs';
import { validateAt } from './lib/schedule.mjs';
import { readPost, loadEditor, openPublishPanel, readPublishSettings, hitVisible, compareHtml, writeEditorTags, sameTags } from './lib/post-integrity.mjs';
import { startChallengeSession, throwIfChallengeFailed } from './lib/challenge-session.mjs';
import { fileAnswerStream, challengeLogger } from './lib/challenge-file.mjs';
import { assertPageAvailable } from './lib/publication-requests.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function selectPosts(posts, args) {
  const value = (key) => { const index = args.indexOf(key); if (index < 0) return undefined; if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${key} 값이 필요하다`); return args[index + 1]; };
  const supported = new Set(['--id', '--file', '--ids', '--all', '--at', '--body', '--tags', '--run', '--interactive']);
  for (const arg of args) if (arg.startsWith('--') && !supported.has(arg)) throw new Error(`지원하지 않는 옵션: ${arg}`);
  const one = value('--id'); const ids = value('--ids'); const name = value('--file'); const at = value('--at');
  if ([Boolean(one), Boolean(ids), args.includes('--all')].filter(Boolean).length !== 1) throw new Error('--id, --ids, --all 중 하나가 필요하다');
  const wanted = one ? [Number(one)] : ids ? ids.split(',').map(Number) : posts.map(requirePostId);
  wanted.forEach((id) => requirePostId({ id }));
  if (new Set(wanted).size !== wanted.length) throw new Error('글 번호가 중복됐다');
  const jobs = wanted.map((id) => {
    const post = posts.find((row) => row.id === id);
    if (!post) throw new Error(`실제 글 번호 ${id}가 대장에 없다. map-post-ids로 먼저 대조해야 한다`);
    if (name && (wanted.length !== 1 || post.name !== name)) throw new Error(`글 번호 ${id}와 원고 ${name}이 대장에서 일치하지 않는다`);
    return post;
  });
  if (!jobs.length) throw new Error('대상이 없다');
  if (at) {
    if (jobs.length !== 1) throw new Error('--at은 한 편에만 적용한다');
    validateAt(at);
    const occupied = posts.find((post) => post.id !== jobs[0].id && hasActiveSchedule(post) && post.at === at);
    if (occupied) throw new Error(`예약시각이 ${occupied.name}과 겹친다: ${at}`);
  }
  const body = args.includes('--body') || !at && !args.includes('--tags');
  if (args.includes('--interactive') && !args.includes('--run')) throw new Error('--interactive는 --run과 함께 사용한다');
  return { jobs, at, body, tags: args.includes('--tags') || body, run: args.includes('--run'), interactive: args.includes('--interactive') };
}

async function writeBody(page, cdp, html, title) {
  await page.evaluate((text) => {
    const el = document.querySelector('#post-title-inp');
    if (!el) throw new Error('제목 입력란이 없다');
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
    setter ? setter.call(el, text) : (el.value = text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, title);
  const htmlMode = await page.evaluate(() => [...document.querySelectorAll('.CodeMirror')].some((el) => el.getClientRects().length));
  if (!htmlMode) {
    await hitVisible(page, '#editor-mode-layer-btn-open', '모드 단추');
    await wait(500);
    const pos = await page.evaluate(() => {
      const item = [...document.querySelectorAll('span.mce-text,span.mce-txt,li,a,button')].find((el) => el.getClientRects().length && el.textContent.trim() === 'HTML');
      if (!item) return null;
      const rect = (item.closest('li,button,a') ?? item).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (!pos) throw new Error('HTML 모드 메뉴를 찾지 못했다');
    await page.mouse.click(pos.x, pos.y);
    await page.waitForSelector('.CodeMirror', { visible: true, timeout: 15000 });
  }
  const pos = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.CodeMirror')].find((node) => node.getClientRects().length);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + Math.min(14, rect.height / 2) };
  });
  if (!pos) throw new Error('HTML 편집기를 찾지 못했다');
  await page.mouse.click(pos.x, pos.y);
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await cdp.send('Input.insertText', { text: html });
  await wait(700);
  const inserted = await page.evaluate(() => [...document.querySelectorAll('.CodeMirror')].find((el) => el.getClientRects().length)?.CodeMirror?.getValue() ?? '');
  const comparison = await compareHtml(page, html, inserted);
  if (!comparison.ok) throw new Error(`저장 전 본문 입력 불일치: ${JSON.stringify(comparison.issues.slice(0, 3))}`);
}

export async function setReservation(page, at) {
  validateAt(at);
  const [year, month, day, hour, minute] = at.match(/\d+/g).map(Number);
  const reservationReady = () => ['button.btn_reserve', '#dateHour', '#dateMinute'].every((selector) =>
    [...document.querySelectorAll(selector)].some((el) => el.getClientRects().length && !el.disabled));
  const reserved = await page.evaluate(reservationReady);
  if (!reserved) {
    // 기존 발행일이 선택된 편집기에서는 예약 버튼이 동작하지 않는다. 현재를 먼저 선택해야 한다.
    const historicalDate = await page.evaluate(() => [...document.querySelectorAll('button.btn_date')]
      .some((el) => el.getClientRects().length && el.classList.contains('on') && !['현재', '예약'].includes(el.textContent.trim())));
    if (historicalDate) {
      const currentPos = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button.btn_date')].filter((el) => el.getClientRects().length && !el.disabled && el.textContent.trim() === '현재');
        if (buttons.length !== 1) return null;
        buttons[0].scrollIntoView({ block: 'center', behavior: 'instant' });
        const rect = buttons[0].getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      if (!currentPos) throw new Error('기존 발행일을 해제할 현재 단추를 유일하게 찾지 못했다');
      await page.mouse.click(currentPos.x, currentPos.y);
      await page.waitForFunction(() => [...document.querySelectorAll('button.btn_date')]
        .some((el) => el.getClientRects().length && el.textContent.trim() === '현재' && el.classList.contains('on')), { timeout: 10000 });
    }
    const pos = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button.btn_date')].filter((el) => el.getClientRects().length && !el.disabled && el.textContent.trim() === '예약');
      if (buttons.length !== 1) return null;
      buttons[0].scrollIntoView({ block: 'center', behavior: 'instant' });
      const rect = buttons[0].getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (!pos) throw new Error('예약 선택 단추를 유일하게 찾지 못했다');
    await page.mouse.click(pos.x, pos.y);
    try {
      await page.waitForFunction(reservationReady, { timeout: 10000 });
    } catch {
      const state = await page.evaluate(() => [...document.querySelectorAll('button.btn_date')]
        .filter((el) => el.getClientRects().length).map((el) => ({ text: el.textContent.trim(), className: el.className, disabled: el.disabled })));
      throw new Error(`예약 모드로 전환되지 않았다. 다시 저장하지 않는다: ${JSON.stringify(state)}`);
    }
  }
  await hitVisible(page, 'button.btn_reserve', '예약 날짜 단추');
  await page.waitForFunction(() => [...document.querySelectorAll('.txt_calendar')].some((el) => el.getClientRects().length && /\d{4}년\s*\d{1,2}월/.test(el.textContent)), { timeout: 10000 });
  let matched = false;
  for (let step = 0; step < 24; step++) {
    const label = await page.evaluate(() => document.querySelector('.txt_calendar')?.textContent.trim() ?? '');
    const current = label.match(/(\d{4})년\s*(\d{1,2})월/);
    if (!current) throw new Error(`달력을 읽지 못했다: ${label}`);
    if (Number(current[1]) === year && Number(current[2]) === month) { matched = true; break; }
    const forward = Number(current[1]) * 12 + Number(current[2]) < year * 12 + month;
    const moved = await page.evaluate((next) => {
      const button = [...document.querySelectorAll('.box_calendar button')].find((el) => el.getClientRects().length && !el.disabled && new RegExp(next ? '다음|next' : '이전|prev', 'i').test(el.className + el.textContent + (el.getAttribute('aria-label') ?? '')));
      if (!button) return false;
      button.click(); return true;
    }, forward);
    if (!moved) throw new Error('달력을 옮기지 못했다');
    await wait(250);
  }
  if (!matched) throw new Error('예약할 달까지 이동하지 못했다');
  const picked = await page.evaluate((wanted) => {
    const buttons = [...document.querySelectorAll('button.btn_day')].filter((el) => el.getClientRects().length && Number(el.textContent.trim()) === wanted && !el.disabled && !/other|outside/.test(el.className));
    if (buttons.length !== 1) return false;
    buttons[0].click(); return true;
  }, day);
  if (!picked) throw new Error(`${day}일이 유일하게 선택되지 않는다`);
  await wait(250);
  await page.evaluate(({ hour, minute }) => {
    for (const [selector, value] of [['#dateHour', hour], ['#dateMinute', minute]]) {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`${selector} 입력란이 없다`);
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value')?.set;
      const text = String(value).padStart(2, '0');
      setter ? setter.call(el, text) : (el.value = text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { hour, minute });
  await wait(300);
  const actual = await readPublishSettings(page);
  if (actual.at !== at) throw new Error(`예약 입력 불일치: ${actual.at} / ${at}`);
}

export async function saveAndWait(page, { waitSeconds = 180 } = {}) {
  throwIfChallengeFailed(page);
  await assertPageAvailable(page);
  takeDialog();
  await hitVisible(page, '#publish-btn', '저장 단추');
  let captchaReported = false;
  for (let second = 0; second < waitSeconds; second++) {
    await wait(1000);
    throwIfChallengeFailed(page);
    await assertPageAvailable(page, { navigationPending: true });
    if (/\/manage\/(posts|entry)(\/|\?|$)/.test(page.url())) return;
    const dialog = takeDialog();
    if (dialog) throw new Error(`저장 알림으로 중단: ${dialog}`);
    if (!captchaReported && page.frames().some((frame) => /dkaptcha/.test(frame.url()))) {
      console.log('CAPTCHA_REQUIRED: 현재 저장 요청의 화면 인증을 기다린다. 저장 단추를 다시 누르지 않는다.');
      captchaReported = true;
    }
  }
  throw new Error(`저장 완료를 확인하지 못했다: ${page.url()}`);
}

export async function fillOne(page, cdp, id, name, { run = false, body = true, tags = body, at, post, dir = DIR, deferSave = false, waitSeconds = 180 } = {}) {
  requirePostId({ id, name });
  const statePath = path.join(dir, '_posts.json');
  const record = post ?? loadPosts(statePath).find((row) => row.id === id && row.name === name);
  if (!record || record.id !== id || record.name !== name) throw new Error(`실제 ID ${id}와 원고 ${name}이 대장에서 일치하지 않는다`);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, `_meta-${name}.json`), 'utf8'));
  const html = body ? fs.readFileSync(path.join(dir, `_body-${name}.html`), 'utf8') : null;
  if (body && (!meta.title?.trim() || !html?.trim())) throw new Error('제목 또는 본문 원고가 비어 있다');
  if (at) validateAt(at);
  if (!run) return { id, name, body, tags, at: at ?? record.at, title: body ? meta.title : record.title, dryRun: true };
  await page.bringToFront();
  const before = await readPost(page, id);
  assertPostIdentity(record, before.title, meta.title);
  const backupDir = path.join(dir, '_backup'); fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `post-${id}-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backup, JSON.stringify(before, null, 2), { encoding: 'utf8', flag: 'wx' });
  if (body || tags) {
    await loadEditor(page, id);
    if (body) await writeBody(page, cdp, html, meta.title);
    if (tags) await writeEditorTags(page, meta.tags ?? []);
    await openPublishPanel(page);
  }
  if (at) await setReservation(page, at);
  const pending = await readPublishSettings(page);
  for (const key of ['slug', 'category', 'visibility']) if (pending[key] !== before[key]) throw new Error(`저장 전 ${key}가 바뀌었다. 저장하지 않는다`);
  if (pending.at !== (at ?? before.at)) throw new Error('저장 전 예약시각이 의도와 다르다');
  // 복원 도구가 같은 편집기에서 공개·예약까지 바꾼 뒤 한 번만 저장한다.
  if (deferSave) return { before, backup, expected: { title: body ? meta.title : before.title,
    html: body ? html : before.html, tags: tags ? meta.tags ?? [] : before.tags } };
  await saveAndWait(page, { waitSeconds });
  const after = await readPost(page, id);
  const wantedTitle = body ? meta.title : before.title;
  if (after.title !== wantedTitle) throw new Error(`저장 후 제목 불일치: ${after.title}`);
  if (!sameTags(tags ? meta.tags ?? [] : before.tags, after.tags)) throw new Error('저장 후 태그가 원고 또는 기존 값과 다르다.');
  for (const key of ['slug', 'category', 'visibility']) if (after[key] !== before[key]) throw new Error(`저장 후 ${key}가 바뀌었다. 다음 글로 진행하지 않는다`);
  if (after.at !== (at ?? before.at)) throw new Error(`저장 후 예약시각 불일치: ${after.at}`);
  const comparison = await compareHtml(page, body ? html : before.html, after.html);
  if (!comparison.ok) throw new Error(`저장 후 본문 불일치: ${JSON.stringify(comparison.issues.slice(0, 5))}`);
  return { ...after, comparison, backup, got: after.html.length, before };
}

export async function main(args = process.argv.slice(2)) {
  const statePath = path.join(DIR, '_posts.json');
  const posts = loadPosts(statePath); const selection = selectPosts(posts, args);
  if (!selection.run) {
    for (const post of selection.jobs) console.log(JSON.stringify(await fillOne(null, null, post.id, post.name, { ...selection, post }), null, 2));
    console.log('미리보기다. --run을 붙이면 저장 전후 대조를 거쳐 수정한다.'); return;
  }
  const { browser } = await getBrowser();
  let stopChallenge, answers, current = null;
  try {
    const page = await getTistoryPage(browser); await ensureLoggedIn(page);
    if (selection.interactive) {
      stopChallenge = startChallengeSession(page, { directory: path.join(DIR, '_backup'), current: () => current });
    } else {
      const challengeDir = path.join(DIR, '_challenge');
      answers = fileAnswerStream(challengeDir);
      stopChallenge = startChallengeSession(page, { directory: challengeDir, input: answers.stream,
        log: challengeLogger(challengeDir, { onSubmitted: () => answers.settle() }), current: () => current });
      answers.useId(stopChallenge.pendingId);
    }
    const cdp = await page.createCDPSession();
    for (const post of selection.jobs) {
      current = `#${post.id} ${post.name}`;
      const result = await fillOne(page, cdp, post.id, post.name, { ...selection, post, waitSeconds: 900 });
      const latest = loadPosts(statePath); const row = latest.find((item) => item.id === post.id && item.name === post.name);
      if (!row) throw new Error('저장 중 대장의 글 대응이 바뀌었다');
      Object.assign(row, applyVerifiedPost(row, result));
      savePostsAtomic(statePath, latest);
      console.log(`#${post.id} ${result.title} · ${result.at ?? '예약 없음'} · 저장 후 본문 대조 통과 · 백업 ${result.backup}`);
    }
  } finally { answers?.stop(); await stopChallenge?.(); answers?.stream.destroy(); await browser.disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
