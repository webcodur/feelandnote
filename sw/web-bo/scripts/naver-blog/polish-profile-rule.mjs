/**
 * 인물 소개의 문말만 정중체로 바꾼다. 사실은 건드리지 않는다.
 *
 * 구분선 위(나레이터 안내)는 정중체, 아래(DB 사실 기록)는 간결체다. 인물 소개만 간결체여서
 * 안내 구간 한복판에서 문체가 덜컹거렸다. 어미가 148종이지만 형태는 규칙적이라 규칙으로 바꾼다.
 * 바꾸지 못한 어미는 손대지 않고 그대로 두고 끝에 모아 보고한다 — 억지로 고치면 뜻이 상한다.
 *
 * 사용: node scripts/naver-blog/polish-profile-rule.mjs [--dry]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DRAFTS = process.env.NB_DRAFTS ?? path.join(ROOT, 'data/naver-blog/celeb-drafts.json');
const dry = process.argv.includes('--dry');

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];

/** 받침이 있으면 「이었습니다」 계열이 필요한 체언 종결인지 본다 */
const hasBatchim = (ch) => {
  const c = String(ch ?? '').charCodeAt(0);
  if (Number.isNaN(c) || c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
};

/** 문장 하나의 끝을 정중체로 바꾼다. 못 바꾸면 null 을 준다. */
function politeSentence(s) {
  const m = s.match(/^(.*?)([가-힣]+)([.!?])$/);
  if (!m) return null;
  const [, head, tail, dot] = m;

  // 이미 정중체
  if (/(습니다|입니다)$/.test(tail)) return s;

  // 용언 과거·현재 종결
  const verb = [
    [/했다$/, '했습니다'], [/였다$/, '였습니다'], [/왔다$/, '왔습니다'], [/갔다$/, '갔습니다'],
    [/봤다$/, '봤습니다'], [/줬다$/, '줬습니다'], [/썼다$/, '썼습니다'], [/났다$/, '났습니다'],
    [/([가-힣])았다$/, '$1았습니다'], [/([가-힣])었다$/, '$1었습니다'],
    [/([가-힣])ㅆ다$/, '$1ㅆ습니다'],
    [/한다$/, '합니다'], [/된다$/, '됩니다'], [/든다$/, '듭니다'],
    [/([가-힣])는다$/, '$1습니다'], [/([가-힣])ㄴ다$/, '$1ㅂ니다'],
    [/쓴다$/, '씁니다'], [/산다$/, '삽니다'], [/본다$/, '봅니다'],
  ];
  for (const [re, to] of verb) if (re.test(tail)) return head + tail.replace(re, to) + dot;

  // 체언 서술 — 「소설가다」·「감독이다」
  if (/이다$/.test(tail)) return head + tail.replace(/이다$/, '입니다') + dot;
  if (/다$/.test(tail)) {
    const stem = tail.slice(0, -1);
    if (!stem) return null;
    // 「소설가다」처럼 받침 없는 체언 + 다
    if (!hasBatchim(stem.slice(-1))) return head + stem + '입니다' + dot;
    return head + stem + '입니다' + dot;
  }
  return null;
}

function politeText(text) {
  const parts = text.split(/(?<=[.!?])\s+/);
  const out = [];
  const stuck = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    const r = politeSentence(t);
    if (r) out.push(r);
    else { out.push(t); stuck.push(t.slice(-14)); }
  }
  return { text: out.join(' '), stuck };
}

function profileAt(body) {
  const lines = body.split('\n');
  const ci = lines.findIndex((l) => /^\[c\].*\[\/c\]$/.test(l.trim()));
  if (ci < 0) return null;
  const hit = lines.map((l, i) => ({ l: l.trim(), i })).find((x) => x.i > ci && x.l && !x.l.startsWith('---'));
  return hit && hit.l.length > 40 ? hit : null;
}

let ok = 0, skip = 0;
const allStuck = [];
for (const row of rows) {
  const slug = (row.target || '').replace('/celeb/', '');
  const hit = profileAt(row.body);
  if (!hit) { skip++; continue; }
  const { text, stuck } = politeText(hit.l);
  if (text === hit.l) { skip++; continue; }
  if (stuck.length) allStuck.push(`${slug}: ${stuck.join(' / ')}`);
  if (ok < 4) console.log(`${slug}\n   전: ${hit.l.slice(0, 78)}\n   후: ${text.slice(0, 78)}\n`);
  if (!dry) {
    const lines = row.body.split('\n');
    lines[hit.i] = text;
    row.body = lines.join('\n');
    row.profilePolished = true;
  }
  ok++;
}

if (!dry) fs.writeFileSync(DRAFTS, JSON.stringify(rows, null, 1));
console.log(`${dry ? '[점검만] ' : ''}바꿈 ${ok} / 건너뜀 ${skip}`);
if (allStuck.length) {
  console.log(`\n못 바꾼 문장이 있는 글 ${allStuck.length}편 — 그대로 두었다`);
  allStuck.slice(0, 12).forEach((s) => console.log(`  ${s}`));
}
