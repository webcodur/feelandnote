// 독서 방식 러너 감시기. 러너를 직접 띄우고 로그를 읽어, 멈춤·확인 화면·오류를 처리하며 다음 실행을 잇는다.
//   node scripts/browser/reading-way-watch.mjs --rounds 3 -- --apply --shorten --limit 20 --pool u0:2,u0:0
//   node scripts/browser/reading-way-watch.mjs --status        현재 상태와 검수 대기 원고
//   node scripts/browser/reading-way-watch.mjs --wait 600      검수 대기 원고·경보·종료가 생기거나 시간이 다 될 때까지 기다린 뒤 상태 출력
// 원고의 사실 검수와 저장은 실행자가 한다. 감시기는 저장하지 않으며, 검수 대기 원고가 남아 있으면 같은 인물을 다시 요청하지 않도록 다음 실행을 미룬다.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';

const ROOT = 'C:/project/feelandnote';
const TEMP = path.join(os.tmpdir(), 'feelandnote');
const HOME = path.join(TEMP, 'reading-way-watch');
const STATUS = path.join(HOME, 'status.json');
const JOURNAL = path.join(HOME, 'watch.log');

// 26.10.30: 확인 화면(google.com/sorry)은 한 계정에서 뜨는 동안 다른 계정은 정상이었다. 그 계정만 쉬게 하고, 다시 걸리면 두 배로 늘린다.
const QUARANTINE_BASE_MS = 60 * 60 * 1000;
// 서로 다른 계정이 이 시간 안에 이 수만큼 걸리면 접속 전체의 문제로 보고 멈춘다.
const ESCALATE_WINDOW_MS = 60 * 60 * 1000, ESCALATE_ACCOUNTS = 2;
// 대기 예정 시각(resume_at)이 지나고도 이 시간 동안 로그가 없으면 러너가 멈춘 것으로 본다. 러너 자체의 응답 정체 처리(8분)보다 길게 둔다.
const SILENCE_MS = 25 * 60 * 1000;
// 확인 화면이 아닌 오류로 끝나면 이 간격으로 이 횟수까지 다시 띄운다.
const ERROR_RESTART_DELAY_MS = 2 * 60 * 1000, ERROR_RESTART_LIMIT = 3;
const TICK_MS = 15 * 1000;
const ERROR_EXIT_GRACE_MS = 60 * 1000;
// 접속 단위 차단이면 이 간격마다 계정 하나로 한 번만 열어 본다. 자주 열면 차단이 길어진다. 다 지나도 풀리지 않으면 사용자에게 넘긴다.
const BLOCK_PROBE_MS = [30, 60, 120].map(m => m * 60 * 1000);
const PROBE_TIMEOUT_MS = 2 * 60 * 1000;
const SORRY = /google\.com\/sorry\/|비정상적인 트래픽|unusual traffic/i;

// Gemini 첫 화면을 열어 확인 화면으로 넘어가는지만 본다. 판정 문구는 러너의 accessReason과 같다.
async function probe(profile) {
  const [account, google] = profile.split(':');
  const {AsideClient} = await import('file:///C:/project/feelandnote/.agents/skills/aside-browser/scripts/aside-client.mjs');
  const {freshSnapshot} = await import('file:///C:/project/feelandnote/.agents/skills/aside-browser/scripts/browser-helpers.mjs');
  const c = new AsideClient({account}); await c.ready;
  try {
    await c.callRepl(`await openTab('https://gemini.google.com/u/${google}/app?hl=ko'); await sleep(6000); console.log('opened')`, 'reading-way watch probe');
    const s = await freshSnapshot(c, false);
    await c.callRepl("await page.close(); console.log('closed')", 'reading-way watch probe').catch(() => {});
    return SORRY.test(s.tree) ? 'blocked' : 'clear';
  } finally { await c.close(); }
}

const now = () => Date.now();
const iso = t => new Date(t).toISOString();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const events = file => { try { return fs.readFileSync(file, 'utf8').split('\n').flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }); } catch { return []; } };

function journal(event, data = {}) {
  fs.mkdirSync(HOME, {recursive: true});
  const line = JSON.stringify({time: iso(now()), event, ...data});
  fs.appendFileSync(JOURNAL, line + '\n');
  console.log(line);
}
function saveStatus(s) { fs.mkdirSync(HOME, {recursive: true}); s.updated = iso(now()); s.heartbeat = now(); fs.writeFileSync(STATUS, JSON.stringify(s, null, 1)); }
// 감시기가 살아 있다는 표시. --wait는 이것이 끊기면 감시기가 죽은 것으로 보고 바로 알린다.
const HEARTBEAT_MS = 60 * 1000, HEARTBEAT_DEAD_MS = 5 * 60 * 1000;
function beat(s) { if (now() - (s.heartbeat ?? 0) >= HEARTBEAT_MS) saveStatus(s); }
async function nap(s, ms) { const end = now() + ms; while (now() < end) { await sleep(Math.min(TICK_MS, end - now())); beat(s); } }

