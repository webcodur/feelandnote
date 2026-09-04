/**
 * 소개와 겹치는 감상 첫 문장을 걷어낸다.
 *
 * 책 소개를 앞에 세운 뒤에도 감상이 「~한 서사시다」로 여는 곳이 남았다. 소개가 방금 한 말을
 * 한 번 더 하는 꼴이다. 고전 서사시처럼 소개와 첫머리가 비슷하게 나오는 책에서 주로 생긴다.
 *
 * 인물 이야기가 섞인 문장은 건드리지 않는다 — 그것은 소개가 아니라 감상이다.
 *
 * 사용: node scripts/naver-blog/trim-dup-lead.mjs [--dry]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';

const DRAFTS = path.join(path.resolve(import.meta.dirname, '../../../..'), 'data/naver-blog/celeb-drafts.json');
const dry = process.argv.includes('--dry');

const KIND = '(책|소설|기록|시집|산문집|평전|자서전|에세이|철학서|희곡|서사시|대서사시|문집|보고서|연구서|민족지|우화|동화|전기|사서|경전|시선집)';
const LEAD = new RegExp(`^([^.!?"“”]{10,80}${KIND}이?다)\\.\\s*`);

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];

let cut = 0, kept = 0;
for (const row of rows) {
  if (!row.blurbed) continue;
  const name = (row.title.match(/^(?:[^ ]+ )*?([가-힣]{2,10})(?:이|가) 읽은/) ?? [])[1];
  const blocks = row.body.split(/\n(?=\*\*『)/);
  let changed = false;

  for (let bi = 1; bi < blocks.length; bi++) {
    const lines = blocks[bi].split('\n');
    const imgAt = lines.findIndex((l) => l.trim().startsWith('[img:'));
    if (imgAt < 0) continue;
    // 표지 뒤 첫 글이 소개, 그 뒤(라벨을 건너뛴) 글이 감상이다
    const idxs = lines.map((l, i) => ({ l: l.trim(), i })).filter((x) => x.i > imgAt && x.l && !x.l.startsWith('---') && !x.l.startsWith('[c]'));
    if (idxs.length < 2) continue;
    const reviewAt = idxs.find((x) => x.i > idxs[0].i && !x.l.startsWith('**감상배경:**'));
    if (!reviewAt) continue;

    const m = reviewAt.l.match(LEAD);
    if (!m) continue;
    // 인물 이름이 든 문장은 감상이다. 건드리지 않는다.
    if (name && m[1].includes(name)) { kept++; continue; }
    const rest = reviewAt.l.slice(m[0].length).trim();
    if (rest.length < 60) { kept++; continue; }   // 남는 게 너무 적으면 그대로 둔다

    console.log(`${(row.target || '').replace('/celeb/', '')} / ${blocks[bi].match(/『([^』]+)』/)?.[1] ?? '?'}`);
    console.log(`   덜어냄: ${m[1].slice(0, 60)}`);
    lines[reviewAt.i] = rest;
    blocks[bi] = lines.join('\n');
    changed = true;
    cut++;
  }

  if (changed && !dry) { row.body = blocks.join('\n'); row.trimmed = true; }
}

if (!dry) fs.writeFileSync(DRAFTS, JSON.stringify(rows, null, 1));
console.log(`\n${dry ? '[점검만] ' : ''}덜어낸 문장 ${cut}개 · 그대로 둔 곳 ${kept}개`);
