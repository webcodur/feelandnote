#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { factionRoster, repoRoot, supabaseClient } from './lib.mjs';

const [manifestArg] = process.argv.slice(2).filter((arg) => arg !== '--apply');
const apply = process.argv.includes('--apply');
if (!manifestArg) {
  console.error('usage: node apply-fiction-story-manifest.mjs <manifest.json> [--apply]');
  process.exit(2);
}

const manifestPath = path.resolve(manifestArg);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.episode || !Array.isArray(manifest.people) || manifest.people.length === 0) {
  throw new Error('manifest에는 episode와 비어 있지 않은 people 배열이 필요합니다.');
}
if (!Array.isArray(manifest.relations)) {
  throw new Error('manifest.relations 배열이 필요합니다.');
}

const root = repoRoot();
const roster = new Set(
  factionRoster(root, manifest.episode)
    .filter((person) => person.mythical === true)
    .map((person) => person.slug),
);
const timelineFields = [
  'sequence_label',
  'sequence_label_en',
  'title',
  'title_en',
  'description',
  'description_en',
  'kind',
  'place_name',
  'place_name_en',
  'source_url',
  'sort_order',
];
const timelineKinds = new Set([
  'birth',
  'death',
  'education',
  'work',
  'publish',
  'battle',
  'travel',
  'office',
  'meeting',
  'other',
]);
const relationGroups = {
  father: 'family',
  mother: 'family',
  parent: 'family',
  child: 'family',
  spouse: 'family',
  partner: 'family',
  sibling: 'family',
  relative: 'family',
  teacher: 'thought',
  student: 'thought',
  influence: 'thought',
  influenced: 'thought',
  rival: 'rivalry',
  cofounder: 'career',
  friend: 'friendship',
};
const inverseTypes = {
  father: 'child',
  mother: 'child',
  parent: 'child',
  child: 'parent',
  spouse: 'spouse',
  partner: 'partner',
  sibling: 'sibling',
  relative: 'relative',
  teacher: 'student',
  student: 'teacher',
  influence: 'influenced',
  influenced: 'influence',
  rival: 'rival',
  cofounder: 'cofounder',
  friend: 'friend',
};
const forbiddenHanzi = /[一-鿿]/;

function normalizeEvent(event) {
  return Object.fromEntries(timelineFields.map((field) => [field, event[field] ?? null]));
}

function validateText(slug, field, value, { min = 1, max = 500, ko = false } = {}) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new Error(`${slug}.${field}: ${min}~${max}자 문자열이 필요합니다.`);
  }
  if (value.includes('—') || value.includes('–')) {
    throw new Error(`${slug}.${field}: dash 문자를 넣을 수 없습니다.`);
  }
  if (ko && forbiddenHanzi.test(value)) {
    throw new Error(`${slug}.${field}: 한자가 섞였습니다.`);
  }
}

const peopleBySlug = new Map();
for (const person of manifest.people) {
  if (!roster.has(person.slug)) {
    throw new Error(`${person.slug}: ${manifest.episode}의 mythical 인물이 아닙니다.`);
  }
  if (peopleBySlug.has(person.slug)) throw new Error(`${person.slug}: 중복 인물입니다.`);
  if (!Array.isArray(person.events) || person.events.length < 6 || person.events.length > 12) {
    throw new Error(`${person.slug}: 서사 사건은 6~12개여야 합니다.`);
  }
  const orders = new Set();
  for (const event of person.events) {
    validateText(person.slug, 'sequence_label', event.sequence_label, { max: 40, ko: true });
    validateText(person.slug, 'sequence_label_en', event.sequence_label_en, { max: 80 });
    validateText(person.slug, 'title', event.title, { max: 80, ko: true });
    validateText(person.slug, 'title_en', event.title_en, { max: 140 });
    validateText(person.slug, 'description', event.description, { min: 35, max: 320, ko: true });
    validateText(person.slug, 'description_en', event.description_en, { min: 70, max: 600 });
    if (!timelineKinds.has(event.kind)) {
      throw new Error(`${person.slug}.${event.title}: 허용되지 않은 kind ${event.kind}`);
    }
    if (!/^https?:\/\//.test(event.source_url ?? '')) {
      throw new Error(`${person.slug}.${event.title}: 확인한 원전 URL이 필요합니다.`);
    }
    if (!Number.isInteger(event.sort_order) || event.sort_order < 1 || orders.has(event.sort_order)) {
      throw new Error(`${person.slug}.${event.title}: 양의 고유 sort_order가 필요합니다.`);
    }
    orders.add(event.sort_order);
    if (event.place_name != null) {
      validateText(person.slug, 'place_name', event.place_name, { max: 80, ko: true });
    }
    if (event.place_name_en != null) {
      validateText(person.slug, 'place_name_en', event.place_name_en, { max: 120 });
    }
  }
  const sorted = [...orders].sort((a, b) => a - b);
  if (sorted.some((order, index) => order !== index + 1)) {
    throw new Error(`${person.slug}: sort_order는 1부터 끊김 없이 이어져야 합니다.`);
  }
  if (!person.review || person.review.cycles < 2 || person.review.blocking !== 0) {
    throw new Error(`${person.slug}: 검토 2회와 blocking 0이 필요합니다.`);
  }
  peopleBySlug.set(person.slug, person);
}