// 이 감시기가 띄운 실행의 원고 중, 원본 파일이 남아 있어 아직 검수·저장되지 않은 것. 실행자가 저장 후 finish로 원본을 지우면 빠진다.
export function pendingDrafts(logs) {
  const last = {};
  for (const e of logs.flatMap(events).sort((a, b) => a.time.localeCompare(b.time)))
    if (['draft_ready', 'books_pending'].includes(e.event) && e.output) last[e.slug] = e;
  return Object.values(last).filter(e => fs.existsSync(e.output)).map(e => ({slug: e.slug, event: e.event, output: e.output}));
}

// 응답을 기다리던 대화. 다시 띄울 때 새 대화를 열지 않고 이어받는다.
export function inFlight(log) {
  const last = {};
  for (const e of events(log)) if (e.slug && ['submitted', 'conversation_located', 'resumed', 'draft_ready', 'books_pending', 'person_deferred', 'generation_stalled'].includes(e.event)) last[e.slug] = e;
  return Object.values(last).filter(e => ['conversation_located', 'resumed'].includes(e.event) && e.url).map(e => ({slug: e.slug, url: e.url, profile: e.profile}));
}

function parse(argv) {
  const o = {rounds: 1, runner: [], status: false, wait: null};
  const sep = argv.indexOf('--');
  const own = sep < 0 ? argv : argv.slice(0, sep);
  o.runner = sep < 0 ? [] : argv.slice(sep + 1);
  for (let i = 0; i < own.length; i++) {
    if (own[i] === '--rounds') o.rounds = Number(own[++i]);
    else if (own[i] === '--status') o.status = true;
    else if (own[i] === '--wait') o.wait = Number(own[++i]) * 1000;
    else throw Error('Unknown argument: ' + own[i]);
  }
  return o;
}

function report() {
  const s = readJson(STATUS, {state: 'none'});
  const pending = pendingDrafts(s.logs ?? []);
  const lastLog = s.logs?.at(-1);
  const tail = lastLog ? events(lastLog).filter(e => !['thinking_confirmed', 'message_confirmed', 'waiting_for_argon'].includes(e.event)).slice(-3).map(e => `${e.time.slice(11, 19)} ${e.event} ${e.slug ?? ''} ${e.profile ?? ''}`.trim()) : [];
  const quarantined = Object.entries(s.quarantine ?? {}).filter(([, q]) => q.until > now()).map(([k, q]) => `${k}~${iso(q.until).slice(11, 16)}`);
  const live = !['done', 'alert', 'none'].includes(s.state);
  const dead = live && (now() - (s.heartbeat ?? 0) > HEARTBEAT_DEAD_MS || (s.watcherPid && !alive(s.watcherPid)));
  return {state: dead ? 'watcher_dead' : s.state, note: dead ? `감시기 정지(마지막 ${s.updated?.slice(11, 19)}). 러너 ${s.pid && alive(s.pid) ? '생존 ' + s.pid : '없음'}` : s.note ?? null, round: s.round, rounds: s.rounds, pid: s.pid ?? null, quarantined, pending: pending.map(p => p.slug), recent: tail, updated: s.updated};
}

async function waitMode(ms) {
  const end = now() + ms;
  for (;;) {
    const r = report();
    if (r.pending.length || ['alert', 'done', 'stopped', 'none', 'watcher_dead'].includes(r.state) || now() >= end) { console.log(JSON.stringify(r)); return; }
    await sleep(TICK_MS);
  }
}

function withPool(args, pool, resumes) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pool') { out.push('--pool', pool.join(',')); i++; }
    else if (args[i] === '--resume') i++;
    else out.push(args[i]);
  }
  for (const r of resumes) out.push('--resume', `${r.slug}=${r.url}`);
  return out;
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

// 26.10.30 10:10쯤 감시기가 기록 없이 죽자 파이프로 묶인 러너도 함께 멈췄다. 러너 출력은 로그 파일에 직접 쓰고 감시기와 분리한다.
async function launch(args) {
  await fsp.mkdir(TEMP, {recursive: true});
  const dir = await fsp.mkdtemp(path.join(TEMP, 'reading-way-argon-runner-'));
  const log = path.join(dir, 'stdout.log');
  const fd = fs.openSync(log, 'a');
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/browser/reading-way-argon.mjs', ...args], {cwd: ROOT, windowsHide: true, detached: true, stdio: ['ignore', fd, fd]});
  fs.closeSync(fd);
  child.unref();
  return {pid: child.pid, log};
}

