// 기존 인물 안내글의 책·소개를 보존하고 현재 DB 감상 원문을 별도 구획에 담는다.
// 실행: node scripts/naver-blog/prepare-celeb-revisions.mjs [--refresh]
// 브라우저·DB·기존 초안/발행 원장은 수정하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ASSETS } from '../blog-assets.mjs';
import { material } from './compose-celebs.mjs';

const ROOT = path.join(ASSETS, 'naver-blog');
const OUT = path.join(ROOT, 'celeb-revisions');
const DATA = path.join(OUT, 'data');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = value => String(value ?? '').normalize('NFKC').replace(/[\s·:：,，.\-—–『』「」()（）]/g, '').toLowerCase();
const imageKey = value => { try { const url = new URL(value); return url.origin + url.pathname; } catch { return ''; } };
const PROF = { author: '작가', writer: '작가', poet: '시인', director: '감독', musician: '음악가', artist: '예술가', actor: '배우', entrepreneur: '기업가', investor: '투자자', politician: '정치인', leader: '지도자', commander: '군인', scholar: '학자', scientist: '과학자', philosopher: '철학자', humanities_scholar: '인문학자', social_scientist: '사회과학자', natural_scientist: '자연과학자', influencer: '인플루언서', athlete: '스포츠인' };
// 이 원고에서 읽어 확인한 종결만 바꾼다. 감상에는 호출하지 않는다.
const NOMINAL_ENDINGS = /(?:서|기|시|화|사회|사|에세이|르포르타주|스릴러|미스터리|민족지|연구|탐구)다$/;
function politeBlurb(text) {
  return text.replace(/[가-힣]+다(?=\.)/g, word => {
    if (word.endsWith('습니다') || word.endsWith('합니다') || word.endsWith('입니다')) return word;
    if (word.endsWith('에세이다')) return word.slice(0, -1) + '입니다';
    if (word.endsWith('이다')) return word.slice(0, -2) + '입니다';
    if (word.endsWith('한다')) return word.slice(0, -2) + '합니다';
    if (word.endsWith('는다')) return word.slice(0, -2) + '습니다';
    if (word.endsWith('있다')) return word.slice(0, -1) + '습니다';
    if (NOMINAL_ENDINGS.test(word)) return word.slice(0, -1) + '입니다';
    const stem = word.slice(0, -1), last = stem.charCodeAt(stem.length - 1), jong = (last - 0xac00) % 28;
    if (jong === 4) return stem.slice(0, -1) + String.fromCharCode(last - 4 + 17) + '니다';
    if (jong === 20) return stem + '습니다';
    throw new Error(`읽고 확인할 책 소개 종결: ${word}`);
  });
}
fs.mkdirSync(DATA, { recursive: true });
const drafts = read(path.join(ROOT, 'celeb-drafts.json'));
const posts = read(path.join(ROOT, 'posts.json'));
if (drafts.length !== 59 || new Set(drafts.map(d => d.logNo)).size !== 59) throw new Error('검수 대상 59편이 달라졌다');

