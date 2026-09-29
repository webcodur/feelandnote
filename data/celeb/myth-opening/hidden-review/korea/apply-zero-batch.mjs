import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const bo = path.resolve(here, '../../../../../sw/web-bo');
const require = createRequire(path.join(bo, 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(readFileSync(path.join(bo, '.env'), 'utf8')
  .split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_DB_API_URL, env.DB_SECRET_KEY);
const expected = {
  'myth-korea-gaya': ['heo-hwang-ok', 'jeonggyeon-moju', 'kim-suro', 'king-ijinasi', 'seok-talhae'],
  'myth-korea-goryeo-segye': ['hogyeong', 'jakjegeon', 'wang-geon', 'gang-chung', 'boyuk', 'jinui', 'yonggeon', 'jeominui'],
  'myth-korea-tamna': ['go-eulla', 'bu-eulla', 'yang-eulla'],
  'myth-korea-silla': ['lady-aryeong', 'guryema', 'sobeoldori', 'alpyeong', 'jibaekho', 'jita', 'kim-alji', 'seok-talhae', 'hojin', 'bak-hyeokgeose'],
};
const excluded = ['the-nine-gan', 'the-five-gaya-founder-brothers', 'three-princesses-of-byeollang'];
async function rows(table, columns, build) {
  const { data, error } = await build(db.from(table).select(columns));
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}
const factions = await rows('faction_lv2', 'id,slug,published,lead_person_ids', q => q.in('slug', Object.keys(expected)));
const memberships = await rows('faction_members', 'id,lv2_id,celeb_id,hidden,short_desc,short_desc_en', q => q.in('lv2_id', factions.map(f => f.id)));
const people = await rows('celebs', 'id,slug,nickname,nickname_en,headline,headline_en,bio,bio_en,avatar_url,publication_status,celeb_reality', q => q.in('id', [...new Set(memberships.map(m => m.celeb_id))]));
const guides = await rows('celeb_explanations', 'profile_id,plain_text,plain_text_en,published_at', q => q.in('profile_id', people.map(p => p.id)));
const books = await rows('figure_book_characters', 'celeb_id,content_id,relation_type', q => q.in('celeb_id', people.map(p => p.id)));
const personById = new Map(people.map(p => [p.id, p]));
const guideById = new Map(guides.map(g => [g.profile_id, g]));
const targets = [];
for (const f of factions) {
  if (f.published !== false) throw new Error(`Unexpected published faction: ${f.slug}`);
  const members = memberships.filter(m => m.lv2_id === f.id);
  const actual = members.map(m => personById.get(m.celeb_id)?.slug).sort();
  const wanted = [...expected[f.slug], ...excluded.filter(slug => members.some(m => personById.get(m.celeb_id)?.slug === slug))].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`Unexpected roster: ${f.slug}: ${actual}`);
  for (const m of members) {
    const p = personById.get(m.celeb_id);
    if (!expected[f.slug].includes(p.slug)) {
      if (!excluded.includes(p.slug) || p.avatar_url || !m.hidden || p.publication_status !== 'inactive') throw new Error(`Unexpected excluded member: ${f.slug}/${p.slug}`);
      continue;
    }
    const g = guideById.get(p.id);
    if (!p.avatar_url || ![p.nickname, p.nickname_en, p.headline, p.headline_en, p.bio, p.bio_en, m.short_desc, m.short_desc_en, g?.plain_text, g?.plain_text_en].every(v => typeof v === 'string' && v.trim())) throw new Error(`Missing public field: ${f.slug}/${p.slug}`);
    if (!['active', 'inactive'].includes(p.publication_status)) throw new Error(`Unexpected profile status: ${p.slug}`);
    if (!books.some(b => b.celeb_id === p.id && b.relation_type === 'appearance')) throw new Error(`No appearance: ${p.slug}`);
    targets.push({ faction: f.slug, member: m, person: p, guide: g });
  }
  for (const id of f.lead_person_ids || []) {
    if (!members.some(m => m.celeb_id === id && expected[f.slug].includes(personById.get(id)?.slug))) throw new Error(`Excluded lead: ${f.slug}/${id}`);
  }
}
if (factions.length !== 4 || targets.length !== 26) throw new Error(`Unexpected target count ${factions.length}/${targets.length}`);
const backupPath = path.join(here, `zero-batch-before-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.json`);
writeFileSync(backupPath, JSON.stringify({ checked_at: new Date().toISOString(), factions, targets, excluded }, null, 2) + '\n');
console.log(`Preflight ${targets.length} placements, ${new Set(targets.map(t => t.person.id)).size} people; backup ${backupPath}`);
if (!process.argv.includes('--apply')) process.exit(0);
const publishedAt = new Date().toISOString();
const unique = [...new Map(targets.map(t => [t.person.id, t])).values()];
for (const t of unique) {
  if (t.person.publication_status === 'inactive') {
    const { data, error } = await db.from('celebs').update({ publication_status: 'active' }).eq('id', t.person.id).eq('publication_status', 'inactive').select('id,publication_status');
    if (error || data?.length !== 1) throw new Error(`Profile CAS failed ${t.person.slug}: ${error?.message || data?.length}`);
  }
  if (!t.guide.published_at) {
    const { data, error } = await db.from('celeb_explanations').update({ published_at: publishedAt }).eq('profile_id', t.person.id).is('published_at', null).select('profile_id,published_at');
    if (error || data?.length !== 1) throw new Error(`Guide CAS failed ${t.person.slug}: ${error?.message || data?.length}`);
  }
}
for (const t of targets) {
  if (!t.member.hidden) continue;
  const { data, error } = await db.from('faction_members').update({ hidden: false }).eq('id', t.member.id).eq('hidden', true).select('id,hidden');
  if (error || data?.length !== 1) throw new Error(`Membership CAS failed ${t.faction}/${t.person.slug}: ${error?.message || data?.length}`);
}
const afterFactions = await rows('faction_lv2', 'id,slug,published', q => q.in('slug', Object.keys(expected)));
const afterMembers = await rows('faction_members', 'id,lv2_id,celeb_id,hidden', q => q.in('lv2_id', factions.map(f => f.id)));
const afterPeople = await rows('celebs', 'id,slug,publication_status', q => q.in('id', unique.map(t => t.person.id)));
const afterGuides = await rows('celeb_explanations', 'profile_id,published_at', q => q.in('profile_id', unique.map(t => t.person.id)));
for (const f of afterFactions) {
  if (f.published !== false || afterMembers.filter(m => m.lv2_id === f.id && !m.hidden).length !== expected[f.slug].length) throw new Error(`Postflight faction mismatch: ${f.slug}`);
}
if (afterPeople.some(p => p.publication_status !== 'active') || afterGuides.some(g => !g.published_at)) throw new Error('Postflight person/guide mismatch');
writeFileSync(path.join(here, 'zero-batch-after.json'), JSON.stringify({ checked_at: new Date().toISOString(), factions: afterFactions, members: afterMembers, people: afterPeople, guides: afterGuides }, null, 2) + '\n');
for (const f of afterFactions) console.log(`${f.slug}: visible=${afterMembers.filter(m => m.lv2_id === f.id && !m.hidden).length}, published=${f.published}`);
