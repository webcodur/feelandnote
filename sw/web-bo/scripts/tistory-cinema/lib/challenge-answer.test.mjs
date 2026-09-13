import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { fileAnswerStream, challengeLogger } from './challenge-file.mjs';
import { startChallengeSession, parseChallengeCommand, throwIfChallengeFailed } from './challenge-session.mjs';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate, label, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (predicate()) return; await delay(20); }
  assert.fail(label);
}

function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-answer-test-'));
  t.after(() => { assert.ok(dir.startsWith(path.join(os.tmpdir(), 'tistory-answer-test-'))); fs.rmSync(dir, { recursive: true }); });
  return dir;
}

function fakePage() {
  const state = { visible: true, text: '지도에 있는 장소의 이름', image: 'https://fixture.invalid/map-a.png', typed: '', clicks: [], frameReads: 0, onType: null };
  const frame = {
    url: () => 'https://dkaptcha.kakao.com/fixture',
    frameElement: async () => ({ boundingBox: async () => state.visible ? { x: 0, y: 0, width: 300, height: 200 } : null }),
    $eval: async (selector) => selector === 'body' ? { text: state.text, images: [state.image] } : false,
    waitForSelector: async () => {}, waitForFunction: async () => {}, focus: async () => {},
    type: async (_selector, answer) => { state.typed = answer; state.onType?.(); },
    click: async () => { state.clicks.push({ answer: state.typed, image: state.image }); state.visible = false; },
  };
  const page = {
    frames: () => { state.frameReads++; return state.visible ? [frame] : []; },
    screenshot: async ({ path: file }) => fs.writeFileSync(file, 'local fixture screenshot'),
    keyboard: { down: async () => {}, up: async () => {}, press: async () => {} },
  };
  return { page, state };
}

function attach(t, directory, fixture, { files = false } = {}) {
  const events = [], diagnostics = [];
  const answers = files ? fileAnswerStream(directory, { interval: 25, retryEvery: 2 }) : null;
  const input = answers?.stream ?? new PassThrough();
  const log = (line) => { diagnostics.push(line); if (line.startsWith('{')) events.push(JSON.parse(line)); };
  const stop = startChallengeSession(fixture.page, { directory, input,
    log: files ? challengeLogger(directory, { log, onSubmitted: () => answers.settle() }) : log });
  if (answers) answers.useId(stop.pendingId);
  t.after(async () => { await stop(); answers?.stop(); input.destroy(); });
  return { stop, answers, input, events, diagnostics, captured: () => events.filter((event) => event.challenge).at(-1) };
}

test('stdin compatibility validates a supplied session before question or capture commands', () => {
  assert.deepEqual(parseChallengeCommand('{"challenge":1,"answer":"가"}', 1, 'current'), { challenge: 1, answer: '가' });
  assert.equal(parseChallengeCommand('{"session":"current","challenge":1,"answer":"가"}', 1, 'current').session, 'current');
  for (const command of [{ session: 'old', challenge: 1, answer: '가' }, { session: 'old', capture: true }]) {
    assert.throws(() => parseChallengeCommand(JSON.stringify(command), 1, 'current'), /session/);
  }
});

test('restart isolates leftover files even when both sessions use question 1', async (t) => {
  const dir = temp(t), firstFixture = fakePage();
  const first = attach(t, dir, firstFixture, { files: true });
  await until(() => first.captured(), 'first capture missing');
  const old = first.captured();
  await first.stop(); first.answers.stop(); first.input.destroy();
  fs.writeFileSync(old.answerFile, '이전답\n');
  fs.writeFileSync(path.join(dir, 'answer-1.txt'), '공유폴더의이전답\n');
  const currentFixture = fakePage(), second = attach(t, dir, currentFixture, { files: true });
  await until(() => second.captured(), 'second capture missing');
  const current = second.captured();
  assert.equal(old.challenge, 1); assert.equal(current.challenge, 1); assert.notEqual(old.session, current.session);
  assert.equal(path.dirname(current.answerFile), second.stop.directory);
  await delay(100); assert.equal(currentFixture.state.clicks.length, 0);
  fs.writeFileSync(current.answerFile, '현재답\n');
  await until(() => currentFixture.state.clicks.length === 1, 'current file not submitted');
  assert.equal(currentFixture.state.clicks[0].answer, '현재답');
  assert.ok(fs.existsSync(old.answerFile));
  await until(() => fs.existsSync(current.answerFile + '.done'), 'current answer not settled');
});

test('different numbers and changed images never reuse a pending file answer', async (t) => {
  const dir = temp(t), fixture = fakePage(), session = attach(t, dir, fixture, { files: true });
  await until(() => session.captured(), 'capture missing');
  const first = session.captured();
  fs.writeFileSync(path.join(session.stop.directory, 'answer-99.txt'), '다른번호\n');
  fixture.state.visible = false;
  fs.writeFileSync(first.answerFile, '첫문제답\n');
  await delay(120); assert.equal(fixture.state.clicks.length, 0);
  fixture.state.image = 'https://fixture.invalid/map-b.png'; fixture.state.visible = true;
  await until(() => session.captured()?.challenge === 2, 'changed image did not get a new identity');
  await delay(100); assert.equal(fixture.state.clicks.length, 0);
  const next = session.captured(); fs.writeFileSync(next.answerFile, '둘째문제답\n');
  await until(() => fixture.state.clicks.length === 1, 'new answer not submitted');
  assert.deepEqual(fixture.state.clicks, [{ answer: '둘째문제답', image: fixture.state.image }]);
  assert.ok(fs.existsSync(first.answerFile));
});

