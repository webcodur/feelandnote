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
const slugs = ['myth-korea-gaya', 'myth-korea-goryeo-segye', 'myth-korea-silla', 'myth-korea-tamna'];
async function query(table, columns, build) {
  const { data, error } = await build(db.from(table).select(columns));
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}
const factions = await query('faction_lv2', 'id,slug,name,name_en,description,description_en,published,lead_person_ids', q => q.in('slug', slugs));
const placements = await query('faction_members', 'id,lv2_id,celeb_id,hidden,short_desc,short_desc_en', q => q.in('lv2_id', factions.map(f => f.id)));
const ids = [...new Set(placements.map(m => m.celeb_id))];
const people = await query('celebs', 'id,slug,nickname,nickname_en,headline,headline_en,bio,bio_en,avatar_url,publication_status,celeb_reality,celeb_tier,wikidata_qid', q => q.in('id', ids));
const guides = await query('celeb_explanations', 'profile_id,plain_text,plain_text_en,published_at', q => q.in('profile_id', ids));
const books = await query('figure_book_characters', 'celeb_id,content_id,relation_type', q => q.in('celeb_id', ids));
const contentIds = [...new Set(books.map(b => b.content_id))];
const contents = contentIds.length ? await query('content_locales', 'content_id,locale,title,creator,isbn', q => q.in('content_id', contentIds)) : [];
const byPerson = new Map(people.map(p => [p.id, p]));
const byContent = new Map(contentIds.map(id => [id, contents.filter(c => c.content_id === id)]));
const result = {checked_at: new Date().toISOString(), factions: factions.map(f => ({...f,
  members: placements.filter(m => m.lv2_id === f.id).map(m => {
    const p = byPerson.get(m.celeb_id);
    const g = guides.find(x => x.profile_id === m.celeb_id);
    return {...m, person: p, guide: g ?? null,
      works: books.filter(b => b.celeb_id === m.celeb_id).map(b => ({...b, content: byContent.get(b.content_id) ?? null}))};
  })
}))};
writeFileSync(path.join(here, 'snapshot.json'), JSON.stringify(result, null, 2) + '\n');
for (const f of result.factions) {
  console.log(`${f.slug}: published=${f.published}, members=${f.members.length}, visible=${f.members.filter(m => !m.hidden).length}`);
  for (const m of f.members) {
    const p = m.person, g = m.guide;
    console.log(`  ${p?.slug ?? m.celeb_id}: ${p?.publication_status}, hidden=${m.hidden}, avatar=${!!p?.avatar_url}, ko/en bio=${!!p?.bio?.trim()}/${!!p?.bio_en?.trim()}, guide=${!!g?.plain_text?.trim()}/${!!g?.plain_text_en?.trim()}/${!!g?.published_at}, appearance=${m.works.filter(x => x.relation_type === 'appearance').length}`);
  }
}
