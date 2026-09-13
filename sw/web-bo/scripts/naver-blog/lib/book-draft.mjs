// 책편 원고를 기존 편집기의 text/image/quote/divider operations로 변환한다.
// 파일·DB·브라우저에는 접근하지 않는다.
import { strip, isDivider } from '../publish-drafts.mjs';
import { MIN_REVIEW_LENGTH } from './roster-data.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const urls = value => value.match(/https?:\/\/[^\s<>]+/g) ?? [];
const clean = value => value.replace(/\u200b/g, '').trim();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const imageUrl = value => {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; }
  catch { return false; }
};

export function parseBookDraft(draft) {
  const book = draft.book, reviews = draft.dbReviews;
  if (draft.kind !== 'book' || !nonempty(draft.title) || !nonempty(draft.body) || !book || book.type !== 'BOOK'
    || book.locale !== 'ko' || !UUID.test(book.content_id ?? '') || book.id !== book.content_id
    || !nonempty(book.title) || !nonempty(book.creator) || !imageUrl(book.thumbnail_url)) throw new Error('책편의 제목·BOOK·한국어 메타·표지가 맞지 않는다');
  const site = `https://feelandnote.com/content/${book.content_id}?category=book`;
  if (draft.target !== `/content/${book.content_id}?category=book` || book.url !== site) throw new Error('책편의 작품 연결이 맞지 않는다');
  if (!Array.isArray(reviews) || !reviews.length) throw new Error('책편에 DB 감상 원문이 없다');
  for (const r of reviews) {
    if (!UUID.test(r.relation_id ?? '') || !UUID.test(r.celeb_id ?? '') || r.content_id !== book.content_id
      || !/^[a-z0-9][a-z0-9.-]*$/.test(r.slug ?? '') || !nonempty(r.nickname) || !nonempty(r.headline)
      || !imageUrl(r.avatar_url) || typeof r.review !== 'string' || r.review.length < MIN_REVIEW_LENGTH
      || r.url !== `https://feelandnote.com/celeb/${r.slug}`) throw new Error('인물·감상 ID 또는 책·인물 연결과 원문 재료가 맞지 않는다');
  }
  for (const key of ['relation_id', 'celeb_id', 'slug', 'avatar_url']) {
    if (new Set(reviews.map(r => r[key])).size !== reviews.length) throw new Error(`인물 감상 또는 이미지 중복: ${key}`);
  }
  if (reviews.some(r => r.avatar_url === book.thumbnail_url)) throw new Error('인물 사진과 책 표지가 같다');

  const expectedImages = new Map([
    [`[img:${book.thumbnail_url}|240|${book.title} 표지]`, { url: book.thumbnail_url, width: 240, name: `${book.title} 표지`, role: 'cover' }],
    ...reviews.map(r => [`[avatar:${r.avatar_url}|80|${r.nickname}]`, { url: r.avatar_url, width: 80, name: r.nickname, role: 'avatar' }]),
  ]);
  const lines = draft.body.replace(/\r\n/g, '\n').split('\n');
  const images = [], quotes = [], flow = [], text = [], links = [], operations = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) { operations.push({ kind: 'text', line: lines[index], lineIndex: index }); continue; }
    if (line.startsWith('[q]')) {
      // 알려진 DB 원문 길이만큼 대조해 소비한다. 별표·문단·URL을 해석하거나 고치지 않는다.
      const expected = reviews[quotes.length]?.review;
      if (expected === undefined) throw new Error('DB 감상보다 인용구가 많다');
      const count = expected.split('\n').length;
      if (lines.slice(index, index + count).join('\n') !== `[q]${expected}[/q]`) throw new Error('DB 감상 원문 또는 순서가 다르다');
      const paragraphs = expected.split('\n').map(clean).filter(Boolean);
      const quote = { text: expected, paragraphs, line: index };
      quotes.push(quote); text.push(...paragraphs); links.push(...urls(expected));
      flow.push({ kind: 'quote', paragraphs }); operations.push({ kind: 'quote', ...quote, lineIndex: index });
      index += count - 1; continue;
    }
    const expectedImage = expectedImages.get(line);
    if (expectedImage) {
      const image = { ...expectedImage, line: index };
      images.push(image); flow.push({ kind: 'image', index: images.length - 1 }); operations.push({ kind: 'image', image, lineIndex: index }); continue;
    }
    if (isDivider(line)) { flow.push({ kind: 'divider' }); operations.push({ kind: 'divider', lineIndex: index }); continue; }
    if (/\[\/?(?:q|table)\]|\[(?:img|avatar):/.test(line)) throw new Error('원고에 없는 이미지·감상 또는 지원하지 않는 서식이다');
    if ((line.match(/\*\*/g) ?? []).length % 2 || line.includes('[c]') !== line.includes('[/c]')) throw new Error('본문 서식 표시가 맞지 않는다');
    const value = strip(line);
    text.push(value); links.push(...urls(value)); flow.push({ kind: 'text', text: value });
    operations.push({ kind: 'text', line: lines[index], lineIndex: index });
  }
  if (images.length !== reviews.length + 1 || quotes.length !== reviews.length) throw new Error('책 표지·인물 사진·DB 감상에 중복 또는 누락이 있다');
  const significant = operations.filter(op => op.kind !== 'text' || op.line.trim());
  let at = 0;
  const take = (kind, value) => {
    const op = significant[at++];
    if (op?.kind !== kind || (value !== undefined && (kind === 'text' ? op.line.trim() !== value : op.image.url !== value))) throw new Error('책·인물·감상·링크의 내용 또는 배치 순서가 다르다');
    return op;
  };
  take('text', `[c]**『${book.title}』 · ${book.creator}**[/c]`);
  take('image', book.thumbnail_url);
  const introAt = at;
  while (significant[at]?.kind === 'text') at++;
  if (at === introAt) throw new Error('책 소개가 없다');
  take('divider');
  for (const r of reviews) {
    take('image', r.avatar_url);
    take('text', `[c]**${r.nickname}**[/c]`);
    take('text', `[c]${r.headline}[/c]`);
    take('quote');
    take('text', `${r.nickname}의 다른 독서 기록 → ${r.url}`);
    take('divider');
  }
  const closingAt = at;
  const bookLink = `『${book.title}』의 감상과 책 정보 보기 → ${site}`;
  while (significant[at]?.kind === 'text' && significant[at].line.trim() !== bookLink) at++;
  if (at === closingAt) throw new Error('마지막 책 안내가 없다');
  take('text', bookLink);
  take('text', '이 글에 나온 사람들');
  for (const r of reviews) take('text', `${r.nickname} → ${r.url}`);
  if (at !== significant.length) throw new Error('등장인물 목록 뒤에 원고가 남아 있다');
  const expectedLinks = [...reviews.flatMap(r => [...urls(r.review), r.url]), site, ...reviews.map(r => r.url)];
  if (!equal(links, expectedLinks)) throw new Error('DB 원문·해당 인물·마지막 책 링크 외의 링크 또는 중복 링크가 있다');
  return { lines, images, covers: images.filter(i => i.role === 'cover'), avatars: images.filter(i => i.role === 'avatar'),
    quotes, tables: [], operations, logo: null, text, links, flow };
}
