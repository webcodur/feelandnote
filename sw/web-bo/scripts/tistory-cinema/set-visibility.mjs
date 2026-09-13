/**
 * 예약된 글을 비공개로 내리거나, 내렸던 글을 새 일정으로 복원한다.
 *
 *   node scripts/tistory-cinema/set-visibility.mjs --private --all          계획만
 *   node scripts/tistory-cinema/set-visibility.mjs --private --all --run    실제 전환
 *   node scripts/tistory-cinema/set-visibility.mjs --restore --all --start 2026-09-09 --refresh-body --run
 *   node scripts/tistory-cinema/set-visibility.mjs --private --ids 1,2,3 --run
 *
 * 🔴 **대장의 `at` 은 지우지 않는다.** 비공개로 내리면 티스토리 화면에서 예약이 풀리는데,
 *    그 값을 대장에서도 지우면 되돌릴 수단이 사라진다. 화면 상태는 `visibility` 필드로
 *    따로 적고 `at` 은 편성 그대로 둔다.
 *
 * --refresh-body는 최신 제목·본문·태그와 새 예약을 같은 편집기에서 한 번만 저장한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn, takeDialog } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic, requirePostId, assertPostIdentity, assertScheduleUnique, applyVerifiedPost } from './lib/post-state.mjs';
import { readPost, loadEditor, openPublishPanel, readPublishSettings, hitVisible, compareHtml, sameTags } from './lib/post-integrity.mjs';
import { startChallengeSession, throwIfChallengeFailed } from './lib/challenge-session.mjs';
import { fileAnswerStream, challengeLogger } from './lib/challenge-file.mjs';
import { setReservation, fillOne } from './fill-body.mjs';
import { parseDay, planSchedule, validateAt } from './lib/schedule.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** 캡차 로그에 어느 글을 저장하다 걸렸는지 함께 남긴다. */
let currentJob = null;

/** 티스토리 발행 패널의 공개 라디오. 값은 실행할 때 화면에서 다시 확인한다. */
const PRIVATE = 'open0';
const PUBLIC = 'open20';

export function parseArgs(argv) {
  const values = new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (['--private', '--restore', '--all', '--run', '--refresh-body', '--interactive'].includes(arg)) values.set(arg, true);
    else if (['--ids', '--start', '--limit'].includes(arg) && argv[i + 1] && !argv[i + 1].startsWith('--')) values.set(arg, argv[++i]);
    else throw new Error(`지원하지 않거나 값이 빠진 옵션: ${arg}`);
  }
  const to = argv.includes('--private') ? PRIVATE : argv.includes('--restore') ? PUBLIC : null;
  if (!to) throw new Error('--private 또는 --restore 가 필요하다');
  if (argv.includes('--private') && argv.includes('--restore')) throw new Error('--private 와 --restore 를 함께 줄 수 없다');
  const ids = values.has('--ids') ? String(values.get('--ids')).split(',').map(Number) : null;
  if (ids && (!ids.length || ids.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length)) throw new Error('--ids 값이 유일한 글 번호가 아니다');
  if (Boolean(ids) === argv.includes('--all')) throw new Error('--all 또는 --ids 중 하나가 필요하다');
  const start = values.get('--start');
  const limit = Number(values.get('--limit') ?? Infinity);
  if (start) parseDay(start);
  if (!(limit === Infinity || Number.isSafeInteger(limit) && limit > 0)) throw new Error('--limit 은 양의 정수여야 한다');
  if (to === PRIVATE && (start || values.has('--refresh-body'))) throw new Error('--start와 --refresh-body는 --restore에만 사용한다');
  if (values.has('--interactive') && !values.has('--run')) throw new Error('--interactive는 --run과 함께 사용한다');
  return { to, ids, start, limit, refreshBody: values.has('--refresh-body'), run: values.has('--run'), interactive: values.has('--interactive') };
}

export function selectPosts(posts, { ids }) {
  const jobs = ids
    ? ids.map((id) => {
      const post = posts.find((row) => row.id === id);
      if (!post) throw new Error(`실제 글 번호 ${id}가 대장에 없다`);
      return post;
    })
    : posts.filter((post) => post.id != null);
  jobs.forEach(requirePostId);
  if (!jobs.length) throw new Error('대상이 없다');
  return jobs;
}

