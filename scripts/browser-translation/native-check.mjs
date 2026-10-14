import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { serve } from './serve.mjs';

const output = resolve('.artifacts/browser-translation');
await mkdir(output, { recursive: true });
const server = await serve();
const url = `http://127.0.0.1:${server.address().port}/`;
const source = (await readFile(new URL('./aside-smoke.js', import.meta.url), 'utf8'))
  .replace('__LAB_URL__', JSON.stringify(url));
const cli = resolve(process.env.LOCALAPPDATA, 'Aside/CLI/current/aside.exe');
let log = '';
try {
  await new Promise((done, reject) => {
    const child = spawn(cli, ['repl', source], { windowsHide: true });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Aside native test timeout')); }, 125_000);
    child.stdout.on('data', chunk => { log += chunk; process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { log += chunk; process.stderr.write(chunk); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? done() : reject(new Error(`Aside exit ${code}`)); });
  });
  const records = log.split(/\r?\n/).filter(line => line.startsWith('{"')).map(line => JSON.parse(line));
  await writeFile(resolve(output, 'native-check.json'), JSON.stringify({ type: 'REAL Aside native Translator API', records }, null, 2));
  const languages = records.filter(record => record.target);
  assert.equal(languages.length, 8, 'All eight languages must actually finish');
  languages.forEach(record => assert.equal(record.state, 'translated', record.target));
  const result = records.find(record => record.modal);
  assert(result.restored, 'English original must be restored');
  assert.equal(result.modal.reopenResult.metrics.calls, result.modal.beforeReopen.calls, 'Reopening must use cache');
  assert.equal(result.modal.longReview.state, 'translated');
  assert.equal(result.modal.longReview.paragraphs, 3, 'Three paragraphs must survive translation');
  console.log('PASS: 8 real languages, changed modal data, cache reuse, paragraphs, original restoration.');
} finally { await new Promise(done => server.close(done)); }