function bookSections(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const starts = lines.flatMap((line, index) => /^\[c\]\*\*『.+』/.test(line) ? [index] : []);
  if (starts.length !== 5) throw new Error(`책 제목이 5개가 아니다: ${starts.length}`);
  const final = lines.findIndex((line, index) => index > starts.at(-1) && /^(---|━+)$/.test(line));
  if (final < 0) throw new Error('마무리 구분선이 없다');
  const books = starts.map((start, i) => {
    const part = lines.slice(start, starts[i + 1] ?? final).filter(line => line.trim());
    const heading = part[0].match(/^\[c\]\*\*『(.+)』\s*[—·-]\s*(.*?)\*\*\[\/c\]$/);
    const img = part[1]?.match(/^\[img:(.+?)\|(\d+)\|(.+)\]$/);
    if (!heading || !img) throw new Error(`책 제목/표지 구성이 다르다: ${part[0]}`);
    const reviewAt = part.findIndex(line => line.startsWith('**감상배경:**'));
    if (part.length < 4 || ![-1, 3].includes(reviewAt) || part.slice(3).some(line => /^\[|^━|^---/.test(line))) throw new Error(`소개/감상 경계가 다르다: ${heading[1]} / ${reviewAt} / ${part.length}`);
    return { title: heading[1], creator: heading[2], image: img[1], blurb: part[2] };
  });
  return { prefix: lines.slice(0, starts[0]).join('\n'), books, suffix: lines.slice(final).join('\n') };
}

function matchBook(book, candidates) {
  let found = candidates.filter(row => normalize(row.title) === normalize(book.title) && normalize(row.creator) === normalize(book.creator));
  let method = 'title+creator';
  if (found.length !== 1) { found = candidates.filter(row => imageKey(row.thumbnail_url) === imageKey(book.image)); method = 'cover'; }
  if (found.length !== 1) { found = candidates.filter(row => normalize(row.title) === normalize(book.title)); method = 'title'; }
  if (found.length !== 1) throw new Error(`작품 매칭 ${found.length}건: ${book.title} / ${book.creator}`);
  const row = found[0];
  if (typeof row.review !== 'string' || !row.review.trim()) throw new Error(`DB 감상이 없다: ${book.title}`);
  if (/\[\/?q\]|\[(?:img|avatar):/.test(row.review)) throw new Error(`감상에 원고 제어 기호가 있다: ${book.title}`);
  return { ...row, thumbnail_url: row.thumbnail_url || book.image, method };
}

const issues = [], ready = [];
for (let start = 0; start < drafts.length; start += 4) {
  const fetched = await Promise.allSettled(drafts.slice(start, start + 4).map(async draft => {
    const slug = draft.target.split('/').at(-1);
    const file = path.join(DATA, `${slug}.json`);
    if (fs.existsSync(file) && !process.argv.includes('--refresh')) return read(file);
    const value = await material(slug);
    value.fetchedAt = new Date().toISOString();
    write(file, value);
    return value;
  }));
  for (let offset = 0; offset < fetched.length; offset++) {
    const draft = drafts[start + offset], fetchedRow = fetched[offset];
    try {
      const preparedFile = path.join(OUT, `${draft.logNo}.json`);
      if (draft.body.includes('[q]') && fs.existsSync(preparedFile)) {
        const prepared = read(preparedFile);
        if (draft.body !== prepared.body) throw new Error('적용 뒤 바뀐 원고는 자동 재조립하지 않는다');
        ready.push({ ...prepared, source_revision_file: preparedFile, source_revision_sha256: hash(fs.readFileSync(preparedFile)) });
        console.log(`기존 완료 원고 보존 ${draft.logNo}`);
        continue;
      }
      if (fetchedRow.status !== 'fulfilled') throw fetchedRow.reason;
      const m = fetchedRow.value, c = m.celeb;
      const post = posts.filter(p => String(p.logNo) === String(draft.logNo));
      if (post.length !== 1 || post[0].kind !== 'celeb' || post[0].url !== `https://feelandnote.com${draft.target}`) throw new Error('발행 원장 대상이 다르다');
      if (!c.avatar_url || !PROF[c.profession]) throw new Error(`아바타/직군 없음: ${c.profession}`);
      const parsed = bookSections(draft.body);
      const personLabel = `${c.nickname} · ${PROF[c.profession]}`;
      let prefix = parsed.prefix.replace(/\[img:[^\n]+\|420\|[^\n]+\]/, `[avatar:${c.avatar_url}|100|${c.nickname}]\n\n[c]**${personLabel}**[/c]`);
      if (!prefix.includes(`[avatar:${c.avatar_url}|100|${c.nickname}]`)) throw new Error('상단 인물 사진 위치가 다르다');
      prefix = prefix.replace(/\n---\n/g, '\n━━━━━━\n').trimEnd();
      const dbReviews = [], matches = [];
      const sections = parsed.books.map(book => {
        const row = matchBook(book, m.allBooks);
        dbReviews.push({ review_id: row.id, content_id: row.content_id, celeb_id: c.id, person: c.nickname, person_label: personLabel, avatar_url: c.avatar_url, review: row.review, source_url: row.source_url });
        matches.push({ original_title: book.title, title: row.title, creator: row.creator, content_id: row.content_id, method: row.method, previous_cover: book.image, cover: row.thumbnail_url });
        const blurb = c.slug === 'bertrand-russell' && book.title === '사랑의 철학' ? book.blurb.replace('성찰한 산문이다.', '성찰한 서정시이다.') : book.blurb;
        return `[c]**『${row.title}』 — ${book.creator}**[/c]\n\n[img:${row.thumbnail_url}|240|${row.title} 표지]\n\n${politeBlurb(blurb)}\n\n[q]${row.review}[/q]`;
      });
      let suffix = parsed.suffix.replace(/^---/g, '━━━━━━');
      // 기존 원고의 개별 음악·영상 예시를 유지하면서 책 권수만 현재 서비스 수치로 맞춘다.
      suffix = suffix.replace(/\[c\]여기까지가[^\n]+?가운데 다섯 권입니다\.\[\/c\]/, `[c]여기까지가 ${m.totalBooks}권 가운데 다섯 권입니다.[/c]`);
      suffix = suffix.replace(/나머지 [가-힣\d]+ 권까지/, `나머지 ${m.totalBooks - 5}권까지`);
      const revision = { kind: 'celeb', target: draft.target, title: draft.title.replace(/읽은 \d+권의 책/, `읽은 ${m.totalBooks}권의 책`), body: `${prefix}\n\n${sections.join('\n\n━━━━━━\n\n')}\n\n${suffix}`, tags: draft.tags, category: draft.category, logNo: String(draft.logNo), dbReviews, celeb: { id: c.id, name: c.nickname, avatar_url: c.avatar_url, person_label: personLabel }, sourceDraftSha256: hash(draft.body), dbFetchedAt: m.fetchedAt, bookMatches: matches };
      const quoted = [...revision.body.matchAll(/\[q\]([\s\S]*?)\[\/q\]/g)].map(hit => hit[1]);
      if (JSON.stringify(quoted) !== JSON.stringify(dbReviews.map(row => row.review))) throw new Error('감상 원문이 변경됐다');
      if ((revision.body.match(/\[avatar:/g) ?? []).length !== 1 || (revision.body.match(/\[img:/g) ?? []).length !== 5 || revision.body.includes('**감상배경:**') || revision.body.includes('[table]')) throw new Error('인물 본문 구성이 다르다');
      const sourceFile = path.join(OUT, `${draft.logNo}.json`);
      if (!fs.existsSync(sourceFile) || JSON.stringify(read(sourceFile)) !== JSON.stringify(revision)) write(sourceFile, revision);
      ready.push({ ...revision, source_revision_file: sourceFile, source_revision_sha256: hash(fs.readFileSync(sourceFile)) });
      console.log(`준비 ${draft.logNo} ${c.nickname} / 감상 ${dbReviews.map(r => r.review.length).join(',')}`);
    } catch (error) {
      const issue = { logNo: draft.logNo, target: draft.target, error: error.message };
      issues.push(issue); console.log(`확인 필요 ${JSON.stringify(issue)}`);
    }
  }
}
write(path.join(OUT, 'input.json'), ready);
write(path.join(OUT, 'manifest.json'), ready.map(row => ({ logNo: row.logNo, target: row.target, kind: 'celeb', source_revision_sha256: row.source_revision_sha256 })));
write(path.join(OUT, 'issues.json'), issues);
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bodyHtml = body => body.split('\n').map(line => {
  if (!line) return '';
  const img = line.match(/^\[(?:img|avatar):(.+)\|(\d+)\|(.+)\]$/);
  if (img) return `<figure><img loading="lazy" src="${esc(img[1])}" width="${img[2]}" alt="${esc(img[3])}"></figure>`;
  if (line === '━━━━━━') return '<hr>';
  let value = esc(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  if (line.startsWith('[q]')) value = value.replace('[q]', '<blockquote>');
  if (line.endsWith('[/q]')) value = value.replace('[/q]', '</blockquote>');
  if (line.startsWith('[c]')) return `<p class="center">${value.replace('[c]', '').replace('[/c]', '')}</p>`;
  return `<p>${value}</p>`;
}).join('\n').replace(/<p><blockquote>/g, '<blockquote><p>').replace(/<\/blockquote><\/p>/g, '</p></blockquote>');
fs.writeFileSync(path.join(OUT, 'preview.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>인물 안내글 개편 미리보기</title><style>body{font:17px/1.9 sans-serif;color:#222;background:#f4f4f4;margin:0}nav,article{max-width:740px;padding:32px;margin:24px auto;background:white}nav a{display:inline-block;margin:4px 10px}h1{font-size:25px;line-height:1.5}figure,.center{text-align:center}img{max-width:100%;height:auto}hr{border:0;border-top:1px solid #ddd;margin:44px 0}p{margin:20px 0}blockquote{border-left:3px solid #222;background:#fafafa;padding:8px 24px;margin:28px 0}blockquote p{white-space:pre-wrap}</style><nav>${ready.map(r => `<a href="#p${r.logNo}">${esc(r.celeb.name)}</a>`).join('')}</nav>${ready.map(r => `<article id="p${r.logNo}"><h1>${esc(r.title)}</h1>${bodyHtml(r.body)}</article>`).join('')}</html>`);
console.log(JSON.stringify({ prepared: ready.length, issues: issues.length, output: OUT }));
if (issues.length) process.exitCode = 1;