const relationKeys = new Set();
const relationEndpointSlugs = new Set();
for (const relation of manifest.relations) {
  if (!roster.has(relation.from) || !roster.has(relation.to) || relation.from === relation.to) {
    throw new Error(`관계 양끝은 같은 에피소드의 서로 다른 mythical 인물이어야 합니다: ${JSON.stringify(relation)}`);
  }
  if (!peopleBySlug.has(relation.from) && !peopleBySlug.has(relation.to)) {
    throw new Error(`관계 양끝 중 적어도 한 명은 현재 manifest.people에 있어야 합니다: ${JSON.stringify(relation)}`);
  }
  if (relationGroups[relation.type] !== relation.group) {
    throw new Error(`${relation.from}->${relation.to}.${relation.type}: 관계 그룹이 맞지 않습니다.`);
  }
  validateText(`${relation.from}->${relation.to}`, 'note', relation.note, { min: 15, max: 180, ko: true });
  validateText(`${relation.from}->${relation.to}`, 'note_en', relation.note_en, { min: 30, max: 320 });
  const key = `${relation.from}|${relation.to}|${relation.type}`;
  if (relationKeys.has(key)) throw new Error(`중복 관계 ${key}`);
  relationKeys.add(key);
  relationEndpointSlugs.add(relation.from);
  relationEndpointSlugs.add(relation.to);
}
for (const relation of manifest.relations) {
  const inverse = `${relation.to}|${relation.from}|${inverseTypes[relation.type]}`;
  if (!relationKeys.has(inverse)) {
    throw new Error(`${relation.from}->${relation.to}.${relation.type}: 역방향 관계 ${inverse}가 없습니다.`);
  }
}

const db = supabaseClient(root);
const slugs = [...new Set([...peopleBySlug.keys(), ...relationEndpointSlugs])];
const { data: profiles, error: profileError } = await db
  .from('profiles')
  .select('id,slug,nickname,nickname_en,profile_type,celeb_tier,status')
  .in('slug', slugs);
if (profileError) throw profileError;
const profileBySlug = new Map((profiles ?? []).map((profile) => [profile.slug, profile]));
for (const slug of slugs) {
  const profile = profileBySlug.get(slug);
  if (!profile
    || profile.profile_type !== 'CELEB'
    || profile.celeb_tier !== 'fiction'
    || profile.status !== 'active') {
    throw new Error(`${slug}: active fiction 프로필 대조 실패 ${JSON.stringify(profile)}`);
  }
}

const peopleIds = [...peopleBySlug.keys()].map((slug) => profileBySlug.get(slug).id);
const relationIds = [...relationEndpointSlugs].map((slug) => profileBySlug.get(slug).id);
const { data: currentEvents, error: eventError } = await db
  .from('celeb_timeline_events')
  .select(`celeb_id,${timelineFields.join(',')}`)
  .in('celeb_id', peopleIds)
  .is('year', null)
  .order('sort_order');
if (eventError) throw eventError;
const currentById = new Map();
for (const event of currentEvents ?? []) {
  const list = currentById.get(event.celeb_id) ?? [];
  list.push(normalizeEvent(event));
  currentById.set(event.celeb_id, list);
}

const timelineWork = [];
for (const [slug, person] of peopleBySlug) {
  const profile = profileBySlug.get(slug);
  const expected = person.events.map(normalizeEvent);
  const current = currentById.get(profile.id) ?? [];
  if (JSON.stringify(current) === JSON.stringify(expected)) {
    console.log(`${apply ? 'APPLY' : 'DRY'} TIMELINE SKIP ${slug}`);
  } else {
    timelineWork.push({ profile, person, expected });
    console.log(
      `${apply ? 'APPLY' : 'DRY'} TIMELINE ${current.length ? 'REPLACE' : 'INSERT'} ${slug} ${expected.length}`,
    );
  }
}

