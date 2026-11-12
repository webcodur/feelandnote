/**
 * 공개 인물·기관 글의 감상 배경에서 빈 문단 없이 붙은 문단을 찾는다. 읽기만 한다.
 * 공개 본문이 없는 글(예약·비공개·삭제)은 들여다볼 수 없어 수만 보고한다.
 * 연속 조회가 제한되면 공개 글도 본문 없이 응답하므로, 본문 없음은 끝에 순서대로 다시 조회해 확정한다.
 *
 * 사용: pnpm naver:audit-review-gaps [--json=<절대경로>]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';
import { publicParagraphs, reviewGapTargets } from './lib/review-paragraph-gaps.mjs';

const jsonPath = process.argv.find(a => a.startsWith('--json='))?.slice(7);
const posts = JSON.parse(fs.readFileSync(path.join(ASSETS, 'naver-blog/posts.json'), 'utf8'))
  .filter(p => ['celeb', 'curated'].includes(p.kind) && ['ok', 'check'].includes(p.link));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const isFutureReservation = post => {
  const d = post.scheduledAt?.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\s+(\d{2}:\d{2})/);
  return Boolean(d) && new Date(`${d[1]}-${d[2]}-${d[3]}T${d[4]}:00+09:00`).getTime() > Date.now();
};

async function inspect(post) {
  const row = { logNo: post.logNo, kind: post.kind, title: post.title, reserved: isFutureReservation(post) };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await wait(2000 * attempt);
    try {
      const res = await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${post.logNo}`, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
      row.status = res.status;
      const flow = publicParagraphs(await res.text());
      if (flow) {
        const targets = reviewGapTargets(flow);
        return { ...row, gaps: targets.length, samples: targets.slice(0, 2).map(i => flow[i - 1].text.slice(0, 24) + ' ⏎ ' + flow[i].text.slice(0, 24)) };
      }
      if (res.status === 404) return { ...row, noPublicBody: true };
    } catch (error) { row.lastError = String(error); }
  }
  return { ...row, error: row.lastError ?? `본문을 읽지 못했다 (HTTP ${row.status})` };
}

const rows = [];
let next = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < posts.length) { rows.push(await inspect(posts[next++])); await wait(150); }
}));
for (const [i, row] of rows.entries()) {
  if (!row.noPublicBody) continue;
  await wait(300);
  rows[i] = await inspect(posts.find(p => p.logNo === row.logNo));
}

const hidden = rows.filter(r => r.noPublicBody), failed = rows.filter(r => r.error);
const affected = rows.filter(r => r.gaps > 0).sort((a, b) => b.gaps - a.gaps);
console.log(`대상 ${rows.length}편 · 공개 본문 확인 ${rows.length - hidden.length - failed.length}편 · 공개 본문 없음 ${hidden.length}편(예약 ${hidden.filter(r => r.reserved).length}편) · 조회 실패 ${failed.length}편`);
console.log(`붙은 글 ${affected.length}편 · 붙은 자리 ${affected.reduce((sum, r) => sum + r.gaps, 0)}곳`);
for (const r of affected) console.log(String(r.gaps).padStart(3), r.kind === 'curated' ? '기관' : '인물', r.logNo, r.title);
for (const r of failed) console.log('실패', r.logNo, r.title, r.error);
if (jsonPath) fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 1));
