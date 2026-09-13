/** Audit saved posts, then repair only demonstrated title/body/schedule differences with --run. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic, requirePostId, assertScheduleUnique } from './lib/post-state.mjs';
import { repairSchedule } from './lib/schedule.mjs';
import { auditOne } from './audit-posted.mjs';
import { fillOne } from './fill-body.mjs';
import { startChallengeSession } from './lib/challenge-session.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const STATE = path.join(DIR, '_posts.json');
const head = (title) => String(title ?? '').split(' | ')[0].trim();

export function planReconciliation(posts, audits, { now = Date.now() } = {}) {
  if (posts.length !== audits.length) throw new Error('모든 기록의 서버 대조가 끝나지 않았다.');
  const identities = new Set();
  const verified = posts.map((post) => {
    requirePostId(post);
    const rows = audits.filter((audit) => audit.id === post.id && audit.name === post.name);
    if (rows.length !== 1) throw new Error(`서버 대조가 유일하지 않다: ${post.name}`);
    const audit = rows[0];
    if (audit.actual.id !== post.id) throw new Error(`서버 글 번호 불일치: ${post.name}`);
    if (post.at && !audit.actual.at) throw new Error(`#${post.id} 기록된 예약이 서버에서 사라졌다. 공개 여부부터 확인해야 한다.`);
    if (identities.has(post.id)) throw new Error('같은 서버 글을 두 번 수정하려 한다.');
    identities.add(post.id);
    const identityIssue = audit.issues.some((issue) => issue.field === 'identity');
    const wanted = audit.issues.find((issue) => issue.field === 'title')?.expected ?? audit.actual.title;
    // A previous subtitle may differ from both historical metadata versions. The exact body and
    // stable title heading must independently corroborate the existing numeric ID before adoption.
    if (identityIssue && (!audit.comparison.ok || !head(wanted) || head(wanted) !== head(audit.actual.title))) {
      throw new Error(`글 신원을 확인할 수 없어 정비를 중단한다: #${post.id} ${post.name}`);
    }
    const unsupported = audit.issues.filter((issue) => ['category', 'visibility', 'url'].includes(issue.field));
    if (unsupported.length) throw new Error(`#${post.id} 분류·공개·주소를 먼저 확인해야 한다: ${JSON.stringify(unsupported)}`);
    return { ...post, title: audit.actual.title, at: audit.actual.at, url: audit.actual.url };
  });
  const schedule = repairSchedule(verified, { now });
  const changes = audits.flatMap((audit) => {
    const shift = schedule.find((item) => item.id === audit.id);
    const body = !audit.comparison.ok || audit.issues.some((issue) => issue.field === 'title');
    const tags = audit.issues.some((issue) => issue.field === 'tags');
    return body || tags || shift ? [{ id: audit.id, name: audit.name, body, tags, at: shift?.at, from: audit.actual.at }] : [];
  });
  return { verified, changes };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.some((arg) => !['--run', '--plan', '--interactive'].includes(arg)) || argv.includes('--run') && argv.includes('--plan')) {
    throw new Error('--plan 또는 --run을 지정한다. --run --interactive는 화면 인증의 답변을 stdin으로 받는다.');
  }
  const run = argv.includes('--run');
  if (argv.includes('--interactive') && !run) throw new Error('--interactive는 --run과 함께 사용한다.');
  const { browser } = await getBrowser();
  let stopChallenge, current = null;
  try {
    const posts = loadPosts(STATE); posts.forEach(requirePostId);
    const page = await getTistoryPage(browser); await ensureLoggedIn(page);
    const audits = [];
    for (const post of posts) {
      const audit = await auditOne(page, post); audits.push(audit);
      console.log(`#${post.id} ${post.name} · ${audit.actual.at} · ${audit.issues.map((issue) => issue.field).join(', ') || '일치'}`);
    }
    const { verified, changes } = planReconciliation(posts, audits);
    for (const change of changes) console.log(JSON.stringify(change));
    console.log(`${changes.length}편 정비 예정${run ? '' : ' · 서버와 대장을 바꾸지 않았다'}`);
    if (!run) return { verified, changes, audits };
    // Remote originals are captured before the first mutation, including the two colliding dates.
    const backupDir = path.join(DIR, '_backup'); fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(backupDir, `server-before-reconcile-${stamp}.json`), JSON.stringify(audits, null, 2), { encoding: 'utf8', flag: 'wx' });
    savePostsAtomic(STATE, verified);
    const cdp = await page.createCDPSession();
    if (argv.includes('--interactive')) stopChallenge = startChallengeSession(page, { directory: backupDir, current: () => current });
    for (const change of changes) {
      current = change;
      const record = verified.find((post) => post.id === change.id);
      const result = await fillOne(page, cdp, record.id, record.name, { run: true, body: change.body, tags: change.tags, at: change.at, post: record });
      Object.assign(record, { title: result.title, at: result.at, url: result.url });
      savePostsAtomic(STATE, verified);
      console.log(`#${record.id} 저장 후 대조 완료: ${record.title} · ${record.at}`);
    }
    assertScheduleUnique(verified);
    console.log('기존 게시글의 원고·서버·대장·예약시각 정비 완료.');
    return { verified, changes };
  } finally { await stopChallenge?.(); await browser.disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
