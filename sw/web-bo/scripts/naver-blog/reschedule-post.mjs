// 예약 글 하나의 예약 시각만 옮긴다. 본문·제목·날짜 외 발행 설정은 저장 전후로 대조하고, 다시 열어 새 시각을 확인한 뒤 원장 scheduledAt을 고친다.
// 사용: node scripts/naver-blog/reschedule-post.mjs --log=<글번호> --to="YYYY-MM-DD HH:MM" [--apply]
//       node scripts/naver-blog/reschedule-post.mjs --log=<글번호> --now [--apply]  예약을 풀고 지금 바로 발행한다(발행 시각을 「현재」로 바꾼다).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { getBrowser } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';
import { setSchedule } from './publish-drafts.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const log = arg('log'), to = arg('to'), apply = process.argv.includes('--apply'), immediate = process.argv.includes('--now');
const m = to?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
if (!log || (!m && !immediate) || (m && immediate)) throw new Error('--log=<글번호> 와 --to="YYYY-MM-DD HH:MM" 또는 --now 중 하나가 필요하다');
const FILE = 'D:/feelandnote/blog-assets/naver-blog/posts.json';
// 새 글 발행 도구는 초안 원장의 scheduledAt으로도 칸이 찼는지 본다. 글 원장을 고칠 때 같은 글번호의 초안 시각도 맞춘다(26.11.17: 옛 시각이 남아 빈 칸을 막았다).
const DRAFTS = 'D:/feelandnote/blog-assets/naver-blog/celeb-drafts.json';
// 시각을 옮기면 편성 화면(portraits.html)도 같은 원장으로 다시 만든다. 실패해도 시각 변경은 유효하므로 알리기만 한다.
const refreshBoard = () => { try { execFileSync(process.execPath, ['--env-file=.env', 'scripts/naver-blog/portrait-board.mjs'], { stdio: 'ignore' }); } catch (e) { console.error('편성 화면 갱신 실패: ' + e.message); } };
const syncDraft = at => { if (!fs.existsSync(DRAFTS)) return; const d = JSON.parse(fs.readFileSync(DRAFTS, 'utf8')); let n = 0;
  for (const x of d) if (String(x.logNo) === log && x.scheduledAt !== at) { x.scheduledAt = at; n++; }
  if (n) { fs.writeFileSync(DRAFTS + '.tmp', JSON.stringify(d, null, 2)); fs.renameSync(DRAFTS + '.tmp', DRAFTS); } };
const posts = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const post = posts.find(p => String(p.logNo) === log);
if (!post?.scheduledAt) throw new Error(`원장에 예약 글이 없다: ${log}`);
const next = immediate ? null : `${m[1]}. ${m[2]}. ${m[3]} ${m[4]}:${m[5]}`;
if (next && posts.some(p => p.scheduledAt === next && !['deleted', 'replaced', 'skip'].includes(p.link))) throw new Error(`이미 차지된 칸이다: ${next}`);
console.log(JSON.stringify({ log, title: post.title, from: post.scheduledAt, to: next ?? "지금 발행", apply }));
if (!apply) process.exit(0);

const { browser } = await getBrowser({ background: true }), page = await browser.newPage();
const editor = createExistingEditor(page);
const strip = s => { const { date, hour, minute, ...rest } = s; return JSON.stringify(rest); };
try {
  const opened = await editor.openTarget({ ...post, body: undefined });
  if (!opened.reservation) throw new Error('예약 목록에서 불러오지 못했다');
  if (immediate) { await publishNow(); process.exitCode = 0; }
  else {
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
  p.scheduledAt = next; fs.writeFileSync(FILE + '.tmp', JSON.stringify(all, null, 2)); fs.renameSync(FILE + '.tmp', FILE); syncDraft(next);
  refreshBoard();
  console.log(JSON.stringify({ stage: 'rescheduled', log, scheduledAt: next }));
  }

  // 예약을 풀고 지금 발행한다. 발행 시각 라디오만 「현재」로 바꾸고, 그 밖의 발행 설정과 본문이 그대로인지 저장 전에 대조한다.
  async function publishNow() {
    const pos = await page.evaluate(() => { const l = [...document.querySelectorAll('[class*=option_time] label')].find(e => e.textContent.trim() === '현재'); if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (!pos) throw new Error('「현재」 라디오를 찾지 못했다');
    await page.mouse.click(pos.x, pos.y); await new Promise(r => setTimeout(r, 900));
    const now = await editor.settings();
    const timeIds = new Set(['radio_time1', 'radio_time2']);
    if (!now.inputs.find(x => x.id === 'radio_time1')?.checked || now.inputs.find(x => x.id === 'radio_time2')?.checked) throw new Error('「현재」가 선택되지 않았다');
    const rest = s => { const { date, hour, minute, inputs, ...r } = s; return JSON.stringify({ ...r, inputs: inputs.filter(x => !timeIds.has(x.id)) }); };
    if (rest(now) !== rest(opened.state)) throw new Error('발행 시각 외 설정이 바뀌었다');
    if (JSON.stringify(await editor.content()) !== JSON.stringify(opened.content)) throw new Error('본문이 바뀌었다');
    await editor.click('button[class*=confirm_btn]');
    await page.waitForFunction(id => location.href.includes('logNo=' + id), { timeout: 30000 }, log);
    const d = new Date(), p2 = n => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}. ${p2(d.getMonth() + 1)}. ${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    const all = JSON.parse(fs.readFileSync(FILE, 'utf8')), p = all.find(x => String(x.logNo) === log);
    if (p.scheduledAt !== post.scheduledAt) throw new Error('작업 중 원장이 바뀌었다');
    p.scheduledAt = stamp; p.scheduleNote = '예약을 풀고 즉시 발행'; fs.writeFileSync(FILE + '.tmp', JSON.stringify(all, null, 2)); fs.renameSync(FILE + '.tmp', FILE); syncDraft(stamp);
    refreshBoard();
    console.log(JSON.stringify({ stage: 'published-now', log, publishedAt: stamp }));
  }
} finally { await page.close(); await browser.disconnect(); }
process.exit(0);
