// 편성 화면(portraits.html)에서 저장한 예약 시각 변경(publish-reschedule.txt)을 네이버에 반영한다.
// 한 줄에 「글번호 YYYY-MM-DD HH:MM」 또는 「글번호 now」(지금 발행). 한 편씩 reschedule-post.mjs로 옮기고, 반영된 줄은 파일에서 지운다.
// 두 글이 시각을 맞바꾸는 경우처럼 서로 칸을 막고 있으면, 한 편을 빈 임시 칸(목표 날짜 30일 뒤 04:00부터)으로 잠깐 비켜 둔 뒤 푼다.
// 도중에 멈추면 그 글은 임시 칸에 남는다. 파일에 그 줄이 남아 있으니 다시 실행하면 이어서 옮긴다.
// 사용: node scripts/naver-blog/apply-schedule-file.mjs [--apply]   (sw/web-bo에서. --apply가 없으면 순서만 보여 준다)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ASSETS } from '../blog-assets.mjs';
import { PLAN_FILES } from './lib/board-plan.mjs';

const fileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);   // 시험용: 다른 파일을 읽는다
const dir = path.join(ASSETS, 'naver-blog'), FILE = fileArg ?? path.join(dir, PLAN_FILES.reschedule), LEDGER = path.join(dir, 'posts.json');
const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some(a => a !== '--apply' && !a.startsWith('--file='))) throw Error('사용: apply-schedule-file.mjs [--apply] [--file=<경로>]');
const tool = path.join(import.meta.dirname, 'reschedule-post.mjs');
const readMoves = () => (fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '').split(/\r?\n/).map(l => l.match(/^(\d+)\s+(now|\d{4}-\d{2}-\d{2} \d{2}:\d{2})\b/)).filter(Boolean).map(m => ({ log: m[1], to: m[2] }));
const dropLine = log => fs.writeFileSync(FILE, fs.readFileSync(FILE, 'utf8').split(/\r?\n/).filter(l => !new RegExp('^' + log + '\\s').test(l)).join('\n'));
const ledger = () => JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
// 새 글 발행 도구는 초안 원장(celeb-drafts.json)의 scheduledAt으로도 칸이 찼는지 본다. 글 원장만 고치면 옛 시각이 남아 빈 칸을 막는다(26.11.17 김풍 11/24 09:00).
// 글을 옮긴 뒤 같은 글번호의 초안 시각을 글 원장 값에 맞춘다.
const DRAFTS = path.join(dir, 'celeb-drafts.json');
const syncDraft = log => { if (!fs.existsSync(DRAFTS)) return; const at = ledger().find(p => String(p.logNo) === log)?.scheduledAt ?? null, d = JSON.parse(fs.readFileSync(DRAFTS, 'utf8')); let n = 0;
  for (const x of d) if (String(x.logNo) === log && (x.scheduledAt ?? null) !== at) { if (at) x.scheduledAt = at; else delete x.scheduledAt; n++; }
  if (n) fs.writeFileSync(DRAFTS, JSON.stringify(d, null, 2)); };
const stamp = to => to.replace(/^(\d{4})-(\d{2})-(\d{2}) /, '$1. $2. $3 ');   // 원장의 scheduledAt 표기
const taken = (posts, to, self) => posts.some(p => String(p.logNo) !== self && p.scheduledAt === stamp(to) && !['deleted', 'replaced', 'skip'].includes(p.link));
const run = (log, to) => {
  if (!apply) return;   // 점검만 할 때는 순서만 보여 준다(옮기는 도구는 원장의 현재 칸을 보므로 가상 순서를 검사하지 못한다)
  const args = [tool, '--log=' + log, to === 'now' ? '--now' : '--to=' + to, ...(apply ? ['--apply'] : [])];
  const r = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (r.status !== 0) throw Error(`옮기지 못했다: ${log} → ${to}`);
  syncDraft(log);
};

