/**
 * 인물 안내글을 조립한다 — 스크립트가 뼈대를 만들고 agy는 빈칸만 채운다
 *
 * 원고의 대부분은 이미 DB에 있다. 책별 감상 본문은 `celeb_contents.review` 를 **그대로** 쓴다.
 * 이미 간결체로 쓰여 있고 출처 정황까지 들어 있어 다시 쓸 이유가 없다(다시 쓰면 원문에서 멀어진다).
 * agy가 만드는 것은 제목 수식어·도입 한 줄·인물 정리·책 소개·마무리뿐이다.
 *
 * 규격은 docs/continuous/blog-naver-book.md 「원고 생산」과 「안내글 양식」을 따른다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/naver-blog/compose-celebs.mjs --dry --slug han-kang     # 한 명 조립해 보기(저장 안 함)
 *   node scripts/naver-blog/compose-celebs.mjs --n 10                    # write 판정 상위 10명 조립
 *   node scripts/naver-blog/compose-celebs.mjs --slug a,b,c              # 지정한 인물만
 *   node scripts/naver-blog/compose-celebs.mjs --slug a --fills 빈칸.json  # 빈칸을 파일로 받아 조립(외부 CLI 호출 없음)
 *
 * --fills 파일은 slug 를 키로 둔다: { "ali-abdaal": { "suffix", "profile", "blurbs": [5], "outro" } }
 * 빈칸 항목에 "exclude": ["content_id", …] 를 두면 그 책을 빼고 다음 순번으로 채운다. 한국어판이
 * 특정 장정·묶음 상품(가죽 성경전서 등)이라 안내글에 맞지 않을 때만 쓰고, 이유는 "excludeReason" 에 적는다.
 * 본문 양식은 기존 59편의 최종 양식(인물 사진·정중체 정리·고정 안내문·인용구 감상)과 같다.
 *
 * 재실행 안전 — celeb-drafts.json 에 이미 있는 인물은 건너뛴다.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const fillsPath = opt('fills');
const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

// 외부 CLI(agy·codex·opencode·claude·kiro)는 사용자가 승인한 실행에서만 쓴다. 기본은 본 모델이 직접 수행한다(AGENTS.md 「데이터·외부 서비스」).
// 빈칸을 파일로 받는 --fills 실행은 외부 CLI를 부르지 않으므로 이 승인을 요구하지 않는다.
if (isMain && !fillsPath && !process.env.ALLOW_EXTERNAL_CLI) {
  console.error('이 스크립트는 외부 CLI 모델을 호출한다. 사용자 승인 후 ALLOW_EXTERNAL_CLI=1로 실행하거나 --fills 로 빈칸을 넘긴다.')
  process.exit(1)
}
const agyCall = isMain && !fillsPath ? (await import('../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs')).agyCall : null;

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const WORK = path.join(ASSETS, 'naver-blog');
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

const dry = args.includes('--dry');
const slugArg = opt('slug');
const N = Number(opt('n') ?? 5);

/**
 * 초안 파일을 고칠 때 거는 잠금.
 *
 * 레인을 여럿 띄우면 같은 파일을 동시에 읽고 써서 나중에 쓴 쪽이 앞선 결과를 지운다.
 * 읽기부터 쓰기까지를 이 안에서 끝내 그 틈을 없앤다. 임계구역이 짧아 대기는 길지 않다.
 */
function withDraftsLock(fn) {
  const LOCK = `${DRAFTS}.lock`;
  const nap = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40 + Math.random() * 60);
  for (let i = 0; i < 400; i++) {
    let fd;
    try {
      fd = fs.openSync(LOCK, 'wx');
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // 죽은 레인이 남긴 잠금은 걷어낸다
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 60000) fs.rmSync(LOCK, { force: true }); } catch {}
      nap();
      continue;
    }
    try {
      return fn();
    } finally {
      fs.closeSync(fd);
      fs.rmSync(LOCK, { force: true });
    }
  }
  throw new Error('초안 파일 잠금을 얻지 못했다');
}

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

/**
 * 직군 → 블로그 카테고리 (「거물의 책추천」 하위)
 *
 * 🔴 빠진 직군을 기본값으로 흘리지 마라. 26.09.04에 `humanities_scholar`·`social_scientist`·
 *    `leader` 가 표에 없어 **철학자·역사학자 13명이 「인플루엔서」로 분류**됐다. 몽테스키외와
 *    사마천이 미스터비스트 옆에 놓일 뻔했다. 모르는 직군은 멈추고 사람이 표를 채운다.
 */
