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
const memberId = 'af6ec593-29b6-41c0-beb2-ada482ff1169';
const personId = 'a036c5a5-850c-43ba-ae70-f5019a06ad80';
const oldFaction = 'c216d350-255d-4d28-bb80-e0fb1a670af6';
const ramayana = '1afd39e4-bacb-4f65-8d58-ea8eb0e0a4e8';
const journeyGroup = '0b9cccf2-7089-4bd7-a5bf-8e32a53b92f2';
async function one(table, build) {
  const { data, error } = await build(db.from(table).select('*'));
  if (error) throw new Error(`${table}: ${error.message}`);
  if (data.length !== 1) throw new Error(`${table}: expected one row, got ${data.length}`);
  return data[0];
}
const member = await one('faction_members', q => q.eq('id', memberId));
const person = await one('celebs', q => q.eq('id', personId));
const group = await one('faction_lv3', q => q.eq('id', journeyGroup));
if (member.celeb_id !== personId || member.lv2_id !== oldFaction || member.lv3_id !== null || !member.hidden) throw new Error('member drift');
if (group.lv2_id !== ramayana || group.name !== '여정에서 만난 이들') throw new Error('group drift');
const change = { lv2_id: ramayana, lv3_id: journeyGroup, sort_order: 2050,
  short_desc: '라마에게 비슈누의 활을 건넨 현자',
  short_desc_en: "The sage who gave Rama Vishnu's bow" };
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ before: member, after: { ...member, ...change }, person_status: person.publication_status }, null, 2));
  process.exit(0);
}
writeFileSync('data/celeb/founding-myth/agastya/before-apply.json', JSON.stringify({ captured_at: new Date().toISOString(), member, person, group }, null, 2));
const { data, error } = await db.from('faction_members').update(change)
  .eq('id', memberId).eq('celeb_id', personId).eq('lv2_id', oldFaction).is('lv3_id', null).eq('hidden', true).select('*');
if (error) throw new Error(`update: ${error.message}`);
if (data?.length !== 1) throw new Error(`update affected ${data?.length ?? 0} rows`);
const after = await one('faction_members', q => q.eq('id', memberId));
if (Object.entries(change).some(([key, value]) => after[key] !== value) || after.hidden !== true) throw new Error('readback mismatch');
writeFileSync('data/celeb/founding-myth/agastya/after.json', JSON.stringify({ updated_at: new Date().toISOString(), before: member, after }, null, 2));
console.log(JSON.stringify({ after }, null, 2));
