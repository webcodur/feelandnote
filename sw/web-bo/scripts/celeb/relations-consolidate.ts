import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import {
  canonicalizeCelebRelation,
  celebRelationFactKey,
  preferSpecificCelebRelationType,
} from '@feelandnote/shared/constants/celeb-relations'

interface RelationRow {
  id: string
  created_at: string
  from_id: string
  to_id: string
  rel_type: string
  rel_group: string
  source: string
  label_ko: string | null
  label_en: string | null
  note: string | null
  note_en: string | null
}

interface CelebRow {
  id: string
  nickname: string
  nickname_en: string | null
}

config({ path: resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase env is missing')

const db = createClient(url, key, { auth: { persistSession: false } })
const outputDir = resolve(process.cwd(), '../../data/celeb/relations-consolidation')

async function selectAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order('id').range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return rows
  }
}

function normalizedText(value: string | null): string | null {
  return value?.trim().replace(/\s+/g, ' ') || null
}

function chooseKeeper(rows: RelationRow[]): RelationRow {
  return [...rows].sort((a, b) => {
    const ac = canonicalizeCelebRelation({ fromId: a.from_id, toId: a.to_id, relType: a.rel_type })
    const bc = canonicalizeCelebRelation({ fromId: b.from_id, toId: b.to_id, relType: b.rel_type })
    if (preferSpecificCelebRelationType(ac.relType, bc.relType)) return -1
    if (preferSpecificCelebRelationType(bc.relType, ac.relType)) return 1
    const aCanonical = ac.fromId === a.from_id && ac.toId === a.to_id && ac.relType === a.rel_type
    const bCanonical = bc.fromId === b.from_id && bc.toId === b.to_id && bc.relType === b.rel_type
    if (aCanonical !== bCanonical) return aCanonical ? -1 : 1
    return a.id.localeCompare(b.id)
  })[0]
}

async function prepare() {
  const [relations, celebs] = await Promise.all([
    selectAll<RelationRow>('celeb_relations', 'id,created_at,from_id,to_id,rel_type,rel_group,source,label_ko,label_en,note,note_en'),
    selectAll<CelebRow>('celebs', 'id,nickname,nickname_en'),
  ])
  const names = new Map(celebs.map((celeb) => [celeb.id, celeb]))
  const groups = new Map<string, RelationRow[]>()

  for (const relation of relations) {
    const keyOfFact = celebRelationFactKey({
      fromId: relation.from_id,
      toId: relation.to_id,
      relType: relation.rel_type,
    })
    const group = groups.get(keyOfFact) ?? []
    group.push(relation)
    groups.set(keyOfFact, group)
  }

  const candidates = [...groups.entries()].map(([factKey, rows]) => {
    const keeper = chooseKeeper(rows)
    const canonical = canonicalizeCelebRelation({
      fromId: keeper.from_id,
      toId: keeper.to_id,
      relType: keeper.rel_type,
    })
    const notesKo = [...new Set(rows.map((row) => normalizedText(row.note)).filter((note) => note !== null))]
    const notesEn = [...new Set(rows.map((row) => normalizedText(row.note_en)).filter((note) => note !== null))]
    return {
      fact_key: factKey,
      keeper_id: keeper.id,
      from_id: canonical.fromId,
      from_name: names.get(canonical.fromId)?.nickname ?? canonical.fromId,
      from_name_en: names.get(canonical.fromId)?.nickname_en ?? null,
      to_id: canonical.toId,
      to_name: names.get(canonical.toId)?.nickname ?? canonical.toId,
      to_name_en: names.get(canonical.toId)?.nickname_en ?? null,
      rel_type: canonical.relType,
      rel_group: keeper.rel_group,
      source: keeper.source,
      old_rows: rows,
      note: notesKo.length === 1 ? notesKo[0] : null,
      note_en: notesEn.length === 1 ? notesEn[0] : null,
      needs_merge: notesKo.length !== 1 || notesEn.length !== 1,
    }
  })

  const sourceJson = JSON.stringify(relations)
  const prepared = {
    source_count: relations.length,
    source_sha256: createHash('sha256').update(sourceJson).digest('hex'),
    candidate_count: candidates.length,
    needs_merge_count: candidates.filter((candidate) => candidate.needs_merge).length,
    candidates,
  }
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(resolve(outputDir, 'source.json'), `${sourceJson}\n`, 'utf8')
  writeFileSync(resolve(outputDir, 'candidates.json'), `${JSON.stringify(prepared, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    source: relations.length,
    candidates: candidates.length,
    needsMerge: prepared.needs_merge_count,
    outputDir,
  }, null, 2))
}

async function main() {
  if (!process.argv.includes('--prepare')) {
    throw new Error('Use --prepare. Apply is intentionally unavailable until every shared note is reviewed.')
  }
  await prepare()
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exit(1)
})
