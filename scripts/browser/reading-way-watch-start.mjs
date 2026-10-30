// 감시기를 이 셸·Kiro 터미널과 분리된 숨김 프로세스로 띄우고 PID만 출력하고 끝난다. 인수는 감시기에 그대로 넘긴다.
//   node scripts/browser/reading-way-watch-start.mjs --rounds 2 -- --apply --shorten --limit 20 --pool u0:2,u0:0
// 26.10.30: Kiro 터미널에서 띄운 감시기가 기록 없이 사라졌다. 장시간 실행은 이 경로로만 띄운다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const home = path.join(os.tmpdir(), 'feelandnote', 'reading-way-watch');
fs.mkdirSync(home, {recursive: true});
const fd = fs.openSync(path.join(home, 'watcher-stderr.log'), 'a');
const child = spawn(process.execPath, ['scripts/browser/reading-way-watch.mjs', ...process.argv.slice(2)], {cwd: 'C:/project/feelandnote', detached: true, windowsHide: true, stdio: ['ignore', 'ignore', fd]});
child.unref();
console.log(JSON.stringify({watcherPid: child.pid}));
