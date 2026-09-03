/**
 * 블로그 글이 사이트로 보내는 도착 주소가 살아 있는지 전수로 본다.
 *
 * 이 채널의 목적은 블로그에서 사이트로 사람을 보내는 것이다. 도착 페이지가 죽어 있으면
 * 글이 아무리 좋아도 소용이 없다. 인물 글은 `slug`, 그 밖은 `url` 이 도착지다.
 *
 * 사용: node scripts/naver-blog/audit-links.mjs [--all]   (sw/web-bo 에서)
 *   기본은 발행된 글(link: ok)만 본다. --all 은 예약 대기(check)까지 본다.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const POSTS = path.join(ROOT, 'data/naver-blog/posts.json');
const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
const all = process.argv.includes('--all');

const SITE = 'https://feelandnote.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const target = (p) => (p.slug ? `${SITE}/celeb/${p.slug}` : p.url || null);
const targets = posts.filter((p) => (all ? ['ok', 'check'] : ['ok']).includes(p.link) && target(p));
console.log(`대상 ${targets.length}편${all ? ' (예약 대기 포함)' : ''}`);

const dead = [];
const odd = [];
let ok = 0;

async function one(p) {
  const url = target(p);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
    if (res.status === 200) { ok++; return; }
    dead.push([p.logNo, res.status, url, p.title]);
  } catch (e) {
    odd.push([p.logNo, String(e).slice(0, 50), url]);
  }
}

for (let i = 0; i < targets.length; i += 5) {
  await Promise.all(targets.slice(i, i + 5).map(one));
  if (i % 50 === 0) console.log(`  ${i}/${targets.length}…`);
  await wait(200);
}

console.log(`\n살아 있음 ${ok}편`);
console.log(`\n=== 죽은 도착지 ${dead.length}건`);
dead.forEach(([n, s, u, t]) => console.log(`  ${n}  [${s}]  ${u}\n      ${(t || '').slice(0, 56)}`));
console.log(`\n=== 확인 실패 ${odd.length}건`);
odd.forEach(([n, e, u]) => console.log(`  ${n}  ${e}  ${u}`));
