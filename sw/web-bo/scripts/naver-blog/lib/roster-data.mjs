// compose-celebs.mjs material()의 BOOK·ko 표지·감상 80자 조건에 한국어 제목 확인을 더한다.
export const MIN_REVIEW_LENGTH = 80;
const text = value => String(value ?? '').trim();
// 한국어판도 《1984》처럼 숫자 제목을 쓴다. ko 메타의 숫자 제목은 남긴다.
const koreanTitle = value => /[가-힣]/.test(text(value)) || /^(?=.*\d)[\d\s.,:!?~…()[\]{}+\-–—]+$/.test(text(value));
const active = c => c?.celeb_tier === 'full' && c.publication_status === 'active' && text(c.slug);
export function celebSlug(value) {
  const s = text(value);
  if (!s) return '';
  if (!s.includes('/')) return s;
  try { return new URL(s, 'https://feelandnote.com').pathname.match(/^\/(?:ko\/|en\/)?celeb\/([^/]+)\/?$/)?.[1] ?? ''; }
  catch { return ''; }
}
const slugOf = row => celebSlug(row.slug) || celebSlug(row.target) || celebSlug(row.url);
const livePost = p => p.kind === 'celeb' && !['deleted', 'private', 'replaced', 'skip'].includes(p.link);
const peopleCount = rows => new Set(rows.map(r => r.slug).filter(Boolean)).size;

