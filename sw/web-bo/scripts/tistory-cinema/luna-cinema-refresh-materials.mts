import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { ASSETS } from '../blog-assets.mjs';
import { readRows } from './lib/selection.mts';

type AnyRecord = Record<string, unknown>;
type MaterialKind = 'work' | 'celeb' | 'list';
type Relation = {
  id: string;
  celeb_id: string;
  content_id: string;
  review: string | null;
};
type MaterialEntry = {
  file: string;
  name: string;
  kind: MaterialKind;
  value: AnyRecord;
};
type ReviewRef = {
  material: MaterialEntry;
  location: string;
  holder: AnyRecord;
  relation: Relation;
};

const argValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const channelDir = argValue('--dir') ?? path.join(ASSETS, 'tistory-cinema');
// A supplied inventory is an optional restriction; normal refresh discovers current materials.
const inventoryPath = argValue('--inventory');
const backupRoot = argValue('--backup-root') ?? path.join(channelDir, '_backup');
const apply = process.argv.includes('--yes');
const renderAfter = process.argv.includes('--preview-all');
const REVIEW_MIN_LENGTH = 100;

const errors: string[] = [];
const addError = (message: string) => errors.push(message);

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function records(value: unknown, label: string): AnyRecord[] {
  if (!Array.isArray(value)) {
    addError(`${label}: expected an array`);
    return [];
  }
  return value.filter((item, index): item is AnyRecord => {
    if (!isRecord(item)) {
      addError(`${label}[${index}]: expected an object`);
      return false;
    }
    return true;
  });
}

function requiredString(value: unknown, label: string): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    addError(`${label}: expected a non-empty string`);
    return null;
  }
  return value;
}

function reviewField(holder: AnyRecord, label: string): string | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(holder, 'review')) {
    addError(`${label}: review field is missing`);
    return undefined;
  }
  if (holder.review !== null && typeof holder.review !== 'string') {
    addError(`${label}: review must be a string or null`);
    return undefined;
  }
  return holder.review;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withoutReviews(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => withoutReviews(item));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'review')
      .map(([key, child]) => [key, withoutReviews(child)]),
  );
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function fileKind(value: AnyRecord): MaterialKind | null {
  const kinds = (['work', 'celeb', 'list'] as const).filter((kind) => isRecord(value[kind]));
  if (kinds.length !== 1) return null;
  return kinds[0];
}

