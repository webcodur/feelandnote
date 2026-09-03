/**
 * 인물 안내글을 조립한다 — 스크립트가 뼈대를 만들고 agy는 빈칸만 채운다
 *
 * 원고의 대부분은 이미 DB에 있다. 책별 감상 본문은 `celeb_contents.review` 를 **그대로** 쓴다.
 * 이미 간결체로 쓰여 있고 출처 정황까지 들어 있어 다시 쓸 이유가 없다(다시 쓰면 원문에서 멀어진다).
 * agy가 만드는 것은 제목 수식어·도입 한 줄·인물 정리·감상배경 라벨 다섯·마무리뿐이다.
 *
 * 규격은 docs/continuous/naver-blog.md 「원고 생산」과 「안내글 양식」을 따른다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/naver-blog/compose-celebs.mjs --dry --slug han-kang     # 한 명 조립해 보기(저장 안 함)
 *   node scripts/naver-blog/compose-celebs.mjs --n 10                    # write 판정 상위 10명 조립
 *   node scripts/naver-blog/compose-celebs.mjs --slug a,b,c              # 지정한 인물만
 *
 * 재실행 안전 — celeb-drafts.json 에 이미 있는 인물은 건너뛴다.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const WORK = path.join(ROOT, 'data/naver-blog');
const DRAFTS = path.join(WORK, 'celeb-drafts.json');
const VERD = path.join(WORK, '_pick-verdicts.json');
const SITE = 'https://feelandnote.com';

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
const dry = args.includes('--dry');
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const slugArg = opt('slug');
const N = Number(opt('n') ?? 5);

// 고유어 수사. 「열한 권」·「스무 권」처럼 세는 말 앞 형태를 쓴다. 100 이상은 숫자로 둔다.
const ONES = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
const TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
/** 받침이 있으면 「이」, 없으면 「가」. 「톨스토이이 읽은」 같은 사고를 막는다. */
function subjectParticle(word) {
  const last = String(word ?? "").trim().slice(-1);
  const code = last.charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return "가";   // 한글이 아니면 무난한 쪽
  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

function koCount(n) {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n);
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (t === 0) return ONES[o];
  const head = t === 2 && o === 0 ? '스무' : TENS[t];
  return head + (o ? ONES[o] : '');
}

// ── DB 편차 흡수 ──────────────────────────────────────
// review 는 사람이 시기마다 다른 기준으로 써 넣어 길이도 꼬리 문장도 제각각이다.
// 26.09.03 실측: 법정 스님 94자 ↔ 페이커 296자, 페이커는 같은 꼬리 문장이 다섯 중 넷에 붙어 있었다.
// 그대로 이어 붙이면 한 글 안에서 같은 말이 반복된다. 문장 단위로 걷어낸다.

const REVIEW_MAX = 240;   // 이보다 길면 문장 경계에서 자른다
const DUP_NGRAM = 14;     // 앞선 감상과 이만큼 겹치는 문장은 버린다

