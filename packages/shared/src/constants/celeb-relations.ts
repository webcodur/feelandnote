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

/** 인물 관계의 현행 네 축. 같은 인물 쌍에서 각 축은 독립적으로 성립한다. */
export const CELEB_RELATION_AXES = ['influence', 'influenced', 'colleague', 'rival'] as const
export type CelebRelationAxis = typeof CELEB_RELATION_AXES[number]

/** 가족 관계가 있는 쌍에는 부차적인 사회 관계를 중복 등록하지 않는다. */
export const CELEB_FAMILY_RELATION_TYPES = ['father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'] as const

export function isCelebFamilyRelation(type: string, group?: string | null): boolean {
  return group === 'family' || (CELEB_FAMILY_RELATION_TYPES as readonly string[]).includes(type)
}

export function celebRelationPairKey(fromId: string, toId: string): string {
  return [fromId, toId].sort().join('|')
}

/** 과거 사제·공동창업 기록만 현행 축으로 읽는다. 혈연·친분·대응은 축의 근거가 아니다. */
export function celebRelationAxis(type: string): CelebRelationAxis | null {
  if ((CELEB_RELATION_AXES as readonly string[]).includes(type)) return type as CelebRelationAxis
  if (type === 'teacher') return 'influence'
  if (type === 'student') return 'influenced'
  if (type === 'cofounder') return 'colleague'
  return null
}

export function celebRelationAxisGroup(axis: CelebRelationAxis): CelebRelationGroup {
  if (axis === 'colleague') return 'career'
  if (axis === 'rival') return 'rivalry'
  return 'thought'
}

export function canonicalizeCelebRelationAxis(relation: CelebRelationIdentity): CelebRelationIdentity | null {
  const axis = celebRelationAxis(relation.relType)
  return axis ? canonicalizeCelebRelation({ ...relation, relType: axis }) : null
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

export const CELEB_RELATION_TYPE_ORDER = CELEB_RELATION_AXES

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