/** 대상 명단을 별도 저장하지 않는다. 현재 공개 기록이 차지한 시각을 제외하고 실행 때 다시 계산한다. */
export function planChanges(posts, options, now = Date.now()) {
  const selected = selectPosts(posts, options);
  const limit = options.limit ?? Infinity;
  const jobs = selected.filter((post) => options.to === PUBLIC ? post.visibility === PRIVATE : post.visibility !== PRIVATE);
  if (!jobs.length) return [];
  if (options.to === PRIVATE) return jobs.slice(0, limit).map((post) => ({ ...post, plannedAt: null }));
  if (options.start) {
    const names = new Set(jobs.map((post) => post.name));
    const occupied = posts.filter((post) => !names.has(post.name));
    const planned = planSchedule([...names], occupied, { start: options.start, days: 366, limit, now });
    if (planned.length < Math.min(jobs.length, limit)) throw new Error('1년 이내에 모든 복원 글을 넣을 빈 시각이 없다');
    return planned.map((job) => ({ ...jobs.find((post) => post.name === job.name), plannedAt: job.at }));
  }
  const planned = jobs.slice(0, limit).map((post) => ({ ...post, plannedAt: validateAt(post.at, now) }));
  const byId = new Map(planned.map((post) => [post.id, post.plannedAt]));
  assertScheduleUnique(posts.map((post) => byId.has(post.id) ? { ...post, at: byId.get(post.id), visibility: PUBLIC } : post));
  return planned;
}

/** 라디오는 label 을 눌러야 먹는 자리가 있다. 누른 뒤 실제로 선택됐는지 확인한다. */
async function chooseVisibility(page, wanted) {
  const available = await page.evaluate(() =>
    [...document.querySelectorAll('input[type=radio]')].filter((el) => /^open\d+$/.test(el.id)).map((el) => el.id));
  if (!available.includes(wanted)) throw new Error(`발행 패널에 ${wanted} 가 없다(있는 것: ${available.join(', ')})`);
  await page.evaluate((id) => {
    const el = document.querySelector(`#${id}`);
    (el?.closest('label') ?? el)?.click();
  }, wanted);
  await wait(1000);
  const chosen = await page.evaluate((id) => document.querySelector(`#${id}`)?.checked, wanted);
  if (!chosen) throw new Error(`${wanted} 를 고르지 못했다`);
}

/**
 * 저장을 걸어 두고 결과를 기다린다.
 *
 * 🔴 **저장 단추를 다시 누르지 않는다.** 캡차가 뜨면 그 저장 요청은 아직 살아 있다.
 *    다시 누르면 요청이 겹쳐 어느 쪽이 반영됐는지 알 수 없게 된다. 캡차는 답이 들어올
 *    때까지 기다릴 뿐이고, 기다리는 시간(`waitSeconds`)만 넉넉히 잡는다.
 */
async function saveAndWait(page, { waitSeconds = 180 } = {}) {
  throwIfChallengeFailed(page);
  takeDialog();
  await hitVisible(page, '#publish-btn', '저장 단추');
  let captchaReported = false;
  for (let second = 0; second < waitSeconds; second++) {
    await wait(1000);
    throwIfChallengeFailed(page);
    if (/\/manage\/(posts|entry)(\/|\?|$)/.test(page.url())) return;
    const dialog = takeDialog();
    if (dialog) throw new Error(`저장 알림으로 중단: ${dialog}`);
    if (!captchaReported && page.frames().some((frame) => /dkaptcha/.test(frame.url()))) {
      console.log('   CAPTCHA_REQUIRED: 현재 저장 요청의 화면 인증을 기다린다. 저장 단추를 다시 누르지 않는다.');
      captchaReported = true;
    }
  }
  throw new Error(`저장 완료를 확인하지 못했다: ${page.url()}`);
}

/**
 * 한 편의 공개 상태를 바꾼다. 본문 갱신이 지정된 경우도 같은 저장에서 처리한다.
 */