// 자기가 띄운 러너만 받은 PID로 끈다(AGENTS.md 개발 서버 규칙과 같은 원칙).
function killOwn(pid) { spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {windowsHide: true}); }

async function waitForUnblock(s, pool) {
  const probeWith = pool.find(k => !s.flags.some(f => f.profile === k)) ?? pool[0];
  for (const wait of BLOCK_PROBE_MS) {
    s.state = 'blocked'; s.note = `접속 단위 확인 화면. ${iso(now() + wait).slice(11, 16)}에 ${probeWith}로 확인`; saveStatus(s);
    await nap(s, wait);
    // 26.10.30 09:04: 확인용 Aside 연결이 응답 없이 멈춰 감시기 전체가 섰다. 시간 제한을 둔다.
    const result = await Promise.race([probe(probeWith), sleep(PROBE_TIMEOUT_MS).then(() => 'timeout')]).catch(e => 'error: ' + e.message);
    journal('block_probe', {profile: probeWith, result});
    if (result === 'clear') { s.quarantine = {}; s.flags = []; s.state = 'starting'; s.note = null; saveStatus(s); journal('block_cleared'); return true; }
  }
  s.state = 'alert'; s.note = '확인 화면이 풀리지 않음. Aside 브라우저에서 사람이 확인 화면을 통과해야 함'; saveStatus(s); journal('alert', {reason: 'block_not_cleared'});
  return false;
}

