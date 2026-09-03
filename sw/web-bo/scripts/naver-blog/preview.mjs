// 발행 대기 원고를 사람이 읽을 수 있는 한 파일로 모은다. 발행 직전 육안 확인용이다.
// 사용: node scripts/naver-blog/preview.mjs   (sw/web-bo 에서)
// 출력: data/naver-blog/_preview.md
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const drafts = read('data/naver-blog/drafts.json');
const celebs = read('data/naver-blog/celeb-drafts.json');

const out = [];
out.push('# 발행 대기 원고');
out.push('');
out.push('`pnpm naver:preview`가 만든다. 직접 고치지 마라 — 원본은 `drafts.json`·`celeb-drafts.json`이다.');
out.push('');

const block = (d) => {
  out.push(`## ${d.title}`);
  out.push('');
  out.push(`- 대상: https://feelandnote.com${d.target}`);
  out.push(`- 카테고리: ${d.category} · 태그: ${(d.tags ?? []).join(' · ')}`);
  if (d.note) out.push(`- 보류 사유: ${d.note}`);
  out.push('');
  out.push('```');
  out.push(d.body ?? '');
  out.push('```');
  out.push('');
};

const ready = drafts.filter((d) => d.status === 'draft');
const held = drafts.filter((d) => d.status === 'hold');
const celebReady = celebs.filter((d) => d.status === 'draft');

out.push(`기관 발행 대기 ${ready.length}편 · 기관 보류 ${held.length}편 · 인물 발행 대기 ${celebReady.length}편`);
out.push('');
out.push('---');
out.push('');
out.push(`# 기관 선정 — 발행 대기 (${ready.length}편)`);
out.push('');
ready.forEach(block);
out.push(`# 인물 — 발행 대기 (${celebReady.length}편)`);
out.push('');
celebReady.forEach(block);
out.push(`# 기관 선정 — 보류 (${held.length}편)`);
out.push('');
out.push('인물 감상이 3편 미만이라 큐에서 뺐다. 감상을 채운 뒤 `status`를 `draft`로 되돌린다.');
out.push('');
held.forEach(block);

const dest = path.join(ROOT, 'data/naver-blog/_preview.md');
fs.writeFileSync(dest, out.join('\n'));
console.log(`${dest} — 기관 대기 ${ready.length} · 보류 ${held.length} · 인물 대기 ${celebReady.length}`);