export async function setOne(page, post, { to, run = false, dir = DIR, waitSeconds = 180, plannedAt = post.plannedAt ?? post.at, refreshBody = false, cdp } = {}) {
  const id = requirePostId(post);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, `_meta-${post.name}.json`), 'utf8'));
  if (refreshBody && to !== PUBLIC) throw new Error('본문 동시 갱신은 공개 복원에만 사용한다');
  if (to === PUBLIC) validateAt(plannedAt);
  if (!run) return { id, name: post.name, to, at: to === PUBLIC ? plannedAt : null, refreshBody, dryRun: true };

  await page.bringToFront();
  const before = await readPost(page, id);
  assertPostIdentity(post, before.title, meta.title);
  if (before.visibility === to && !refreshBody && (to === PRIVATE || before.at === plannedAt)) {
    return { ...before, id, name: post.name, skipped: `이미 ${to}` };
  }
  if (to === PUBLIC && before.visibility !== PRIVATE && before.at !== plannedAt) throw new Error(`#${id} 서버에서 이미 공개된 글의 일정이 다르다. 현재 서버와 기록을 먼저 대조해야 한다`);

  const backupDir = path.join(dir, '_backup');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `post-${id}-visibility-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backup, JSON.stringify(before, null, 2), { encoding: 'utf8', flag: 'wx' });

  let expected = { title: before.title, html: before.html, tags: before.tags };
  if (refreshBody) {
    const prepared = await fillOne(page, cdp ?? await page.createCDPSession(), id, post.name, { run: true, post, dir, deferSave: true });
    expected = prepared.expected;
  } else {
    await loadEditor(page, id);
    await openPublishPanel(page);
  }
  await chooseVisibility(page, to);
  if (to === PUBLIC) {
    await setReservation(page, plannedAt);
  }

  const pending = await readPublishSettings(page);
  if (pending.visibility !== to) throw new Error(`저장 전 공개 상태가 ${pending.visibility} 다`);
  if (pending.slug !== before.slug) throw new Error('저장 전 글 주소가 바뀌었다. 저장하지 않는다');
  if (pending.category !== before.category) throw new Error('저장 전 카테고리가 바뀌었다. 저장하지 않는다');
  if (pending.at !== (to === PUBLIC ? plannedAt : null)) throw new Error(`저장 전 예약시각 불일치: ${pending.at}`);

  await saveAndWait(page, { waitSeconds });

  const after = await readPost(page, id);
  if (after.visibility !== to) throw new Error(`저장 후 공개 상태가 ${after.visibility} 다`);
  if (after.title !== expected.title) throw new Error(`저장 후 제목이 원고와 다르다: ${after.title}`);
  if (!sameTags(expected.tags ?? [], after.tags ?? [])) throw new Error('저장 후 태그가 원고 또는 기존 값과 다르다');
  if (after.slug !== before.slug) throw new Error('저장 후 글 주소가 바뀌었다');
  if (after.category !== before.category) throw new Error('저장 후 카테고리가 바뀌었다');
  if (after.at !== (to === PUBLIC ? plannedAt : null)) throw new Error(`저장 후 예약시각 불일치: ${after.at}`);
  const comparison = await compareHtml(page, expected.html, after.html);
  if (!comparison.ok) throw new Error(`저장 후 본문이 바뀌었다: ${JSON.stringify(comparison.issues.slice(0, 3))}`);

  return { id, name: post.name, title: after.title, visibility: after.visibility, at: after.at, url: after.url, backup };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const statePath = path.join(DIR, '_posts.json');
  const posts = loadPosts(statePath);
  let jobs = planChanges(posts, options);

  if (!options.run) {
    const label = options.to === PRIVATE ? '비공개로 내린다' : '공개+예약으로 되돌린다';
    console.log(`${jobs.length}편을 ${label}.`);
    for (const post of jobs) console.log(` #${post.id} ${post.name} · 현재 대장 ${post.at ?? '예약 없음'} → ${options.to === PRIVATE ? '비공개(예약 해제)' : post.plannedAt}${options.refreshBody ? ' · 최신 본문 동시 갱신' : ''}`);
    console.log('미리보기다. --run 을 붙이면 저장 전후 대조를 거쳐 바꾼다.');
    return;
  }
  if (!jobs.length) { console.log('변경할 글이 없다. 이미 처리된 공개 상태는 건너뛴다.'); return; }

  const { browser } = await getBrowser();
  let stopChallenge = null;
  let answers = null;
  try {
    // 브라우저 잠금을 얻는 사이 다른 실행이 완료됐을 수 있으므로 다시 편성한다.
    jobs = planChanges(loadPosts(statePath), options);
    const page = await getTistoryPage(browser);
    await ensureLoggedIn(page);

    /**
     * 캡차는 화면을 읽고 정상 입력으로 답한다. 인증 API 나 세션 조작으로 건너뛰지 않는다.
     * 답은 `_challenge/answer-<번호>.txt` 로 받는다 — 세션이 떨어뜨린 PNG 를 본 쪽이 적는다.
     */
    const challengeDir = path.join(DIR, '_challenge');
    if (options.interactive) {
      stopChallenge = startChallengeSession(page, { directory: path.join(DIR, '_backup'), current: () => currentJob });
    } else {
      answers = fileAnswerStream(challengeDir);
      stopChallenge = startChallengeSession(page, {
        directory: challengeDir, input: answers.stream,
        log: challengeLogger(challengeDir, { onSubmitted: () => answers.settle() }), current: () => currentJob,
      });
      answers.useId(stopChallenge.pendingId);
    }
    const cdp = options.refreshBody ? await page.createCDPSession() : null;

    let done = 0;
    for (const post of jobs) {
      currentJob = `#${post.id} ${post.name}`;
      const result = await setOne(page, post, { ...options, cdp, waitSeconds: 900 });
      const latest = loadPosts(statePath);
      const row = latest.find((item) => item.id === post.id && item.name === post.name);
      if (!row) throw new Error('저장 중 대장의 글 대응이 바뀌었다');
      Object.assign(row, applyVerifiedPost(row, result));
      assertScheduleUnique(latest);
      savePostsAtomic(statePath, latest);
      done++;
      console.log(`#${post.id} ${post.name} · ${result.visibility} · ${result.at ?? '예약 없음'} · ${done}/${jobs.length}`);
    }
    console.log(`\n${done}/${jobs.length}편 완료.`);
  } finally { answers?.stop(); await stopChallenge?.(); answers?.stream.destroy(); await browser.disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