export function buildRoster({ celebs, relations, contents, locales, posts, drafts, min = 5 }) {
  const byId = new Map(celebs.map(c => [c.id, c]));
  const bySlug = new Map(celebs.map(c => [c.slug, c]));
  const bookIds = new Set(contents.filter(c => c.type === 'BOOK').map(c => c.id));
  const ko = new Map(locales.filter(l => l.locale === 'ko').map(l => [l.content_id, l]));
  const byPerson = new Map(), byBook = new Map();
  for (const r of relations) {
    const c = byId.get(r.celeb_id), meta = ko.get(r.content_id);
    if (!active(c) || !bookIds.has(r.content_id) || !koreanTitle(meta?.title) || !text(meta?.thumbnail_url) || (r.review ?? '').length < MIN_REVIEW_LENGTH) continue;
    if (!byPerson.has(c.id)) byPerson.set(c.id, new Set());
    byPerson.get(c.id).add(r.content_id);
    if (!byBook.has(r.content_id)) byBook.set(r.content_id, { ...meta, readers: new Map() });
    const readers = byBook.get(r.content_id).readers;
    const previous = readers.get(c.id);
    if (!previous || previous.review.length < r.review.length) readers.set(c.id, { ...c, review: r.review, source_url: r.source_url });
  }
  const count = c => byPerson.get(c?.id)?.size ?? 0;
  const draftRows = drafts.filter(d => !d.kind || d.kind === 'celeb').map(d => ({ ...d, slug: slugOf(d) }));
  const draftByLog = new Map(draftRows.filter(d => d.logNo).map(d => [String(d.logNo), d]));
  const postRows = posts.filter(livePost).map(p => {
    const draft = draftByLog.get(String(p.logNo));
    const slug = slugOf(p) || draft?.slug || '';
    const c = bySlug.get(slug);
    return { ...p, slug, celeb: c, n: count(c), draft };
  });
  // 초안 상태로 발행 여부를 추측하지 않는다. 실제 글 대장의 번호로 이번 글을 식별한다.
  const current = postRows.filter(p => p.draft);
  const existing = postRows.filter(p => !p.draft);
  const postLogNos = new Set(postRows.map(p => String(p.logNo)));
  const unposted = draftRows.filter(d => !d.logNo || !postLogNos.has(String(d.logNo)));
  // 미발행 초안도 신규 후보에서 제외한다. 제목/이름은 신원 키로 쓰지 않는다.
  const covered = new Set([...postRows, ...draftRows].map(r => r.slug).filter(Boolean));
  const candidates = celebs.filter(active).map(c => ({ ...c, n: count(c) }))
    .filter(c => c.n >= min && !covered.has(c.slug))
    .sort((a, b) => b.n - a.n || a.slug.localeCompare(b.slug));
  const books = [...byBook.values()].map(b => ({ ...b, readers: [...b.readers.values()].sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko')) }))
    .filter(b => b.readers.length >= 2)
    .sort((a, b) => b.readers.length - a.readers.length || String(a.content_id).localeCompare(String(b.content_id)));
  return { min, candidates, books, current, existing, unposted, existingPeople: peopleCount(existing), currentPeople: peopleCount(current), coveredPeople: peopleCount(postRows) };
}

const cell = value => text(value).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
const personLink = c => `[${cell(c.nickname)}](https://feelandnote.com/celeb/${c.slug})`;
export function renderRoster(r, { top = 120 } = {}) {
  const out = ['# 인물·책 안내글 대장', '', '`pnpm naver:roster`가 DB와 `posts.json`·`celeb-drafts.json`에서 만든다.', '',
    `인물 후보의 책 수는 활성 full 인물에게 연결된 BOOK 중 ko 제목(한글 또는 숫자 제목)·ko 표지·${MIN_REVIEW_LENGTH}자 이상 감상이 있는 서로 다른 책 수다. 신규 인물만 ${r.min}권 이상을 요구한다. 기존 글은 책 수와 현재 인물 공개 상태에 관계없이 모두 남긴다.`, '',
    '| 구분 | 글 수 | 인물 수 |', '|---|---:|---:|',
    `| 기존 인물 글 | ${r.existing.length} | ${r.existingPeople} |`,
    `| 이번 작성 중 글 대장에 있는 글 | ${r.current.length} | ${r.currentPeople} |`,
    `| 전체 인물 글 | ${r.existing.length + r.current.length} | ${r.coveredPeople} |`,
    `| 글 대장에 없는 초안 | ${r.unposted.length} | ${peopleCount(r.unposted)} |`,
    `| 미작성 신규 인물 후보 | — | ${r.candidates.length} |`, '',
    '글 수는 글 번호별로 보존한다. 이번 작성은 초안과 글 대장의 글 번호를 대조한 결과이며, 예약·공개 여부는 실제 네이버 화면에서 확인한다.', '',
    `## 신규 인물 후보 (${r.candidates.length}명 중 상위 ${Math.min(top, r.candidates.length)}명)`, '',
    '이 표는 프로그램이 산출한 실행 순서다. 작업·검수 원칙은 `docs/continuous/blog-naver-book.md`를 따른다.', '',
    '| # | 인물 | 직군 | 사용 가능한 책 | slug |', '|---:|---|---|---:|---|'];
  r.candidates.slice(0, top).forEach((c, i) => out.push(`| ${i + 1} | ${personLink(c)} | ${cell(c.profession)} | ${c.n} | ${c.slug} |`));
  for (const [title, rows] of [['이번에 쓴 인물 글', r.current], ['기존 인물 글', r.existing]]) {
    out.push('', `## ${title}`, '', '| 인물 | 사용 가능한 책 | 글 번호 | 글 제목 | 기록 상태 |', '|---|---:|---|---|---|');
    for (const p of rows) out.push(`| ${p.celeb ? personLink(p.celeb) : cell(p.name || p.slug || '인물 연결 미확인')} | ${p.n} | [${cell(p.logNo)}](https://blog.naver.com/dmx777/${p.logNo}) | ${cell(p.title)} | ${cell(p.link)}${p.celeb && !active(p.celeb) ? ' / 인물 비활성 또는 full 아님' : !p.celeb ? ' / DB 인물 미확인' : ''} |`);
  }
  if (r.unposted.length) {
    out.push('', '## 글 대장에 없는 초안', '', '| 인물 slug | 제목 | 초안 상태 |', '|---|---|---|');
    for (const d of r.unposted) out.push(`| ${cell(d.slug)} | ${cell(d.title)} | ${cell(d.status)} |`);
  }
  out.push('', `## 같은 책을 읽은 인물 — 책 중심 후보 (${r.books.length}권 중 상위 ${Math.min(top, r.books.length)}권)`, '',
    '위와 같은 책·감상 조건을 통과한 인물이 2명 이상인 책이다. 인물별 5권 조건은 적용하지 않는다. 제목이 같아도 content_id가 다르면 합치지 않는다. 독자 수는 출처를 검증한 독서 사실의 수가 아니라 DB 감상 기록의 수다. 작성 전에 해당 책과 각 인물의 감상 출처·구매 링크를 확인한다.', '',
    '| # | 책 | 저자 | 표지 | 인물 수 | 감상 인물 | content_id |', '|---:|---|---|---|---:|---|---|');
  r.books.slice(0, top).forEach((b, i) => out.push(`| ${i + 1} | [${cell(b.title)}](https://feelandnote.com/content/${b.content_id}?category=book) | ${cell(b.creator)} | [표지](${b.thumbnail_url}) | ${b.readers.length} | ${b.readers.map(personLink).join(', ')} | ${b.content_id} |`));
  out.push('');
  return out.join('\n');
}
