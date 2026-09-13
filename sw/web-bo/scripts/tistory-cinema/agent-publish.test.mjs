import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { publisherArgs, createAgentOutput, runAgent } from './agent-publish.mjs';

function harness() {
  const events = []; const sent = []; const log = [];
  const bridge = createAgentOutput({ emit: (e) => events.push(e), forward: (s) => sent.push(JSON.parse(s)), log: (s) => log.push(s) });
  return { bridge, events, sent, log };
}

test('preview never acquires interactive mode; unsupported and conflicting options fail', () => {
  assert.deepEqual(publisherArgs([]), { args: [], mode: 'plan' });
  assert.deepEqual(publisherArgs(['--plan', '--limit', '951']).args, ['--plan', '--limit', '951']);
  assert.deepEqual(publisherArgs(['--run', '--limit', '5']).args, ['--run', '--limit', '5', '--interactive']);
  for (const args of [['--run', '--plan'], ['--limit'], ['--days', '0'], ['--limit', '-1'], ['--limit', '1.1'], ['--retry'], ['--entry', 'x']]) assert.throws(() => publisherArgs(args));
});

test('892 planned rows and routine progress become one accurate final event', () => {
  const { bridge, events, log } = harness();
  bridge.line('대기 892편 / 편성 892편');
  for (let i = 0; i < 892; i++) bridge.line(`  2026-09-28 18:00  원고${i}`);
  bridge.line('#61 2026-09-28 18:00 원고0');
  bridge.line('검증하여 기록한 예약 1편');
  assert.equal(events.length, 0);
  assert.equal(bridge.finish({ exitCode: 0, recorded: 60, mode: 'run' }), 0);
  assert.equal(events.length, 1);
  assert.deepEqual([events[0].waiting, events[0].planned, events[0].done, events[0].recorded], [892, 892, 1, 60]);
  assert.equal(events[0].first.name, '원고0');
  assert.equal(events[0].last.name, '원고891');
  assert.equal(log.length, 895);
  bridge.finish({ exitCode: 0 });
  assert.equal(events.length, 1);
});

test('only the displayed session and question can receive an answer', () => {
  const { bridge, events, sent } = harness();
  const show = (session, challenge) => bridge.line(JSON.stringify({ session, challenge, image: 'screen.png', answerFile: 'answer.txt' }));
  const answer = (session, challenge) => bridge.answer(JSON.stringify({ session, challenge, answer: '정답' }));
  show('first', 1);
  answer('old', 1); answer('first', 2); bridge.answer('not json');
  assert.equal(sent.length, 0);
  answer('first', 1);
  assert.deepEqual(sent, [{ session: 'first', challenge: 1, answer: '정답' }]);
  bridge.line(JSON.stringify({ session: 'old', submitted: 1 }));
  answer('first', 1);
  assert.equal(sent.length, 2);
  bridge.line(JSON.stringify({ session: 'first', submitted: 1 }));
  answer('first', 1);
  assert.equal(sent.length, 2);
  show('second', 1);
  answer('first', 1); answer('second', 1);
  assert.equal(sent.length, 3);
  bridge.answer(JSON.stringify({ session: 'first', capture: true }));
  assert.equal(sent.length, 3);
  bridge.answer(JSON.stringify({ session: 'second', capture: true }));
  assert.deepEqual(sent.at(-1), { session: 'second', capture: true });
  bridge.finish({ exitCode: 0 });
  assert.equal(events.at(-1).done, 0, 'CAPTCHA submission is not a saved post');
  answer('second', 1);
  assert.equal(sent.length, 4);
});

test('missing challenge session and explicit publisher failure cannot report success', () => {
  const a = harness();
  a.bridge.line('{"challenge":1,"image":"screen.png"}');
  assert.equal(a.bridge.finish({ exitCode: 0 }), 1);
  const b = harness();
  b.bridge.line('STOP: 원고 / TISTORY_POST_LIMIT: 하루 최대 5개');
  b.bridge.line('검증하여 기록한 예약 2편');
  assert.equal(b.bridge.finish({ exitCode: 1, error: 'unhelpful last line' }), 1);
  assert.match(b.events.at(-1).error, /하루 최대 5개/);
  assert.equal(b.events.at(-1).done, 2);
});

