/** Plan future vacant slots; only --run publishes. Stop the entire run on any unresolved result. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn } from './lib/browser.mjs';
import { createPublisher } from './publish.mjs';
import { loadPosts, savePostsAtomic, assertScheduleUnique, requirePostId } from './lib/post-state.mjs';
import { planSchedule, parseDay } from './lib/schedule.mjs';
import { startChallengeSession } from './lib/challenge-session.mjs';
import { fileAnswerStream, challengeLogger } from './lib/challenge-file.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const STATE = path.join(DIR, '_posts.json');

export function readyNames(dir = DIR) {
  const titles = new Map();
  return fs.readdirSync(dir).filter((f) => f.startsWith('_body-') && f.endsWith('.html'))
    .map((f) => {
      const name = f.slice(6, -5);
      const meta = JSON.parse(fs.readFileSync(path.join(dir, `_meta-${name}.json`), 'utf8'));
      if (typeof meta.title !== 'string' || !meta.title.trim() || !Array.isArray(meta.tags) || meta.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) throw new Error(`제목·태그 원고가 불완전하다: ${name}`);
      if (!fs.readFileSync(path.join(dir, f), 'utf8').trim()) throw new Error(`본문 원고가 비어 있다: ${name}`);
      const title = meta.title.split(' | ')[0].trim();
      if (titles.has(title)) throw new Error(`발행 제목 중복: ${titles.get(title)} / ${name}`);
      titles.set(title, name);
      return name;
    })
    .sort((a, b) => fs.statSync(path.join(dir, '_body-' + b + '.html')).size - fs.statSync(path.join(dir, '_body-' + a + '.html')).size || a.localeCompare(b));
}

export function parseBatchArgs(argv) {
  const values = new Map();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (['--run', '--plan', '--interactive'].includes(key)) values.set(key, true);
    else if (['--start', '--days', '--limit'].includes(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) values.set(key, argv[++i]);
    else throw new Error('Unknown or incomplete option: ' + key);
  }
  if (values.has('--run') && values.has('--plan')) throw new Error('Use either --plan or --run.');
  const start = values.get('--start');
  parseDay(start);
  if (values.has('--interactive') && !values.has('--run')) throw new Error('--interactive는 --run과 함께 사용한다.');
  return { start, days: Number(values.get('--days') ?? 7), limit: Number(values.get('--limit') ?? 10), run: values.has('--run'), interactive: values.has('--interactive') };
}

/** The real execution seam: partial success followed by failure must not start another job. */
export async function runJobs(plan, { publish, save, state, log = console.log }) {
  let done = 0;
  for (const job of plan) {
    try {
      const result = await publish(job);
      requirePostId(result);
      if (result.name !== job.name || result.at !== job.at) throw new Error('Verified result does not match the planned post.');
      const next = [...state, result];
      assertScheduleUnique(next);
      save(next);
      state.push(result);
      done++;
      log('#' + result.id + ' ' + job.at + ' ' + job.name);
    } catch (error) {
      log('STOP: ' + job.name + ' / ' + error.message);
      return { done, failed: { name: job.name, message: error.message } };
    }
  }
  return { done, failed: null };
}

export async function runBatch(options) {
  let browser, stopChallenge, answers;
  let current = null;
  try {
    let state = loadPosts(STATE);
    assertScheduleUnique(state);
    const names = readyNames();
    const plan = planSchedule(names, state, options);
    const waiting = names.filter((name) => !state.some((p) => p.name === name));
    console.log('대기 ' + waiting.length + '편 / 편성 ' + plan.length + '편');
    for (const job of plan) console.log('  ' + job.at + '  ' + job.name);
    if (!options.run || !plan.length) {
      if (!options.run) console.log('미리보기다. --run을 붙일 때만 예약한다.');
      return { done: 0, failed: null, plan };
    }
    ({ browser } = await getBrowser());
    // Re-read after the exclusive browser lock; another finished process may have saved state.
    state = loadPosts(STATE);
    for (const post of state) requirePostId(post);
    const fresh = planSchedule(names, state, options);
    const page = await getTistoryPage(browser);
    await ensureLoggedIn(page);
    if (options.interactive) stopChallenge = startChallengeSession(page, { directory: path.join(DIR, '_backup'), current: () => current });
    else {
      const challengeDir = path.join(DIR, '_challenge');
      answers = fileAnswerStream(challengeDir);
      stopChallenge = startChallengeSession(page, { directory: challengeDir, input: answers.stream,
        log: challengeLogger(challengeDir, { onSubmitted: () => answers.settle() }), current: () => current });
      answers.useId(stopChallenge.pendingId);
    }
    const cdp = await page.createCDPSession();
    const publish = await createPublisher(page, cdp, { recorded: state });
    const result = await runJobs(fresh, {
      state, save: (posts) => savePostsAtomic(STATE, posts),
      publish: (job) => { current = job; return publish(job.name, job.at); },
    });
    console.log('검증하여 기록한 예약 ' + result.done + '편' + (result.failed ? ' / 실패 후 전체 중단' : ''));
    return result;
  } finally { answers?.stop(); await stopChallenge?.(); answers?.stream.destroy(); await browser?.disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await runBatch(parseBatchArgs(process.argv.slice(2)));
    if (result.failed) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
