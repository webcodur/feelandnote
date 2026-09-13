// Read existing drafts and live service records; write only a separate revision directory.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { parseRevisionBody } from './apply-institution-revisions.mjs';
import { koreanListLabels } from './korean-list-labels.mjs';

const ROOT = 'D:/blog-assets/naver-blog';
const OUT = `${ROOT}/remaining-institution-revisions`;
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const hash = v => crypto.createHash('sha256').update(v).digest('hex');
const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
fs.mkdirSync(`${OUT}/data`, { recursive: true });
const completed = new Set(fs.readdirSync(`${ROOT}/revisions`).filter(f => /^\d+\.json$/.test(f)).map(f => f.slice(0, -5)));
const posts = read(`${ROOT}/posts.json`).filter(p => p.kind === 'curated' && !['deleted', 'to-delete', 'private', 'replaced', 'skip'].includes(p.link) && !completed.has(p.logNo));
if (posts.length !== 33 || completed.size !== 18) throw new Error('Expected 33 remaining posts and 18 completed posts');
const drafts = read(`${ROOT}/drafts.json`);
const oldImages = read(`${ROOT}/_blog-institution-images.json`).posts;
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY);
async function page(table, select = '*', filter = q => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(select)).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
async function chunks(table, select, key, ids) {
  const rows = [];
  for (let i = 0; i < ids.length; i += 80) rows.push(...await page(table, select, q => q.in(key, ids.slice(i, i + 80))));
  return rows;
}
const cache = `${OUT}/data/service.json`;
let service;
if (process.argv.includes('--cached') && fs.existsSync(cache)) service = read(cache);
else {
  const lists = await page('curated_lists', '*', q => q.in('slug', posts.map(p => p.url.split('/').at(-1))));
  const curators = await chunks('curators', '*', 'id', [...new Set(lists.map(l => l.curator_id))]);
  const items = await chunks('curated_list_items', '*', 'list_id', lists.map(l => l.id));
  const ids = [...new Set(items.filter(i => !i.hidden && i.content_id).map(i => i.content_id))];
  const locales = await chunks('content_locales', 'content_id,locale,title,creator,thumbnail_url,description', 'content_id', ids);
  const reviews = await chunks('celeb_contents', 'id,celeb_id,content_id,review', 'content_id', ids);
  const people = await chunks('celebs', 'id,nickname,avatar_url,profession,publication_status,celeb_tier', 'id', [...new Set(reviews.map(r => r.celeb_id))]);
  service = { checked_at: new Date().toISOString(), lists, curators, items, locales, reviews, people };
  write(cache, service);
}
const professionSource = fs.readFileSync(path.resolve(import.meta.dirname, '../../../../packages/shared/src/constants/celeb-professions.ts'), 'utf8');
const professions = Object.fromEntries([...professionSource.matchAll(/value: '([^']+)', label: '([^']+)'/g)].map(m => [m[1], m[2]]));
const people = new Map(service.people.filter(p => p.publication_status === 'active' && p.avatar_url).map(p => [p.id, p]));
const locales = new Map(service.locales.filter(l => l.locale === 'ko').map(l => [l.content_id, l]));
const titleKey = s => String(s ?? '').replace(/\s+\d+$/, '').replace(/[\s·:：―—\-.,!?『』「」()[\]]/g, '').toLowerCase();
const extraIntros = fs.existsSync(`${OUT}/data/book-intros.json`) ? read(`${OUT}/data/book-intros.json`) : {};
const prose = fs.existsSync(`${OUT}/data/prose.json`) ? read(`${OUT}/data/prose.json`) : { lists: {}, books: {} };
function polite(value) {
  const endings = { '이었다': '이었습니다', '있었다': '있었습니다', '없었다': '없었습니다', '했다': '했습니다', '됐다': '됐습니다', '웠다': '웠습니다', '왔다': '왔습니다', '었다': '었습니다', '았다': '았습니다', '이다': '입니다', '있다': '있습니다', '없다': '없습니다', '한다': '합니다', '된다': '됩니다', '준다': '줍니다', '진다': '집니다', '난다': '납니다', '놓는다': '놓습니다', '뽑는다': '뽑습니다', '받는다': '받습니다', '남는다': '남습니다', '묻는다': '묻습니다', '나눈다': '나눕니다', '나뉜다': '나뉩니다', '다룬다': '다룹니다', '겨룬다': '겨룹니다', '이룬다': '이룹니다', '그린다': '그립니다', '가린다': '가립니다', '오른다': '오릅니다', '든다': '듭니다', '비춘다': '비춥니다', '서다': '서입니다', '시다': '시입니다', '우화다': '우화입니다', '소설이다': '소설입니다', '넓다': '넓습니다', '가깝다': '가깝습니다', '넣지 않았다': '넣지 않았습니다' };
  let result = String(value ?? '').trim();
  for (const [from, to] of Object.entries(endings).sort((a,b) => b[0].length-a[0].length)) result = result.replace(new RegExp(`${from}(?=[.!?](?:\\s|$)|$)`, 'g'), to);
  for (const [from, to] of Object.entries({ '짚는다':'짚습니다', '랐다':'랐습니다', '렸다':'렸습니다', '땄다':'땄습니다', '아우른다':'아우릅니다', '꼽힌다':'꼽힙니다', '들여다본다':'들여다봅니다', '그려낸다':'그려냅니다', '보인다':'보입니다', '부른다':'부릅니다', '이야기다':'이야기입니다', '관찰기다':'관찰기입니다', '투표다':'투표입니다', '위다':'위입니다', '』다':'』입니다' })) result = result.replace(new RegExp(`${from}(?=[.!?](?:\\s|$)|$)`, 'g'), to);
  return result;
}
// Reuse existing book introductions, never the adjacent appreciation paragraphs.
const blurbs = new Map();
for (const d of [...read(`${ROOT}/celeb-drafts.json`), ...drafts, ...[...completed].map(id => read(`${ROOT}/revisions/${id}.json`))]) {
  const lines = d.body?.split('\n') ?? [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:\[c\])?\*\*『(.+?)』/);
    if (!m) continue;
    const nextImage = lines.findIndex((line, j) => j > i && line.startsWith('[img:'));
    if (nextImage < 0 || nextImage > i + 4) continue;
    let j = nextImage + 1; while (!lines[j]?.trim() && j < lines.length) j++;
    const v = lines[j]?.trim();
    if (v && !/^(\[|\*|\d{4}|국내|한국어판|원서|표지)/.test(v) && v.length > 50 && !/감상배경|수상작 ·|출간 .*출판/.test(v)) blurbs.set(titleKey(m[1]), v);
  }
}
const prepared = [], choices = [];
for (const post of posts) {
  const target = new URL(post.url).pathname;
  const list = service.lists.find(l => l.slug === target.split('/').at(-1));
  const curator = service.curators.find(c => c.id === list.curator_id);
  if (curator.slug !== target.split('/').at(-2)) throw new Error('List/curator mismatch');
  const items = service.items.filter(i => i.list_id === list.id && !i.hidden).sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const draft = drafts.find(d => d.logNo === post.logNo);
  const oldTitles = [...(draft?.body ?? '').matchAll(/\*\*『(.+?)』/g)].map(m => titleKey(m[1]));
  const candidates = items.map((item, position) => {
    const locale = locales.get(item.content_id);
    const title = locale?.title ?? item.raw_title;
    const reviewPool = service.reviews.filter(r => r.content_id === item.content_id && r.review?.trim() && people.has(r.celeb_id) && !/https?:\/\/|\[\/?q\]/.test(r.review));
    reviewPool.sort((a, b) => {
      const pa = people.get(a.celeb_id), pb = people.get(b.celeb_id);
      const usedA = draft?.body.includes(pa.nickname) ? 1 : 0, usedB = draft?.body.includes(pb.nickname) ? 1 : 0;
      return usedB - usedA || Number(pb.celeb_tier ?? 0) - Number(pa.celeb_tier ?? 0) || b.review.length - a.review.length;
    });
    const intro = prose.books?.[title] ?? extraIntros[item.content_id]?.intro ?? blurbs.get(titleKey(title)) ?? locale?.description;
    return { item, position, locale, title, intro, reviews: reviewPool, old: oldTitles.indexOf(titleKey(title)) };
  }).filter(c => c.locale?.thumbnail_url && /[가-힣]/.test(c.intro ?? '') && c.reviews.length);
  candidates.sort((a, b) => Number(b.old >= 0) - Number(a.old >= 0) || (a.old >= 0 && b.old >= 0 ? a.old - b.old : 0) || Number(blurbs.has(titleKey(b.title))) - Number(blurbs.has(titleKey(a.title))) || a.position - b.position);
  const selected = candidates.slice(0, list.slug === 'newbery-medal' ? 2 : 3);
  if (selected.length < (list.slug === 'newbery-medal' ? 2 : 3)) { console.log(`MISSING ${list.slug}: only ${selected.length} usable works`); continue; }
  const imageRecord = oldImages.find(p => p.logNo === post.logNo);
  const logoUrl = curator.logo_url?.startsWith('/') ? `https://feelandnote.com${curator.logo_url}` : curator.logo_url;
  let logoAsset;
  if (logoUrl) {
    let local = imageRecord?.service_registration?.logo_url === logoUrl ? imageRecord.service_registration.local_file : null;
    if (!local || !fs.existsSync(local)) {
      const res = await fetch(logoUrl); if (!res.ok) throw new Error(`Logo ${curator.slug}: ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      local = `${OUT}/data/${curator.slug}-logo${path.extname(new URL(logoUrl).pathname) || '.png'}`;
      if (fs.existsSync(local) && hash(fs.readFileSync(local)) !== hash(bytes)) throw new Error('Refuse overwrite different asset');
      if (!fs.existsSync(local)) fs.writeFileSync(local, bytes);
    }
    const bytes = fs.readFileSync(local), meta = await sharp(bytes).metadata();
    logoAsset = { original_url: logoUrl, local_file: local, sha256: hash(bytes), width: meta.width, height: meta.height };
  }
  const columns = list.is_annual ? ['연도', '작품', '작가'] : list.is_ranked ? ['순위', '작품', '작가'] : ['작품', '작가'];
  const tidyCell = s => String(s ?? '').replace(/[\t\r\n]+/g, ' ').trim();
  const rows = items.map(i => [...(columns.length === 3 ? [String((list.is_annual ? i.year : i.rank) ?? '')] : []), ...koreanListLabels(i, locales.get(i.content_id))]).map(r => r.map(tidyCell));
  const source_file = `${OUT}/data/${post.logNo}-full-list.json`;
  write(source_file, { count: rows.length, columns, rows, items });
  const fullList = { heading: `${list.title} 전체 목록`, columns, rows, source_file };
  const dbReviews = selected.map(c => {
    const r = c.reviews[0], p = people.get(r.celeb_id);
    return { book: c.title, review_id: r.id, content_id: r.content_id, celeb_id: r.celeb_id, person: p.nickname, review: r.review, avatar_url: p.avatar_url, person_label: `${p.nickname} · ${professions[p.profession] ?? p.profession ?? '인물'}` };
  });
  const blocks = [`📚 ${list.title} 전체 보기 → ${post.url}`];
  if (logoAsset) blocks.push(`[img:${logoUrl}|400|${curator.name} 로고]`);
  blocks.push(polite(prose.lists?.[list.slug] ?? list.description), `전체 목록 가운데 ${selected.length === 2 ? '두' : '세'} 권을 골라 책 소개와 그 책을 읽은 인물의 감상 기록을 함께 소개합니다.`);
  selected.forEach((c, i) => {
    const r = dbReviews[i];
    blocks.push('━━━━━━', `[c]**『${c.title}』 · ${c.locale.creator ?? c.item.raw_creator}**[/c]`, `[img:${c.locale.thumbnail_url}|240|${c.title} 표지]`, polite(c.intro), `[avatar:${r.avatar_url}|100|${r.person}]`, `[c]**${r.person_label}**[/c]`, `[q]${r.review}[/q]`);
  });
  blocks.push('━━━━━━', `[c]**${fullList.heading}**[/c]`, `[table]\n${[columns, ...rows].map(r => r.join('\t')).join('\n')}\n[/table]`, `필앤노트에서 전체 목록의 표지와 국내 번역 여부를 확인하실 수 있습니다. 작품을 누르면 같은 책을 읽은 인물과 그 인물의 다른 독서 기록으로 이어집니다.`, `→ ${post.url}`);
  const revision = { kind: 'curated', logNo: post.logNo, target, title: post.title, body: blocks.filter(Boolean).join('\n\n'), tags: draft?.tags ?? [curator.name, list.title, '책추천', '필앤노트'], category: post.category, status: 'check', dbReviews, fullList, ...(logoAsset ? { logoAsset } : {}), draftSeed: { kind: 'curated', logNo: post.logNo, target, title: post.title, category: post.category, status: 'check' } };
  parseRevisionBody(revision);
  const file = `${OUT}/${post.logNo}.json`;
  write(file, revision);
  prepared.push({ ...revision, source_revision_file: file, source_revision_sha256: hash(fs.readFileSync(file)) });
  choices.push({ logNo: post.logNo, slug: list.slug, intro: list.description, works: selected.map((c, i) => ({ title: c.title, intro: c.intro, reusedIntro: blurbs.has(titleKey(c.title)), person: dbReviews[i].person, reviewLength: dbReviews[i].review.length })), rows: rows.length });
  console.log(`${post.logNo} ${list.title}: ${selected.map(c => c.title).join(' / ')} (${rows.length} rows)`);
}
write(`${OUT}/revisions.json`, prepared);
write(`${OUT}/manifest.json`, prepared.map(r => ({ kind: r.kind, logNo: r.logNo, target: r.target, source_revision_sha256: r.source_revision_sha256 })));
write(`${OUT}/data/choices.json`, choices);
console.log(`Prepared ${prepared.length}; completed ${completed.size} excluded`);
