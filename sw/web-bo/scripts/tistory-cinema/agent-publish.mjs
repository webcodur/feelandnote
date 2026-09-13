/** Stream only actionable events from the existing publisher; never retries or schedules another run. */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { loadPosts } from './lib/post-state.mjs';

export function publisherArgs(args) {
  const result = []; let run = false; let plan = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--run' || key === '--plan') {
      if (key === '--run') run = true; else plan = true;
      result.push(key);
    } else if (key === '--days' || key === '--limit') {
      const value = args[++i];
      if (!/^\d+$/.test(value ?? '') || !Number.isSafeInteger(Number(value)) || Number(value) < (key === '--days' ? 1 : 0)) throw new Error(`Invalid ${key}`);
      result.push(key, value);
    } else throw new Error(`Unsupported option: ${key}`);
  }
  if (run && plan) throw new Error('Use either --run or --plan.');
  return { args: [...result, ...(run ? ['--interactive'] : [])], mode: run ? 'run' : 'plan' };
}

export function createAgentOutput({ emit, forward, log = () => {} }) {
  const summary = { planned: 0, waiting: 0, done: 0, first: null, last: null };
  let pending = null; let session = null; let closed = false; let failure = null;
  const reject = (message) => emit({ event: 'input-error', message, session, challenge: pending?.challenge ?? null });
  return {
    line(line) {
      log(line);
      if (closed || !line.trim()) return;
      let data;
      try { data = JSON.parse(line); } catch { /* Existing human-readable progress is kept in the log. */ }
      if (Number.isSafeInteger(data?.challenge) && typeof data.image === 'string') {
        if (typeof data.session !== 'string' || !data.session) {
          failure = 'CAPTCHA event has no session identifier.';
          emit({ event: 'error', message: failure });
          return;
        }
        session = data.session; pending = data;
        emit({ ...data, event: 'challenge' });
      } else if (Number.isSafeInteger(data?.submitted)) {
        if (pending?.challenge === data.submitted && session === data.session) pending = null;
      } else if (line.startsWith('CHALLENGE_INPUT_ERROR:')) {
        reject(line);
      }
      const plan = line.match(/^대기 (\d+)편 \/ 편성 (\d+)편$/);
      if (plan) { summary.waiting = Number(plan[1]); summary.planned = Number(plan[2]); }
      const slot = line.match(/^\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s+(.+)$/);
      if (slot) { const value = { at: slot[1], name: slot[2] }; summary.first ??= value; summary.last = value; }
      if (/^#\d+ \d{4}-\d{2}-\d{2}/.test(line)) summary.done++;
      const done = line.match(/^검증하여 기록한 예약 (\d+)편/);
      if (done) summary.done = Number(done[1]);
      if (/^(STOP:|CAPTCHA_SERVICE_ERROR:|CAPTCHA_CAPTURE_ERROR:|TISTORY_ACCESS_RESTRICTED:|TISTORY_POST_LIMIT:)/.test(line)) failure = line;
    },
    answer(line) {
      if (closed) return;
      try {
        const command = JSON.parse(line);
        if (!session || command.session !== session) throw new Error('현재 캡차 이벤트의 session이 필요합니다.');
        if (command.capture === true) { forward(JSON.stringify({ session, capture: true }) + '\n'); return; }
        if (!pending || command.challenge !== pending.challenge || !Number.isSafeInteger(command.challenge)) throw new Error('현재 캡차 번호와 일치하지 않습니다.');
        if (typeof command.answer !== 'string' || !command.answer.trim() || command.answer.length > 50) throw new Error('화면에서 읽은 답 1~50자가 필요합니다.');
        forward(JSON.stringify({ session, challenge: command.challenge, answer: command.answer }) + '\n');
      } catch (error) { reject(error.message); }
    },
    finish({ exitCode, signal, mode, logFile, recorded, error } = {}) {
      if (closed) return;
      closed = true; pending = null;
      const message = failure ?? error;
      const code = exitCode === 0 && !message && !signal ? 0 : exitCode || 1;
      emit({ event: 'finished', mode, exitCode: code, signal: signal ?? null, ...summary,
        recorded: recorded ?? null, error: message ?? null, logFile });
      return code;
    },
  };
}

export async function runAgent(args, {
  entry = fileURLToPath(new URL('./fill-schedule.mjs', import.meta.url)),
  dir = path.join(ASSETS, 'tistory-cinema'), input = process.stdin,
  emit = (event) => process.stdout.write(JSON.stringify(event) + '\n'),
} = {}) {
  const options = publisherArgs(args);
  const logDir = path.join(dir, '_challenge'); fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `agent-${Date.now()}-${process.pid}.log`);
  const fd = fs.openSync(logFile, 'wx');
  const log = (line) => fs.writeSync(fd, line + '\n');
  let child; let aborted = null; let closed = false; let error = null;
  const tail = [];
  const bridge = createAgentOutput({ emit, log, forward: (line) => child.stdin.write(line) });
  const readers = [];
  const stop = (message) => { if (!closed && child?.exitCode === null && child.signalCode === null) { aborted = message; child.kill(); } };
  const onInterrupt = () => stop('Interrupted; no restart was scheduled.');
  const onInputEnd = () => { if (options.mode === 'run') stop('Input closed; the owned publishing process was stopped.'); };
  try {
    child = spawn(process.execPath, [entry, ...options.args], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.on('error', (cause) => { error ??= cause.message; });
    const completion = new Promise((resolve) => {
      child.once('error', (cause) => { error = cause.message; });
      // Wait for child output to drain. Normal child exit includes its finally cleanup.
      child.once('close', (code, signal) => resolve({ exitCode: code, signal }));
    });
    for (const stream of [child.stdout, child.stderr]) {
      const reader = readline.createInterface({ input: stream }); readers.push(reader);
      reader.on('line', (line) => { tail.push(line); if (tail.length > 8) tail.shift(); bridge.line(line); });
    }
    if (options.mode === 'run') {
      const reader = readline.createInterface({ input }); readers.push(reader);
      reader.on('line', (line) => bridge.answer(line));
      input.once('end', onInputEnd);
      if (input.readableEnded) onInputEnd();
    }
    process.once('SIGINT', onInterrupt); process.once('SIGTERM', onInterrupt);
    const result = await completion; closed = true;
    for (const reader of readers) reader.close();
    if (options.mode === 'run') input.pause();
    let recorded = null;
    try { recorded = loadPosts(path.join(dir, '_posts.json')).length; } catch (cause) { error ??= cause.message; }
    const reason = aborted ?? error ?? (result.exitCode ? tail.filter(Boolean).slice(-3).join('\n') : null);
    return bridge.finish({ ...result, mode: options.mode, logFile, recorded, error: reason });
  } finally {
    input.off('end', onInputEnd);
    process.off('SIGINT', onInterrupt); process.off('SIGTERM', onInterrupt);
    for (const reader of readers) reader.close();
    if (!closed) stop('Wrapper stopped.');
    fs.closeSync(fd);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await runAgent(process.argv.slice(2)); }
  catch (error) { console.error(JSON.stringify({ event: 'finished', exitCode: 1, error: error.message })); process.exitCode = 1; }
}
