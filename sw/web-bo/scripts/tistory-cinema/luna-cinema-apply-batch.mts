import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const argValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const manifestPath = argValue('--manifest');
if (!manifestPath) throw new Error('Pass --manifest <review-result.json>; add --yes to apply.');
const runStamp = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17)}-${process.pid}`;
const backupPath = argValue('--backup')
  ?? `D:/blog-assets/tistory-cinema/_backup/luna-cinema-db-before-${runStamp}.json`;
const applyLogPath = argValue('--log')
  ?? `D:/blog-assets/tistory-cinema/luna-cinema-db-apply-${runStamp}.json`;
const apply = process.argv.includes('--yes');
type ManifestRow = {
  index: number;
  rid: string;
  celeb_id: string;
  content_id: string;
  work: string;
  decision: string;
  before: string | null;
  after: string | null;
  review_en_before: string | null;
  review_en_after: string | null;
  source_url?: string | null;
};

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
  rows: ManifestRow[];
};

const targets = manifest.rows.filter((row) => row.decision === 'revise'
  && (row.before !== row.after || row.review_en_before !== row.review_en_after));
if (!targets.length) throw new Error('No changed rows to apply');
const ids = targets.map((row) => row.rid);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate relation ID in manifest');

const hasManifestSourceUrl = (target: ManifestRow): target is ManifestRow & { source_url: string | null } =>
  Object.prototype.hasOwnProperty.call(target, 'source_url') && target.source_url !== undefined;
const sourceUrlMatches = (
  target: ManifestRow,
  row: { source_url: string | null },
) => !hasManifestSourceUrl(target) || row.source_url === target.source_url;
const READ_BATCH_SIZE = 100;
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!);
const currentRows: Array<{
  id: string;
  celeb_id: string;
  content_id: string;
  review: string | null;
  review_en: string | null;
  source_url: string | null;
}> = [];
for (let offset = 0; offset < ids.length; offset += READ_BATCH_SIZE) {
  const batchIds = ids.slice(offset, offset + READ_BATCH_SIZE);
  const { data: current, error: readError } = await db
    .from('celeb_contents')
    .select('id, celeb_id, content_id, review, review_en, source_url')
    .in('id', batchIds);
  if (readError) throw readError;
  currentRows.push(...((current ?? []) as Array<{
    id: string;
    celeb_id: string;
    content_id: string;
    review: string | null;
    review_en: string | null;
    source_url: string | null;
  }>));
}
if (new Set(currentRows.map((row) => row.id)).size !== currentRows.length) {
  throw new Error('Duplicate relation ID returned during preflight read');
}
const byId = new Map(currentRows.map((row) => [row.id, row]));
const alreadyApplied = targets.filter((target) => {
  const row = byId.get(target.rid);
  return row?.celeb_id === target.celeb_id
    && row.content_id === target.content_id
    && sourceUrlMatches(target, row)
    && row.review === target.after
    && row.review_en === target.review_en_after;
});
const pending = targets.filter((target) => !alreadyApplied.some((row) => row.rid === target.rid));
const mismatches = pending.filter((target) => {
  const row = byId.get(target.rid);
  return !row
    || row.celeb_id !== target.celeb_id
    || row.content_id !== target.content_id
    || !sourceUrlMatches(target, row)
    || row.review !== target.before
    || row.review_en !== target.review_en_before;
});
if (mismatches.length) {
  throw new Error(`Preflight guard mismatch for relation(s): ${mismatches.map((row) => row.rid).join(', ')}`);
}

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
if (fs.existsSync(backupPath)) throw new Error(`Backup path already exists: ${backupPath}`);
fs.writeFileSync(backupPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  manifestPath,
  rows: currentRows,
}, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  plannedCount: targets.length,
  remainingCount: pending.length,
  alreadyAppliedCount: alreadyApplied.length,
  backupPath,
  applyLogPath,
  ...(process.argv.includes('--list') ? { targets: pending.map((row) => ({ rid: row.rid, work: row.work })) } : {}),
}, null, 2));
if (!apply) process.exit(0);

const applied: string[] = alreadyApplied.map((row) => row.rid);
const plannedCount = targets.length;
const initialAlreadyAppliedCount = alreadyApplied.length;
const writeLog = (status: string, error?: string) => fs.writeFileSync(applyLogPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  manifestPath,
  backupPath,
  status,
  plannedCount,
  remainingCount: Math.max(0, pending.length - (applied.length - initialAlreadyAppliedCount)),
  appliedCount: applied.length,
  appliedRelationIds: applied,
  ...(error ? { error } : {}),
}, null, 2) + '\n', 'utf8');

writeLog('running');
try {
  for (const target of pending) {
    let query = db
      .from('celeb_contents')
      .update({ review: target.after, review_en: target.review_en_after })
      .eq('id', target.rid)
      .eq('celeb_id', target.celeb_id)
      .eq('content_id', target.content_id);
    if (hasManifestSourceUrl(target)) {
      query = target.source_url === null
        ? query.is('source_url', null)
        : query.eq('source_url', target.source_url);
    }
    query = target.before === null ? query.is('review', null) : query.eq('review', target.before);
    query = target.review_en_before === null ? query.is('review_en', null) : query.eq('review_en', target.review_en_before);
    const { data, error } = await query.select('id, celeb_id, content_id, source_url, review, review_en');
    if (error) throw error;
    if (!data || data.length !== 1 || data[0].id !== target.rid
      || data[0].celeb_id !== target.celeb_id
      || data[0].content_id !== target.content_id
      || !sourceUrlMatches(target, data[0])
      || data[0].review !== target.after || data[0].review_en !== target.review_en_after) {
      throw new Error(`Guarded update did not return expected row: ${target.rid}`);
    }
    const { data: verify, error: verifyError } = await db
      .from('celeb_contents')
      .select('id, celeb_id, content_id, source_url, review, review_en')
      .eq('id', target.rid)
      .maybeSingle();
    if (verifyError) throw verifyError;
    if (!verify || verify.celeb_id !== target.celeb_id || verify.content_id !== target.content_id
      || !sourceUrlMatches(target, verify)
      || verify.review !== target.after || verify.review_en !== target.review_en_after) {
      throw new Error(`Post-update verification failed: ${target.rid}`);
    }
    applied.push(target.rid);
    writeLog('running');
    if (applied.length % 25 === 0 || applied.length === plannedCount) {
      console.log(`저장·재조회 ${applied.length}/${plannedCount} · ${target.work}`);
    }
  }
} catch (error) {
  writeLog('failed', error instanceof Error ? error.message : String(error));
  throw error;
}
writeLog('complete');
console.log(JSON.stringify({ applyLogPath, appliedCount: applied.length }, null, 2));