const { data: currentRelations, error: relationError } = await db
  .from('celeb_relations')
  .select('from_id,to_id,rel_type,rel_group,source,note,note_en')
  .in('from_id', relationIds)
  .in('to_id', relationIds);
if (relationError) throw relationError;
const currentRelationByKey = new Map(
  (currentRelations ?? []).map((relation) => [
    `${relation.from_id}|${relation.to_id}|${relation.rel_type}`,
    relation,
  ]),
);

const relationWork = [];
for (const relation of manifest.relations) {
  const from = profileBySlug.get(relation.from);
  const to = profileBySlug.get(relation.to);
  const payload = {
    from_id: from.id,
    to_id: to.id,
    rel_type: relation.type,
    rel_group: relation.group,
    source: 'manual',
    note: relation.note,
    note_en: relation.note_en,
  };
  const key = `${from.id}|${to.id}|${relation.type}`;
  const current = currentRelationByKey.get(key);
  if (current
    && current.rel_group === payload.rel_group
    && current.source === payload.source
    && current.note === payload.note
    && current.note_en === payload.note_en) {
    continue;
  }
  if (current && current.source !== 'manual') {
    throw new Error(`${relation.from}->${relation.to}.${relation.type}: 수집 관계를 덮어쓸 수 없습니다.`);
  }
  relationWork.push(payload);
}
console.log(
  `${apply ? 'APPLY' : 'DRY'} RELATIONS ${relationWork.length ? `UPSERT ${relationWork.length}` : 'SKIP'}`,
);

if (apply) {
  for (const { profile, person, expected } of timelineWork) {
    const { data, error } = await db.rpc('set_fiction_narrative_events', {
      p_celeb_id: profile.id,
      p_events: person.events,
    });
    if (error) throw error;
    if (data !== expected.length) {
      throw new Error(`${person.slug}: RPC 반영 건수 ${data}, 예상 ${expected.length}`);
    }
  }
  if (relationWork.length) {
    const { error } = await db
      .from('celeb_relations')
      .upsert(relationWork, { onConflict: 'from_id,to_id,rel_type' });
    if (error) throw error;
  }

  const { data: savedEvents, error: savedEventError } = await db
    .from('celeb_timeline_events')
    .select(`celeb_id,${timelineFields.join(',')}`)
    .in('celeb_id', peopleIds)
    .is('year', null)
    .order('sort_order');
  if (savedEventError) throw savedEventError;
  const savedById = new Map();
  for (const event of savedEvents ?? []) {
    const list = savedById.get(event.celeb_id) ?? [];
    list.push(normalizeEvent(event));
    savedById.set(event.celeb_id, list);
  }
  for (const [slug, person] of peopleBySlug) {
    const profile = profileBySlug.get(slug);
    if (JSON.stringify(savedById.get(profile.id) ?? []) !== JSON.stringify(person.events.map(normalizeEvent))) {
      throw new Error(`${slug}: 서사 연표 적용 후 전문 대조 실패`);
    }
  }

  const { data: savedRelations, error: savedRelationError } = await db
    .from('celeb_relations')
    .select('from_id,to_id,rel_type,rel_group,source,note,note_en')
    .in('from_id', relationIds)
    .in('to_id', relationIds);
  if (savedRelationError) throw savedRelationError;
  const savedRelationByKey = new Map(
    (savedRelations ?? []).map((relation) => [
      `${relation.from_id}|${relation.to_id}|${relation.rel_type}`,
      relation,
    ]),
  );
  for (const relation of manifest.relations) {
    const from = profileBySlug.get(relation.from);
    const to = profileBySlug.get(relation.to);
    const saved = savedRelationByKey.get(`${from.id}|${to.id}|${relation.type}`);
    if (!saved
      || saved.rel_group !== relation.group
      || saved.source !== 'manual'
      || saved.note !== relation.note
      || saved.note_en !== relation.note_en) {
      throw new Error(`${relation.from}->${relation.to}.${relation.type}: 관계 적용 후 전문 대조 실패`);
    }
  }
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  people: peopleBySlug.size,
  timelineChanged: timelineWork.length,
  relationChanged: relationWork.length,
}));
