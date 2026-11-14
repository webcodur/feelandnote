// 예약 글 하나의 예약 시각만 옮긴다. 본문·제목·날짜 외 발행 설정은 저장 전후로 대조하고, 다시 열어 새 시각을 확인한 뒤 원장 scheduledAt을 고친다.
// 사용: node scripts/naver-blog/reschedule-post.mjs --log=<글번호> --to="YYYY-MM-DD HH:MM" [--apply]
import fs from 'node:fs';
import { getBrowser } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';
import { setSchedule } from './publish-drafts.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const log = arg('log'), to = arg('to'), apply = process.argv.includes('--apply');
const m = to?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
if (!log || !m) throw new Error('--log=<글번호> --to="YYYY-MM-DD HH:MM" 가 필요하다');
const FILE = 'D:/feelandnote/blog-assets/naver-blog/posts.json';
const posts = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const post = posts.find(p => String(p.logNo) === log);
if (!post?.scheduledAt) throw new Error(`원장에 예약 글이 없다: ${log}`);
const next = `${m[1]}. ${m[2]}. ${m[3]} ${m[4]}:${m[5]}`;
if (posts.some(p => p.scheduledAt === next && !['deleted', 'replaced', 'skip'].includes(p.link))) throw new Error(`이미 차지된 칸이다: ${next}`);
console.log(JSON.stringify({ log, title: post.title, from: post.scheduledAt, to: next, apply }));
if (!apply) process.exit(0);

const { browser } = await getBrowser({ background: true }), page = await browser.newPage();
const editor = createExistingEditor(page);
const strip = s => { const { date, hour, minute, ...rest } = s; return JSON.stringify(rest); };
try {
  const opened = await editor.openTarget({ ...post, body: undefined });
  if (!opened.reservation) throw new Error('예약 목록에서 불러오지 못했다');
  await setSchedule(page, new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  const now = await editor.settings();
  if (strip(now) !== strip(opened.state)) throw new Error('날짜 외 발행 설정이 바뀌었다');
  if (JSON.stringify(await editor.content()) !== JSON.stringify(opened.content)) throw new Error('본문이 바뀌었다');
  await editor.click('button[class*=confirm_btn]');
  await page.waitForFunction(id => location.href.includes('logNo=' + id), { timeout: 30000 }, log);
  const reopened = await editor.openTarget({ ...post, scheduledAt: next, body: undefined });
  if (`${reopened.state.date?.replace(/\s/g, '')} ${reopened.state.hour}:${reopened.state.minute}` !== `${m[1]}.${m[2]}.${m[3]} ${m[4]}:${m[5]}`) throw new Error('다시 연 예약 시각이 다르다');
  if (strip(reopened.state) !== strip(opened.state)) throw new Error('다시 연 발행 설정이 다르다');
  if (JSON.stringify(reopened.content) !== JSON.stringify(opened.content)) throw new Error('다시 연 본문이 다르다');
  const all = JSON.parse(fs.readFileSync(FILE, 'utf8')), p = all.find(x => String(x.logNo) === log);
  if (p.scheduledAt !== post.scheduledAt) throw new Error('작업 중 원장이 바뀌었다');
  p.scheduledAt = next; fs.writeFileSync(FILE + '.tmp', JSON.stringify(all, null, 2)); fs.renameSync(FILE + '.tmp', FILE);
  console.log(JSON.stringify({ stage: 'rescheduled', log, scheduledAt: next }));
} finally { await page.close(); await browser.disconnect(); }
process.exit(0);
