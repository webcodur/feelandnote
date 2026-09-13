/** Add missing representative images through the normal publish-panel file input. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic, requirePostId, assertPostIdentity } from './lib/post-state.mjs';
import { readPost, readPublishSettings, sameTags, compareHtml } from './lib/post-integrity.mjs';
import { prepareRepresentativeImage, sourceForPost, uploadRepresentativeImage, assertRepresentativeImage } from './lib/representative-image.mjs';
import { PUBLICATION_REQUESTS, pauseRequests } from './lib/publication-requests.mjs';
import { startChallengeSession } from './lib/challenge-session.mjs';
import { fileAnswerStream, challengeLogger } from './lib/challenge-file.mjs';
import { saveAndWait } from './fill-body.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');

export async function assertRepresentativeOnly(page, before, after, image) {
  for (const key of ['id', 'title', 'slug', 'category', 'visibility', 'at', 'url']) {
    if (after[key] !== before[key]) throw new Error(`대표이미지 저장 후 ${key}가 달라졌다. 다음 글로 진행하지 않는다.`);
  }
  if (!sameTags(before.tags, after.tags)) throw new Error('대표이미지 저장 후 태그가 달라졌다.');
  const comparison = await compareHtml(page, before.html, after.html);
  if (!comparison.ok) throw new Error(`대표이미지 저장 후 본문 불일치: ${JSON.stringify(comparison.issues.slice(0, 3))}`);
  assertRepresentativeImage(after.representativeImage, image);
}

export function representativeNeedsWork(post, source) {
  return !post.representativeImage || !post.representativeVerifiedAt || (post.representativeSource !== null && post.representativeSource !== source);
}

export async function fillRepresentative(page, post, { dir = DIR, screenshot = false, read = readPost } = {}) {
  const id = requirePostId(post);
  await page.bringToFront();
  const before = await read(page, id);
  assertPostIdentity(post, before.title);
  if (before.at !== (post.visibility === 'open0' ? null : post.at ?? null) || before.visibility !== (post.visibility ?? 'open20')) throw new Error(`#${id} 원장과 서버 공개·예약 설정이 다르다.`);
  const backupDir = path.join(dir, '_backup'); fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `post-${id}-before-cover-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify(before, null, 2), { encoding: 'utf8', flag: 'wx' });
  if (before.representativeImage) {
    // A previous save may have finished before the local record was written. Preserve it without inventing a source.
    assertRepresentativeImage(before.representativeImage);
    return { representativeImage: before.representativeImage, representativeSource: null, representativeVerifiedAt: new Date().toISOString(), backup, preserved: true };
  }
  const asset = await prepareRepresentativeImage(post.name, { dir });
  const image = await uploadRepresentativeImage(page, asset.file);
  const pending = await readPublishSettings(page);
  for (const key of ['slug', 'category', 'visibility', 'at', 'url']) if (pending[key] !== before[key]) throw new Error(`대표이미지 첨부 후 ${key}가 달라졌다. 저장하지 않는다.`);
  await saveAndWait(page, { waitSeconds: 900 });
  const after = await read(page, id);
  await assertRepresentativeOnly(page, before, after, image);
  let screenshotPath;
  if (screenshot) {
    screenshotPath = path.join(dir, '_challenge', `cover-saved-${id}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }
  return { representativeImage: image, representativeSource: asset.source, representativeVerifiedAt: new Date().toISOString(), backup, screenshot: screenshotPath };
}

export async function main(args = process.argv.slice(2)) {
  for (const arg of args) if (arg.startsWith('--') && !['--all', '--ids', '--run', '--screenshot'].includes(arg)) throw new Error(`지원하지 않는 옵션: ${arg}`);
  const idsIndex = args.indexOf('--ids');
  const ids = idsIndex < 0 ? null : (args[idsIndex + 1] ?? '').split(',').map(Number);
  if (Boolean(ids) === args.includes('--all') || ids?.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error('--all 또는 --ids 실제ID,실제ID가 필요하다.');
  const statePath = path.join(DIR, '_posts.json');
  const posts = loadPosts(statePath);
  if (ids?.some((id) => !posts.some((post) => post.id === id))) throw new Error('요청한 실제 ID가 원장에 없다.');
  const selected = posts.filter((post) => !ids || ids.includes(post.id));
  const jobs = selected.filter((post) => representativeNeedsWork(post, sourceForPost(post.name, DIR)));
  console.log(`대표이미지 보완 ${jobs.length}편 / 선택 ${selected.length}편`);
  if (!args.includes('--run')) { for (const post of jobs) console.log(`#${post.id} ${post.name}`); return; }
  if (!jobs.length) return;
  const { browser } = await getBrowser();
  let answers, stopChallenge, current;
  try {
    const page = await getTistoryPage(browser); await ensureLoggedIn(page);
    const challengeDir = path.join(DIR, '_challenge');
    answers = fileAnswerStream(challengeDir);
    stopChallenge = startChallengeSession(page, { directory: challengeDir, input: answers.stream,
      log: challengeLogger(challengeDir, { onSubmitted: () => answers.settle() }), current: () => current });
    answers.useId(stopChallenge.pendingId);
    for (let index = 0; index < jobs.length; index++) {
      const post = jobs[index]; current = `대표이미지 #${post.id} ${post.name}`;
      if (index) await pauseRequests(page, PUBLICATION_REQUESTS.betweenPostsMs);
      console.log(`[${index + 1}/${jobs.length}] ${current}`);
      const result = await fillRepresentative(page, post, { screenshot: args.includes('--screenshot') });
      const latest = loadPosts(statePath); const row = latest.find((item) => item.id === post.id && item.name === post.name);
      if (!row) throw new Error('저장 중 원장 ID 대응이 달라졌다.');
      Object.assign(row, { representativeImage: result.representativeImage, representativeSource: result.representativeSource, representativeVerifiedAt: result.representativeVerifiedAt });
      savePostsAtomic(statePath, latest);
      console.log(`VERIFIED #${post.id} ${post.name} · ${row.at} · 대표 ${latest.filter((item) => item.representativeVerifiedAt).length}/${latest.length}${result.preserved ? ' · 기존 대표 보존(출처 미확정)' : ''}${result.screenshot ? ' · ' + result.screenshot : ''}`);
    }
  } finally { answers?.stop(); await stopChallenge?.(); answers?.stream.destroy(); await browser.disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
