/**
 * 인물 안내글을 쓸 사람을 agy에게 고르게 한다
 *
 * 후보 명단은 감상 수로만 줄을 세워서 위쪽이 국내 인지도 없는 영어권 인물로 채워진다.
 * 사실 확인이 아니라 선정이므로 LLM 판단에 맡긴다. 이름만 넘기고 판정과 한 마디 이유만 받는다.
 *
 * 스크립트가 먼저 거른다 — 조건에 맞는 책 5권을 못 채우는 인물은 애초에 후보가 아니다.
 * 이미 블로그에 있거나 이번에 쓴 인물도 뺀다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/naver-blog/pick-celebs.mjs --dump            # 후보 추출만
 *   node scripts/naver-blog/pick-celebs.mjs --ask --limit 1   # 배치 1개만
 *   node scripts/naver-blog/pick-celebs.mjs --ask             # 남은 전량
 *
 * 재실행 안전 — 이미 판정받은 인물은 건너뛴다.
 * 출력: data/naver-blog/_pick-candidates.json / _pick-verdicts.json
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const WORK = path.join(ROOT, 'data/naver-blog');
const CAND = path.join(WORK, '_pick-candidates.json');
const VERD = path.join(WORK, '_pick-verdicts.json');
const BATCH = 60;
const CONCURRENCY = 2;

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

const page = async (t, sel, tune) => {
  let from = 0, out = [];
  for (;;) {
    let q = db.from(t).select(sel).range(from, from + 999);
    if (tune) q = tune(q);
    const { data, error } = await q;
    if (error) throw error;
    out = out.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
};

/** 조건에 맞는 책이 몇 권인지 센다. 규칙은 docs/continuous/naver-blog.md 를 따른다. */
export function usableBooks(rows, koByContent, typeById) {
  return rows
    .filter((r) => typeById.get(r.content_id) === 'BOOK')
    .filter((r) => koByContent.get(r.content_id)?.thumbnail_url)
    .filter((r) => (r.review ?? '').length >= 80)
    .sort((a, b) => {
      const q = (x) => (/["“”'']/.test(x.review ?? '') ? 1 : 0);
      return q(b) - q(a) || (b.review ?? '').length - (a.review ?? '').length;
    });
}

async function dump() {
  const celebs = await page('celebs', 'id,slug,nickname,headline,profession,celeb_tier,publication_status');
  const cc = await page('celeb_contents', 'celeb_id,content_id,review');
  const cids = [...new Set(cc.map((r) => r.content_id).filter(Boolean))];

  const koByContent = new Map();
  const typeById = new Map();
  for (let i = 0; i < cids.length; i += 300) {
    const chunk = cids.slice(i, i + 300);
    const a = await db.from('content_locales').select('content_id,locale,title,creator,thumbnail_url').eq('locale', 'ko').in('content_id', chunk);
    const b = await db.from('contents').select('id,type').in('id', chunk);
    if (a.error || b.error) throw (a.error ?? b.error);
    for (const r of a.data) koByContent.set(r.content_id, r);
    for (const r of b.data) typeById.set(r.id, r.type);
  }

  const byCeleb = new Map();
  for (const r of cc) {
    if (!byCeleb.has(r.celeb_id)) byCeleb.set(r.celeb_id, []);
    byCeleb.get(r.celeb_id).push(r);
  }

  // 이미 블로그에 있거나 이번에 쓴 인물은 뺀다
  const posts = JSON.parse(fs.readFileSync(path.join(WORK, 'posts.json'), 'utf8'));
  const drafts = JSON.parse(fs.readFileSync(path.join(WORK, 'celeb-drafts.json'), 'utf8'));
  const taken = new Set([
    ...posts.filter((p) => p.kind === 'celeb' && p.slug && ['ok', 'manual'].includes(p.link)).map((p) => p.slug),
    ...drafts.map((d) => String(d.target ?? '').split('/').pop()).filter(Boolean),
  ]);

  const out = celebs
    .filter((c) => c.celeb_tier === 'full' && c.publication_status === 'active' && c.slug && !taken.has(c.slug))
    .map((c) => ({ ...c, books: usableBooks(byCeleb.get(c.id) ?? [], koByContent, typeById).length }))
    .filter((c) => c.books >= 5)
    .sort((a, b) => b.books - a.books)
    .map((c) => ({ slug: c.slug, nickname: c.nickname, headline: c.headline ?? '', profession: c.profession ?? '', books: c.books }));

  fs.writeFileSync(CAND, JSON.stringify(out, null, 1));
  console.log(`쓸 수 있는 책 5권 이상 · 아직 안 쓴 인물 ${out.length}명 → ${CAND}`);
  return out;
}

function buildPrompt(batch) {
  const lines = batch.map((b, i) => `${i + 1}. ${b.nickname}${b.headline ? ` — ${b.headline}` : ''} (${b.profession})`).join('\n');
  return `한국 독자를 상대로 하는 책 추천 블로그에 「이 사람이 읽은 책」 글을 쓰려 한다. 아래 인물 가운데 누구를 쓸 만한지 골라 달라.

판단 기준은 하나다. **한국 사람이 이름을 듣고 누구인지 아는가.**
- 한국에서 검색될 만한 인물이면 write.
- 국내에 거의 알려지지 않았으면 skip. 영어권에서 유명해도 한국에서 모르면 skip이다.
- 애매하면 skip으로 둔다. 나중에 다시 볼 수 있다.

정치인·논쟁적 인물이라도 이름이 알려져 있으면 write로 둔다. 글 내용은 독서 기록이라 정치색과 무관하다.

각 인물마다 한 줄씩, 아래 JSON 형식만 출력한다. 설명·머리말·코드펜스를 붙이지 마라.
{"n":1,"verdict":"write","why":"노벨문학상 수상으로 국내 인지도 높음"}
{"n":2,"verdict":"skip","why":"영어권 유튜버, 국내 인지도 낮음"}

why 는 15자 안팎으로 짧게 쓴다.

인물:
${lines}`;
}

function parseAnswer(text, batch) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    let o;
    try { o = JSON.parse(t); } catch { continue; }
    const b = batch[Number(o.n) - 1];
    if (!b) continue;
    out.push({ slug: b.slug, nickname: b.nickname, books: b.books, verdict: o.verdict === 'write' ? 'write' : 'skip', why: String(o.why ?? '').slice(0, 60) });
  }
  return out;
}

