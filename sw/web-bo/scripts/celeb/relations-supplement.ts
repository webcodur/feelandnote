import {
  canonicalizeCelebRelation,
  canonicalizeCelebRelationAxis,
  celebRelationInputGroup,
  isCelebRelationInputType,
  type CelebRelationInputType,
  type CelebRelationGroup,
  celebRelationFactKey,
  celebRelationPairKey,
  isCelebFamilyRelation,
} from '@feelandnote/shared/constants/celeb-relations'

export type RelationFact = { from_id: string; to_id: string; rel_type: string; rel_group?: string | null }
export type RelationPerson = {
  id: string; slug: string; nickname: string; wikidata_qid: string | null
}

/** 명단 밖 가족 기록도 등록 상대의 QID와 연결해 같은 쌍의 사회 관계를 막는다. */
export function externalFamilyRelationFacts(
  rows: readonly { from_id: string; qid: string; rel_type: string; rel_group?: string | null }[],
  people: readonly { id: string; wikidata_qid: string | null }[],
): RelationFact[] {
  const byQid = new Map<string, string[]>()
  for (const person of people) {
    if (person.wikidata_qid) byQid.set(person.wikidata_qid, [...(byQid.get(person.wikidata_qid) ?? []), person.id])
  }
  return rows.flatMap(row => isCelebFamilyRelation(row.rel_type, row.rel_group)
    ? (byQid.get(row.qid) ?? []).map(to_id => ({
      from_id: row.from_id, to_id, rel_type: row.rel_type, rel_group: 'family',
    })) : [])
}
export type RelationSupplement = {
  schemaVersion: 1
  pairs: Array<{
    a: string; a_qid: string; b: string; b_qid: string
    kind: CelebRelationInputType
    note_ko: string; note_en: string; sources: string[]
  }>
}

/** 가족 쌍은 사회 관계에서 제외한다. 그 밖의 네 축은 독립적이다. */
export function relationConflict(candidate: RelationFact, existing: RelationFact[]): string | null {
  if (!isCelebRelationInputType(candidate.rel_type)) return 'unsupported type'
  const family = isCelebFamilyRelation(candidate.rel_type)
  const identity = { fromId: candidate.from_id, toId: candidate.to_id, relType: candidate.rel_type }
  const c = family ? canonicalizeCelebRelation(identity) : canonicalizeCelebRelationAxis(identity)!
  const pair = celebRelationPairKey(candidate.from_id, candidate.to_id)
  if (!family && existing.some(row => isCelebFamilyRelation(row.rel_type, row.rel_group)
    && celebRelationPairKey(row.from_id, row.to_id) === pair)) return 'existing family relation'
  const key = celebRelationFactKey(c)
  for (const row of existing) {
    const identity = { fromId: row.from_id, toId: row.to_id, relType: row.rel_type }
    const other = isCelebFamilyRelation(row.rel_type, row.rel_group) ? canonicalizeCelebRelation(identity) : canonicalizeCelebRelationAxis(identity)
    if (other && celebRelationFactKey(other) === key) return 'existing fact'
  }
  return null
}

export function validateRelationSupplement(value: unknown): RelationSupplement {
  const input = value as RelationSupplement
  if (!input || input.schemaVersion !== 1 || !Array.isArray(input.pairs) || !input.pairs.length) {
    throw new Error('보강 파일은 schemaVersion: 1과 비어 있지 않은 pairs 배열이 필요합니다.')
  }
  for (const [i, p] of input.pairs.entries()) {
    if (!p || !isCelebRelationInputType(p.kind)) throw new Error(`pairs[${i}]: 가족 유형과 사회 관계 네 축만 허용합니다.`)
    for (const key of ['a', 'b', 'note_ko', 'note_en'] as const) {
      if (typeof p[key] !== 'string' || !p[key].trim()) throw new Error(`pairs[${i}]: ${key}가 필요합니다.`)
    }
    if (p.a === p.b) throw new Error(`pairs[${i}]: 자기 참조는 허용하지 않습니다.`)
    if (!/^Q\d+$/.test(p.a_qid) || !/^Q\d+$/.test(p.b_qid)) throw new Error(`pairs[${i}]: 양쪽 신원 QID가 필요합니다.`)
    if (!Array.isArray(p.sources) || !p.sources.length || p.sources.some((url) => {
      try { return typeof url !== 'string' || !['https:', 'http:'].includes(new URL(url).protocol) }
      catch { return true }
    })) throw new Error(`pairs[${i}]: 확인한 출처 URL이 필요합니다.`)
  }
  return input
}

export function prepareRelationSupplement(
  input: RelationSupplement, people: RelationPerson[], existing: RelationFact[],
) {
  validateRelationSupplement(input)
  const bySlug = new Map(people.map(p => [p.slug, p]))
  const rows: Array<RelationFact & { rel_group: CelebRelationGroup; source: 'manual'; note: string; note_en: string }> = []
  const sources: Array<RelationFact & { sources: string[] }> = []
  const skipped: Array<{ a: string; b: string; reason: string }> = []
  const seen = [...existing]
  // 전체 신원을 먼저 검사해서 일부만 반영되는 것을 막는다.
  const pairs = [...input.pairs].sort((a, b) => Number(isCelebFamilyRelation(b.kind)) - Number(isCelebFamilyRelation(a.kind)))
  for (const p of pairs) {
    for (const [slug, qid] of [[p.a, p.a_qid], [p.b, p.b_qid]]) {
      const person = bySlug.get(slug)
      if (!person) throw new Error(`명단에 없는 인물: ${slug}`)
      if (person.wikidata_qid !== qid) throw new Error(`인물 QID 불일치: ${slug} (DB ${person.wikidata_qid}, 조사 ${qid})`)
    }
  }
  for (const p of pairs) {
    const canonical = canonicalizeCelebRelation({ fromId: bySlug.get(p.a)!.id, toId: bySlug.get(p.b)!.id, relType: p.kind })
    const fact = { from_id: canonical.fromId, to_id: canonical.toId, rel_type: canonical.relType }
    const reason = relationConflict(fact, seen)
    if (reason) {
      if (reason === 'existing fact') sources.push({ ...fact, sources: [...new Set(p.sources)] })
      skipped.push({ a: p.a, b: p.b, reason }); continue
    }
    rows.push({ ...fact, rel_group: celebRelationInputGroup(canonical.relType as CelebRelationInputType), source: 'manual', note: p.note_ko.trim(), note_en: p.note_en.trim() })
    sources.push({ ...fact, sources: [...new Set(p.sources)] })
    seen.push(fact)
  }
  return { rows, sources, skipped }
}
