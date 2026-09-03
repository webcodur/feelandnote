// 인물 안내글 대장 — 누가 이미 블로그에 있고, 누구를 썼고, 다음에 누구를 쓸지 한 장으로 본다.
// 사용: node scripts/naver-blog/roster.mjs [--min 5] [--top 120]   (sw/web-bo 에서)
// 출력: data/naver-blog/_roster.md
//
// 감상 수는 최소 조건일 뿐이다. 도착한 페이지가 얇으면 역효과라 두께로 거르되,
// 그 안에서 국내에 이름이 알려진 인물을 사람이 골라 발행 순서를 정한다.
// 감상 수만으로 줄을 세우면 위쪽이 국내 검색 수요 없는 영어권 유튜버로 채워진다.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const loadEnv = (p) => {
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
};
loadEnv(path.join(ROOT, '.env'));
loadEnv(path.join(ROOT, 'sw/web-bo/.env'));
loadEnv(path.join(ROOT, 'sw/web/.env'));

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY ?? process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const MIN = opt('min', 5);
const TOP = opt('top', 120);

const page = async (t, sel) => {
  let from = 0, out = [];
  for (;;) {
    const { data, error } = await db.from(t).select(sel).range(from, from + 999);
    if (error) throw error;
    out = out.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
};

const celebs = await page('celebs', 'id,slug,nickname,celeb_tier,publication_status,profession');
const contents = await page('celeb_contents', 'celeb_id');
const count = new Map();
for (const r of contents) count.set(r.celeb_id, (count.get(r.celeb_id) ?? 0) + 1);

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/naver-blog/posts.json'), 'utf8'));
const drafts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/naver-blog/celeb-drafts.json'), 'utf8'));

// 예전부터 블로그에 있던 글 (2020년 이전 글 포함). 삭제·비공개는 빼고 살아 있는 것만 센다.
const onBlog = new Map();
for (const p of posts) {
  if (p.kind !== 'celeb' || !p.slug) continue;
  if (!['ok', 'manual'].includes(p.link)) continue;
  onBlog.set(p.slug, p);
}
// 이번에 쓴 것
const written = new Map();
for (const d of drafts) {
  const slug = String(d.target ?? '').split('/').pop();
  if (slug) written.set(slug, d);
}

const rows = celebs
  .filter((c) => c.celeb_tier === 'full' && c.publication_status === 'active' && c.slug)
  .map((c) => ({ ...c, n: count.get(c.id) ?? 0 }))
  .filter((c) => c.n >= MIN)
  .sort((a, b) => b.n - a.n);

const state = (c) => (written.has(c.slug) ? '이번 작성' : onBlog.has(c.slug) ? '기존 게재' : '미작성');
const tally = { '기존 게재': 0, '이번 작성': 0, 미작성: 0 };
for (const c of rows) tally[state(c)]++;

// 이번에 쓴 것이 목록에 안 잡히는 경우(감상 수가 기준 미만)도 보여 준다
const missedWritten = [...written.keys()].filter((s) => !rows.some((c) => c.slug === s));

const out = [];
out.push('# 인물 안내글 대장');
out.push('');
out.push('`pnpm naver:roster`가 만든다. 직접 고치지 마라 — 값은 DB와 `posts.json`·`celeb-drafts.json`이 쥔다.');
out.push('');
out.push(`감상 ${MIN}건 이상인 \`full\` 인물 **${rows.length}명**이 대상이다. 감상이 많은 순으로 줄을 세웠다 — 블로그가 사람을 보냈는데 도착한 페이지가 얇으면 역효과이므로 두꺼운 인물부터 쓴다.`);
out.push('');
out.push(`| 상태 | 인원 |`);
out.push(`|---|---:|`);
out.push(`| 예전부터 블로그에 있던 글 | ${tally['기존 게재']} |`);
out.push(`| 이번에 쓴 글(예약 완료) | ${tally['이번 작성']} |`);
out.push(`| 아직 안 쓴 인물 | ${tally['미작성']} |`);
out.push('');
if (missedWritten.length) {
  out.push(`> 이번에 썼지만 감상 ${MIN}건 미만이라 아래 표에 없는 인물: ${missedWritten.join(', ')}`);
  out.push('');
}

out.push(`## 후보 풀 (미작성 상위 ${TOP}명, 감상 많은 순)`);
  out.push('');
  out.push('**이 순서를 그대로 발행 순서로 쓰지 마라.** 감상 수만 세면 위쪽이 영어권 유튜버로 채워지는데, 국내 검색 수요가 없어 블로그로 사람이 오지 않는다. 두께는 최소 조건일 뿐이고, 실제 순서는 여기서 **국내에서 이름을 아는 인물**을 골라 정한다. 이번 8명(한강·유발 하라리·RM·김영하·샘 알트만·나발 라비칸트·나탈리 포트만·쿠엔틴 타란티노)이 그렇게 뽑혔다.');
out.push('');
out.push('| # | 인물 | 직군 | 감상 | slug |');
out.push('|---:|---|---|---:|---|');
rows.filter((c) => state(c) === '미작성').slice(0, TOP)
  .forEach((c, i) => out.push(`| ${i + 1} | ${c.nickname} | ${c.profession ?? ''} | ${c.n} | \`${c.slug}\` |`));
out.push('');

out.push('## 이번에 쓴 글');
out.push('');
out.push('| 인물 | 감상 | 상태 |');
out.push('|---|---:|---|');
for (const [slug, d] of written) {
  const c = rows.find((x) => x.slug === slug);
  out.push(`| ${d.title.replace(/ \(.+\)$/, '')} | ${c?.n ?? '—'} | ${d.status} |`);
}
out.push('');

out.push('## 예전부터 블로그에 있던 인물');
out.push('');
out.push('| 인물 | 감상 | 글 번호 |');
out.push('|---|---:|---|');
rows.filter((c) => state(c) === '기존 게재')
  .forEach((c) => out.push(`| ${c.nickname} | ${c.n} | ${onBlog.get(c.slug).logNo} |`));
// 감상이 기준 미만이라 위 표에 없는 기존 게재분도 센다
const onBlogBelow = [...onBlog.keys()].filter((s) => !rows.some((c) => c.slug === s));
out.push('');
out.push(`감상 ${MIN}건 미만이라 위 표에 없는 기존 게재 글이 ${onBlogBelow.length}건 더 있다.`);
out.push('');

const dest = path.join(ROOT, 'data/naver-blog/_roster.md');
fs.writeFileSync(dest, out.join('\n'));
console.log(`${dest}`);
console.log(`대상 ${rows.length}명 — 기존 게재 ${tally['기존 게재']} · 이번 작성 ${tally['이번 작성']} · 미작성 ${tally['미작성']}`);
console.log(`감상 ${MIN}건 미만 기존 게재 ${onBlogBelow.length}건`);
