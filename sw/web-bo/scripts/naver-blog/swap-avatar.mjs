/**
 * 초안의 인물 사진을 seo-image 에서 아바타 원본으로 바꾼다.
 *
 * seo-image 는 사이트 다크 테마에 맞춰 검은 배경을 깐다. 흰 바탕인 블로그에서는
 * 얼굴만 뜬 시커먼 덩어리로 보인다. 아바타 원본은 배경을 지운 투명 이미지라
 * 발행기가 흰색으로 합쳐 올리면 밝고 선명하다.
 *
 * 사용: node scripts/naver-blog/swap-avatar.mjs [--dry]   (sw/web-bo 에서)
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DRAFTS = path.join(ROOT, 'data/naver-blog/celeb-drafts.json');
const dry = process.argv.includes('--dry');

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

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const slugs = rows.map((r) => (r.target || '').replace('/celeb/', '')).filter(Boolean);

const avatar = new Map();
for (let i = 0; i < slugs.length; i += 200) {
  const { data } = await db.from('celebs').select('slug,avatar_url').in('slug', slugs.slice(i, i + 200));
  for (const r of data ?? []) if (r.avatar_url) avatar.set(r.slug, r.avatar_url);
}

let changed = 0, skipped = 0;
const noAvatar = [];
for (const row of rows) {
  const slug = (row.target || '').replace('/celeb/', '');
  const url = avatar.get(slug);
  if (!url) { noAvatar.push(slug); continue; }
  const re = /\[img:https:\/\/feelandnote\.com\/seo-image\/celeb\/[^|\]]+\|(\d+)\|([^\]]+)\]/;
  const m = row.body.match(re);
  if (!m) { skipped++; continue; }
  console.log(`${slug.padEnd(30)} seo-image → 아바타 원본`);
  if (!dry) {
    row.body = row.body.replace(re, `[img:${url}|${m[1]}|${m[2]}]`);
    row.avatarSwapped = true;
  }
  changed++;
}

if (!dry) fs.writeFileSync(DRAFTS, JSON.stringify(rows, null, 1));
console.log(`\n${dry ? '[점검만] ' : ''}바꿈 ${changed} / 이미 바뀜·해당없음 ${skipped}`);
if (noAvatar.length) console.log(`아바타 없는 인물: ${noAvatar.join(', ')}`);