/** 한국어 종결 뒤에서 문장을 나눈다 */
function sentences(text) {
  return String(text ?? "")
    .split(/(?<=[.!?]|다\.|요\.)\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * agy 가 다듬은 감상을 검사한다. 원문에 있던 큰따옴표 인용이 사라졌거나
 * 길이가 반토막이면 다듬기를 버리고 원문을 쓴다 — 사실이 날아가는 쪽이 훨씬 나쁘다.
 */
function safeReview(original, rewritten) {
  const raw = String(original ?? "").trim();
  const neu = String(rewritten ?? "").trim();
  if (!neu || neu.length < 40) return { text: raw, why: "다듬기가 비었다" };
  const quotes = (raw.match(/[""]([^""]{6,})[""]/g) ?? []).map((q) => q.slice(1, -1));
  for (const q of quotes) if (!neu.includes(q)) return { text: raw, why: `인용이 사라졌다: ${q.slice(0, 18)}…` };
  if (neu.length < raw.length * 0.4) return { text: raw, why: "너무 많이 잘렸다" };
  return { text: neu, why: null };
}

/**
 * 다듬기를 못 받았을 때만 쓰는 대비책. 앞선 감상과 겹치는 문장을 버리고 길이를 맞춘다.
 * 첫 두 문장은 남긴다 — 더 줄이면 무슨 말인지 모르게 된다.
 */
function trimReview(review, seen) {
  const out = [];
  let len = 0;
  for (const [i, sent] of sentences(review).entries()) {
    const key = sent.slice(0, DUP_NGRAM);
    const dup = key.length >= DUP_NGRAM && seen.some((s) => s.includes(key));
    if (i >= 2 && (dup || len + sent.length > REVIEW_MAX)) break;
    out.push(sent);
    len += sent.length;
  }
  const text = out.join(" ");
  seen.push(text);
  return text;
}

/**
 * 다섯 권을 고를 때 출처가 겹치지 않게 한다.
 * 같은 기사에서 온 감상만 모으면 같은 표현이 되풀이된다.
 */
function pickFive(books) {
  const key = (b) => {
    try { const u = new URL(b.source_url); return u.host + u.pathname.split("/").slice(0, 3).join("/"); }
    catch { return b.source_url ?? String(b.content_id); }
  };
  const chosen = [];
  const used = new Set();
  for (const b of books) {
    if (chosen.length >= 5) break;
    const k = key(b);
    if (used.has(k)) continue;
    used.add(k);
    chosen.push(b);
  }
  for (const b of books) {          // 출처가 모자라면 순위대로 채운다
    if (chosen.length >= 5) break;
    if (!chosen.includes(b)) chosen.push(b);
  }
  return chosen.slice(0, 5);
}

/** 직군 → 블로그 카테고리 (「거물의 책추천」 하위) */
const CATEGORY = {
  author: '작가', writer: '작가', director: '아티스트', musician: '아티스트', artist: '아티스트',
  actor: '배우', entrepreneur: '기업가', investor: '투자자', politician: '정치인',
  scholar: '학자', scientist: '학자', philosopher: '학자', influencer: '인플루엔서', athlete: '스포츠인',
};

async function material(slug) {
  const { data: c, error } = await db
    .from('celebs')
    .select('id,slug,nickname,nickname_en,headline,bio,title,profession,consumption_philosophy')
    .eq('slug', slug).single();
  if (error || !c) throw new Error(`인물을 찾지 못했다: ${slug}`);

  const { data: cc } = await db.from('celeb_contents').select('content_id,review,source_url').eq('celeb_id', c.id);
  const cids = [...new Set((cc ?? []).map((r) => r.content_id).filter(Boolean))];
  const ko = new Map(); const type = new Map();
  for (let i = 0; i < cids.length; i += 300) {
    const chunk = cids.slice(i, i + 300);
    const a = await db.from('content_locales').select('content_id,title,creator,thumbnail_url').eq('locale', 'ko').in('content_id', chunk);
    const b = await db.from('contents').select('id,type').in('id', chunk);
    for (const r of a.data ?? []) ko.set(r.content_id, r);
    for (const r of b.data ?? []) type.set(r.id, r.type);
  }

  const books = (cc ?? [])
    .filter((r) => type.get(r.content_id) === 'BOOK')
    .filter((r) => ko.get(r.content_id)?.thumbnail_url)
    .filter((r) => (r.review ?? '').length >= 80)
    .sort((a, b) => {
      const q = (x) => (/["“”'']/.test(x.review ?? '') ? 1 : 0);
      return q(b) - q(a) || (b.review ?? '').length - (a.review ?? '').length;
    })
    .map((r) => ({ ...r, ...ko.get(r.content_id) }));

  const totalBooks = (cc ?? []).filter((r) => type.get(r.content_id) === 'BOOK').length;
  const videos = (cc ?? []).filter((r) => type.get(r.content_id) === 'VIDEO').length;
  const musics = (cc ?? []).filter((r) => type.get(r.content_id) === 'MUSIC').length;
  return { celeb: c, books, totalBooks, videos, musics };
}

function buildPrompt(m) {
  const { celeb: c, books, totalBooks, videos, musics } = m;
  const five = pickFive(books);
  return `한국 독자를 상대로 하는 책 추천 블로그에 「${c.nickname}이(가) 읽은 책」 안내글을 쓴다. 본문 대부분은 이미 준비돼 있고, 너는 빈칸만 채운다.

## 문체
- 도입·마무리는 정중체(~합니다, ~보세요). 인물 정리는 간결체(~다, ~이다, ~했다).
- 번역투·사물 주어 금지. 광고 어휘(인생을 바꾸는, 필독, 놓치면 안 될) 금지.
- 단골 문예 어휘(포개다, 벼리다, 빚어내다) 금지. 설교로 끝맺지 마라.
- **주어를 빼먹지 마라. 혼자 읽어도 뜻이 통해야 한다.**

## 재료
인물: ${c.nickname}${c.nickname_en ? ` (${c.nickname_en})` : ''}
한 줄 정의: ${c.headline ?? ''}
소개: ${c.bio ?? ''}
감상 철학: ${String(c.consumption_philosophy ?? '').slice(0, 700)}

고른 책 다섯 권과 그 감상 기록:
${five.map((b, i) => `${i + 1}. 『${b.title}』 — ${b.creator ?? ''}\n   감상: ${b.review}\n   출처: ${b.source_url ?? '없음'}`).join('\n')}

사이트에 있는 전체: 책 ${totalBooks}권${videos ? `, 영상 ${videos}편` : ''}${musics ? `, 음악 ${musics}곡` : ''}

## 채울 것
- suffix: 제목 앞에 붙일 수식어. **한국 사람이 그 인물을 알아보는 가장 흔한 손잡이**를 쓴다. 한 줄 정의를 그대로 줄이지 말고, 더 알려진 회사·작품·직함이 있으면 그쪽을 쓴다. 12자 안팎. 예) "배달의민족 창업자", "노벨문학상 수상 작가", "『사피엔스』 저자", "방탄소년단 RM"
- intro: 도입 한 문장. **위 감상 기록 안에 있는 구체적 사실 하나**로 끌어들인다. 정중체. 30자 안팎.
- profile: 인물 정리 3~4문장. 위 소개와 감상 철학을 압축한다. **새로 조사하거나 지어내지 마라.** 간결체.
- bridge: 본문으로 넘어가는 한 문장. 정중체. 20자 안팎.
- contexts: 책 다섯 권 각각의 「감상배경」 라벨. 그 사람이 **언제 어디서** 그 말을 했는지를 위 감상 기록과 출처에서 뽑아 10~20자로 적는다.
    예) "2014년 네이버 '지서재' 기획", "인생의 책을 꼽은 자리", "가장 좋아하는 책을 묻는 인터뷰", "2023년 MSI 대회 인터뷰"
    · **출처 주소를 읽어 매체와 시점을 뽑는 것은 창작이 아니다.** 적극적으로 활용해라.
      newsis.com/view/NISX20241011… → "2024년 뉴시스 인터뷰" · invenglobal.com/articles/… → "인벤 글로벌 인터뷰"
      theguardian.com/books/2018/dec/03/best-books-of-2018 → "2018년 가디언 올해의 책"
    · 주소에서도 매체를 알 수 없고 감상 기록에도 시점·자리가 없을 때만 빈 문자열("")로 둔다.
      지어내거나 「독서 뒤 남긴 소감」처럼 아무 말이나 채우지 마라.
      다섯 개가 모두 비슷한 꼴로 끝나면 라벨이 없느니만 못하다. 확실한 것만 적고 나머지는 비운다.
- reviews: 위 감상 기록 다섯 편을 **모범값에 맞춰 다듬은 것**. 아래 규칙을 지킨다.
    · 길이를 110~150자로 맞춘다. 원문이 길면 곁가지를 덜어내고, 짧으면 억지로 늘리지 마라.
    · **큰따옴표 안의 말은 한 글자도 바꾸지 마라.** 본인 발언이다.
    · **사실을 더하지 마라.** 원문에 없는 연도·작품·평가를 만들어 넣으면 안 된다. 덜어내기만 한다.
    · 앞 권에서 이미 쓴 꼬리 문장을 되풀이하지 마라. 같은 출처에서 온 감상들이 같은 말로 끝나는 일이 잦다.
    · 인물 이름을 매번 문장 첫머리에 놓지 마라. 두 번째 권부터는 다른 방식으로 문장을 연다.
    · 간결체(~다, ~이다, ~했다).

  모범값 — 이 길이와 결을 따른다:
  「아우슈비츠에서 살아 나온 사람이 남긴 기록이다. 한강은 "무너짐 속에서도 인간을 포기하지 않는 문학이에요"라고 말했다. 감정적 호소에 기대지 않고 단단하고 맑은 문장으로 그려낸 이 기록이 문학이 존재를 기록하는 새로운 방식이었다고 덧붙였다.」

- outro: 마무리 2~3문장. 필앤노트에서 나머지를 표지와 함께 볼 수 있다는 것, 작품을 누르면 같은 작품을 감상한 다른 인물로 이어진다는 것. 정중체.

## 출력
아래 JSON 하나만 출력한다. 설명·머리말·코드펜스를 붙이지 마라.
{"suffix":"…","intro":"…","profile":"…","bridge":"…","contexts":["…","…","…","…","…"],"reviews":["…","…","…","…","…"],"outro":"…"}`;
}

/**
 * agy 산출물을 검사한다. 프롬프트로 부탁만 해서는 지켜지지 않는다 —
 * 26.09.03 실측에서 같은 지시로 돌린 두 인물의 결과가 갈렸다(한강은 개선, 하라리는 악화).
 * 어긋나면 무엇이 문제인지 적어 돌려주고 한 번 다시 시킨다.
 */
function inspect(m, w) {
  const bad = [];
  const name = m.celeb.nickname;
  const reviews = Array.isArray(w.reviews) ? w.reviews.map((x) => String(x ?? "")) : [];

  // 인물 이름이 문장 첫머리에 되풀이되는가
  const headed = reviews.filter((r) => r.trim().startsWith(name)).length;
  if (headed >= 3) bad.push(`감상 ${headed}편이 「${name}」으로 시작한다. 두 번째 권부터는 다른 방식으로 문장을 열어라.`);

  // 같은 낱말이 본문 전체에서 되풀이되는가
  const freq = {};
  for (const r of reviews) for (const t of r.match(/[가-힣]{4,}/g) ?? []) freq[t] = (freq[t] ?? 0) + 1;
  const rep = Object.entries(freq).filter(([, n]) => n >= 4).map(([t]) => t);
  if (rep.length) bad.push(`「${rep.slice(0, 3).join("」·「")}」가 네 번 넘게 나온다. 같은 말을 되풀이하지 마라.`);

  // 라벨이 억지로 채워졌는가 / 재료가 있는데 비었는가
  const labels = (Array.isArray(w.contexts) ? w.contexts : []).map((x) => String(x ?? "").trim());
  const filled = labels.filter(Boolean);
  const tails = filled.map((x) => x.slice(-4));
  if (tails.length >= 3 && new Set(tails).size <= Math.ceil(tails.length / 2)) {
    bad.push("감상배경 라벨이 서로 같은 꼴로 끝난다. 확실한 것만 남기고 나머지는 빈 문자열로 두어라.");
  }
  const withUrl = pickFive(m.books).filter((b) => b.source_url).length;
  if (withUrl >= 3 && filled.length === 0) {
    bad.push("출처 주소가 있는데도 감상배경을 하나도 못 뽑았다. 주소에서 매체와 연도를 읽어 적어라.");
  }

  // 길이
  const off = reviews.filter((r) => r.length < 90 || r.length > 190).length;
  if (off >= 3) bad.push("감상 길이가 모범값(110~150자)에서 많이 벗어난다.");
  return bad;
}

function assemble(m, w) {
  const { celeb: c, books, totalBooks } = m;
  const five = pickFive(books);
  const seen = [];
  const fallbacks = [];
  // 라벨 다섯이 같은 꼴로 끝나면 재료가 없어 억지로 채운 것이다. 그럴 바엔 전부 뺀다.
  const rawLabels = (Array.isArray(w.contexts) ? w.contexts : []).map((x) => String(x ?? "").trim());
  const tails = rawLabels.filter(Boolean).map((x) => x.slice(-4));
  const padded = tails.length >= 3 && new Set(tails).size <= Math.ceil(tails.length / 2);
  if (padded) fallbacks.push("감상배경 라벨이 모두 같은 꼴이라 뺐다");
  const labels = padded ? rawLabels.map(() => "") : rawLabels;
  const link = `${SITE}/celeb/${c.slug}`;
  const L = [];
  L.push(`📚 ${c.nickname}의 감상 기록 전체 보기 → ${link}`);
  L.push('');
  L.push(`[img:${SITE}/seo-image/celeb/${c.slug}?locale=ko|420|${c.nickname} 사진]`);
  L.push('');
  L.push(`[c]${w.intro}[/c]`);
  L.push('');
  L.push(w.profile);
  L.push('');
  L.push(w.bridge);
  L.push('');
  L.push('---');
  L.push('');
  five.forEach((b, i) => {
    L.push(`**『${b.title}』 — ${b.creator ?? ''}**`);
    L.push('');
    L.push(`[img:${b.thumbnail_url}|240|${b.title} 표지]`);
    L.push('');
    const ctx = (labels[i] ?? "").trim();
    if (ctx) L.push(`**감상배경:** ${ctx}`);
    const fixed = Array.isArray(w.reviews) ? safeReview(b.review, w.reviews[i]) : { text: null, why: "다듬기 없음" };
    if (fixed.why) fallbacks.push(`${i + 1}번 ${fixed.why}`);
    L.push(fixed.text ? fixed.text : trimReview(b.review, seen));
    if (i < five.length - 1) L.push('');
  });
  L.push('');
  L.push('---');
  L.push('');
  L.push(`[c]여기까지가 ${koCount(totalBooks)} 권 가운데 다섯 권입니다.[/c]`);
  L.push('');
  L.push(w.outro);
  L.push(`→ ${link}`);

  const title = `${w.suffix} ${c.nickname}${subjectParticle(c.nickname)} 읽은 ${totalBooks}권의 책${c.nickname_en ? ` (${c.nickname_en})` : ''}`;
  const tags = [c.nickname, CATEGORY[c.profession] ?? '인플루엔서', '책추천', '독서', '추천도서'];
  if (fallbacks.length) console.log(`   ↩ 원문 사용: ${fallbacks.join(", ")}`);
  return {
    kind: 'celeb',
    target: `/celeb/${c.slug}`,
    title,
    body: L.join('\n'),
    tags,
    category: CATEGORY[c.profession] ?? '인플루엔서',
    status: 'draft',
  };
}

async function main() {
  const drafts = fs.existsSync(DRAFTS) ? JSON.parse(fs.readFileSync(DRAFTS, 'utf8')) : [];
  const have = new Set(drafts.map((d) => String(d.target ?? '').split('/').pop()));

  let slugs;
  if (slugArg) slugs = slugArg.split(',').map((s) => s.trim()).filter(Boolean);
  else {
    if (!fs.existsSync(VERD)) throw new Error('먼저 pick-celebs.mjs --ask 를 돌려라');
    slugs = Object.values(JSON.parse(fs.readFileSync(VERD, 'utf8')))
      .filter((v) => v.verdict === 'write')
      .sort((a, b) => b.books - a.books)
      .map((v) => v.slug)
      .filter((s) => !have.has(s))
      .slice(0, N);
  }
  console.log(`조립 대상 ${slugs.length}명: ${slugs.join(', ')}`);

  let ok = 0, skip = 0, fail = 0;
  for (const slug of slugs) {
    try {
      const m = await material(slug);
      if (m.books.length < 5) { skip++; console.log(`건너뜀 ${slug} — 쓸 수 있는 책 ${m.books.length}권`); continue; }
      let j = null;
      let notes = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const extra = notes.length
          ? `\n\n## 앞선 시도에서 어긋난 점 — 이번에는 반드시 고쳐라\n${notes.map((n) => `- ${n}`).join("\n")}`
          : "";
        const text = await agyCall(buildPrompt(m) + extra, { timeoutMs: 900000 });
        const cand = JSON.parse(String(text).slice(String(text).indexOf("{"), String(text).lastIndexOf("}") + 1));
        if (!cand.intro || !cand.profile || !Array.isArray(cand.contexts)) throw new Error("응답 형식이 어긋난다");
        notes = inspect(m, cand);
        j = cand;
        if (!notes.length) break;
        console.log(`   ↻ 다시 시킴: ${notes.join(" / ")}`);
      }
      if (notes.length) console.log(`   ⚠ 남은 문제: ${notes.join(" / ")}`);
      const row = assemble(m, j);
      if (dry) { console.log(`\n===== ${row.title}\n${row.body}\n`); ok++; continue; }
      drafts.push(row);
      fs.writeFileSync(DRAFTS, JSON.stringify(drafts, null, 1));
      ok++;
      console.log(`OK ${slug} — ${row.title}`);
    } catch (e) {
      fail++;
      console.log(`실패 ${slug}: ${String(e).slice(0, 300)}`);
    }
  }
  console.log(`\n완료 — 조립 ${ok} / 건너뜀 ${skip} / 실패 ${fail}`);
}

await main();