test('the same visible problem returns with its original identity after frame loss', async (t) => {
  const dir = temp(t), fixture = fakePage(), session = attach(t, dir, fixture, { files: true });
  await until(() => session.captured(), 'capture missing');
  const first = session.captured(); fixture.state.visible = false;
  fs.writeFileSync(first.answerFile, '같은문제답\n');
  await delay(4300); assert.equal(session.stop.pendingId(), null); assert.equal(fixture.state.clicks.length, 0);
  fixture.state.visible = true;
  await until(() => fixture.state.clicks.length === 1, 'same-signature return did not accept the original answer');
  assert.equal(session.events.filter((event) => event.challenge).length, 1);
  assert.equal(session.events.find((event) => event.submitted)?.submitted, first.challenge);
});

test('partial text, incomplete UTF-8 and multiple lines are not committed answers', async (t) => {
  const dir = temp(t), fixture = fakePage(), session = attach(t, dir, fixture, { files: true });
  await until(() => session.captured(), 'capture missing');
  const file = session.captured().answerFile;
  for (const partial of ['첫', Buffer.from([0xea, 0xb0, 0x0a]), '첫줄\n둘째줄\n', '\n']) {
    fs.writeFileSync(file, partial); await delay(100); assert.equal(fixture.state.clicks.length, 0);
  }
  fs.writeFileSync(file, '완료된답\n');
  await until(() => fixture.state.clicks.length === 1, 'complete UTF-8 line not submitted');
  assert.equal(fixture.state.clicks[0].answer, '완료된답');
});

test('a problem replaced during typing cannot receive the old answer', async (t) => {
  const dir = temp(t), fixture = fakePage(), session = attach(t, dir, fixture);
  await until(() => session.captured(), 'capture missing');
  const first = session.captured(); fixture.state.onType = () => { fixture.state.image = 'https://fixture.invalid/new.png'; };
  session.input.write(JSON.stringify({ session: first.session, challenge: first.challenge, answer: '이전답' }) + '\n');
  await until(() => session.diagnostics.some((line) => line.includes('답 입력 중 인증 문제가 바뀌었다')), 'replacement was not rejected');
  assert.equal(fixture.state.clicks.length, 0);
  await until(() => session.captured()?.challenge === 2, 'replacement capture missing');
  session.input.write(JSON.stringify({ session: first.session, challenge: first.challenge, answer: '이전답' }) + '\n');
  await delay(80); assert.equal(fixture.state.clicks.length, 0);
});

test('EOF aborts pending input and stop waits for capture work without later events', async (t) => {
  const dir = temp(t), fixture = fakePage(), session = attach(t, dir, fixture);
  await until(() => session.captured(), 'capture missing');
  const captured = session.captured();
  // A final unterminated JSON object delivered by readline at EOF must not cause a click.
  session.input.end(JSON.stringify({ session: captured.session, challenge: captured.challenge, answer: '종료답' }));
  await until(() => session.stop.failure(), 'EOF did not stop the session');
  assert.equal(session.stop.failure().code, 'CAPTCHA_INPUT_CLOSED');
  assert.throws(() => throwIfChallengeFailed(fixture.page), (error) => error.code === 'CAPTCHA_INPUT_CLOSED');
  await session.stop();
  const count = session.events.length, reads = fixture.state.frameReads;
  await delay(600); assert.equal(session.events.length, count); assert.equal(fixture.state.frameReads, reads); assert.equal(fixture.state.clicks.length, 0);
  assert.doesNotThrow(() => throwIfChallengeFailed(fixture.page));
});

test('normal completion stops both the file watcher and the in-flight capture', async (t) => {
  const dir = temp(t), fixture = fakePage(), session = attach(t, dir, fixture, { files: true });
  await delay(550); // The capture has started and is waiting for its layout delay.
  session.answers.stop(); await session.stop(); session.input.destroy();
  const count = session.events.length, reads = fixture.state.frameReads;
  fs.writeFileSync(path.join(session.stop.directory, 'answer-1.txt'), '종료후답\n');
  await delay(650);
  assert.equal(session.events.length, count); assert.equal(fixture.state.frameReads, reads); assert.equal(fixture.state.clicks.length, 0);
});

test('stopping a real child session exits even when its parent stdin pipe stays open', async (t) => {
  const directory = temp(t);
  const source = `import { startChallengeSession } from ${JSON.stringify(new URL('./challenge-session.mjs', import.meta.url).href)};
    const stop = startChallengeSession({ frames: () => [] }, { directory: ${JSON.stringify(directory)}, log: () => {} });
    process.stdin.once('data', () => setTimeout(async () => { await stop(); process.stdout.write('STOPPED\\n'); }, 20));`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill(); child.stdin.destroy(); });
  let output = '', errors = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { errors += chunk; });
  child.stdin.write('{"capture":true}\n'); // Exercise a pipe that actually received an input line, without closing it.
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Child remained alive after stop(): ' + output + errors)); }, 3500);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => { clearTimeout(timer); resolve(code); });
  });
  assert.equal(code, 0, errors); assert.equal(output, 'STOPPED\n');
});