function fixture(t, source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinema-agent-'));
  const entry = path.join(dir, 'fixture.mjs');
  fs.writeFileSync(entry, source, 'utf8');
  fs.writeFileSync(path.join(dir, '_posts.json'), '[]');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, entry };
}

test('child stdin protocol, verified record, and cleanup finish before final output', { timeout: 5000 }, async (t) => {
  const location = fixture(t, `
    import fs from 'node:fs'; import readline from 'node:readline';
    const dir = new URL('.', import.meta.url);
    console.log('대기 1편 / 편성 1편');
    console.log('  2026-09-28 18:00  원고');
    console.log(JSON.stringify({session:'live',challenge:1,image:'screen.png'}));
    const input = readline.createInterface({input:process.stdin});
    input.once('line', line => {
      const answer = JSON.parse(line);
      if(answer.session !== 'live' || answer.challenge !== 1 || answer.answer !== '정답') process.exit(9);
      console.log(JSON.stringify({session:'live',submitted:1}));
      fs.writeFileSync(new URL('_posts.json',dir), JSON.stringify([{id:61,name:'원고'}]));
      console.log('#61 2026-09-28 18:00 원고');
      console.log('검증하여 기록한 예약 1편');
      fs.writeFileSync(new URL('cleaned',dir),'yes');
      input.close(); process.stdin.destroy();
    });
  `);
  const input = new PassThrough(); const events = [];
  const exitCode = await runAgent(['--run'], { ...location, input, emit: (event) => {
    events.push(event);
    if (event.event === 'challenge') input.write(JSON.stringify({ session: event.session, challenge: event.challenge, answer: '정답' }) + '\n');
    if (event.event === 'finished') assert.equal(fs.readFileSync(path.join(location.dir, 'cleaned'), 'utf8'), 'yes');
  } });
  assert.equal(exitCode, 0);
  assert.deepEqual(events.map(e => e.event), ['challenge', 'finished']);
  assert.equal(events.at(-1).recorded, 1);
  assert.equal(events.at(-1).done, 1);
  assert.match(fs.readFileSync(events.at(-1).logFile, 'utf8'), /검증하여 기록한 예약 1편/);
});

test('quota exit preserves verified partial progress and never reruns child', { timeout: 5000 }, async (t) => {
  const location = fixture(t, `
    import fs from 'node:fs';
    fs.appendFileSync(new URL('runs',import.meta.url),'1');
    fs.writeFileSync(new URL('_posts.json',import.meta.url),JSON.stringify([{id:61,name:'원고'}]));
    console.log('#61 2026-09-28 18:00 원고');
    console.error('STOP: 다음원고 / TISTORY_POST_LIMIT: 하루 최대 5개');
    console.log('검증하여 기록한 예약 1편');
    process.exitCode=1;
  `);
  const events = [];
  assert.equal(await runAgent(['--run'], { ...location, input: new PassThrough(), emit: e => events.push(e) }), 1);
  assert.equal(fs.readFileSync(path.join(location.dir, 'runs'), 'utf8'), '1');
  assert.equal(events.length, 1);
  assert.equal(events[0].done, 1);
  assert.equal(events[0].recorded, 1);
  assert.match(events[0].error, /하루 최대 5개/);
});

test('closing input stops only the owned waiting child without reporting success', { timeout: 5000 }, async (t) => {
  const location = fixture(t, `console.log(JSON.stringify({session:'waiting',challenge:1,image:'screen.png'})); setInterval(()=>{},1000);`);
  const input = new PassThrough(); const events = [];
  assert.equal(await runAgent(['--run'], { ...location, input, emit: e => {
    events.push(e); if (e.event === 'challenge') input.end();
  } }), 1);
  assert.equal(events.at(-1).event, 'finished');
  assert.match(events.at(-1).error, /Input closed/);
});
