/**
 * 이미 만들어 둔 인물 안내글에 책 소개를 채워 넣는다.
 *
 * 조립기는 책 소개를 감상 첫 문장 하나로만 처리했다. 제목만 보고는 무슨 책인지 모르는
 * 독자에게 그 한 줄로는 모자란다. 책마다 두세 문장짜리 소개를 앞에 세우고,
 * 소개 노릇을 하던 감상 첫 문장은 겹치므로 걷어낸다.
 *
 * 책 소개는 DB에 없어 agy가 짓는다. 줄거리의 엄밀함보다 「무슨 책인지 전달되는가」가 기준이다.
 * 다만 지어내면 곤란한 것(출간 연도·수상·판매량·평가)은 넣지 않는다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/naver-blog/enrich-blurbs.mjs --dry --slug park-wan-suh
 *   node scripts/naver-blog/enrich-blurbs.mjs --status draft --n 30
 *   node scripts/naver-blog/enrich-blurbs.mjs --slug a,b,c
 *
 * 재실행 안전 — 이미 소개가 붙은 글은 건너뛴다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DRAFTS = process.env.NB_DRAFTS ?? path.join(ROOT, 'data/naver-blog/celeb-drafts.json');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const slugArg = opt('slug');
const statusArg = opt('status') ?? 'draft';
const N = Number(opt('n') ?? 999);

// 책 한 권 블록: 제목 줄 → 표지 → (감상배경 라벨) → 감상
const BOOK = /\*\*『([^』]+)』 — ([^*]*)\*\*\n\n(\[img:[^\]]+\])\n\n/g;

/** 소개 노릇을 하던 감상 첫 문장을 걷어낸다. 인물 이야기가 시작되면 손대지 않는다. */
function dropLeadSentence(review) {
  const m = review.match(/^([^.!?"「』]*?(?:책|소설|기록|시집|산문집|평전|자서전|에세이|철학서|희곡|시선집|편지|안내서|보고서|연구서|교본|문집)이?다)\.\s*/);
  if (!m) return { text: review, dropped: null };
  const rest = review.slice(m[0].length).trim();
  if (rest.length < 60) return { text: review, dropped: null };   // 남는 게 너무 적으면 그대로 둔다
  return { text: rest, dropped: m[1] };
}

function withLock(fn) {
  const LOCK = `${DRAFTS}.lock`;
  const nap = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40 + Math.random() * 60);
  for (let i = 0; i < 400; i++) {
    let fd;
    try { fd = fs.openSync(LOCK, 'wx'); } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 60000) fs.rmSync(LOCK, { force: true }); } catch {}
      nap(); continue;
    }
    try { return fn(); } finally { fs.closeSync(fd); fs.rmSync(LOCK, { force: true }); }
  }
  throw new Error('초안 파일 잠금을 얻지 못했다');
}

const load = () => {
  const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
  return Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
};

function buildPrompt(books) {
  return `너는 책 소개를 쓴다. 아래 책들 각각을 **두세 문장**으로 소개해라.

## 무엇을 쓰나
- 제목만 본 사람이 「아, 그런 책이구나」 하고 넘어갈 수 있게 쓴다. 그것이 유일한 목표다.
- 쓸 것: 어떤 종류의 책인지, 무엇을 다루는지, 누구의 이야기인지, 어떤 물음을 던지는지.
- **쓰지 말 것: 출간 연도, 수상 이력, 판매량, 「명작이다」·「필독서다」 같은 평가.**
  줄거리를 끝까지 밝히지 말고, 결말을 적지 마라.
- 확실하지 않으면 좁게 단정하지 말고 넓게 써라. 틀린 사실을 적느니 두루뭉술한 편이 낫다.
- 60~110자. 간결체(~다, ~이다).
- 문장을 「이 책은」으로 열지 마라. 여러 권이 같은 꼴로 시작하면 안 된다.

## 책
${books.map((b, i) => `${i + 1}. 『${b.title}』 — ${b.creator || '저자 미상'}`).join('\n')}

## 출력
아래 JSON 하나만 출력한다. 설명·머리말·코드펜스를 붙이지 마라.
{"blurbs":[${books.map((_, i) => `"${i + 1}번 소개"`).join(',')}]}`;
}

async function enrich(row) {
  const books = [];
  for (const m of row.body.matchAll(BOOK)) books.push({ title: m[1], creator: m[2].trim(), head: m[0] });
  if (!books.length) return { skip: '책 블록을 찾지 못했다' };
  if (row.blurbed) return { skip: '이미 소개가 붙었다' };

  let blurbs = null;
  for (let attempt = 0; attempt < 2 && !blurbs; attempt++) {
    const text = await agyCall(buildPrompt(books), { timeoutMs: 900000 });
    const j = JSON.parse(String(text).slice(String(text).indexOf('{'), String(text).lastIndexOf('}') + 1));
    if (Array.isArray(j.blurbs) && j.blurbs.length === books.length && j.blurbs.every((b) => typeof b === 'string' && b.length >= 30)) blurbs = j.blurbs;
  }
  if (!blurbs) return { skip: '소개를 받지 못했다' };

  // 블록마다 표지 뒤에 소개를 세우고, 겹치는 감상 첫 문장은 걷어낸다
  let body = row.body;
  let dropped = 0;
  books.forEach((b, i) => {
    const blurb = blurbs[i].trim();
    const at = body.indexOf(b.head);
    if (at < 0) return;
    const end = at + b.head.length;
    const nextIdx = books[i + 1] ? body.indexOf(books[i + 1].head) : body.length;
    let block = body.slice(end, nextIdx);
    const lines = block.split('\n');
    const ri = lines.findIndex((l) => l.trim() && !l.startsWith('**감상배경:**'));
    if (ri >= 0) {
      const cut = dropLeadSentence(lines[ri].trim());
      if (cut.dropped) { lines[ri] = cut.text; dropped++; }
      block = lines.join('\n');
    }
    body = `${body.slice(0, end)}${blurb}\n\n${block}${body.slice(nextIdx)}`;
  });

  return { body, count: books.length, dropped };
}

const all = load();
const targets = (slugArg
  ? all.filter((r) => slugArg.split(',').includes((r.target || '').replace('/celeb/', '')))
  : all.filter((r) => r.status === statusArg)
).slice(0, N);

console.log(`보강 대상 ${targets.length}편`);
let ok = 0, skip = 0, fail = 0;
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  try {
    const r = await enrich(row);
    if (r.skip) { skip++; console.log(`건너뜀 ${slug} — ${r.skip}`); continue; }
    if (dry) {
      console.log(`\n===== ${row.title}`);
      console.log(r.body.split(/\n(?=\*\*『)/).slice(1, 3).join('\n').replace(/\[img:[^\]]+\]/g, '[표지]'));
      ok++; continue;
    }
    withLock(() => {
      const live = load();
      const t = live.find((x) => x.target === row.target);
      if (!t) throw new Error('그 사이 사라졌다');
      t.body = r.body;
      t.blurbed = true;   // 본문에 표시를 남기지 않는다 — 그대로 발행되면 독자에게 보인다
      fs.writeFileSync(DRAFTS, JSON.stringify(live, null, 1));
    });
    ok++;
    console.log(`OK ${slug} — 책 ${r.count}권 소개, 겹친 첫 문장 ${r.dropped}개 정리`);
  } catch (e) {
    fail++;
    console.log(`실패 ${slug}: ${String(e).slice(0, 200)}`);
  }
}
console.log(`\n완료 — 보강 ${ok} / 건너뜀 ${skip} / 실패 ${fail}`);
