import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
const apply = process.argv.includes('--apply');
const before = JSON.parse(readFileSync(path.join(here, 'zero-batch-preimage.json'), 'utf8'));
const lead = slug => before.factions.flatMap(f => f.leads).find(l => l.person.slug === slug);
const maui = lead('māui');
const tagaloa = lead('tagaloa');
if (!maui || !tagaloa) throw new Error('Required leads absent from preimage');
let changes = [
  {
    table: 'celebs', key: 'id', id: maui.person.id,
    old: { bio: maui.person.bio, bio_en: maui.person.bio_en },
    next: {
      bio: maui.person.bio.replace('조상의 턱뼈로 만든', '할머니의 턱뼈로 만든'),
      bio_en: maui.person.bio_en.replace("an ancestor's jawbone", "his grandmother Murirangawhenua's jawbone"),
    },
  },
  {
    table: 'celeb_explanations', key: 'profile_id', id: tagaloa.person.id,
    old: { plain_text: tagaloa.guide.plain_text, plain_text_en: tagaloa.guide.plain_text_en },
    next: {
      plain_text: tagaloa.guide.plain_text.replace('통가 신화의 탕갈로아나 타히티 신화의 타아로아와도 통하는 신이다.', '통가의 탕갈로아와 타히티의 타아로아는 이름과 전승이 닿지만, 섬마다 이야기와 역할은 다르다.'),
      plain_text_en: tagaloa.guide.plain_text_en.replace("he is the same god as Tangaloa of Tongan myth and Ta'aroa of Tahiti.", "his name and traditions have counterparts in Tonga's Tangaloa and Tahiti's Ta'aroa, though their stories and roles differ by island."),
    },
  },
];
const factionChanges = [];
for (const slug of ['myth-africa', 'myth-oceania', 'myth-southeast-asia', 'myth-west-asia']) {
  const faction = before.factions.find(f => f.slug === slug);
  if (!faction) throw new Error(`Missing ${slug}`);
  let description = faction.description.replace('건국 신화은', '건국 신화는');
  if (slug === 'myth-oceania') description = description.replace('하울로아 계보', '할로아 계보');
  factionChanges.push({ table: 'faction_lv2', key: 'id', id: faction.id,
    old: { description: faction.description }, next: { description } });
}
if (process.argv.includes('--factions')) changes = factionChanges;
for (const c of changes) {
  for (const field of Object.keys(c.old)) if (c.old[field] === c.next[field]) throw new Error(`${c.table}.${field}: replacement did not match`);
  const { data, error } = await db.from(c.table).select(`${c.key},${Object.keys(c.old).join(',')}`).eq(c.key, c.id).single();
  if (error || Object.keys(c.old).some(field => data[field] !== c.old[field])) throw new Error(`${c.table}/${c.id}: live preimage mismatch`);
}
console.log(`${changes.length} guarded row updates; ${apply ? 'APPLY' : 'DRY RUN'}`);
if (!apply) process.exit(0);
const backup = path.join(here, process.argv.includes('--factions') ? 'zero-batch-faction-fix-before.json' : 'zero-batch-fix-before.json');
if (existsSync(backup)) throw new Error('Backup already exists');
writeFileSync(backup, JSON.stringify({ captured_at: new Date().toISOString(), changes }, null, 2) + '\n');
for (const c of changes) {
  let q = db.from(c.table).update(c.next).eq(c.key, c.id);
  for (const [field, value] of Object.entries(c.old)) q = q.eq(field, value);
  const { data, error } = await q.select(`${c.key},${Object.keys(c.next).join(',')}`);
  if (error || data?.length !== 1 || Object.keys(c.next).some(field => data[0][field] !== c.next[field])) throw new Error(`${c.table}/${c.id}: update or verification failed: ${error?.message ?? ''}`);
  console.log(`Verified ${c.table}/${c.id}`);
}
