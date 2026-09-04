/**
 * 초안의 블로그 카테고리를 DB 직군으로 다시 계산한다.
 *
 * 조립기가 모르는 직군을 기본값 「인플루엔서」로 흘려, 철학자·역사학자 13명이 그렇게 분류됐다.
 * 표를 고친 뒤 이미 만들어 둔 초안을 맞춘다. 태그 두 번째 자리에도 같은 값이 들어가므로 함께 고친다.
 *
 * 사용: node scripts/naver-blog/fix-category.mjs [--dry]   (sw/web-bo 에서)
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

const CATEGORY = {
  author: '작가', writer: '작가', poet: '작가',
  director: '아티스트', musician: '아티스트', artist: '아티스트',
  actor: '배우', entrepreneur: '기업가', investor: '투자자',
  politician: '정치인', leader: '정치인', commander: '정치인',
  scholar: '학자', scientist: '학자', philosopher: '학자',
  humanities_scholar: '학자', social_scientist: '학자', natural_scientist: '학자',
  influencer: '인플루엔서', athlete: '스포츠인',
};

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const slugs = rows.map((r) => (r.target || '').replace('/celeb/', '')).filter(Boolean);

const prof = new Map();
for (let i = 0; i < slugs.length; i += 200) {
  const { data } = await db.from('celebs').select('slug,profession').in('slug', slugs.slice(i, i + 200));
  for (const r of data ?? []) prof.set(r.slug, r.profession);
}

let changed = 0, same = 0;
const unknown = new Set();
for (const row of rows) {
  const slug = (row.target || '').replace('/celeb/', '');
  const p = prof.get(slug);
  // 사도 바울은 신약 서신을 남긴 저술가다. 지도자 직군이지만 정치인 칸은 어울리지 않는다.
  const want = slug === 'paul-the-apostle' ? '학자' : CATEGORY[p];
  if (!want) { unknown.add(`${slug}(${p})`); continue; }
  if (row.category === want) { same++; continue; }
  console.log(`${slug.padEnd(28)} ${String(row.category).padEnd(8)} → ${want}   [${p}]`);
  if (!dry) {
    // 태그 두 번째 자리가 카테고리다. 옛 값이 남지 않게 같이 바꾼다.
    if (Array.isArray(row.tags)) row.tags = row.tags.map((t) => (t === row.category ? want : t));
    row.category = want;
  }
  changed++;
}

if (!dry) fs.writeFileSync(DRAFTS, JSON.stringify(rows, null, 1));
console.log(`\n${dry ? '[점검만] ' : ''}고침 ${changed} / 그대로 ${same}`);
if (unknown.size) console.log(`표에 없는 직군: ${[...unknown].join(', ')}`);
