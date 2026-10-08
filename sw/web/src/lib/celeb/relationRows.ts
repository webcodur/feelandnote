import {
  canonicalizeCelebRelationAxis,
  celebRelationAxisGroup,
  celebRelationCounterpartId,
  celebRelationFactKey,
  celebRelationPairKey,
  celebRelationTypeForViewer,
  isCelebFamilyRelation,
  preferSpecificCelebRelationType,
  type CelebRelationGroup,
} from '@feelandnote/shared/constants/celeb-relations'

export interface StoredRelationRow {
  from_id: string
  to_id: string
  rel_type: string
  rel_group: CelebRelationGroup
  note: string | null
  note_en: string | null
}

export interface ViewedRelationRow {
  factKey: string
  counterpartId: string
  relType: string
  relGroup: CelebRelationGroup
  note: string | null
  noteEn: string | null
}

interface PickedRelation extends ViewedRelationRow {
  canonicalType: string
  isCanonicalRow: boolean
}

function toViewedRelation(
  row: StoredRelationRow,
  viewerId: string,
): PickedRelation | null {
  const identity = { fromId: row.from_id, toId: row.to_id, relType: row.rel_type }
  const canonical = canonicalizeCelebRelationAxis(identity)
  if (!canonical) return null
  const counterpartId = celebRelationCounterpartId(canonical, viewerId)
  const relType = celebRelationTypeForViewer(canonical, viewerId)
  if (!counterpartId || !relType) return null

  return {
    factKey: celebRelationFactKey(canonical),
    counterpartId,
    relType,
    relGroup: celebRelationAxisGroup(relType as 'influence' | 'influenced' | 'colleague' | 'rival'),
    note: row.note?.trim() || null,
    noteEn: row.note_en?.trim() || null,
    canonicalType: canonical.relType,
    isCanonicalRow:
      canonical.fromId === row.from_id
      && canonical.toId === row.to_id
      && canonical.relType === row.rel_type,
  }
}

function shouldReplace(candidate: PickedRelation, current: PickedRelation): boolean {
  if (preferSpecificCelebRelationType(candidate.canonicalType, current.canonicalType)) return true
  if (preferSpecificCelebRelationType(current.canonicalType, candidate.canonicalType)) return false
  if (candidate.isCanonicalRow !== current.isCanonicalRow) return candidate.isCanonicalRow
  if (Boolean(candidate.note) !== Boolean(current.note)) return Boolean(candidate.note)
  return false
}

export function mergeRelationRowsForViewer(
  rows: readonly StoredRelationRow[],
  viewerId: string,
): ViewedRelationRow[] {
  const byFact = new Map<string, PickedRelation>()
  const familyPairs = new Set(rows
    .filter(row => isCelebFamilyRelation(row.rel_type, row.rel_group))
    .map(row => celebRelationPairKey(row.from_id, row.to_id)))

  for (const row of rows) {
    if (familyPairs.has(celebRelationPairKey(row.from_id, row.to_id))) continue
    const candidate = toViewedRelation(row, viewerId)
    if (!candidate) continue
    const current = byFact.get(candidate.factKey)
    if (!current || shouldReplace(candidate, current)) {
      byFact.set(candidate.factKey, candidate)
    }
  }

  return [...byFact.values()].map((row) => ({
    factKey: row.factKey,
    counterpartId: row.counterpartId,
    relType: row.relType,
    relGroup: row.relGroup,
    note: row.note,
    noteEn: row.noteEn,
  }))
}
