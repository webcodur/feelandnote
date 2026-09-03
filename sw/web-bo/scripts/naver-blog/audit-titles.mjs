/**
 * 발행된 글의 실제 제목을 받아 오염을 찾는다.
 *
 * 링크 삽입이 본문이 아니라 제목에 박힌 사고가 있었다(맥스 레브친 글). 같은 사고가
 * 다른 글에도 남아 있는지 전수로 본다. 기록된 제목과 실제 제목이 다르면 보고한다.
 *
 * 사용: node scripts/naver-blog/audit-titles.mjs   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const POSTS = path.join(ROOT, 'data/naver-blog/posts.json');
const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const DIRTY = [/전체\s*보기/, /feelandnote\.com/, /📚/, /→/];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// og:title 은 엔티티로 인코딩돼 온다. 풀지 않으면 `&amp;`·`&lt;` 때문에 멀쩡한 제목이 불일치로 잡힌다.
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

// 예약글(link==='check')은 공개 주소가 없어 404 다. 발행된 글만 본다.
const targets = posts.filter((p) => !['check', 'deleted', 'to-delete', 'private', 'excluded', 'replaced'].includes(p.link));
console.log(`대상 ${targets.length}편`);

const dirty = [];
const mismatch = [];
const failed = [];

async function one(p) {
  const url = `https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${p.logNo}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    const live = html.match(/og:title"\s*content="([^"]*)"/)?.[1];
    const t = live && decode(live);
    if (!live) { failed.push([p.logNo, `제목을 읽지 못했다 (${res.status})`]); return; }
    const bad = DIRTY.filter((re) => re.test(t));
    if (bad.length) dirty.push([p.logNo, t]);
    else if (p.title && t.trim() !== p.title.trim()) mismatch.push([p.logNo, p.title, t]);
  } catch (e) {
    failed.push([p.logNo, String(e).slice(0, 60)]);
  }
}

// 네이버에 몰아치지 않게 넷씩 끊어 돌린다
for (let i = 0; i < targets.length; i += 4) {
  await Promise.all(targets.slice(i, i + 4).map(one));
  if (i % 40 === 0) console.log(`  ${i}/${targets.length}…`);
  await wait(250);
}

console.log(`\n=== 제목 오염 ${dirty.length}건`);
dirty.forEach(([n, t]) => console.log(`  ${n}  ${t}`));
console.log(`\n=== 기록과 다름 ${mismatch.length}건`);
mismatch.forEach(([n, a, b]) => console.log(`  ${n}\n    기록: ${a}\n    실제: ${b}`));
console.log(`\n=== 확인 실패 ${failed.length}건`);
failed.slice(0, 20).forEach(([n, e]) => console.log(`  ${n}  ${e}`));
