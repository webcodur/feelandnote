// 책 중심 글의 DB 재료 추출. 감상 원문을 고치거나 발행하지 않는다.
// sw/web-bo: node scripts/naver-blog/book-material.mjs --id <content_id> [--refresh]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { ASSETS } from '../blog-assets.mjs';
import { MIN_REVIEW_LENGTH } from './lib/roster-data.mjs';

export function assembleBookMaterial({ content, locale, relations, celebs }) {
  if (!content || content.type !== 'BOOK') throw new Error('BOOK 작품만 추출할 수 있습니다.');
  if (locale?.content_id !== content.id || locale.locale !== 'ko' || !locale.title?.trim() || !locale.thumbnail_url?.trim()) {
    throw new Error('해당 책의 ko 제목과 표지가 필요합니다.');
  }
  const byId = new Map(celebs.map(c => [c.id, c]));
  const readers = relations.filter(r => {
    const c = byId.get(r.celeb_id);
    return r.content_id === content.id && c?.publication_status === 'active' && c.celeb_tier === 'full'
      && c.slug && typeof r.review === 'string' && r.review.length >= MIN_REVIEW_LENGTH;
  }).map(r => {
    const c = byId.get(r.celeb_id);
    return {
      relation_id: r.id, celeb_id: r.celeb_id, content_id: r.content_id,
      nickname: c.nickname, slug: c.slug, headline: c.headline, bio: c.bio,
      profession: c.profession, avatar_url: c.avatar_url,
      review: r.review, source_url: r.source_url,
      url: `https://feelandnote.com/celeb/${c.slug}`,
    };
  });
  return {
    book: { ...locale, id: content.id, type: content.type, url: `https://feelandnote.com/content/${content.id}?category=book` },
    readers,
  };
}

export function saveBookMaterial(dest, material, { refresh = false } = {}) {
  // wx는 검사 이후 다른 작업자가 같은 파일을 만들더라도 덮어쓰지 않는다.
  fs.writeFileSync(dest, `${JSON.stringify(material, null, 2)}\n`, { encoding: 'utf8', flag: refresh ? 'w' : 'wx' });
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--id');
  const id = i < 0 ? '' : args[i + 1];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? '')) {
    throw new Error('--id <content_id UUID>가 필요합니다.');
  }
  const refresh = args.includes('--refresh');
  const dir = path.join(ASSETS, 'naver-blog/book-drafts');
  const dest = path.join(dir, `${id}.material.json`);
  if (fs.existsSync(dest) && !refresh) {
    console.log(`기존 파일 보존: ${dest} (갱신하려면 --refresh)`);
    return;
  }
  const root = path.resolve(import.meta.dirname, '../../../..');
  for (const file of ['.env', 'sw/web-bo/.env', 'sw/web/.env']) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY ?? process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY);
  const [contentResult, localeResult] = await Promise.all([
    db.from('contents').select('id,type').eq('id', id).single(),
    db.from('content_locales').select('content_id,locale,title,creator,description,thumbnail_url,affiliate_url,isbn,publisher').eq('content_id', id).eq('locale', 'ko').single(),
  ]);
  if (contentResult.error || localeResult.error) throw new Error(`책 조회 실패: ${(contentResult.error ?? localeResult.error).message}`);
  // 잘못된 작품/메타는 인물 조회 전에 멈춘다.
  assembleBookMaterial({ content: contentResult.data, locale: localeResult.data, relations: [], celebs: [] });
  const relations = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('celeb_contents').select('id,celeb_id,content_id,review,source_url')
      .eq('content_id', id).order('id').range(from, from + 999);
    if (error) throw new Error(`감상 조회 실패: ${error.message}`);
    relations.push(...data);
    if (data.length < 1000) break;
  }
  const ids = [...new Set(relations.map(r => r.celeb_id))];
  const celebs = [];
  for (let from = 0; from < ids.length; from += 300) {
    const { data, error } = await db.from('celebs').select('id,nickname,slug,headline,bio,profession,avatar_url,celeb_tier,publication_status')
      .in('id', ids.slice(from, from + 300)).eq('celeb_tier', 'full').eq('publication_status', 'active');
    if (error) throw new Error(`인물 조회 실패: ${error.message}`);
    celebs.push(...data);
  }
  const material = assembleBookMaterial({ content: contentResult.data, locale: localeResult.data, relations, celebs });
  fs.mkdirSync(dir, { recursive: true });
  saveBookMaterial(dest, material, { refresh });
  const saved = JSON.parse(fs.readFileSync(dest, 'utf8'));
  if (JSON.stringify(saved) !== JSON.stringify(material)) throw new Error('저장한 재료가 DB 추출 결과와 다릅니다.');
  console.log(dest);
  console.log(JSON.stringify(saved.readers.map(r => ({ name: r.nickname, characters: r.review.length })), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