// 내릴 글(publish-demote.txt)이 아직 예약에 남아 칸을 막고 있으면, 그 글부터 지워야 한다고 알린다.
const demoteFile = path.join(dir, PLAN_FILES.demote), demoted = new Set((fs.existsSync(demoteFile) ? fs.readFileSync(demoteFile, 'utf8') : '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')));
const why = b => demoted.has(b.slug) ? `그 칸의 글 ${b.logNo}(${b.slug})은 내릴 글이다. publish-demote.txt의 글을 먼저 지운 뒤 다시 실행한다` : `그 칸의 글 ${b.logNo}은 옮길 계획이 없다`;
let moves = readMoves();
if (!moves.length) { console.log('반영할 시각 변경이 없다.'); process.exit(0); }
const now = new Date(), nowText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${now.toTimeString().slice(0, 5)}`;
for (const m of moves) if (m.to !== 'now' && m.to <= nowText) throw Error(`이미 지난 시각이다: ${m.log} → ${m.to}. 편성 화면에서 다시 정한다.`);
// 하나라도 옮기기 전에 전부 본다: 목표 칸을 이 목록에 없는 글이 차지하고 있으면 아무것도 옮기지 않고 멈춘다.
for (const m of moves.filter(m => m.to !== 'now')) { const b = ledger().find(p => String(p.logNo) !== m.log && p.scheduledAt === stamp(m.to) && !['deleted', 'replaced', 'skip'].includes(p.link)); if (b && !moves.some(x => x.log === String(b.logNo))) throw Error(`칸이 차 있다: ${m.log} → ${m.to} (${why(b)}). 아무것도 옮기지 않았다.`); }
console.log(`시각 변경 ${moves.length}건${apply ? '' : ' (점검만 — 실제로 옮기려면 --apply)'}`);

// 점검만 할 때는 원장을 바꾸지 않으므로, 옮긴 것으로 치고 순서만 계산한다.
const sim = new Map();   // 글번호 → 옮긴 뒤 시각(점검용)
const posts = () => ledger().map(p => sim.has(String(p.logNo)) ? { ...p, scheduledAt: sim.get(String(p.logNo)) } : p);
let guard = 0;
const parked = new Set();   // 임시 칸으로 한 번 비킨 글(두 번 비키지 않는다)
while (moves.length) {
  if (++guard > 500) throw Error('순서를 풀지 못했다');
  const cur = posts();
  for (const m of moves) if (!cur.some(p => String(p.logNo) === m.log && p.scheduledAt)) throw Error(`원장에 예약 글이 없다: ${m.log}`);
  const free = moves.find(m => m.to === 'now' || !taken(cur, m.to, m.log));
  if (free) {
    console.log(`→ ${free.log}  ${free.to}`);
    run(free.log, free.to);
    if (apply) dropLine(free.log); else sim.set(free.log, free.to === 'now' ? null : stamp(free.to));
    moves = moves.filter(m => m !== free);
    continue;
  }
  // 남은 줄이 모두 막혀 있다. 막고 있는 글이 이 목록에 없으면 비켜 줄 계획이 없는 것이므로 멈춘다
  // (편성 화면을 만든 뒤 다른 글이 그 칸에 들어간 경우다). 목록에 있으면 서로 맞물린 것이므로 한 편을 임시 칸으로 비킨다.
  const blockerOf = m => cur.find(p => String(p.logNo) !== m.log && p.scheduledAt === stamp(m.to) && !['deleted', 'replaced', 'skip'].includes(p.link));
  const stuck = moves.find(m => !moves.some(x => x.log === String(blockerOf(m).logNo)));
  if (stuck) throw Error(`칸이 차 있다: ${stuck.log} → ${stuck.to} (그 칸의 글 ${blockerOf(stuck).logNo}은 옮길 계획이 없다). 편성 화면을 다시 만들어 정한다.`);
  const m = moves.find(x => !parked.has(x.log));
  if (!m) throw Error('순서를 풀지 못했다: ' + moves.map(x => x.log).join(', '));
  // 임시 칸: 목표 날짜에서 30일 뒤의 04:00부터 한 시간씩, 비어 있고 다른 줄의 목표가 아닌 칸.
  // 가까운 날로 잡으면 도중에 멈췄을 때 그 글이 임시 시각에 그대로 발행된다. 한 달 뒤면 사람이 알아채고 고칠 시간이 있다.
  const far = new Date(m.to.slice(0, 10) + "T00:00"); far.setDate(far.getDate() + 30);
  const day = far.getFullYear() + "-" + String(far.getMonth() + 1).padStart(2, "0") + "-" + String(far.getDate()).padStart(2, "0");
  const temp = Array.from({ length: 20 }, (_, i) => `${day} ${String(i + 4).padStart(2, '0')}:00`).find(t => t > nowText && !taken(cur, t, m.log) && !moves.some(x => x.to === t));
  if (!temp) throw Error(`임시로 비켜 둘 칸이 없다: ${day}`);
  console.log(`⇄ ${m.log}  임시 ${temp} (나중에 ${m.to}로)`);
  run(m.log, temp);
  parked.add(m.log);
  if (!apply) sim.set(m.log, stamp(temp));
}
console.log(apply ? '반영을 마쳤다. 편성 화면은 portrait-board.mjs로 다시 만든다.' : '점검 끝.');