async function ask(limitBatches) {
  if (!fs.existsSync(CAND)) await dump();
  const cands = JSON.parse(fs.readFileSync(CAND, 'utf8'));
  const verdicts = fs.existsSync(VERD) ? JSON.parse(fs.readFileSync(VERD, 'utf8')) : {};
  const todo = cands.filter((c) => !verdicts[c.slug]);
  console.log(`후보 ${cands.length} / 남은 ${todo.length}`);
  if (!todo.length) return;

  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  const run = limitBatches ? batches.slice(0, limitBatches) : batches;

  let ok = 0, fail = 0;
  const work = async (batch, label) => {
    try {
      const text = await agyCall(buildPrompt(batch), { timeoutMs: 900000 });
      const rows = parseAnswer(text, batch);
      for (const r of rows) verdicts[r.slug] = r;
      fs.writeFileSync(VERD, JSON.stringify(verdicts, null, 1));
      ok++;
      console.log(`  ${label} ${rows.length}/${batch.length}명 판정 (누적 ${Object.keys(verdicts).length})`);
    } catch (e) {
      fail++;
      console.log(`  ${label} 실패: ${String(e).slice(0, 400)}`);
    }
  };
  for (let i = 0; i < run.length; i += CONCURRENCY) {
    await Promise.all(run.slice(i, i + CONCURRENCY).map((b, j) => work(b, `[${i + j + 1}/${run.length}]`)));
  }
  const all = Object.values(verdicts);
  console.log(`\n완료 — 배치 성공 ${ok} / 실패 ${fail}`);
  console.log(`  쓸 인물 ${all.filter((a) => a.verdict === 'write').length}명 · 뺄 인물 ${all.filter((a) => a.verdict === 'skip').length}명`);
}

const args = process.argv.slice(2);
const li = args.indexOf('--limit');
const limit = li >= 0 ? Number(args[li + 1]) : 0;
if (args.includes('--dump')) await dump();
else if (args.includes('--ask')) await ask(limit);
else console.log('사용법: --dump | --ask [--limit N]');
