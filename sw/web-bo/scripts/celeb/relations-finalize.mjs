import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { celebRelationFactKey } from '@feelandnote/shared/constants/celeb-relations'

const root = resolve(process.cwd(), '../..')
const dir = resolve(root, 'data/celeb/relations-consolidation')
const readJson = (name) => JSON.parse(readFileSync(resolve(dir, name), 'utf8'))
const source = readJson('source.json')
const prepared = readJson('candidates.json')
const merged = readJson('merged-notes.json')
const decisions = existsSync(resolve(dir, 'review-decisions.json'))
  ? readJson('review-decisions.json')
  : { source_sha256: prepared.source_sha256, decisions: {} }

const sourceHash = createHash('sha256').update(JSON.stringify(source)).digest('hex')
if (sourceHash !== prepared.source_sha256) throw new Error('Source backup hash mismatch')

for (const artifact of [merged, decisions]) {
  if (artifact.source_sha256 !== prepared.source_sha256) throw new Error('Source hash mismatch')
}
const candidateKeys = new Set(prepared.candidates.map((candidate) => candidate.fact_key))
for (const [factKey, decision] of Object.entries(decisions.decisions)) {
  if (!candidateKeys.has(factKey)) throw new Error(`Decision has no candidate: ${factKey}`)
  if (!['drop', 'replace'].includes(decision.action)) throw new Error(`Invalid decision: ${factKey}`)
}

function resultOf(candidate) {
  if (!candidate.needs_merge) {
    return { status: 'ok', note: candidate.note, note_en: candidate.note_en }
  }
  return merged.results[candidate.fact_key] ?? null
}

function finalRow(candidate, decision) {
  if (decision?.action === 'drop') return null
  const result = resultOf(candidate)
  if ((!result || result.status !== 'ok') && decision?.action !== 'replace') return undefined
  const keeper = candidate.old_rows.find((row) => row.id === candidate.keeper_id)
  if (!keeper) throw new Error(`Keeper missing: ${candidate.fact_key}`)
  return {
    id: candidate.keeper_id,
    created_at: keeper.created_at,
    from_id: decision?.from_id ?? candidate.from_id,
    to_id: decision?.to_id ?? candidate.to_id,
    rel_type: decision?.rel_type ?? candidate.rel_type,
    rel_group: decision?.rel_group ?? candidate.rel_group,
    source: decision?.source ?? candidate.source,
    label_ko: null,
    label_en: null,
    note: decision?.note ?? result?.note ?? null,
    note_en: decision?.note_en ?? result?.note_en ?? null,
  }
}

const unresolved = []
const rows = []
for (const candidate of prepared.candidates) {
  const row = finalRow(candidate, decisions.decisions[candidate.fact_key])
  if (row === undefined) {
    unresolved.push(candidate.fact_key)
  } else if (row !== null) {
    rows.push(row)
  }
}

const identities = new Map()
for (const row of rows) {
  if (!row.note || !row.note_en) throw new Error(`Shared note missing: ${row.id}`)
  const key = celebRelationFactKey({
    fromId: row.from_id,
    toId: row.to_id,
    relType: row.rel_type,
  })
  const previous = identities.get(key)
  if (previous) throw new Error(`Duplicate final fact: ${previous}, ${row.id}`)
  identities.set(key, row.id)
}

if (unresolved.length > 0) {
  throw new Error(`${unresolved.length} relationship notes still need merge or review`)
}

function jsonb(value) {
  const encoded = Buffer.from(JSON.stringify(value), 'utf8').toString('base64')
  return `convert_from(decode('${encoded}', 'base64'), 'utf8')::jsonb`
}

const columns = `
  id uuid,
  created_at timestamptz,
  from_id uuid,
  to_id uuid,
  rel_type text,
  rel_group text,
  source text,
  label_ko text,
  label_en text,
  note text,
  note_en text`
const sql = String.raw`\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE relation_source AS
SELECT * FROM jsonb_to_recordset(${jsonb(source)}) AS row(${columns});

DO $guard$
DECLARE matched integer;
DECLARE live_count integer;
BEGIN
  SELECT count(*) INTO live_count FROM public.celeb_relations;
  SELECT count(*) INTO matched
  FROM public.celeb_relations live
  JOIN relation_source saved ON saved.id = live.id
  WHERE saved.created_at = live.created_at
    AND saved.from_id = live.from_id
    AND saved.to_id = live.to_id
    AND saved.rel_type = live.rel_type
    AND saved.rel_group = live.rel_group
    AND saved.source = live.source
    AND saved.label_ko IS NOT DISTINCT FROM live.label_ko
    AND saved.label_en IS NOT DISTINCT FROM live.label_en
    AND saved.note IS NOT DISTINCT FROM live.note
    AND saved.note_en IS NOT DISTINCT FROM live.note_en;
  IF matched <> ${source.length} OR live_count <> ${source.length} THEN
    RAISE EXCEPTION 'celeb_relations changed after backup: matched %, live %, expected ${source.length}', matched, live_count;
  END IF;
END
$guard$;

CREATE TEMP TABLE relation_final AS
SELECT * FROM jsonb_to_recordset(${jsonb(rows)}) AS row(${columns});

DELETE FROM public.celeb_relations live
USING relation_source saved
WHERE live.id = saved.id;

INSERT INTO public.celeb_relations
  (id, created_at, from_id, to_id, rel_type, rel_group, source, label_ko, label_en, note, note_en)
SELECT id, created_at, from_id, to_id, rel_type, rel_group, source, label_ko, label_en, note, note_en
FROM relation_final;

DO $verify$
DECLARE inserted integer;
BEGIN
  SELECT count(*) INTO inserted
  FROM public.celeb_relations live
  JOIN relation_final final ON final.id = live.id;
  IF inserted <> ${rows.length} THEN
    RAISE EXCEPTION 'final relationship count mismatch: % of ${rows.length}', inserted;
  END IF;
END
$verify$;

COMMIT;
`

const final = {
  source_sha256: prepared.source_sha256,
  source_count: source.length,
  final_count: rows.length,
  dropped_count: prepared.candidates.length - rows.length,
  rows,
}
writeFileSync(resolve(dir, 'final.json'), `${JSON.stringify(final, null, 2)}\n`, 'utf8')
writeFileSync(resolve(dir, 'apply.sql'), sql, 'utf8')
console.log(JSON.stringify({
  source: source.length,
  final: rows.length,
  dropped: final.dropped_count,
  sql: resolve(dir, 'apply.sql'),
}, null, 2))
