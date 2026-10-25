// Deterministic service -> Naver sync. No LLM/API generation calls.
// --prepare: download/check assets only. --apply: sync once. --apply --watch: poll every 10 minutes.
// Live editing re-identifies every slot and validates text, covers, component order and reservations.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createClient } from '@feelandnote/db';
import { ASSETS } from '../blog-assets.mjs';
import { repoPath } from '../lib/paths.ts';
import { photoRole, assetsForPost } from './lib/person-photo-plan.mjs';

const args = process.argv.slice(2);
const value = key => args.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const apply = args.includes('--apply'), watch = args.includes('--watch');
if (watch && !apply) throw new Error('--watch requires --apply');
const base = path.join(ASSETS, 'naver-blog');
const repo = repoPath();
for (const p of [path.join(repo, '.env'), path.join(repo, 'sw/web-bo/.env')]) {
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY);
fs.mkdirSync(path.join(os.tmpdir(), 'feelandnote'), { recursive: true });
const root = value('work') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'feelandnote', 'naver-photo-sync-'));
fs.mkdirSync(root, { recursive: true });
const stopFile = path.join(root, 'stop');
if (args.includes('--stop')) {
  if (!value('work')) throw new Error('--stop requires --work');
  fs.writeFileSync(stopFile, 'Stop at the next post boundary.');
  console.log('Stop requested at the next post boundary.');
  process.exit(0);
}
if (fs.existsSync(stopFile)) { console.log('Stop marker present; not starting.'); process.exit(0); }
const ownerFile = path.join(root, 'worker.pid');
if (fs.existsSync(ownerFile)) {
  const pid = Number(fs.readFileSync(ownerFile, 'utf8'));
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch {}
  if (alive) throw new Error(`Sync already running: ${pid}`);
  fs.unlinkSync(ownerFile);
}
fs.writeFileSync(ownerFile, String(process.pid), { flag: 'wx' });
process.on('exit', () => { try { if (fs.readFileSync(ownerFile, 'utf8') === String(process.pid)) fs.unlinkSync(ownerFile); } catch {} });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const put = (name, data) => fs.writeFileSync(path.join(root, name), JSON.stringify(data, null, 2));
const oldAssets = json(path.join(base, 'portrait-images/assets.json'));
const auditMap = oldAssets.auditMap;
const selected = value('log')?.split(',');
const stateFile = path.join(root, 'state.json');
const state = fs.existsSync(stateFile) ? json(stateFile) : { checked: {}, assets: {} };
if (state.halted) throw new Error(`Saved post still needs review: ${JSON.stringify(state.halted)}`);
let stopped = false;
process.on('SIGTERM', () => { stopped = true; });
process.on('SIGINT', () => { stopped = true; });
const log = o => console.log(JSON.stringify({ at: new Date().toISOString(), ...o }));
const runner = fileURLToPath(new URL('./replace-person-photos.mjs', import.meta.url));

