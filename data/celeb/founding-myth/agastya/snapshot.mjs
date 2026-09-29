import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const bo = path.resolve('sw/web-bo');
const require = createRequire(path.join(bo, 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(readFileSync(path.join(bo, '.env'), 'utf8').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_DB_API_URL, env.DB_SECRET_KEY);
async function rows(table, columns, build = q => q) {
  const { data, error } = await build(db.from(table).select(columns));
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}
const person = (await rows('celebs', '*', q => q.eq('slug', 'agastya')))[0];
if (!person) throw new Error('agastya missing');
const memberships = await rows('faction_members', '*', q => q.eq('celeb_id', person.id));
const factionIds = [...new Set(memberships.map(m => m.lv2_id))];
const factions = factionIds.length ? await rows('faction_lv2', '*', q => q.in('id', factionIds)) : [];
const guide = await rows('celeb_explanations', '*', q => q.eq('profile_id', person.id));
const relations = await rows('figure_book_characters', '*', q => q.eq('celeb_id', person.id));
const groupCandidates = factionIds.length ? await rows('faction_lv3', '*', q => q.in('lv2_id', factionIds)) : [];
const factionMembers = factionIds.length ? await rows('faction_members', 'celeb_id,lv2_id,lv3_id,sort_order,hidden', q => q.in('lv2_id', factionIds)) : [];
const neighborIds = factionMembers.map(m => m.celeb_id);
const neighbors = neighborIds.length ? await rows('celebs', 'id,slug,nickname,headline', q => q.in('id', neighborIds)) : [];
const contentIds = relations.map(r => r.content_id);
const contents = contentIds.length ? await rows('contents', '*', q => q.in('id', contentIds)) : [];
const locales = contentIds.length ? await rows('content_locales', '*', q => q.in('content_id', contentIds)) : [];
const editions = contentIds.length ? await rows('figure_book_editions', '*', q => q.in('content_id', contentIds)) : [];
const relatedFactions = await rows('faction_lv2', 'id,slug,name,name_en,is_myth', q => q.or('slug.ilike.%hindu%,slug.ilike.%india%,slug.ilike.%veda%,slug.ilike.%bharat%,slug.ilike.%ramayana%'));
const relatedGroups = await rows('faction_lv3', 'id,lv2_id,name,name_en,description', q => q.in('lv2_id', relatedFactions.filter(f=>f.is_myth).map(f=>f.id)));
const relatedMembers = await rows('faction_members', 'id,celeb_id,lv2_id,lv3_id,sort_order,hidden,short_desc,short_desc_en', q => q.in('lv2_id', relatedFactions.filter(f=>f.is_myth).map(f=>f.id)));
const relatedPeopleIds = [...new Set(relatedMembers.map(m=>m.celeb_id))];
const relatedPeople = relatedPeopleIds.length ? await rows('celebs', 'id,slug,nickname', q => q.in('id', relatedPeopleIds)) : [];
const result = { captured_at: new Date().toISOString(), person, memberships, factions, guide, relations, groupCandidates, factionMembers, neighbors, contents, locales, editions, relatedFactions, relatedGroups, relatedMembers, relatedPeople };
const outputPath = process.argv.includes('--current')
  ? 'data/celeb/founding-myth/agastya/current.json'
  : 'data/celeb/founding-myth/agastya/before.json';
writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ person: { id: person.id, bio: person.bio, bio_en: person.bio_en, headline: person.headline, headline_en: person.headline_en, publication_status: person.publication_status }, memberships, factions: factions.map(f => ({id:f.id,slug:f.slug,name:f.name})), groups: groupCandidates.map(g => ({id:g.id, name:g.name, name_en:g.name_en, lv2_id:g.lv2_id})), relations, neighbors: neighbors.map(n => ({slug:n.slug, group: groupCandidates.find(g=>g.id===factionMembers.find(m=>m.celeb_id===n.id)?.lv3_id)?.name || null})) }, null, 2));