const CATEGORY = {
  author: '작가', writer: '작가', poet: '작가',
  director: '아티스트', musician: '아티스트', artist: '아티스트',
  actor: '배우', entrepreneur: '기업가', investor: '투자자',
  politician: '정치인', leader: '정치인', commander: '정치인',
  scholar: '학자', scientist: '학자', philosopher: '학자',
  humanities_scholar: '학자', social_scientist: '학자', natural_scientist: '학자',
  influencer: '인플루엔서', athlete: '스포츠인',
};

/** 인물 이름 옆에 붙는 직군 표시(「한강 · 작가」). prepare-celeb-revisions.mjs 의 표와 같다. */
const PROF_LABEL = {
  author: '작가', writer: '작가', poet: '시인', director: '감독', musician: '음악가', artist: '예술가', actor: '배우',
  entrepreneur: '기업가', investor: '투자자', politician: '정치인', leader: '지도자', commander: '군인',
  scholar: '학자', scientist: '과학자', philosopher: '철학자', humanities_scholar: '인문학자', social_scientist: '사회과학자',
  natural_scientist: '자연과학자', influencer: '인플루언서', athlete: '스포츠인',
};

export async function material(slug) {
  const { data: c, error } = await db
    .from('celebs')
    .select('id,slug,nickname,nickname_en,headline,bio,title,profession,consumption_philosophy,avatar_url')
    .eq('slug', slug).single();
  if (error || !c) throw new Error(`인물을 찾지 못했다: ${slug}`);

  const { data: cc, error: ccError } = await db.from('celeb_contents').select('id,content_id,review,source_url').eq('celeb_id', c.id);
  if (ccError) throw new Error(`감상 조회 실패: ${ccError.message}`);
  const cids = [...new Set((cc ?? []).map((r) => r.content_id).filter(Boolean))];
  const ko = new Map(); const type = new Map();
  for (let i = 0; i < cids.length; i += 300) {
    const chunk = cids.slice(i, i + 300);
    const a = await db.from('content_locales').select('content_id,title,creator,thumbnail_url').eq('locale', 'ko').in('content_id', chunk);
    const b = await db.from('contents').select('id,type').in('id', chunk);
    if (a.error || b.error) throw new Error(`책 메타 조회 실패: ${(a.error ?? b.error).message}`);
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
  return { celeb: c, books, allBooks: (cc ?? []).filter(r => type.get(r.content_id) === 'BOOK').map(r => ({ ...r, ...ko.get(r.content_id) })), totalBooks, videos, musics };
}

function buildPrompt(m) {
  const { celeb: c, books, totalBooks, videos, musics } = m;
  const five = pickFive(books);
  return `한국 독자를 상대로 하는 책 추천 블로그에 「${c.nickname}이(가) 읽은 책」 안내글을 쓴다. 본문 대부분은 이미 준비돼 있고, 너는 빈칸만 채운다.

## 문체
- 도입·인물 정리·책 소개·마무리는 정중체(~합니다, ~보세요).
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
- profile: 인물 정리 3~4문장. 위 소개와 감상 철학을 압축한다. **새로 조사하거나 지어내지 마라.** 정중체.
- bridge: 본문으로 넘어가는 한 문장. 정중체. 20자 안팎.
- blurbs: 책 다섯 권 각각의 **소개 두세 문장**. 감상 앞에 따로 세운다.
    · 제목만 본 사람이 「아, 그런 책이구나」 하고 넘어갈 수 있게 쓰는 것이 유일한 목표다.
      쓸 것: 어떤 종류의 책인지, 무엇을 다루는지, 누구의 이야기인지, 어떤 물음을 던지는지.
    · **쓰지 마라: 출간 연도, 수상 이력, 판매량, 「명작이다」·「필독서다」 같은 평가.** 지어내기가 시작되는 자리다.
      줄거리를 끝까지 밝히지 말고 결말을 적지 마라.
    · 확실하지 않으면 좁게 단정하지 말고 넓게 써라. 틀린 사실을 적느니 두루뭉술한 편이 낫다.
    · 60~110자. 정중체. 「이 책은」으로 열지 마라 — 다섯이 같은 꼴로 시작하면 안 된다.
      예) "아우슈비츠에서 살아 나온 사람이 남긴 기록입니다. 인간이 어디까지 무너질 수 있는지를 담담한 문장으로 적었습니다."
- 감상은 스크립트가 DB 원문을 그대로 넣는다. 감상·감상 요약·감상배경 라벨은 생성하지 마라.

- outro: 마무리 2~3문장. 필앤노트에서 나머지를 표지와 함께 볼 수 있다는 것, 작품을 누르면 같은 작품을 감상한 다른 인물로 이어진다는 것. 정중체.

## 출력
아래 JSON 하나만 출력한다. 설명·머리말·코드펜스를 붙이지 마라.
{"suffix":"…","intro":"…","profile":"…","bridge":"…","blurbs":["…","…","…","…","…"],"outro":"…"}`;
}

/**
 * agy 산출물을 검사한다. 프롬프트로 부탁만 해서는 지켜지지 않는다 —
 * 26.09.03 실측에서 같은 지시로 돌린 두 인물의 결과가 갈렸다(한강은 개선, 하라리는 악화).
 * 어긋나면 무엇이 문제인지 적어 돌려주고 한 번 다시 시킨다.
 */
function inspect(m, w) {
  const bad = [];
  if (!Array.isArray(w.blurbs) || w.blurbs.length !== pickFive(m.books).length || w.blurbs.some(value => !String(value ?? '').trim())) bad.push('각 책의 소개가 필요하다.');
  if (w.reviews || w.contexts) bad.push('감상과 감상배경 라벨은 생성하지 마라. DB 원문은 스크립트가 넣는다.');
  return bad;
}

/**
 * 기존 59편의 최종 양식으로 조립한다.
 *
 * 첫 줄 링크 → 인물 사진([avatar:], 액자 없음) → 「이름 · 직군」 → 고정 도입 → 정중체 인물 정리 → 고정 안내
 * → 책마다 「제목 — 저자」·표지·소개·[q]DB 감상 원문[/q] → 마무리 → 링크. 나레이터 두 줄은 고정 문구다
 * (fix-opening.mjs 참고). 감상은 celeb_contents.review 원문 그대로 인용구에 넣는다.
 */
function assemble(m, w) {
  const { celeb: c, books, totalBooks } = m;
  const five = pickFive(books);
  const link = `${SITE}/celeb/${c.slug}`;
  const label = PROF_LABEL[c.profession];
  if (!c.avatar_url) throw new Error('인물 아바타가 없다 — 사진 없이 조립하지 않는다');
  if (!label) throw new Error(`직군 '${c.profession}' 이 이름 표시 표에 없다 — PROF_LABEL 에 넣고 다시 돌려라`);
  const blurbs = Array.isArray(w.blurbs) ? w.blurbs.map((b) => String(b ?? '').trim()) : [];
  if (blurbs.length !== five.length || blurbs.some((b) => !b)) throw new Error('책 소개가 다섯 권 모두 있어야 한다');
  const bad = [w.profile, w.outro, ...blurbs].find((t) => /\[(?:img|avatar|q|c)\]|━|\*\*/.test(String(t)));
  if (bad) throw new Error(`빈칸에 서식 표시가 들어 있다: ${String(bad).slice(0, 30)}`);
  const L = [];
  L.push(`📚 ${c.nickname}의 감상 기록 전체 보기 → ${link}`);
  L.push('');
  // 🔴 seo-image 는 사이트 다크 테마에 맞춰 검은 배경을 깐다. 흰 바탕인 블로그에서는
  //    시커먼 덩어리로 보인다. 배경을 지운 아바타 원본을 쓰고, 흰색 합성은 발행기가 한다.
  L.push(`[avatar:${c.avatar_url}|100|${c.nickname}]`);
  L.push('');
  L.push(`[c]**${c.nickname} · ${label}**[/c]`);
  L.push('');
  L.push(`[c]오늘 만나볼 인물은 ${c.nickname}입니다.[/c]`);
  L.push('');
  L.push(String(w.profile).trim());
  L.push('');
  L.push(`[c]${c.nickname}${subjectParticle(c.nickname)} 읽은 책들을 살펴볼까요?[/c]`);
  L.push('');
  L.push('━━━━━━');
  L.push('');
  five.forEach((b, i) => {
    L.push(`[c]**『${b.title}』 — ${b.creator ?? ''}**[/c]`);
    L.push('');
    L.push(`[img:${b.thumbnail_url}|240|${b.title} 표지]`);
    L.push('');
    L.push(blurbs[i]);
    L.push('');
    L.push(`[q]${String(b.review).replace(/\s*\n\s*/g, ' ').trim()}[/q]`);
    L.push('');
    L.push('━━━━━━');
    L.push('');
  });
  L.push(`[c]여기까지가 ${totalBooks}권 가운데 다섯 권입니다.[/c]`);
  L.push('');
  L.push(String(w.outro).trim());
  L.push(`→ ${link}`);

  const title = `${w.suffix} ${c.nickname}${subjectParticle(c.nickname)} 읽은 ${totalBooks}권의 책${c.nickname_en ? ` (${c.nickname_en})` : ''}`;
  const cat = CATEGORY[c.profession];
  if (!cat) throw new Error(`직군 '${c.profession}' 이 카테고리 표에 없다 — CATEGORY 에 넣고 다시 돌려라`);
  // 네이버 태그 입력은 공백에서 갈라진다(「알리 압달」→ #알리 #압달). 인물명은 공백을 빼고 한 태그로 넣는다.
  const tags = [c.nickname.replace(/\s+/g, ''), cat, '책추천', '독서', '추천도서'];
  return {
    kind: 'celeb',
    target: `/celeb/${c.slug}`,
    title,
    body: L.join('\n'),
    tags,
    category: cat,
    status: 'draft',
    // 고른 다섯 권과 감상 행 — 발행 뒤 DB 원문 대조와 서비스 링크 확인에 쓴다.
    books: five.map((b) => ({ content_id: b.content_id, review_id: b.id, title: b.title, creator: b.creator ?? null, source_url: b.source_url ?? null })),
  };
}

async function main() {
  const drafts = fs.existsSync(DRAFTS) ? JSON.parse(fs.readFileSync(DRAFTS, 'utf8')) : [];
  const have = new Set(drafts.map((d) => String(d.target ?? '').split('/').pop()));
  const fills = fillsPath ? JSON.parse(fs.readFileSync(fillsPath, 'utf8')) : null;

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
      if (have.has(slug)) { skip++; console.log(`건너뜀 ${slug} — 기존 초안이 있다`); continue; }
      const m = await material(slug);
      if (m.books.length < 5) { skip++; console.log(`건너뜀 ${slug} — 쓸 수 있는 책 ${m.books.length}권`); continue; }
      let j = null;
      let notes = [];
      if (fills) {
        j = fills[slug];
        if (!j) { skip++; console.log(`건너뜀 ${slug} — 빈칸 파일에 없다`); continue; }
        if (Array.isArray(j.exclude) && j.exclude.length) {
          const drop = new Set(j.exclude);
          m.books = m.books.filter((b) => !drop.has(b.content_id));
          console.log(`   제외 ${j.exclude.length}권 (${j.excludeReason ?? '이유 미기재'})`);
          if (m.books.length < 5) { skip++; console.log(`건너뜀 ${slug} — 제외 뒤 쓸 수 있는 책 ${m.books.length}권`); continue; }
        }
      }
      for (let attempt = 0; !fills && attempt < 2; attempt++) {
        const extra = notes.length
          ? `\n\n## 앞선 시도에서 어긋난 점 — 이번에는 반드시 고쳐라\n${notes.map((n) => `- ${n}`).join("\n")}`
          : "";
        const text = await agyCall(buildPrompt(m) + extra, { timeoutMs: 900000 });
        const cand = JSON.parse(String(text).slice(String(text).indexOf("{"), String(text).lastIndexOf("}") + 1));
        if (!cand.intro || !cand.profile || !Array.isArray(cand.blurbs)) throw new Error("응답 형식이 어긋난다");
        notes = inspect(m, cand);
        j = cand;
        if (!notes.length) break;
        console.log(`   ↻ 다시 시킴: ${notes.join(" / ")}`);
      }
      if (notes.length) console.log(`   ⚠ 남은 문제: ${notes.join(" / ")}`);
      const row = assemble(m, j);
      if (dry) { console.log(`\n===== ${row.title}\n${row.body}\n`); ok++; continue; }
      // 🔴 예약 작업이 같은 파일의 status 를 고치는 중일 수 있다. 통째로 덮어쓰면 그 갱신이 날아간다.
      //    26.09.03에 그렇게 예약된 글이 draft 로 되돌아가 중복 발행 직전까지 갔다.
      //    레인 여럿이 동시에 돌 때도 같은 일이 난다 — 읽기·쓰기를 잠금 안에서 한 번에 끝낸다.
      const wrote = withDraftsLock(() => {
        const live = fs.existsSync(DRAFTS) ? JSON.parse(fs.readFileSync(DRAFTS, "utf8")) : [];
        if (live.some((d) => d.target === row.target)) return false;
        live.push(row);
        fs.writeFileSync(DRAFTS, JSON.stringify(live, null, 1));
        return true;
      });
      if (!wrote) { console.log(`   건너뜀 ${slug} — 그 사이 다른 레인이 넣었다`); continue; }
      ok++;
      console.log(`OK ${slug} — ${row.title}`);
    } catch (e) {
      fail++;
      console.log(`실패 ${slug}: ${String(e).slice(0, 300)}`);
    }
  }
  console.log(`\n완료 — 조립 ${ok} / 건너뜀 ${skip} / 실패 ${fail}`);
}

if (isMain) await main();