async function supervise(o) {
  const basePool = (o.runner[o.runner.indexOf('--pool') + 1] ?? '').split(',').filter(Boolean);
  if (!basePool.length) throw Error('Runner arguments need --pool');
  const prev = readJson(STATUS, {});
  if (prev.watcherPid && prev.watcherPid !== process.pid && alive(prev.watcherPid) && !['done', 'alert'].includes(prev.state)) throw Error('Another watcher is running: ' + prev.watcherPid);
  // 앞 감시기가 죽었어도 러너가 살아 있으면 새로 띄우지 않고 이어서 지켜본다.
  let adopt = prev.pid && prev.logs?.length && alive(prev.pid) ? {pid: prev.pid, log: prev.logs.at(-1)} : null;
  const resumeRound = adopt || prev.state === 'awaiting_review';
  const s = {state: 'starting', watcherPid: process.pid, runner: o.runner, rounds: o.rounds, round: resumeRound ? Math.max(0, (prev.round ?? 1) - 1) : 0,
    logs: resumeRound ? prev.logs ?? [] : [], quarantine: prev.quarantine ?? {}, flags: prev.flags ?? [], errorRestarts: []};
  saveStatus(s);
  journal('watch_started', {rounds: o.rounds, runner: o.runner.join(' '), adopt: adopt?.pid ?? null});
  let resumes = [], roundOpen = false;
  for (;;) {
    // 검수 대기 원고가 있으면 다시 띄우지 않는다. 같은 인물이 다시 선정돼 중복 요청이 나간다.
    const pending = adopt ? [] : pendingDrafts(s.logs);
    if (pending.length) { if (s.state !== 'awaiting_review') { s.state = 'awaiting_review'; s.note = `검수 대기 ${pending.length}건`; saveStatus(s); journal('awaiting_review', {slugs: pending.map(p => p.slug)}); } await nap(s, TICK_MS); continue; }
    if (!roundOpen) {
      if (s.round >= o.rounds) { s.state = 'done'; s.note = `${s.round}회 실행 완료`; saveStatus(s); journal('watch_done', {rounds: s.round}); return; }
      s.round++; roundOpen = true;
    }
    const pool = basePool.filter(k => !(s.quarantine[k]?.until > now()));
    if (!pool.length) {
      const until = Math.min(...basePool.map(k => s.quarantine[k].until));
      s.state = 'cooldown'; s.note = `모든 계정 격리 중. ${iso(until).slice(11, 16)}에 재개`; saveStatus(s); journal('all_quarantined', {until: iso(until)});
      await nap(s, until - now() + 1000); continue;
    }
    let run;
    if (adopt) { run = adopt; adopt = null; journal('runner_adopted', run); }
    else {
      const args = withPool(o.runner, pool, resumes.filter(r => pool.includes(r.profile)));
      run = await launch(args);
      s.logs.push(run.log);
      journal('runner_started', {pid: run.pid, log: run.log, pool: pool.join(','), resumes: resumes.map(r => r.slug)});
    }
    s.state = 'running'; s.note = null; s.pid = run.pid; saveStatus(s);
    const startedAt = now();
    let code = null, silent = false;
    while (code === null) {
      await sleep(TICK_MS);
      beat(s);
      if (!alive(run.pid)) { code = 0; break; }
      const ev = events(run.log), last = ev.at(-1);
      const lastAt = last ? Date.parse(last.time) : startedAt;
      const waitUntil = Math.max(0, ...ev.filter(e => e.resume_at).map(e => Date.parse(e.resume_at)).filter(Number.isFinite));
      // 26.10.30 13:05: 러너가 error를 기록하고도 정리 단계에서 멈춰 종료되지 않았다.
      if (last?.event === 'error' && now() - lastAt > ERROR_EXIT_GRACE_MS) { journal('runner_stuck_after_error', {pid: run.pid}); killOwn(run.pid); code = -1; break; }
      if (now() - Math.max(lastAt, waitUntil, startedAt) > SILENCE_MS) { silent = true; journal('runner_silent', {pid: run.pid, last: last?.event, lastAt: last?.time}); killOwn(run.pid); code = -1; }
    }
    s.pid = null;
    const ev = events(run.log);
    const finished = ev.findLast(e => e.event === 'finished');
    const error = ev.findLast(e => e.event === 'error');
    resumes = inFlight(run.log);
    if (finished && !error) {
      roundOpen = false;
      journal('round_finished', {round: s.round, completed: finished.completed, total: finished.total, deferred: finished.deferred});
      if (finished.total === 0) { s.state = 'done'; s.note = '대상 없음'; saveStatus(s); journal('watch_done', {reason: 'no_targets'}); return; }
      if (finished.completed === 0) { s.state = 'alert'; s.note = '한 건도 회수하지 못하고 끝남'; saveStatus(s); journal('alert', {reason: 'empty_round'}); return; }
      resumes = [];
      continue;
    }
    if (error?.code === 'GOOGLE_VERIFICATION_REQUIRED') {
      const blocked = ev.findLast(e => e.event === 'access_blocked' && ['network_verification', 'human_verification'].includes(e.reason));
      const key = blocked?.profile;
      if (!key) { s.state = 'alert'; s.note = '확인 화면 계정을 특정하지 못함'; saveStatus(s); journal('alert', {reason: 'verification_unknown_account'}); return; }
      const strikes = (s.quarantine[key]?.strikes ?? 0) + 1;
      s.quarantine[key] = {until: now() + QUARANTINE_BASE_MS * 2 ** (strikes - 1), strikes, reason: blocked.reason};
      s.flags.push({profile: key, time: now()});
      journal('account_quarantined', {profile: key, until: iso(s.quarantine[key].until), strikes});
      const recent = new Set(s.flags.filter(f => now() - f.time < ESCALATE_WINDOW_MS).map(f => f.profile));
      if (recent.size >= ESCALATE_ACCOUNTS) {
        journal('connection_blocked', {profiles: [...recent]});
        if (!(await waitForUnblock(s, basePool))) return;
      }
      continue;
    }
    // 그 밖의 비정상 종료와 무응답은 짧게 쉬고 다시 띄운다.
    s.errorRestarts = s.errorRestarts.filter(t => now() - t < 60 * 60 * 1000);
    if (s.errorRestarts.length >= ERROR_RESTART_LIMIT) { s.state = 'alert'; s.note = `오류 반복: ${error?.message ?? (silent ? '무응답' : 'exit ' + code)}`; saveStatus(s); journal('alert', {reason: 'repeated_errors', message: error?.message}); return; }
    s.errorRestarts.push(now());
    // 26.10.30 12:47쯤 Aside 앱이 내려가 러너가 "Aside isn't running"으로 멈췄다. aside-browser 스킬의 복구 절차대로 앱을 다시 띄운다.
    if (/Aside isn't running/.test(error?.message ?? '')) {
      spawn('C:/Program Files/Aside/Application/Aside.exe', [], {detached: true, stdio: 'ignore', windowsHide: false}).unref();
      journal('aside_app_started', {});
    }
    s.state = 'cooldown'; s.note = error?.message ?? (silent ? '무응답 러너 종료' : 'exit ' + code); saveStatus(s);
    journal('runner_restart_scheduled', {reason: s.note, resumes: resumes.map(r => r.slug)});
    await nap(s, ERROR_RESTART_DELAY_MS);
  }
}

const direct = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).toLowerCase();
const o = direct ? parse(process.argv.slice(2)) : {status: false, wait: null, skip: true};
if (o.skip) {}
else if (o.status) console.log(JSON.stringify(report(), null, 1));
else if (o.wait != null) await waitMode(o.wait);
else await supervise(o).catch(e => { const s = readJson(STATUS, {}); s.state = 'alert'; s.note = e.message; saveStatus(s); journal('alert', {reason: 'watcher_error', message: e.message}); process.exitCode = 1; });