const materialFiles = fs.existsSync(channelDir)
  ? fs.readdirSync(channelDir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
    .filter((name) => !['fn-reviews.json', 'headlines.json'].includes(name))
    .sort()
  : [];

const materials: MaterialEntry[] = [];
for (const name of materialFiles) {
  const file = path.join(channelDir, name);
  let value: unknown;
  try {
    value = readJson(file);
  } catch (error) {
    addError(`${name}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    continue;
  }
  if (!isRecord(value)) continue;
  const kind = fileKind(value);
  if (!kind) continue;
  materials.push({ file, name, kind, value });
}
if (!materials.length) addError('materials: no article materials found');

if (!process.env.NEXT_PUBLIC_DB_API_URL || !process.env.DB_SECRET_KEY) {
  addError('database environment is not configured');
}

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL ?? 'https://invalid.local', process.env.DB_SECRET_KEY ?? 'missing');
const [celebs, relations] = await Promise.all([
  readRows<{ id: string; slug: string | null }>(db, 'celebs', 'id, slug'),
  readRows<Relation>(db, 'celeb_contents', 'id, celeb_id, content_id, review'),
]);

const celebIdsBySlug = new Map<string, string[]>();
for (const celeb of celebs) {
  if (typeof celeb.id !== 'string' || typeof celeb.slug !== 'string' || !celeb.slug) continue;
  celebIdsBySlug.set(celeb.slug, [...(celebIdsBySlug.get(celeb.slug) ?? []), celeb.id]);
}

const relationById = new Map<string, Relation>();
const relationByPair = new Map<string, Relation[]>();
for (const relation of relations) {
  if (relationById.has(relation.id)) addError(`DB: duplicate relation ID ${relation.id}`);
  relationById.set(relation.id, relation);
  const key = `${relation.celeb_id}/${relation.content_id}`;
  relationByPair.set(key, [...(relationByPair.get(key) ?? []), relation]);
}

const refs: ReviewRef[] = [];
const nullListItems: { material: string; location: string }[] = [];

function addReference(material: MaterialEntry, location: string, holder: AnyRecord, relation: Relation | null) {
  const localReview = reviewField(holder, `${material.name}:${location}`);
  if (!relation || localReview === undefined) return;
  if (relation.review === null) addError(`${material.name}:${location}: DB review is null`);
  refs.push({ material, location, holder, relation });
}

function relationByPairFor(
  material: MaterialEntry,
  location: string,
  slugValue: unknown,
  contentValue: unknown,
): Relation | null {
  const slug = requiredString(slugValue, `${material.name}:${location}.slug`);
  const contentId = requiredString(contentValue, `${material.name}:${location}.content_id`);
  if (!slug || !contentId) return null;
  const celebIds = celebIdsBySlug.get(slug) ?? [];
  if (celebIds.length !== 1) {
    addError(`${material.name}:${location}: slug ${slug} resolves to ${celebIds.length} celebs`);
    return null;
  }
  const matches = relationByPair.get(`${celebIds[0]}/${contentId}`) ?? [];
  if (matches.length !== 1) {
    addError(`${material.name}:${location}: relation pair resolves to ${matches.length} rows`);
    return null;
  }
  return matches[0];
}

function addWorkReferences(material: MaterialEntry) {
  const work = isRecord(material.value.work) ? material.value.work : null;
  const contentId = work ? requiredString(work.id, `${material.name}:work.id`) : null;
  const picked = records(material.value.picked, `${material.name}:picked`);
  const seenRids = new Set<string>();
  picked.forEach((person, index) => {
    const location = `picked[${index}]`;
    const rid = requiredString(person.rid, `${material.name}:${location}.rid`);
    if (!rid) return;
    if (seenRids.has(rid)) addError(`${material.name}:${location}: duplicate rid ${rid}`);
    seenRids.add(rid);
    const relation = relationById.get(rid);
    if (!relation) {
      addError(`${material.name}:${location}: rid ${rid} is absent from DB`);
      return;
    }
    if (contentId && relation.content_id !== contentId) {
      addError(`${material.name}:${location}: rid content_id does not match work.id`);
    }
    if (typeof person.id !== 'string' || person.id !== relation.celeb_id) {
      addError(`${material.name}:${location}: rid celeb_id does not match picked.id`);
    }
    const celebIds = typeof person.slug === 'string' ? celebIdsBySlug.get(person.slug) ?? [] : [];
    if (celebIds.length !== 1 || celebIds[0] !== relation.celeb_id) {
      addError(`${material.name}:${location}: rid celeb_id does not match picked.slug`);
    }
    addReference(material, location, person, relation);
  });
}

function addPersonReferences(material: MaterialEntry) {
  const celeb = isRecord(material.value.celeb) ? material.value.celeb : null;
  const slug = celeb ? requiredString(celeb.slug, `${material.name}:celeb.slug`) : null;
  if (slug) {
    const ids = celebIdsBySlug.get(slug) ?? [];
    if (ids.length !== 1) addError(`${material.name}:celeb.slug resolves to ${ids.length} celebs`);
  }
  const picked = records(material.value.picked, `${material.name}:picked`);
  const seenContentIds = new Set<string>();
  picked.forEach((movie, index) => {
    const location = `picked[${index}]`;
    const contentId = requiredString(movie.id, `${material.name}:${location}.id`);
    if (!contentId || !slug) return;
    if (seenContentIds.has(contentId)) addError(`${material.name}:${location}: duplicate content_id ${contentId}`);
    seenContentIds.add(contentId);
    addReference(material, location, movie, relationByPairFor(material, location, slug, contentId));
  });
}

function addListReferences(material: MaterialEntry) {
  const all = records(material.value.all, `${material.name}:all`);
  const allContentIds = new Set<string>();
  const allVoiceKeys = new Set<string>();
  all.forEach((item, index) => {
    const location = `all[${index}]`;
    const contentValue = item.contentId;
    const voices = records(item.voices, `${material.name}:${location}.voices`);
    if (contentValue === null || contentValue === undefined || contentValue === '') {
      nullListItems.push({ material: material.name, location });
      if (voices.length) addError(`${material.name}:${location}: voices exist under null contentId`);
      return;
    }
    const contentId = requiredString(contentValue, `${material.name}:${location}.contentId`);
    if (!contentId) return;
    if (allContentIds.has(contentId)) addError(`${material.name}:${location}: duplicate content_id ${contentId}`);
    allContentIds.add(contentId);
    const seenSlugs = new Set<string>();
    voices.forEach((voice, voiceIndex) => {
      const voiceLocation = `${location}.voices[${voiceIndex}]`;
      const slug = requiredString(voice.slug, `${material.name}:${voiceLocation}.slug`);
      if (!slug) return;
      if (seenSlugs.has(slug)) addError(`${material.name}:${voiceLocation}: duplicate voice slug ${slug}`);
      seenSlugs.add(slug);
      allVoiceKeys.add(`${contentId}/${slug}`);
      addReference(material, voiceLocation, voice, relationByPairFor(material, voiceLocation, slug, contentId));
    });
  });

  const picked = records(material.value.picked, `${material.name}:picked`);
  const pickedContentIds = new Set<string>();
  picked.forEach((item, index) => {
    const location = `picked[${index}]`;
    const contentId = requiredString(item.contentId, `${material.name}:${location}.contentId`);
    if (!contentId) return;
    if (pickedContentIds.has(contentId)) addError(`${material.name}:${location}: duplicate picked content_id ${contentId}`);
    pickedContentIds.add(contentId);
    if (!allContentIds.has(contentId)) addError(`${material.name}:${location}: content_id is absent from all`);
    const voices = records(item.voices, `${material.name}:${location}.voices`);
    const seenSlugs = new Set<string>();
    voices.forEach((voice, voiceIndex) => {
      const voiceLocation = `${location}.voices[${voiceIndex}]`;
      const slug = requiredString(voice.slug, `${material.name}:${voiceLocation}.slug`);
      if (!slug) return;
      if (seenSlugs.has(slug)) addError(`${material.name}:${voiceLocation}: duplicate voice slug ${slug}`);
      seenSlugs.add(slug);
      if (!allVoiceKeys.has(`${contentId}/${slug}`)) {
        addError(`${material.name}:${voiceLocation}: picked voice is absent from all`);
      }
      addReference(material, voiceLocation, voice, relationByPairFor(material, voiceLocation, slug, contentId));
    });
  });

  if (material.value.closing !== null && material.value.closing !== undefined) {
    const closing = isRecord(material.value.closing) ? material.value.closing : null;
    if (!closing) {
      addError(`${material.name}:closing must be an object or null`);
      return;
    }
    const slug = requiredString(closing.slug, `${material.name}:closing.slug`);
    const work = requiredString(closing.work, `${material.name}:closing.work`);
    const candidates = all.filter((item) => item.contentId && item.title === work && item.year === closing.year);
    if (candidates.length !== 1) {
      addError(`${material.name}:closing: work/year resolves to ${candidates.length} list items`);
    } else if (slug) {
      const contentId = requiredString(candidates[0].contentId, `${material.name}:closing.contentId`);
      if (contentId && !allVoiceKeys.has(`${contentId}/${slug}`)) {
        addError(`${material.name}:closing: relation is absent from all voices`);
      }
      addReference(material, 'closing', closing, relationByPairFor(material, 'closing', slug, contentId));
    }
  }
}

for (const material of materials) {
  if (material.kind === 'work') addWorkReferences(material);
  if (material.kind === 'celeb') addPersonReferences(material);
  if (material.kind === 'list') addListReferences(material);
}

let inventoryRows: AnyRecord[] = [];
if (inventoryPath) try {
  const inventory = readJson(inventoryPath);
  if (!isRecord(inventory)) {
    addError('inventory: expected an object');
  } else {
    inventoryRows = records(inventory.rows, 'inventory.rows');
  }
} catch (error) {
  addError(`inventory: cannot read ${inventoryPath} (${error instanceof Error ? error.message : String(error)})`);
}

const inventoryIds = new Set<string>();
for (const [index, row] of inventoryRows.entries()) {
  const rid = requiredString(row.rid, `inventory.rows[${index}].rid`);
  if (!rid) continue;
  if (inventoryIds.has(rid)) addError(`inventory: duplicate relation ID ${rid}`);
  inventoryIds.add(rid);
  const relation = relationById.get(rid);
  if (!relation) {
    addError(`inventory: relation ID absent from DB ${rid}`);
    continue;
  }
  if (row.celeb_id !== relation.celeb_id || row.content_id !== relation.content_id) {
    addError(`inventory: relation identity differs from DB ${rid}`);
  }
}

const localRelationIds = new Set(refs.map((ref) => ref.relation.id));
const missingFromMaterials = [...inventoryIds].filter((rid) => !localRelationIds.has(rid));
const extraInMaterials = [...localRelationIds].filter((rid) => !inventoryIds.has(rid));
if (inventoryPath && extraInMaterials.length) addError(`materials: ${extraInMaterials.length} relations are outside inventory`);

const changedRefs = refs.filter((ref) => ref.holder.review !== ref.relation.review);
const changedRelationIds = new Set(changedRefs.map((ref) => ref.relation.id));
const under100Relations = [...localRelationIds]
  .map((rid) => relationById.get(rid))
  .filter((relation): relation is Relation => relation !== undefined && (relation.review ?? '').trim().length < REVIEW_MIN_LENGTH);
const under100Refs = refs.filter((ref) => (ref.relation.review ?? '').trim().length < REVIEW_MIN_LENGTH);

const beforeSnapshots = new Map(materials.map((material) => [material.file, cloneJson(material.value)]));
const changedMaterials = new Set(changedRefs.map((ref) => ref.material.file));
const runStamp = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17)}-${process.pid}`;
let backupPath: string | null = null;

function createBackupDirectory(): string {
  fs.mkdirSync(backupRoot, { recursive: true });
  let candidate = path.join(backupRoot, `luna-cinema-materials-before-${runStamp}`);
  let suffix = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(backupRoot, `luna-cinema-materials-before-${runStamp}-${suffix}`);
    suffix += 1;
  }
  fs.mkdirSync(candidate);
  return candidate;
}

function backupOriginals(): string {
  const directory = createBackupDirectory();
  const names = [
    ...materials.map((material) => material.name),
    ...materials.flatMap((material) => [
      `_body-${material.name.replace(/\.json$/, '')}.html`,
      `_meta-${material.name.replace(/\.json$/, '')}.json`,
      `_preview-${material.name.replace(/\.json$/, '')}.html`,
    ]),
  ];
  for (const name of names) {
    const source = path.join(channelDir, name);
    if (!fs.existsSync(source)) {
      addError(`backup: missing original ${name}`);
      continue;
    }
    fs.copyFileSync(source, path.join(directory, name));
  }
  return directory;
}

function atomicWrite(file: string, value: unknown) {
  const temporary = `${file}.${process.pid}.tmp`;
  if (fs.existsSync(temporary)) throw new Error(`temporary path already exists: ${temporary}`);
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  fs.renameSync(temporary, file);
}

function renderAll() {
  const script = path.join(import.meta.dirname, 'preview.mts');
  const result = spawnSync(process.execPath, ['--env-file=.env', '--import', 'tsx', script, '--all'], {
    cwd: path.resolve(import.meta.dirname, '../..'),
    encoding: 'utf8',
    stdio: 'inherit',
    timeout: 600000,
  });
  if (result.status !== 0) throw new Error(`preview --all failed with status ${String(result.status)}`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exitCode = 1;
} else if (apply) {
  for (const ref of changedRefs) ref.holder.review = ref.relation.review;
  for (const material of materials) {
    if (!changedMaterials.has(material.file)) continue;
    if (!sameJson(withoutReviews(beforeSnapshots.get(material.file)), withoutReviews(material.value))) {
      throw new Error(`material fields other than review changed in memory: ${material.name}`);
    }
  }
  if (changedRefs.length) {
    backupPath = backupOriginals();
    if (errors.length) {
      console.error(JSON.stringify({ ok: false, errors, backupPath }, null, 2));
      process.exitCode = 1;
    } else {
      for (const material of materials) {
        if (changedMaterials.has(material.file)) atomicWrite(material.file, material.value);
      }
      for (const material of materials) {
        if (!changedMaterials.has(material.file)) continue;
        const written = readJson(material.file);
        if (!sameJson(withoutReviews(beforeSnapshots.get(material.file)), withoutReviews(written))) {
          throw new Error(`material fields other than review changed on disk: ${material.name}`);
        }
      }
      if (renderAfter) renderAll();
    }
  } else if (renderAfter) {
    renderAll();
  }
}

const materialChangeCounts = [...new Set(changedRefs.map((ref) => ref.material.name))]
  .sort()
  .map((name) => ({ name, references: changedRefs.filter((ref) => ref.material.name === name).length }));
console.log(JSON.stringify({
  ok: errors.length === 0,
  mode: apply ? 'apply' : 'dry-run',
  database: { celebs: celebs.length, relations: relations.length },
  materials: { total: materials.length, work: materials.filter((m) => m.kind === 'work').length, celeb: materials.filter((m) => m.kind === 'celeb').length, list: materials.filter((m) => m.kind === 'list').length },
  references: refs.length,
  uniqueRelations: localRelationIds.size,
  inventoryRelations: inventoryIds.size,
  repeatedRelationReferences: refs.length - localRelationIds.size,
  inventoryOnlyRelations: missingFromMaterials.length,
  nullListItems: nullListItems.length,
  reviewSync: { changedReferences: changedRefs.length, changedRelations: changedRelationIds.size, changedMaterials: changedMaterials.size },
  under100: { uniqueRelations: under100Relations.length, materialReferences: under100Refs.length, minimum: REVIEW_MIN_LENGTH },
  materialChangeCounts,
  backupPath,
  previewAll: renderAfter && apply ? 'ran_once' : 'not_run',
}, null, 2));

if (errors.length) process.exitCode = 1;
