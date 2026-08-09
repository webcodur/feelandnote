import { createHash } from 'node:crypto'

export const TIMELINE_POPULATION_RULE = Object.freeze({
  population: 'Every row in public.celebs is included.',
  missing: 'A celeb is missing only when public.celeb_timeline_events has zero rows for that celeb id.',
  exclusions: [],
})

export const TIMELINE_POPULATION_HASH = Object.freeze({
  algorithm: 'sha256',
  encoding: 'utf8',
  canonicalization: [
    'Sort missing celebs by slug, then celebId, using ordinal string comparison.',
    "Serialize each row as `${celebId}|${slug}|${nickname}|${nicknameEn ?? ''}`.",
    'Join rows with LF and no trailing LF.',
  ].join(' '),
})

function compareOrdinal(left, right) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`)
  }
  return value
}

function nullableString(value, label) {
  if (value == null) return null
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string or null`)
  return value
}

function normalizeCeleb(row, index) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new TypeError(`celebs[${index}] must be an object`)
  }

  return {
    celebId: requireNonEmptyString(row.id, `celebs[${index}].id`),
    slug: requireNonEmptyString(row.slug, `celebs[${index}].slug`),
    nickname: requireNonEmptyString(row.nickname, `celebs[${index}].nickname`),
    nicknameEn: nullableString(row.nickname_en, `celebs[${index}].nickname_en`),
    celebTier: nullableString(row.celeb_tier, `celebs[${index}].celeb_tier`),
    publicationStatus: nullableString(
      row.publication_status,
      `celebs[${index}].publication_status`,
    ),
    birthDate: nullableString(row.birth_date, `celebs[${index}].birth_date`),
    deathDate: nullableString(row.death_date, `celebs[${index}].death_date`),
    profession: nullableString(row.profession, `celebs[${index}].profession`),
    nationality: nullableString(row.nationality, `celebs[${index}].nationality`),
    wikidataQid: nullableString(row.wikidata_qid, `celebs[${index}].wikidata_qid`),
  }
}

function compareCelebs(left, right) {
  return compareOrdinal(left.slug, right.slug) || compareOrdinal(left.celebId, right.celebId)
}

function assertDeclaredTotal(label, declared, actual) {
  if (!Number.isSafeInteger(declared) || declared < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`)
  }
  if (declared !== actual) {
    throw new Error(`${label} mismatch: declared ${declared}, received ${actual}`)
  }
}

export function canonicalTimelinePopulationPayload(missingCelebs) {
  return [...missingCelebs]
    .sort(compareCelebs)
    .map((person) => (
      `${person.celebId}|${person.slug}|${person.nickname}|${person.nicknameEn ?? ''}`
    ))
    .join('\n')
}

export function hashTimelineTargetPopulation(missingCelebs) {
  const hash = createHash(TIMELINE_POPULATION_HASH.algorithm)
  hash.write(canonicalTimelinePopulationPayload(missingCelebs), TIMELINE_POPULATION_HASH.encoding)
  return hash.digest('hex')
}

/**
 * The only population decision used by timeline collection.
 *
 * Every celebs row participates. Publication state, tier, life dates, and whether
 * the row represents a real or fictional person are deliberately not predicates.
 */
export function computeTimelineTargetPopulation({
  celebs,
  eventOwnerIds,
  declaredCelebTotal = celebs?.length,
  declaredEventTotal = eventOwnerIds?.length,
}) {
  if (!Array.isArray(celebs)) throw new TypeError('celebs must be an array')
  if (!Array.isArray(eventOwnerIds)) throw new TypeError('eventOwnerIds must be an array')

  assertDeclaredTotal('celeb total', declaredCelebTotal, celebs.length)
  assertDeclaredTotal('timeline event total', declaredEventTotal, eventOwnerIds.length)

  const normalizedCelebs = celebs.map(normalizeCeleb)
  const celebIds = new Set()
  const slugs = new Set()
  for (const person of normalizedCelebs) {
    if (celebIds.has(person.celebId)) throw new Error(`duplicate celeb id: ${person.celebId}`)
    if (slugs.has(person.slug)) throw new Error(`duplicate celeb slug: ${person.slug}`)
    celebIds.add(person.celebId)
    slugs.add(person.slug)
  }

  const ownersWithEvents = new Set()
  for (const [index, ownerId] of eventOwnerIds.entries()) {
    const normalizedOwnerId = requireNonEmptyString(ownerId, `eventOwnerIds[${index}]`)
    if (!celebIds.has(normalizedOwnerId)) {
      throw new Error(`timeline event references unknown celeb id: ${normalizedOwnerId}`)
    }
    ownersWithEvents.add(normalizedOwnerId)
  }

  const missingCelebs = normalizedCelebs
    .filter((person) => !ownersWithEvents.has(person.celebId))
    .sort(compareCelebs)

  const counts = {
    totalCelebs: normalizedCelebs.length,
    withTimeline: ownersWithEvents.size,
    timelineEventRows: eventOwnerIds.length,
    missingTotal: missingCelebs.length,
  }

  if (counts.withTimeline + counts.missingTotal !== counts.totalCelebs) {
    throw new Error('population accounting invariant failed')
  }

  return {
    rule: TIMELINE_POPULATION_RULE,
    counts,
    hash: {
      ...TIMELINE_POPULATION_HASH,
      value: hashTimelineTargetPopulation(missingCelebs),
    },
    missingCelebs,
  }
}
