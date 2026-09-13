/**
 * 발행된 글이 실제로 공개돼 있고 검색에 걸리는지 읽기 전용으로 살펴본다.
 *
 * `audit-posted.mjs` 는 **편집기 안**(원고·예약 설정)을 보고, 이 스크립트는 **바깥**
 * (독자와 검색엔진이 보는 공개 주소)을 본다. 로그인도 브라우저도 쓰지 않는다.
 *
 *   node scripts/tistory-cinema/audit-live.mjs            발행 시각이 지난 글의 공개 상태
 *   node scripts/tistory-cinema/audit-live.mjs --all      예약 미도래 글까지 전부
 *   node scripts/tistory-cinema/audit-live.mjs --index    색인 여부까지 조회
 *
 * 색인 조회는 검색엔진이 자동 요청을 막으면 실패한다. 그때는 실패를 실패로 적고
 * 결과를 「색인됨」으로 올리지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { BLOG } from './lib/browser.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

/** "2026-09-07 09:00"(KST)을 시각으로 읽는다. */
export function parseAt(at) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(String(at ?? '').trim());
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]));
}

/** 발행 시각이 지난 글만 고른다. `--all` 이면 전부. */
export function selectLive(posts, { all = false, now = new Date() } = {}) {
  if (all) return posts;
  return posts.filter((post) => {
    const at = parseAt(post.at);
    return at !== null && at <= now;
  });
}

const TITLE = /<meta\s+property="og:title"\s+content="([^"]*)"/i;
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** 공개 주소를 열어 살아 있는지, 제목이 원고와 같은지 본다. */
export async function checkPublic(post, { fetchImpl = fetch } = {}) {
  const url = post.url;
  if (!url) return { id: post.id, name: post.name, ok: false, reason: '대장에 공개 주소가 없다' };
  try {
    const res = await fetchImpl(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
    const html = res.ok ? await res.text() : '';
    const title = res.ok ? decode(TITLE.exec(html)?.[1] ?? '') : '';
    const issues = [];
    if (!res.ok) issues.push(`HTTP ${res.status}`);
    else if (!title) issues.push('og:title 없음 — 비공개이거나 보호된 글일 수 있다');
    else if (post.title && !title.includes(post.title.split('|')[0].trim())) issues.push(`제목 불일치: ${title}`);
    return { id: post.id, name: post.name, url, status: res.status, title, ok: issues.length === 0, issues };
  } catch (error) {
    return { id: post.id, name: post.name, url, ok: false, issues: [`요청 실패: ${error.message}`] };
  }
}

/**
 * 구글에 색인됐는지 본다. 자동 요청이 막히면 `blocked` 를 돌려준다.
 * 막힌 것을 「색인 안 됨」으로 적으면 채널 전체를 실패로 오판한다. 둘을 구분한다.
 */
export async function checkIndexed(url, { fetchImpl = fetch } = {}) {
  const q = `https://duckduckgo.com/html/?q=${encodeURIComponent(`site:${url.replace(/^https?:\/\//, '')}`)}`;
  try {
    const res = await fetchImpl(q, { headers: { 'user-agent': UA } });
    if (!res.ok) return { indexed: null, blocked: true, reason: `HTTP ${res.status}` };
    const html = await res.text();
    if (/anomaly|unusual traffic|challenge/i.test(html)) return { indexed: null, blocked: true, reason: '자동 요청 차단' };
    const slug = decodeURIComponent(url).split('/entry/')[1] ?? '';
    return { indexed: html.includes('/entry/') && (slug === '' || html.includes(slug.slice(0, 20))), blocked: false };
  } catch (error) {
    return { indexed: null, blocked: true, reason: error.message };
  }
}

/** 요청 간 간격을 둔다. 한꺼번에 때리면 차단당해 결과를 못 믿게 된다. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const withIndex = args.includes('--index');
  const posts = JSON.parse(fs.readFileSync(path.join(DIR, '_posts.json'), 'utf8'));
  const targets = selectLive(posts, { all });

  console.log(`대장 ${posts.length}편 중 ${all ? '전체' : '발행 시각이 지난'} ${targets.length}편을 확인한다.`);
  if (targets.length === 0) {
    const next = posts.map((p) => p.at).filter(Boolean).sort()[0];
    console.log(`아직 공개된 글이 없다. 첫 발행 예정: ${next ?? '미상'}`);
    return;
  }

  const now = new Date();
  const results = [];
  for (const post of targets) {
    const at = parseAt(post.at);
    /** 예약 시각 전이면 주소가 닫혀 있는 것이 정상이다. 이것을 실패로 세면 안 된다. */
    const pending = at !== null && at > now;
    const row = await checkPublic(post);
    row.pending = pending;
    if (withIndex && row.ok) {
      await wait(1500);
      row.index = await checkIndexed(row.url);
    }
    results.push(row);
    const mark = pending ? '⏳' : row.ok ? '✅' : '❌';
    const idx = row.index ? (row.index.blocked ? ' [색인 조회 차단]' : row.index.indexed ? ' [색인됨]' : ' [색인 안 됨]') : '';
    const note = pending ? `발행 대기 ${post.at}` : row.issues?.join(', ');
    console.log(`${mark} #${row.id} ${row.name}${idx}${note ? ` — ${note}` : ''}`);
    await wait(600);
  }

  const due = results.filter((r) => !r.pending);
  const live = due.filter((r) => r.ok).length;
  const indexed = results.filter((r) => r.index?.indexed === true).length;
  const blocked = results.filter((r) => r.index?.blocked).length;
  console.log(`\n발행 시각이 지난 ${due.length}편 중 공개 ${live}편 · 발행 대기 ${results.length - due.length}편`);
  if (withIndex) {
    console.log(`색인 확인 ${indexed}편 · 조회 차단 ${blocked}편`);
    if (blocked) console.log('차단분은 insane-search 스킬이나 브라우저에서 직접 확인한다.');
  }

  const out = path.join(DIR, '_audit-live.json');
  fs.writeFileSync(out, JSON.stringify({ checkedAt: new Date().toISOString(), blog: BLOG, results }, null, 2));
  console.log(`기록: ${out}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
