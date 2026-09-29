import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
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
const slugs = ['myth-africa', 'myth-americas', 'myth-bible', 'myth-hindu-lineage', 'myth-oceania', 'myth-persia', 'myth-slavic', 'myth-southeast-asia', 'myth-west-asia'];
async function rows(table, columns, key, values) {
  const out = [];
  for (let i = 0; i < values.length; i += 70) {
    const { data, error } = await db.from(table).select(columns).in(key, values.slice(i, i + 70)).limit(1000);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
  }
  return out;
}
const factions = await rows('faction_lv2', 'id,slug,name,published,lead_person_ids,description,description_en', 'slug', slugs);
const members = await rows('faction_members', 'lv2_id,celeb_id,hidden', 'lv2_id', factions.map(f => f.id));
const ids = [...new Set(members.map(m => m.celeb_id))];
const people = await rows('celebs', 'id,slug,nickname,publication_status,avatar_url,bio,bio_en', 'id', ids);
const guides = await rows('celeb_explanations', 'profile_id,plain_text,plain_text_en,published_at', 'profile_id', ids);
const books = await rows('figure_book_characters', 'celeb_id,content_id,relation_type', 'celeb_id', ids);
const contentIds = [...new Set(books.map(b => b.content_id))];
const locales = await rows('content_locales', 'content_id,locale,title,isbn', 'content_id', contentIds);
const person = new Map(people.map(p => [p.id, p]));
const guide = new Map(guides.map(g => [g.profile_id, g]));
for (const f of factions.sort((a,b) => slugs.indexOf(a.slug)-slugs.indexOf(b.slug))) {
  const group = members.filter(m => m.lv2_id === f.id);
  const lead = new Set(f.lead_person_ids ?? []);
  console.log(`\n${f.slug} published=${f.published} assigned=${group.length} shown=${group.filter(m => !m.hidden).length} leads=${lead.size} overview=${!!f.description?.trim()}/${!!f.description_en?.trim()}`);
  for (const m of group.sort((a,b) => Number(lead.has(b.celeb_id))-Number(lead.has(a.celeb_id)) || (person.get(a.celeb_id)?.slug ?? '').localeCompare(person.get(b.celeb_id)?.slug ?? ''))) {
    const p = person.get(m.celeb_id), g = guide.get(m.celeb_id);
    const ap = books.filter(b => b.celeb_id === m.celeb_id && b.relation_type === 'appearance').length;
    const titles = lead.has(m.celeb_id) || ['abraham', 'moses', 'david', 'sang-nila-utama', 'cech', 'rus'].includes(p?.slug)
      ? books.filter(b => b.celeb_id === m.celeb_id && b.relation_type === 'appearance')
        .map(b => locales.find(l => l.content_id === b.content_id && l.locale === 'en')?.title ?? locales.find(l => l.content_id === b.content_id)?.title ?? '(no locale)') : [];
    console.log(`${lead.has(m.celeb_id) ? '*' : ' '} ${p?.slug ?? '(missing)'}${lead.has(m.celeb_id) ? ` (${m.celeb_id})` : ''} | ${p?.publication_status ?? '?'} hidden=${m.hidden} avatar=${!!p?.avatar_url} bio=${!!p?.bio?.trim()}/${!!p?.bio_en?.trim()} guide=${!!g?.plain_text?.trim()}/${!!g?.plain_text_en?.trim()} guidePub=${!!g?.published_at} appearance=${ap}${titles.length ? ` books=${titles.join(' ; ')}` : ''}`);
  }
  for (const id of lead) if (!group.some(m => m.celeb_id === id)) console.log(`! orphan lead ${person.get(id)?.slug ?? id}`);
}
