import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const bo = path.resolve(here, '../../../sw/web-bo');
const require = createRequire(path.join(bo, 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(readFileSync(path.join(bo, '.env'), 'utf8')
  .split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => {
    const i = line.indexOf('=');
    return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
  }));
const db = createClient(env.NEXT_PUBLIC_DB_API_URL, env.DB_SECRET_KEY);

async function all(table, columns, query = q => q) {
  const rows = [];
  for (let from = 0;; from += 1000) {
    const { data, error } = await query(db.from(table).select(columns)).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const myths = await all('faction_lv2', 'id,slug,name,published,is_featured,description,description_en,lead_person_ids,team_images', q => q.eq('is_myth', true));
const members = await all('faction_members', 'lv2_id,celeb_id,hidden', q => q.in('lv2_id', myths.map(m => m.id)));
const ids = [...new Set(members.map(m => m.celeb_id))];
const people = [];
for (let i = 0; i < ids.length; i += 100) {
  const { data, error } = await db.from('celebs').select('id,slug,nickname,publication_status,avatar_url').in('id', ids.slice(i, i + 100));
  if (error) throw new Error(error.message);
  people.push(...data);
}
const byId = new Map(people.map(p => [p.id, p]));
const result = myths.map(myth => {
  const assignments = members.filter(m => m.lv2_id === myth.id);
  const visible = assignments.filter(m => !m.hidden);
  const bad = visible.map(m => byId.get(m.celeb_id)).filter(p => !p || p.publication_status !== 'active' || !p.avatar_url);
  return {
    slug: myth.slug, name: myth.name, published: myth.published, is_featured: myth.is_featured,
    total: assignments.length, visible: visible.length,
    has_title_art: (myth.team_images ?? []).some(image => /^https:\/\/assets\.feelandnote\.com\/myth\/title-art\/[a-z0-9-]+-[a-f0-9]{12}\.png$/.test(image?.url ?? '')),
    description_ko: Boolean(myth.description?.trim()), description_en: Boolean(myth.description_en?.trim()),
    hidden_lead_slugs: (myth.lead_person_ids ?? []).filter(id => !visible.some(m => m.celeb_id === id))
      .map(id => byId.get(id)?.slug ?? '(missing person)'),
    visible_problem_slugs: bad.map(p => p?.slug ?? '(missing person)'),
    hidden_no_avatar_slugs: assignments.filter(m => m.hidden && !byId.get(m.celeb_id)?.avatar_url)
      .map(m => byId.get(m.celeb_id)?.slug ?? '(missing person)'),
  };
}).sort((a, b) => a.slug.localeCompare(b.slug));

const output = { checked_at: new Date().toISOString(), myths: result };
writeFileSync(path.join(here, 'readiness.json'), JSON.stringify(output, null, 2) + '\n');
for (const row of result) console.log(`${row.published ? 'OPEN ' : 'CLOSED'} ${row.slug.padEnd(35)} ${String(row.visible).padStart(3)}/${String(row.total).padStart(3)}  bad=${row.visible_problem_slugs.join(',') || '-'} hidden_no_avatar=${row.hidden_no_avatar_slugs.join(',') || '-'}`);
