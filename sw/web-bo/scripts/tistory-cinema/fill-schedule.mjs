/** Fill the next vacant scheduled slots. No midnight timer and no implicit retry loop. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { loadPosts, assertScheduleUnique, hasActiveSchedule } from './lib/post-state.mjs';
import { SLOT_TIMES, addDays } from './lib/schedule.mjs';
import { runBatch } from './publish-batch.mjs';

export function nextStart(posts, now = Date.now()) {
  assertScheduleUnique(posts);
  const today = new Date(now + 9 * 3600000).toISOString().slice(0, 10);
  const occupied = new Set(posts.filter(hasActiveSchedule).map((p) => p.at));
  const first = [...occupied].sort()[0]?.slice(0, 10);
  let day = first && first > today ? first : addDays(today, 1);
  for (;;) {
    if (SLOT_TIMES.some((time) => !occupied.has(day + ' ' + time))) return day;
    day = addDays(day, 1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const argv = process.argv.slice(2);
    const allowed = new Set(['--run', '--plan', '--limit', '--days', '--interactive']);
    const options = { days: 7, limit: 10, run: false };
    for (let i = 0; i < argv.length; i++) {
      const key = argv[i];
      if (!allowed.has(key)) throw new Error('Unknown option: ' + key + '. Waiting and automatic retries are disabled.');
      if (key === '--run') options.run = true;
      else if (key === '--interactive') options.interactive = true;
      else if (key === '--limit' || key === '--days') {
        if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing option value: ' + key);
        options[key.slice(2)] = Number(argv[++i]);
      }
    }
    if (argv.includes('--plan') && argv.includes('--run')) throw new Error('Use either --plan or --run.');
    if (options.interactive && !options.run) throw new Error('--interactive는 --run과 함께 사용한다.');
    const posts = loadPosts(path.join(ASSETS, 'tistory-cinema', '_posts.json'));
    options.start = nextStart(posts);
    const result = await runBatch(options);
    if (result.failed) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
