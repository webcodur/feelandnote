export type CelebRelationGroup =
  | 'family'
  | 'thought'
  | 'counterpart'
  | 'rivalry'
  | 'career'
  | 'friendship'

export interface CelebRelationIdentity {
  fromId: string
  toId: string
  relType: string
}

const REVERSED_TYPE: Record<string, string> = {
  child: 'parent',
  influenced: 'influence',
  student: 'teacher',
}

const SYMMETRIC_TYPES = new Set([
  'cofounder',
  'colleague',
  'counterpart',
  'friend',
  'partner',
  'relative',
  'rival',
  'sibling',
  'spouse',
])

const FACT_KIND: Record<string, string> = {
  child: 'parentage',
  father: 'parentage',
  influenced: 'influence',
  mother: 'parentage',
  parent: 'parentage',
  student: 'teacher',
}

const INVERSE_VIEW_TYPE: Record<string, string> = {
  father: 'child',
  influence: 'influenced',
  mother: 'child',
  parent: 'child',
  teacher: 'student',
}

// Stored directional types describe what toId is to fromId.
// Example: child -> parent with relType "mother".

export const CELEB_RELATION_TYPE_ORDER = [
  'father',
  'mother',
  'parent',
  'child',
  'spouse',
  'partner',
  'sibling',
  'relative',
  'counterpart',
  'teacher',
  'student',
  'influence',
  'influenced',
  'cofounder',
  'colleague',
  'friend',
  'rival',
] as const

export function canonicalizeCelebRelation(
  relation: CelebRelationIdentity,
): CelebRelationIdentity {
  const canonicalType = REVERSED_TYPE[relation.relType]
  if (canonicalType) {
    return {
      fromId: relation.toId,
      toId: relation.fromId,
      relType: canonicalType,
    }
  }

  if (SYMMETRIC_TYPES.has(relation.relType) && relation.fromId > relation.toId) {
    return {
      fromId: relation.toId,
      toId: relation.fromId,
      relType: relation.relType,
    }
  }

  return relation
}

export function celebRelationFactKey(relation: CelebRelationIdentity): string {
  const canonical = canonicalizeCelebRelation(relation)
  const kind = FACT_KIND[canonical.relType] ?? canonical.relType
  return `${canonical.fromId}|${canonical.toId}|${kind}`
}

export function celebRelationCounterpartId(
  relation: CelebRelationIdentity,
  viewerId: string,
): string | null {
  const canonical = canonicalizeCelebRelation(relation)
  if (canonical.fromId === viewerId) return canonical.toId
  if (canonical.toId === viewerId) return canonical.fromId
  return null
}

export function celebRelationTypeForViewer(
  relation: CelebRelationIdentity,
  viewerId: string,
): string | null {
  const canonical = canonicalizeCelebRelation(relation)
  if (canonical.fromId === viewerId) return canonical.relType
  if (canonical.toId === viewerId) {
    return INVERSE_VIEW_TYPE[canonical.relType] ?? canonical.relType
  }
  return null
}

export function preferSpecificCelebRelationType(
  candidate: string,
  current: string,
): boolean {
  const specificity: Record<string, number> = { father: 2, mother: 2, parent: 1 }
  return (specificity[candidate] ?? 0) > (specificity[current] ?? 0)
}
