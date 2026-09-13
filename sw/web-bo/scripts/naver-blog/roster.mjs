// 사용: node scripts/naver-blog/roster.mjs [--min 5] [--top 120] (sw/web-bo에서)
// DB는 읽기만 하고 blog-assets(D:)/naver-blog/_roster.md를 갱신한다.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';
import { buildRoster, renderRoster } from './lib/roster-data.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
for (const file of ['.env', 'sw/web-bo/.env', 'sw/web/.env']) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) continue;
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const args = process.argv.slice(2);
const opt = (key, fallback) => {
  const i = args.indexOf(`--${key}`);
  const n = i < 0 ? fallback : Number(args[i + 1]);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`--${key}는 양의 정수여야 합니다.`);
  return n;
};
const min = opt('min', 5), top = opt('top', 120);
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY ?? process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY);
const page = async (table, select, order, filter = q => q) => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(select)).order(order).range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
};
const [celebs, relations, contents, locales] = await Promise.all([
  page('celebs', 'id,slug,nickname,celeb_tier,publication_status,profession', 'id'),
  page('celeb_contents', 'id,celeb_id,content_id,review,source_url', 'id'),
  page('contents', 'id,type', 'id', q => q.eq('type', 'BOOK')),
  page('content_locales', 'content_id,locale,title,creator,thumbnail_url', 'content_id', q => q.eq('locale', 'ko')),
]);
const read = name => JSON.parse(fs.readFileSync(path.join(ASSETS, `naver-blog/${name}.json`), 'utf8'));
const roster = buildRoster({ celebs, relations, contents, locales, posts: read('posts'), drafts: read('celeb-drafts'), min });
const dest = path.join(ASSETS, 'naver-blog/_roster.md');
fs.writeFileSync(dest, renderRoster(roster, { top }), 'utf8');
console.log(dest);
console.log(`기존 ${roster.existing.length}편·${roster.existingPeople}명 / 이번 ${roster.current.length}편·${roster.currentPeople}명 / 미게재 초안 ${roster.unposted.length}편`);
console.log(`신규 인물 후보 ${roster.candidates.length}명 / 책 중심 후보 ${roster.books.length}권`);
console.log(JSON.stringify(roster.books.slice(0, 5).map(b => ({ title: b.title, creator: b.creator, readers: b.readers.length, content_id: b.content_id })), null, 2));
