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
if (process.argv.includes('--kebra')) {
  for (const pattern of ['%Kebra%', '%케브라%', '%Glory of Kings%']) {
    const { data, error } = await db.from('content_locales').select('content_id,locale,title,isbn').ilike('title', pattern).limit(30);
    if (error) throw new Error(error.message);
    console.log(pattern, JSON.stringify(data));
  }
  process.exit(0);
}
const slugs = ['myth-africa', 'myth-americas', 'myth-oceania', 'myth-southeast-asia', 'myth-west-asia'];
async function query(table, columns, column, values) {
  const out = [];
  for (let i = 0; i < values.length; i += 60) {
    const { data, error } = await db.from(table).select(columns).in(column, values.slice(i, i + 60)).limit(1000);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
  }
  return out;
}
const factions = await query('faction_lv2', 'id,slug,name,name_en,description,description_en,published,lead_person_ids', 'slug', slugs);
const members = await query('faction_members', 'id,lv2_id,celeb_id,hidden,short_desc,short_desc_en', 'lv2_id', factions.map(f => f.id));
const leadIds = [...new Set(factions.flatMap(f => f.lead_person_ids ?? []))];
const people = await query('celebs', 'id,slug,nickname,nickname_en,avatar_url,bio,bio_en,publication_status,celeb_reality,wikidata_qid', 'id', leadIds);
const guides = await query('celeb_explanations', 'profile_id,plain_text,plain_text_en,published_at', 'profile_id', leadIds);
const relations = await query('figure_book_characters', 'celeb_id,content_id,relation_type', 'celeb_id', leadIds);
const contentIds = [...new Set(relations.map(r => r.content_id))];
const locales = await query('content_locales', 'content_id,locale,title,isbn,description', 'content_id', contentIds);
const editions = await query('figure_book_editions', 'id,content_id,locale,title,isbn,verified,edition_kind,text_scope,sort_order', 'content_id', contentIds);
const payload = { captured_at: new Date().toISOString(), factions: factions.map(f => ({ ...f, members: members.filter(m => m.lv2_id === f.id), leads: (f.lead_person_ids ?? []).map(id => ({ person: people.find(p => p.id === id), guide: guides.find(g => g.profile_id === id), relations: relations.filter(r => r.celeb_id === id).map(r => ({ ...r, locales: locales.filter(l => l.content_id === r.content_id), editions: editions.filter(e => e.content_id === r.content_id) })) })) })) };
const file = path.join(here, 'zero-batch-current.json');
writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
console.log(`${file}: ${factions.length} factions, ${members.length} memberships, ${people.length} leads, ${relations.length} lead relations`);
