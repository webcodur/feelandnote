/**
 * 조립된 초안을 읽기 전용으로 일괄 검사한다.
 *
 * 릴레이 규약상 개별 결과를 재승인하지 않는다. 중복·필수값 누락·깨진 문자처럼
 * 레인 안에서 잡히지 않는 것만 통째로 훑는다.
 *
 * 사용: node scripts/naver-blog/audit-drafts.mjs [--all]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DRAFTS = path.join(ROOT, 'data/naver-blog/celeb-drafts.json');
const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const all = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const targets = process.argv.includes('--all') ? all : all.filter((x) => x.status === 'draft');

console.log(`검사 대상 ${targets.length}편 / 전체 ${all.length}편\n`);
const say = (label, rows) => console.log(`${label.padEnd(22)} ${rows.length ? `${rows.length}건 — ${rows.slice(0, 6).join(', ')}` : '없음'}`);

// 중복
const seen = new Map();
for (const x of all) seen.set(x.target, (seen.get(x.target) ?? 0) + 1);
say('중복 target', [...seen].filter(([, n]) => n > 1).map(([t]) => t));

// 필수값
say('필수값 누락', targets.filter((x) => ['title', 'body', 'target', 'category'].some((k) => !x[k])).map((x) => x.target));

// 깨진 문자 — 치환문자와 제어문자
const BROKEN = new RegExp(`[�${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}${String.fromCharCode(14)}-${String.fromCharCode(31)}]`);
say('깨진 문자', targets.filter((x) => BROKEN.test(x.title + x.body)).map((x) => x.target));

// 표시 균형 — 굵게(**)와 가운데([c]…[/c])
say('굵게·가운데 불균형', targets.filter((x) => {
  const b = (x.body.match(/\*\*/g) ?? []).length % 2;
  const o = (x.body.match(/\[c\]/g) ?? []).length;
  const c = (x.body.match(/\[\/c\]/g) ?? []).length;
  return b || o !== c;
}).map((x) => x.target));

// 이미지·도착 링크·태그
say('이미지 없음', targets.filter((x) => !/\[img:/.test(x.body)).map((x) => x.target));
say('도착 링크 없음', targets.filter((x) => !x.body.includes(`feelandnote.com${x.target}`)).map((x) => x.target));
say('태그 없음', targets.filter((x) => !x.tags?.length).map((x) => x.target));

// 제목 길이 — 네이버 제목은 100자를 넘기지 않는다
say('제목 100자 초과', targets.filter((x) => x.title.length > 100).map((x) => `${x.target}(${x.title.length})`));

// 책 소개 — 순서는 표지 → 소개 → 감상배경 라벨 → 감상이다
const blocksOf = (x) => x.body.split(/\n(?=\*\*『)/).slice(1);
const noBlurb = [], wrongOrder = [];
for (const x of targets.filter((r) => r.blurbed)) {
  for (const b of blocksOf(x)) {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    const imgAt = lines.findIndex((l) => l.startsWith('[img:'));
    if (imgAt < 0) continue;
    const after = lines.slice(imgAt + 1).filter((l) => !l.startsWith('---') && !l.startsWith('[c]'));
    if (!after.length) continue;
    if (after[0].startsWith('**감상배경:**')) { wrongOrder.push(`${x.target}:${b.match(/『([^』]+)』/)?.[1] ?? '?'}`); continue; }
    if (after[0].length < 30) noBlurb.push(`${x.target}:${b.match(/『([^』]+)』/)?.[1] ?? '?'}`);
  }
}
say('책 소개 없음', noBlurb);
say('소개가 라벨 뒤', wrongOrder);
console.log(`\n소개 붙은 글 ${targets.filter((r) => r.blurbed).length}편 · 네이버 반영 ${targets.filter((r) => r.applied).length}편`);

const len = targets.map((x) => x.body.length).sort((a, b) => a - b);
if (len.length) console.log(`\n본문 길이  최소 ${len[0]} · 중간 ${len[len.length >> 1]} · 최대 ${len[len.length - 1]}`);
const imgs = targets.map((x) => (x.body.match(/\[img:/g) ?? []).length).sort((a, b) => a - b);
if (imgs.length) console.log(`이미지 수  최소 ${imgs[0]} · 중간 ${imgs[imgs.length >> 1]} · 최대 ${imgs[imgs.length - 1]}`);