async function prepare() {
  const people = [];
  for (let offset = 0;; offset += 1000) {
    const { data, error } = await db.from('celebs').select('id,slug,nickname,portrait_url,avatar_url,publication_status').order('id').range(offset, offset + 999);
    if (error) throw new Error(error.message);
    people.push(...data);
    if (data.length < 1000) break;
  }
  const posts = json(path.join(base, 'posts.json')).filter(p => ['celeb', 'curated'].includes(p.kind) && ['ok', 'check'].includes(p.link));
  const drafts = json(path.join(base, 'celeb-drafts.json'));
  for (const post of posts.filter(p => p.kind === 'celeb' && !p.slug)) {
    const routes = [post.url, ...drafts.filter(d => String(d.logNo) === String(post.logNo)).map(d => d.target)].filter(Boolean).map(url => url.match(/\/celeb\/([^/?#]+)/)?.[1]).filter(Boolean);
    if (new Set(routes).size === 1) post.slug = routes[0];
  }
  const historical = json(path.join(base, 'portrait-images/targets.json'));
  const wanted = new Set([...oldAssets.assets.map(a => a.slug), ...posts.map(p => p.slug), ...Object.values(auditMap.nicknames)]);
  const current = people.filter(p => p.publication_status === 'active' && wanted.has(p.slug)).flatMap(person => ['portrait', 'avatar'].filter(role => person[role === 'avatar' ? 'avatar_url' : 'portrait_url']).map(role => ({ person, role })));
  const assets = [];
  let index = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (index < current.length) {
      const { person, role } = current[index++];
      const sourceField = role === 'avatar' ? 'avatar_url' : 'portrait_url';
      const sourceUrl = person[sourceField];
      const key = `${role}:${person.slug}`;
      const cached = state.assets[key] ?? (role === 'portrait' ? state.assets[person.slug] : null);
      if ((cached?.sourceUrl ?? cached?.portrait_url) === sourceUrl && fs.existsSync(cached.uploadFile) && sha(fs.readFileSync(cached.uploadFile)) === cached.uploadSha256) {
        assets.push({ ...cached, role, sourceField, sourceUrl }); continue;
      }
      const url = new URL(sourceUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'assets.feelandnote.com' || !url.pathname.startsWith(`/celebs/${person.id}/`)) throw new Error(`Unexpected portrait URL: ${person.slug}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(60000), cache: 'no-store' });
      if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) throw new Error(`Portrait fetch failed ${person.slug}: ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      const sourceSha256 = sha(bytes);
      const meta = await sharp(bytes).metadata();
      if (!meta.width || !meta.height || meta.width < 32 || meta.height < 32) throw new Error(`Invalid image: ${person.slug} ${role}`);
      const uploadFile = path.join(root, `${role}-${person.slug}-${sourceSha256.slice(0, 16)}.jpg`);
      const jpeg = await sharp(bytes).rotate().flatten({ background: '#ffffff' }).jpeg({ quality: 94 }).toBuffer();
      const out = await sharp(jpeg).metadata();
      fs.writeFileSync(uploadFile, jpeg);
      const asset = { ...person, role, sourceField, sourceUrl, sourceSha256, uploadFile, uploadSha256: sha(jpeg), width: out.width, height: out.height };
      assets.push(asset); state.assets[key] = asset;
    }
  }));
  assets.sort((a, b) => a.slug.localeCompare(b.slug));
  // Latest metadata comes from posts.json; historical positions are never trusted.
  const targets = posts.filter(p => !selected || selected.includes(String(p.logNo))).map(p => {
    const old = historical.find(t => String(t.logNo) === String(p.logNo));
    return { ...old, ...p, publicVerified: old?.publicVerified || Boolean(state.publicFallback?.[p.logNo]), allowPrivate: old?.allowPrivate || p.link === 'private', changes: old?.changes ?? [], audit: true, expectedImageCount: undefined };
  });
  if (selected && selected.some(id => !targets.some(t => String(t.logNo) === id))) throw new Error('Selected post missing');
  put('assets.json', { assets, auditMap }); put('targets.json', targets); put('state.json', state);
  log({ event: 'prepared', posts: targets.length, people: assets.length, work: root });
  return { targets, assets };
}

async function cycle() {
  let { targets, assets } = await prepare();
  if (!apply) return;
  let bySlug = new Map(assets.map(a => [`${a.role}:${a.slug}`, a]));
  const signature = (target, slugs) => sha(JSON.stringify([target.title, target.scheduledAt, slugs.map(s => [s, bySlug.get(`${photoRole(target)}:${s}`)?.sourceSha256]), ...(target.kind === 'curated' ? ['reviewer-avatar'] : [])]));
  const deferred = new Set();
  const pendingTargets = () => targets.filter(t => {
    if (deferred.has(String(t.logNo))) return false;
    const saved = state.checked[t.logNo];
    return !saved || saved.signature !== signature(t, saved.slugs);
  });
  let queue = pendingTargets();
  while (queue.length && !stopped) {
    if (fs.existsSync(stopFile)) { stopped = true; break; }
    put('pending.json', queue);
    const run = fs.mkdtempSync(path.join(root, 'batch-'));
    let output = '';
    const code = await new Promise(resolve => {
      const child = spawn(process.execPath, [runner, `--root=${run}`, `--targets=${path.join(root, 'pending.json')}`, `--assets=${path.join(root, 'assets.json')}`, '--apply', '--live-match', '--limit=10'], { cwd: repo, windowsHide: true });
      child.stdout.on('data', b => { const s = b.toString(); output += s; process.stdout.write(s); });
      child.stderr.on('data', b => fs.appendFileSync(path.join(root, 'errors.log'), b));
      child.on('error', e => { log({ event: 'spawn-error', error: e.message }); resolve(-1); });
      child.on('exit', resolve);
    });
    const resultsFile = path.join(run, 'results.jsonl');
    const results = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    const handled = new Set();
    for (const result of results.filter(r => r.logNo)) {
      const target = queue.find(t => String(t.logNo) === String(result.logNo));
      if (!target) continue;
      handled.add(String(result.logNo));
      if (['saved-and-reopened', 'already-replaced', 'no-person-photo'].includes(result.result)) {
        const beforeFile = path.join(run, fs.readdirSync(run).find(n => n.startsWith('run-')) ?? '', `before-${result.logNo}.json`);
        const { planPersonPhotos } = await import('./lib/person-photo-plan.mjs');
        const before = json(beforeFile).snapshot;
        const slugs = [...new Set(planPersonPhotos(before.images, assetsForPost(assets, target), auditMap, target.changes, target).changes.map(c => c.slug))].sort();
        state.checked[result.logNo] = { slugs, signature: signature(target, slugs), verifiedAt: new Date().toISOString() };
      } else if (result.complete === false) {
        deferred.add(String(result.logNo));
        if (/공개 글과 편집기의 사진 목록이 다르다/.test(result.error ?? '') && !result.saved) {
          state.publicFallback ??= {};
          state.publicFallback[result.logNo] = true;
        }
        log({ event: 'needs-review', logNo: result.logNo, saved: result.saved, error: result.error });
        // One exceptional post does not hold unrelated posts; it is never automatically marked done.
        if (result.saved) {
          state.halted = { logNo: result.logNo, error: result.error, run };
          put('state.json', state);
          const error = new Error(`Saved post needs verification: ${result.logNo}`);
          error.fatal = true;
          throw error;
        }
      }
    }
    put('state.json', state);
    if (fs.existsSync(stopFile)) { stopped = true; break; }
    if (!handled.size) throw new Error(`Browser unavailable or runner failed (${code}): ${output.slice(-300)}`);
    const fresh = await prepare();
    targets = fresh.targets;
    assets = fresh.assets;
    bySlug = new Map(assets.map(a => [`${a.role}:${a.slug}`, a]));
    queue = pendingTargets();
  }
  log({ event: stopped ? 'stopped' : 'cycle-complete', verified: Object.keys(state.checked).length, total: targets.length, remaining: queue.length });
}

do {
  try { await cycle(); }
  catch (e) { log({ event: 'error', error: String(e), fatal: Boolean(e.fatal) }); if (!watch || e.fatal) throw e; }
  if (!watch || stopped) break;
  const nextCycle = Date.now() + 10 * 60 * 1000;
  while (!stopped && Date.now() < nextCycle) {
    if (fs.existsSync(stopFile)) { stopped = true; break; }
    await new Promise(resolve => setTimeout(resolve, Math.min(1000, nextCycle - Date.now())));
  }
  if (stopped) log({ event: 'stopped-between-cycles' });
} while (!stopped);
